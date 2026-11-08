import {AsyncSemaphore} from './semaphore.mjs';
import { assertJson, validateGraph } from './schema.mjs';
import { graphFingerprint, RevisionConflict } from './transactions.mjs';
const MAX_JSON=12*1024*1024;
async function boundedBytes(response,limit){const reader=response.body?.getReader();if(!reader)throw new Error('The companion returned no response body');const chunks=[];let bytes=0;try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>limit)throw new Error('Companion response exceeds its byte limit');chunks.push(next.value);}}finally{await reader.cancel();reader.releaseLock();}const result=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;}

/** The local companion is the authority. This adapter does not copy a project
 * into IndexedDB or translate it into a separate editor format. */
export class RemoteGraphWorkspace {
 #origin;#token;#listeners=new Set();#watched=new Map();#stamps=new Map();#mutating=0;#timer=null;#closed=false;#polling=false;#controller=new AbortController();#mediaSlots=new AsyncSemaphore(2);#mediaPending=new Map();
 constructor(origin,token){const url=new URL(origin);if(url.origin!==origin||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||!/^[a-f0-9]{64}$/.test(token))throw new Error('Use the local Studio URL printed by Looplilt');this.#origin=origin;this.#token=token;}
 async #request(route,{method='GET',value,body,headers={},signal}={}){
  if(this.#closed)throw new Error('The local workspace is closed');
  const mutation=method!=='GET';if(mutation)this.#mutating++;
  try{
  const combined=AbortSignal.any([this.#controller.signal,AbortSignal.timeout(35000),...(signal?[signal]:[])]);
  const response=await fetch(this.#origin+'/api/'+route,{method,body:value===undefined?body:JSON.stringify(value),headers:{Authorization:'Bearer '+this.#token,...(value===undefined?{}:{'Content-Type':'application/json'}),...headers},signal:combined,credentials:'omit',redirect:'error',cache:'no-store'});
  if(response.ok&&headers.Accept==='application/octet-stream')return response;
  const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(response,MAX_JSON)));
  if(!response.ok||!result.ok){const e=result.error??{};if(e.code==='REVISION_CONFLICT')throw new RevisionConflict(e.expected,e.actual);throw Object.assign(new Error(e.message??'The local workspace request failed'),{code:e.code});}
  return result.data;
  }finally{if(mutation)this.#mutating--;}
 }
 async #state(route,options){const state=await this.#request(route,options);validateGraph(state.document,{allowUnsupported:true});if(await graphFingerprint(state.document)!==state.fingerprint)throw new Error('Companion project failed its integrity check');this.#watched.clear();this.#stamps.clear();this.#watched.set(state.document.id,state.fingerprint);if(state.storageStamp)this.#stamps.set(state.document.id,state.storageStamp);return state;}
 list(){return this.#request('projects');}
 read(id){return this.#state('projects/'+encodeURIComponent(id));}
 create(document){return this.#state('projects',{method:'POST',value:document});}
 transact(id,request,options={}){return this.#state('projects/'+encodeURIComponent(id)+'/edit',{method:'POST',value:request,...options});}
 undoRedo(id,direction,fingerprint){return this.#state('projects/'+encodeURIComponent(id)+'/history',{method:'POST',value:{action:direction,expectedFingerprint:fingerprint}});}
 async putAsset(asset,blob,{signal,projectId}={}){
  if(!projectId)throw new Error('Choose the media destination project');if(!(blob instanceof Blob)||blob.size!==asset.bytes||blob.size>256*1024*1024)throw new Error('Media size does not match its manifest');assertJson(asset);
  await this.#request('projects/'+encodeURIComponent(projectId)+'/assets/'+encodeURIComponent(asset.id),{method:'PUT',body:blob,headers:{'Content-Type':'application/octet-stream','X-Looplilt-Asset':encodeURIComponent(JSON.stringify(asset))},signal});
 }
 async getAsset(asset,projectId){
  if(!projectId)throw new Error('Choose a media source project');
  const key=projectId+':'+asset.id+':'+asset.sha256;let pending=this.#mediaPending.get(key);
  if(!pending){pending=this.#mediaSlots.run(()=>this.#readAsset(asset,projectId),{signal:this.#controller.signal}).finally(()=>this.#mediaPending.delete(key));this.#mediaPending.set(key,pending);}
  return pending;
 }
 async #readAsset(asset,projectId){
  if(!projectId)throw new Error('Choose a media source project');if(!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>256*1024*1024)throw new Error('Media exceeds the browser byte limit');
  const response=await this.#request('projects/'+encodeURIComponent(projectId)+'/assets/'+encodeURIComponent(asset.id),{headers:{Accept:'application/octet-stream'}}),bytes=await boundedBytes(response,asset.bytes);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==asset.bytes||hash!==asset.sha256)throw new Error('Local media failed its integrity check: '+asset.name);return new Blob([bytes],{type:asset.mime});
 }
 subscribe(listener){this.#listeners.add(listener);if(!this.#timer)this.#timer=setInterval(()=>void this.#poll(),1000);return()=>{this.#listeners.delete(listener);if(!this.#listeners.size&&this.#timer){clearInterval(this.#timer);this.#timer=null;}};}
 async #poll(){
  if(this.#polling||this.#closed||this.#mutating||!this.#watched.size)return;this.#polling=true;
  try{for(const [id,fingerprint]of [...this.#watched]){
   const route='projects/'+encodeURIComponent(id),revision=await this.#request(route+'/revision');
   if(this.#mutating||this.#watched.get(id)!==fingerprint||revision.storageStamp===this.#stamps.get(id))continue;
   const state=await this.#request(route);
   validateGraph(state.document,{allowUnsupported:true});
   if(state.document.id!==id||await graphFingerprint(state.document)!==state.fingerprint)throw new Error('Companion project failed its integrity check');
   if(this.#mutating||this.#watched.get(id)!==fingerprint)continue;
   if(state.storageStamp)this.#stamps.set(id,state.storageStamp);
   if(state.fingerprint!==fingerprint){this.#watched.set(id,state.fingerprint);for(const listener of this.#listeners)try{listener({projectId:id,fingerprint:state.fingerprint});}catch{}}
  }}
  catch(error){if(!this.#closed)for(const listener of this.#listeners)try{listener({projectId:[...this.#watched.keys()][0],error:error.message});}catch{}}
  finally{this.#polling=false;}
 }
 close(){this.#closed=true;this.#controller.abort();if(this.#timer)clearInterval(this.#timer);this.#timer=null;this.#listeners.clear();}
}

export function companionFromLocation(location=globalThis.location,storage=globalThis.sessionStorage){
 if(location.protocol!=='http:'||location.hostname!=='127.0.0.1')return null;
 const params=new URLSearchParams(location.hash.slice(1)),provided=params.get('workspace');
 if(provided!==null){if(!/^[a-f0-9]{64}$/.test(provided))throw new Error('Invalid local workspace link');storage.setItem('looplilt-companion',provided);globalThis.history.replaceState(null,'',location.pathname+location.search);}
 const token=provided??storage.getItem('looplilt-companion');return token?new RemoteGraphWorkspace(location.origin,token):null;
}

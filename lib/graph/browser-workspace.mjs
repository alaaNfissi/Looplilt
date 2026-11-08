import { createGraph, validateGraph } from './schema.mjs';
import { applyTransaction, graphFingerprint, RevisionConflict, serializeGraph } from './transactions.mjs';

const HISTORY_BYTES=16*1024*1024;
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const summary=record=>({document:record.document,fingerprint:record.fingerprint,history:{undo:record.undo.map(item=>item.label),redo:record.redo.map(item=>item.label)},savedAt:record.savedAt});
function trimHistory(record){
 let bytes=record.undo.concat(record.redo).reduce((sum,item)=>sum+item.bytes,0);
 while(bytes>HISTORY_BYTES||record.undo.length+record.redo.length>100){const list=record.undo.length>=record.redo.length?record.undo:record.redo;bytes-=list.shift().bytes;}
}
function remember(record,list,label){record[list].push({document:record.document,fingerprint:record.fingerprint,label,bytes:new TextEncoder().encode(serializeGraph(record.document)).byteLength});}

/** Local browser persistence of the canonical document. IndexedDB commits are
 * acknowledged at transaction completion, not when an individual put succeeds.
 * Revision checks happen inside the same write transaction as publication.
 */
export class BrowserGraphWorkspace {
 #database;#channel;#listeners=new Set();
 constructor(database,name){
  this.#database=database;
  if(typeof BroadcastChannel!=='undefined'){this.#channel=new BroadcastChannel(`${name}:revisions`);this.#channel.onmessage=event=>this.#notify(event.data);}
  database.onversionchange=()=>this.close();
 }
 static async open({name='looplilt-workspace-v2'}={}){
  if(typeof indexedDB==='undefined')throw new Error('Browser storage is unavailable. Open Studio in a browser with IndexedDB enabled.');
  if(!/^looplilt-[a-z0-9_-]{1,90}$/.test(name))throw new Error('Invalid Looplilt database name');
  const database=await new Promise((resolve,reject)=>{
   const request=indexedDB.open(name,1);let settled=false;
   request.onupgradeneeded=()=>{request.result.createObjectStore('projects',{keyPath:'id'});request.result.createObjectStore('assets');};
   request.onerror=()=>{settled=true;reject(request.error);};request.onblocked=()=>{settled=true;reject(new Error('Close another Studio tab to finish upgrading browser storage.'));};
   request.onsuccess=()=>{if(settled)request.result.close();else{settled=true;resolve(request.result);}};
  });
  return new BrowserGraphWorkspace(database,name);
 }
 #transaction(storeName,mode,run){
  return new Promise((resolve,reject)=>{
   let result,error;const tx=this.#database.transaction(storeName,mode),store=tx.objectStore(storeName);
   tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error??tx.error??new Error('Browser storage transaction was aborted'));tx.onerror=()=>{};
   const set=value=>{result=value;},fail=reason=>{error=reason;tx.abort();};
   try{run(store,set,fail);}catch(reason){fail(reason);}
  });
 }
 async #record(id){
  const record=await this.#transaction('projects','readonly',(store,set)=>{const req=store.get(id);req.onsuccess=()=>set(req.result);});
  if(!record)throw new Error('Project was not found in this browser');
  validateGraph(record.document,{allowUnsupported:true});
  if(record.fingerprint!==await graphFingerprint(record.document))throw new Error('Stored project failed its integrity check');
  return record;
 }
 #notify(event){if(!event||typeof event.projectId!=='string'||typeof event.fingerprint!=='string')return;for(const listener of this.#listeners)try{listener(event);}catch{/* Views cannot roll back committed data. */}}
 subscribe(listener){this.#listeners.add(listener);return ()=>this.#listeners.delete(listener);}
 async #publish(record,expectedFingerprint){
  await this.#transaction('projects','readwrite',(store,set,fail)=>{
   const request=store.get(record.id);
   request.onsuccess=()=>{
    const current=request.result;
    if(expectedFingerprint===null?!!current:current?.fingerprint!==expectedFingerprint){fail(new RevisionConflict(expectedFingerprint,current?.fingerprint??null));return;}
    store.put(record);set(true);
   };
  });
  const event={projectId:record.id,fingerprint:record.fingerprint};this.#notify(event);this.#channel?.postMessage(event);
  return freeze(summary(record));
 }
 async create(document=createGraph()){
  validateGraph(document,{allowUnsupported:true});const copy=structuredClone(document);
  return this.#publish({id:copy.id,document:copy,fingerprint:await graphFingerprint(copy),undo:[],redo:[],savedAt:Date.now()},null);
 }
 async read(id){return freeze(summary(await this.#record(id)));}
 async list(){
  return this.#transaction('projects','readonly',(store,set,fail)=>{
   const items=[],request=store.openCursor();request.onsuccess=()=>{
    const cursor=request.result;if(!cursor){set(items.sort((a,b)=>b.savedAt-a.savedAt));return;}
    if(items.length>=500){fail(new Error('Project library exceeds 500 entries'));return;}
    const record=cursor.value;items.push({id:record.id,title:record.document.title,fingerprint:record.fingerprint,revision:record.document.revision,savedAt:record.savedAt});cursor.continue();
   };
  });
 }
 async transact(id,request,{signal}={}){
  signal?.throwIfAborted();const record=await this.#record(id),result=await applyTransaction(record.document,request);
  if(result.noop){signal?.throwIfAborted();return {...await this.#publish(record,request.expectedFingerprint),...result};}
  remember(record,'undo',request.label);record.redo=[];record.document=result.document;record.fingerprint=result.fingerprint;record.savedAt=Date.now();trimHistory(record);
  signal?.throwIfAborted();const state=await this.#publish(record,request.expectedFingerprint);
  return {...state,previousFingerprint:result.previousFingerprint,changedNodes:result.changedNodes,changedAssets:result.changedAssets,noop:false};
 }
 async undoRedo(id,direction,expectedFingerprint,{signal}={}){
  if(!['undo','redo'].includes(direction))throw new Error('Choose undo or redo');
  signal?.throwIfAborted();const record=await this.#record(id);
  if(record.fingerprint!==expectedFingerprint)throw new RevisionConflict(expectedFingerprint,record.fingerprint);
  const source=record[direction];if(!source.length)throw new Error(`Nothing to ${direction}`);
  const entry=source.pop();validateGraph(entry.document,{allowUnsupported:true});
  if(await graphFingerprint(entry.document)!==entry.fingerprint)throw new Error('History snapshot failed its integrity check');
  remember(record,direction==='undo'?'redo':'undo',entry.label);
  const document=structuredClone(entry.document);document.revision=record.document.revision+1;validateGraph(document,{allowUnsupported:true});
  record.document=document;record.fingerprint=await graphFingerprint(document);record.savedAt=Date.now();trimHistory(record);
  signal?.throwIfAborted();return this.#publish(record,expectedFingerprint);
 }
 async putAsset(asset,blob,{signal}={}){
  if(!(blob instanceof Blob)||blob.size!==asset.bytes||blob.size>256*1024*1024)throw new Error('Asset bytes must match their manifest and fit within 256 MiB');
  signal?.throwIfAborted();const bytes=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==asset.sha256)throw new Error('Asset failed its integrity check');signal?.throwIfAborted();
  await this.#transaction('assets','readwrite',(store,set)=>{store.put(blob,hash);set(true);});
 }
 async getAsset(asset){
  if(!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>256*1024*1024)throw new Error('Media exceeds the browser asset budget');
  const blob=await this.#transaction('assets','readonly',(store,set)=>{const request=store.get(asset.sha256);request.onsuccess=()=>set(request.result);});
  if(!(blob instanceof Blob)||blob.size!==asset.bytes)throw new Error(`Missing local media: ${asset.name}. Relink the original file.`);
  const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()),hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==asset.sha256)throw new Error(`Changed local media: ${asset.name}. Relink the original file.`);
  return blob;
 }
 close(){this.#channel?.close();this.#listeners.clear();this.#database.close();}
}

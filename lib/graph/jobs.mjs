import {atomicRename} from '../atomic-file.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {scopedPath} from './workspace.mjs';
import {assertJson,validateGraph} from './schema.mjs';
import {serializeGraph,graphFingerprint,RevisionConflict} from './transactions.mjs';
import {normalizeRenderRequest} from './render-request.mjs';
const renderGraphSnapshot=async(...args)=>(await import('./render.mjs')).renderGraphSnapshot(...args);
import {artifactDigest} from './render-verify.mjs';

const ID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,HASH=/^[a-f0-9]{64}$/;
const finished=new Set(['completed','failed','cancelled','interrupted']);
const now=()=>new Date().toISOString();
const filename=request=>request.kind==='video'?'result.'+request.format:request.kind+'.png';
function jobId(id){if(typeof id!=='string'||!ID.test(id))throw new Error('Expected a render job ID');return id;}
function isAlive(pid){try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}}
async function makeDirectory(root,name){
 const directory=await scopedPath(root,name,{missingLeaf:true});
 try{await fs.mkdir(directory);}catch(error){if(error.code!=='EEXIST')throw error;}
 const checked=await scopedPath(root,name);if(!(await fs.stat(checked)).isDirectory())throw new Error('Render storage is not a directory');return checked;
}
async function durable(file,bytes){
 const handle=await fs.open(file,'wx',0o600);
 try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
}
async function readRecord(file){
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));let record;
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.size>65536)throw new Error('Invalid render job record');
  const bytes=Buffer.alloc(stat.size+1),read=await handle.read(bytes,0,bytes.length,0);
  if(read.bytesRead!==stat.size)throw new Error('Render job record changed while reading');
  record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,read.bytesRead)));
 }finally{await handle.close();}
 assertJson(record);const {checksum,...body}=record;
 if(checksum!==await graphFingerprint(body)||body.version!==1||!ID.test(body.id)||!HASH.test(body.fingerprint)||!Number.isSafeInteger(body.ownerPid)||body.ownerPid<1||!['queued','running','completed','failed','cancelled'].includes(body.status))throw new Error('Render job record failed its integrity check');
 if(!body.request||!['frame','storyboard','video'].includes(body.request.kind)||!['mp4','webm'].includes(body.request.format))throw new Error('Invalid recorded render request');
 if(body.output&&(body.output.filename!==filename(body.request)||!HASH.test(body.output.sha256)||!Number.isSafeInteger(body.output.bytes)||body.output.bytes<1||body.output.bytes>256*1024*1024))throw new Error('Invalid render artifact record');
 return body;
}

/** One active render, with at most four accepted jobs, including the active one.
 * Immutable snapshots and append-only artifact names isolate rendering from
 * live edits. A second local client can inspect or request cancellation. */
export class GraphRenderJobs{
 #workspace;#entries=new Map();#tail=Promise.resolve();#reserved=0;#closed=false;#lifetime=new AbortController();#graphics=process.env.LOOPLILT_DISABLE_GPU==='1'?'software':'auto';
 constructor(workspace,{renderer=renderGraphSnapshot,onProgress=()=>{}}={}){this.#workspace=workspace;this.renderer=renderer;this.onProgress=onProgress;}
 async #directory(id){return scopedPath(this.#workspace.root,'renders/'+jobId(id));}
 async #persist(record){
  const directory=await this.#directory(record.id),temporary=await scopedPath(directory,'status-'+randomUUID()+'.pending',{missingLeaf:true});
  try{
   await durable(temporary,JSON.stringify({...record,checksum:await graphFingerprint(record)}));
   await atomicRename(temporary,await scopedPath(directory,'status.json',{missingLeaf:true}));
  }finally{await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 }
 async start({projectId,expectedFingerprint,request={}}, {signal}={}){
  if(this.#closed)throw new Error('Render service is closed');
  if(this.#reserved>=4)throw Object.assign(new Error('Four render jobs are already accepted; wait or cancel one'),{code:'SERVER_BUSY'});
  this.#reserved++;
  try{
   signal?.throwIfAborted();this.#lifetime.signal.throwIfAborted();assertJson(request);
   const state=await this.#workspace.read(projectId);
   if(state.fingerprint!==expectedFingerprint)throw new RevisionConflict(expectedFingerprint,state.fingerprint);
   validateGraph(state.document);const normalized=normalizeRenderRequest(state.document,request);
   const storage=await makeDirectory(this.#workspace.root,'renders'),id=randomUUID(),directory=await scopedPath(storage,id,{missingLeaf:true});
   await fs.mkdir(directory);await scopedPath(storage,id);
   const record={version:1,id,projectId,fingerprint:state.fingerprint,revision:state.document.revision,ownerPid:process.pid,status:'queued',createdAt:now(),request:normalized,progress:{phase:'queued',ratio:0,completedFrames:0,totalFrames:normalized.kind==='video'?normalized.outputFrames:normalized.kind==='frame'?1:normalized.frames.length}};
   await durable(await scopedPath(directory,'snapshot.looplilt.json',{missingLeaf:true}),serializeGraph(state.document));
   await this.#persist(record);
   const entry={record,controller:new AbortController(),done:null};this.#entries.set(id,entry);
   if(signal?.aborted)entry.controller.abort(signal.reason);
   const previous=this.#tail;
   entry.done=previous.catch(()=>{}).then(()=>this.#execute(entry,state,structuredClone(request))).finally(()=>{
    this.#reserved--;this.#entries.delete(id);
   });
   this.#tail=entry.done.catch(()=>{});
   // The queue is owned by this process, not by the lifetime of one MCP call.
   return structuredClone(record);
  }catch(error){this.#reserved--;throw error;}
 }
 async #execute(entry,state,request){
  const record=entry.record,signal=AbortSignal.any([entry.controller.signal,this.#lifetime.signal]),directory=await this.#directory(record.id);
  const temporary=await scopedPath(directory,'render-'+randomUUID()+'.pending.'+(record.request.kind==='video'?record.request.format:'png'),{missingLeaf:true});
  let poll,busy=false;
  const checkCancellation=async()=>{
   if(busy)return;busy=true;
   try{
    await scopedPath(directory,'cancel.json');
    entry.controller.abort(new Error('Render cancelled by a workspace client'));
   }catch(error){if(error.code!=='ENOENT')entry.controller.abort(error);}finally{busy=false;}
  };
  try{
   await checkCancellation();signal.throwIfAborted();
   record.status='running';record.startedAt=now();record.progress.phase='preparing';await this.#persist(record);
   poll=setInterval(()=>void checkCancellation(),500);
   const result=await this.renderer(this.#workspace,state,request,temporary,{signal,graphics:this.#graphics,onProgress:value=>{
    record.progress=value;this.onProgress({jobId:record.id,...value});
   }});
   await checkCancellation();signal.throwIfAborted();
   if(result.metrics?.graphics==='software')this.#graphics='software';
   // Verify the renderer contract even for a custom locally supplied runner.
   if(result.fingerprint!==record.fingerprint||result.filename!==filename(record.request)||!HASH.test(result.sha256))throw new Error('Render result does not match its job');
   const actual=await artifactDigest(await scopedPath(directory,path.basename(temporary)),{signal});
   if(actual.sha256!==result.sha256||actual.bytes!==result.bytes)throw new Error('Render output changed before publication');
   const handle=await fs.open(temporary,'r+');try{await handle.sync();}finally{await handle.close();}
   await checkCancellation();signal.throwIfAborted();const output=await scopedPath(directory,result.filename,{missingLeaf:true});
   // Exclusive link is the artifact publication point. Existing files cannot
   // be overwritten; the verified staging inode becomes the final artifact.
   await fs.link(temporary,output);
   record.output={...result,path:'renders/'+record.id+'/'+result.filename};record.status='completed';record.finishedAt=now();record.progress.phase='complete';
   await this.#persist(record);
  }catch(error){
   record.status=signal.aborted?'cancelled':'failed';record.finishedAt=now();record.error=String(error.message??error).slice(0,2000);
   await this.#persist(record);
  }finally{
   clearInterval(poll);
   await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});
  }
  return structuredClone(record);
 }
 async status(id){
  jobId(id);const owned=this.#entries.get(id);if(owned)return structuredClone(owned.record);
  const record=await readRecord(await scopedPath(await this.#directory(id),'status.json'));
  if(record.id!==id)throw new Error('Job ID does not match its directory');
  if(!finished.has(record.status)){
   record.ownerAlive=isAlive(record.ownerPid);
   if(!record.ownerAlive){record.status='interrupted';record.error='The render process ended before completion. The editable project and snapshot are preserved. Start a new job.';}
   else record.progress={...record.progress,phase:'running in another process; live progress is available from its owning client'};
  }
  return record;
 }
 async list({offset=0,limit=20}={}){
  if(!Number.isInteger(offset)||offset<0||offset>10000||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid render job page');
  let root;try{root=await scopedPath(this.#workspace.root,'renders');}catch(error){if(error.code==='ENOENT')return {items:[],total:0,nextOffset:null};throw error;}
  const names=[];for await(const entry of await fs.opendir(root)){if(names.length>=10000)throw new Error('Render history exceeds10000 jobs; archive completed artifacts before adding more');if(entry.isDirectory()&&!entry.isSymbolicLink()&&ID.test(entry.name))names.push(entry.name);}
  // UUID ordering is stable for pagination; each entry carries its creation date.
  names.sort();const items=[];
  for(const id of names.slice(offset,offset+limit)){try{items.push(await this.status(id));}catch(error){items.push({id,status:'unreadable',error:error.message});}}
  return {items,total:names.length,nextOffset:offset+limit<names.length?offset+limit:null};
 }
 async cancel(id){
  const record=await this.status(id);if(finished.has(record.status))return record;
  const owned=this.#entries.get(id);if(owned){owned.controller.abort(new Error('Render cancelled'));owned.record.cancelRequested=true;return {...structuredClone(owned.record),cancelRequested:true};}
  const directory=await this.#directory(id),file=await scopedPath(directory,'cancel.json',{missingLeaf:true});
  try{await fs.writeFile(file,JSON.stringify({requestedAt:now()}),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
  return {...await this.status(id),cancelRequested:true};
 }
 async wait(id){
  const entry=this.#entries.get(jobId(id));if(entry)await entry.done;return this.status(id);
 }
 async artifact(id,{signal}={}){
  const record=await this.status(id);if(record.status!=='completed'||!record.output)throw new Error('The render job has no completed artifact');
  const file=await scopedPath(await this.#directory(id),filename(record.request)),actual=await artifactDigest(file,{signal});
  if(actual.sha256!==record.output.sha256||actual.bytes!==record.output.bytes)throw new Error('Completed artifact has been changed; start a new render');
  return {jobId:id,fingerprint:record.fingerprint,...record.output,file};
 }
 async close(){
  if(this.#closed)return this.#tail;this.#closed=true;this.#lifetime.abort(new Error('Render service closed'));
  await this.#tail;
 }
}

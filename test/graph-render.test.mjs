import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {createGraph} from '../lib/graph/schema.mjs';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';
import {GraphRenderJobs} from '../lib/graph/jobs.mjs';
import {normalizeRenderRequest} from '../lib/graph/render-request.mjs';
import {startGraphRenderHost} from '../lib/graph/render-host.mjs';
import {putWorkspaceAsset} from '../lib/graph/assets.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-render-test-')),workspace=await GraphWorkspace.open(root);
 const state=await workspace.create(createGraph({id:'original-film',title:'Original film',width:320,height:180,durationFrames:60}));
 t.after(async()=>{const resolved=await fs.realpath(root),temporary=await fs.realpath(os.tmpdir());assert.equal(path.dirname(resolved),temporary);assert.match(path.basename(resolved),/^looplilt-render-test-/);await fs.rm(resolved,{recursive:true,force:true});});
 return {root,workspace,state};
}
test('render requests reject unbounded output and retain exact fractional timing',()=>{
 const graph=createGraph({width:1920,height:1080,durationFrames:300,frameRate:{numerator:30000,denominator:1001}});
 const result=normalizeRenderRequest(graph,{kind:'video',startFrame:30,endFrame:90,width:640,rate:{numerator:60000,denominator:1001}});
 assert.equal(result.outputFrames,120);assert.equal(result.durationSeconds,2.002);assert.equal(result.height,360);
 for(const request of [{kind:'video',width:641},{kind:'frame',frame:300},{kind:'storyboard',frames:[-1]},{kind:'storyboard',width:4096,height:4096},{kind:'video',endFrame:301},{kind:'frame',url:'https://example.test/private'}])assert.throws(()=>normalizeRenderRequest(graph,request));
 const hostile={kind:'frame'};Object.defineProperty(hostile,'width',{enumerable:true,get(){throw new Error('getter executed');}});
 assert.throws(()=>normalizeRenderRequest(graph,hostile),/unsafe JSON/);
});
test('read-only render host keeps its snapshot and rejects writes, foreign origins and unrelated media',{timeout:120000},async t=>{
 const {root,workspace,state}=await fixture(t),runtime=path.join(root,'runtime');await fs.mkdir(path.join(runtime,'render'),{recursive:true});await fs.writeFile(path.join(runtime,'render/index.html'),'<p>Local test runtime</p>');
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==','base64'),sha256=createHash('sha256').update(bytes).digest('hex');
 const asset={id:'own-pixel',name:'Own pixel',kind:'image',mime:'image/png',path:'assets/'+sha256+'.png',sha256,bytes:bytes.length,metadata:{}};
 await putWorkspaceAsset(workspace,state.document.id,asset,[bytes]);
 const saved=await workspace.transact(state.document.id,{expectedFingerprint:state.fingerprint,label:'Attach image',operations:[{op:'asset.add',asset}]});
 const host=await startGraphRenderHost(workspace,saved,{staticDirectory:runtime});t.after(()=>host.close());
 const token=new URLSearchParams(new URL(host.url).hash.slice(1)).get('render'),headers={Authorization:'Bearer '+token};
 assert.equal((await fetch(host.origin+'/api/render/project')).status,401);
 assert.equal((await fetch(host.origin+'/api/render/project',{headers:{...headers,Origin:'https://untrusted.example'}})).status,403);
 assert.equal((await fetch(host.origin+'/api/render/project',{headers,method:'POST'})).status,405);
 assert.equal((await fetch(host.origin+'/api/render/assets/missing',{headers})).status,404);
 await workspace.transact(saved.document.id,{expectedFingerprint:saved.fingerprint,label:'Continue editing',operations:[{op:'asset.remove',id:asset.id},{op:'project.patch',changes:{title:'Changed after render began'}}]});
 const retained=await(await fetch(host.origin+'/api/render/project',{headers})).json();assert.equal(retained.fingerprint,saved.fingerprint);assert.equal(retained.document.title,'Original film');
 assert.deepEqual(Buffer.from(await(await fetch(host.origin+'/api/render/assets/'+asset.id,{headers})).arrayBuffer()),bytes);
 assert.equal((await fetch(host.origin+'/studio/render/')).status,200);
});
test('job queue cancellation, durable retrieval, tamper detection and protected outputs',{timeout:120000},async t=>{
 const {root,workspace,state}=await fixture(t);let entered,release;const started=new Promise(resolve=>entered=resolve),hold=new Promise(resolve=>release=resolve);
 // A controlled worker tests the filesystem/queue boundary. Real encoder
 // integration is exercised separately by verify-graph-jobs.mjs.
 const worker=async(_workspace,snapshot,request,file,{signal})=>{
  entered();await Promise.race([hold,new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))]);signal.throwIfAborted();
  const bytes=Buffer.from('bounded worker output');await fs.writeFile(file,bytes,{flag:'wx'});
  return {filename:'frame.png',mime:'image/png',bytes:bytes.length,width:320,height:180,frames:1,durationSeconds:0,hasAudio:false,fingerprint:snapshot.fingerprint,sha256:createHash('sha256').update(bytes).digest('hex')};
 };
 const jobs=new GraphRenderJobs(workspace,{renderer:worker}),other=new GraphRenderJobs(workspace);t.after(async()=>{release();await Promise.all([jobs.close(),other.close()]);});
 const request={projectId:state.document.id,expectedFingerprint:state.fingerprint,request:{kind:'frame',frame:0}};
 const first=await jobs.start(request);await started;
 const second=await jobs.start(request);await jobs.start(request);await jobs.start(request);
 await assert.rejects(jobs.start(request),/Four render jobs/);
 await jobs.cancel(second.id);await other.cancel(first.id);release();
 assert.equal((await jobs.wait(first.id)).status,'cancelled');assert.equal((await jobs.wait(second.id)).status,'cancelled');
 const remaining=(await jobs.list()).items.filter(job=>![first.id,second.id].includes(job.id));for(const job of remaining)await jobs.wait(job.id);
 const completed=remaining[0].id,artifact=await other.artifact(completed);assert.equal(artifact.fingerprint,state.fingerprint);
 await fs.writeFile(artifact.file,'changed');await assert.rejects(other.artifact(completed),/changed/);
 const preserved=await workspace.read(state.document.id);assert.equal(preserved.fingerprint,state.fingerprint);
 const record=path.join(root,'renders',completed,'status.json');await fs.writeFile(record,'{"version":1}');await assert.rejects(other.status(completed),/integrity/);
 await assert.rejects(other.status('../outside'),/job ID/);
});
test('failed workers cannot replace an existing output or publish a partial file',{timeout:120000},async t=>{
 const {root,workspace,state}=await fixture(t);
 const jobs=new GraphRenderJobs(workspace,{renderer:async(_workspace,snapshot,_request,file)=>{
  const bytes=Buffer.from('new output');await fs.writeFile(file,bytes);await fs.writeFile(path.join(path.dirname(file),'frame.png'),'existing output');
  return {filename:'frame.png',mime:'image/png',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),fingerprint:snapshot.fingerprint};
 }});t.after(()=>jobs.close());
 const job=await jobs.start({projectId:state.document.id,expectedFingerprint:state.fingerprint,request:{kind:'frame'}});
 assert.equal((await jobs.wait(job.id)).status,'failed');
 assert.equal(await fs.readFile(path.join(root,'renders',job.id,'frame.png'),'utf8'),'existing output');
 assert.equal((await fs.readdir(path.join(root,'renders',job.id))).some(file=>file.startsWith('render-')),false);
 await assert.rejects(jobs.artifact(job.id),/no completed artifact/);
});

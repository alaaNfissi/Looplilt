import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { inspectProject, reviseProject, exportFrame } from '../lib/inspect.mjs';
import { readProject } from '../lib/project.mjs';
import { startPreview } from '../lib/preview.mjs';
import { run } from '../lib/process.mjs';
import { renderRange } from '../lib/render.mjs';
const data=()=>({version:1,title:'Scene trial',duration:4,fps:30,score:[],scenes:[
{id:'before',label:'Before',start:0,end:2,params:{accent:'#d0aa66'}},
{id:'after',label:'After',start:2,end:4,params:{accent:'#88aa66',jump:20}}]});
async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-workflow-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const project=path.join(root,'project with spaces');await fs.mkdir(project);
  await fs.writeFile(path.join(project,'project.json'),JSON.stringify(data()));
  await fs.writeFile(path.join(project,'draw.js'),'function drawFrame({ctx,w,h,shot}) { ctx.fillStyle=shot.params.accent;ctx.fillRect(0,0,w,h); }');
  return {root,project};
}
test('inspection validates without executing hostile drawing code in Node',async t=>{
  const {project}=await fixture(t);
  await fs.writeFile(path.join(project,'draw.js'),'function drawFrame() { while(true){} }');
  const report=await inspectProject(project);
  assert.equal(report.validation.drawingExecuted,false);assert.equal(report.scenes[1].startFrame,60);
  assert.match(report.sourceHash,/^[a-f0-9]{64}$/);
});
test('a targeted revision preserves input bytes and all untargeted source data',async t=>{
  const {root,project}=await fixture(t), before=await readProject(project), out=path.join(root,'revised');
  const patch={version:1,expectedSourceHash:before.hash,changes:[{scene:'after',params:{accent:'#b8a4dc',jump:27}}]};
  const report=await reviseProject(project,patch,out), after=await readProject(out);
  assert.equal((await readProject(project)).hash,before.hash);
  assert.equal(after.drawing,before.drawing);assert.deepEqual(after.data.scenes[0],before.data.scenes[0]);
  assert.equal(after.data.scenes[1].params.jump,27);assert.equal(report.changed.length,2);
  assert.deepEqual(after.data.score,before.data.score);assert.deepEqual(after.data.captions,before.data.captions);
  await assert.rejects(reviseProject(project,patch,out),{code:'EEXIST'});
});
test('stale, unsafe, unknown and type-changing revisions fail before creating output',async t=>{
  const {root,project}=await fixture(t), current=await readProject(project);
  const patch=changes=>({version:1,expectedSourceHash:current.hash,changes});
  for(const [i,p] of [
    {...patch([{scene:'after',params:{jump:10}}]),expectedSourceHash:'0'.repeat(64)},
    patch([{scene:'after',params:{missing:1}}]),
    patch([{scene:'after',params:{jump:'very high'}}]),
    patch([{scene:'../../other',params:{jump:10}}]),
    patch([{scene:'after',params:JSON.parse('{"__proto__":"bad"}')}]),
    {...patch([{scene:'after',params:{jump:10}}]),shell:'echo nope'}
  ].entries()){
    const out=path.join(root,'invalid-'+i);
    await assert.rejects(reviseProject(project,p,out));await assert.rejects(fs.stat(out),{code:'ENOENT'});
  }
});
test('render ranges are frame-aligned and scene-relative selection is exclusive',()=>{
  assert.deepEqual(renderRange(data(),{scene:'after'}),{start:2,end:4,firstFrame:60,frames:60,duration:2,scene:'after'});
  for(const value of [{from:.01},{from:3,to:2},{scene:'missing'},{scene:'after',from:2},{to:5}])assert.throws(()=>renderRange(data(),value));
});
test('process input preserves chunk order and waits for the complete stream',async()=>{
  async function* chunks(){for(let i=0;i<80;i++)yield Buffer.alloc(65536,i);}
  const expected=createHash('sha256');for await(const chunk of chunks())expected.update(chunk);
  const result=await run(process.execPath,['-e',"const h=require('crypto').createHash('sha256');process.stdin.on('data',x=>h.update(x));process.stdin.on('end',()=>console.log(h.digest('hex')))"],{input:chunks()});
  assert.equal(result.stdout.trim(),expected.digest('hex'));
});
test('cancelling a process waits for its exit and abort-before-start creates no child',async()=>{
  const controller=new AbortController(), start=Date.now();
  const pending=run(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:controller.signal});
  setTimeout(()=>controller.abort(new Error('cancel-test')),80);
  await assert.rejects(pending,/cancel-test/);assert.ok(Date.now()-start<3000);
  assert.throws(()=>run(process.execPath,['-e','throw 1'],{signal:controller.signal}),/cancel-test/);
});
test('preview restricts host, origin, method and paths, and retains the last valid snapshot',async t=>{
  const {project}=await fixture(t), preview=await startPreview(project);
  t.after(()=>preview.close());
  const url=new URL(preview.url), state=await (await fetch(new URL('state',url))).json();
  assert.equal(state.scenes.length,2);
  assert.equal((await fetch(new URL('state',url),{headers:{origin:'https://untrusted.example'}})).status,403);
  assert.equal((await fetch(new URL('state',url),{method:'POST'})).status,405);
  assert.equal((await fetch(new URL('/project.json',url))).status,404);
  assert.equal((await fetch(new URL('./%2e%2e/%2e%2e/project.json',url))).status,404);
  const response=await new Promise((resolve,reject)=>{const req=http.get({hostname:'127.0.0.1',port:url.port,path:url.pathname,headers:{host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject)});
  assert.equal(response,403);
  await fs.writeFile(path.join(project,'project.json'),'{invalid');
  await preview.refresh();
  const invalid=await (await fetch(new URL('state',url))).json();
  assert.equal(invalid.hash,state.hash);assert.ok(invalid.error);
  assert.equal((await fetch(new URL('film',url))).status,200);
  await fs.writeFile(path.join(project,'project.json'),JSON.stringify({...data(),title:'A revision'}));
  await preview.refresh();const after=await(await fetch(new URL('state',url))).json();
  assert.notEqual(after.hash,state.hash);assert.equal(after.error,null);assert.equal(after.title,'A revision');
});

test('scene-relative frame requests cannot escape into an earlier shot', async t => {
  const { root, project } = await fixture(t), out=path.join(root,'invalid.png');
  for (const at of [-1, -Infinity, NaN]) await assert.rejects(exportFrame(project,out,{scene:'after',at}), /nonnegative/);
  await assert.rejects(exportFrame(project,out,{scene:'after',at:2}), /outside/);
  await assert.rejects(fs.stat(out), {code:'ENOENT'});
});

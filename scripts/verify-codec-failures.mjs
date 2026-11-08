import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withBrowser} from '../lib/browser.mjs';
import {awaitBounded} from '../lib/graph/async.mjs';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';
import {createGraph} from '../lib/graph/schema.mjs';
import {createNodeOperations} from '../lib/graph/commands.mjs';
import {importWorkspaceAsset} from '../lib/graph/assets.mjs';
import {startGraphRenderHost} from '../lib/graph/render-host.mjs';
import {normalizeRenderRequest} from '../lib/graph/render-request.mjs';
import {finalizeGraphArtifact} from '../lib/graph/render-verify.mjs';
import {readProject} from '../lib/project.mjs';
import {makeSound} from '../lib/sound.mjs';
const repository=fileURLToPath(new URL('../',import.meta.url)),root=path.join(repository,'.validation','codec-failures-'+Date.now());
await fs.mkdir(path.join(root,'imports'),{recursive:true});
const workspace=await GraphWorkspace.open(root);
let state=await workspace.create(createGraph({id:'codec-fixture',title:'Original codec recovery fixture',width:640,height:360,durationFrames:30}));
const source=await readProject(path.join(repository,'examples/paper-garden'));
await fs.writeFile(path.join(root,'imports/original-score.wav'),makeSound(source.data));
state=await importWorkspaceAsset(workspace,{projectId:state.document.id,expectedFingerprint:state.fingerprint,source:'imports/original-score.wav'});
state=await workspace.transact(state.document.id,{expectedFingerprint:state.fingerprint,label:'Compose the codec test',operations:createNodeOperations(state.document,[
 {id:'title',type:'text',props:{text:'The project stays yours.',fontSize:32,fill:'#f0d8a8'},transform:{x:70,y:110}},
 {id:'score',type:'audio',props:{asset:state.asset.id,gain:.5}}
])});
const host=await startGraphRenderHost(workspace,state),report={startedAt:new Date().toISOString(),kind:'Real Chromium codecs with injected never-settling flush promises',checks:[]};
try{
 await withBrowser(async browser=>{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:960,height:640}});
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===host.origin||['blob:','data:'].includes(url.protocol)?route.continue():route.abort();});
  await context.addInitScript(()=>{
   window.loopliltCodecFault={type:null,entered:false,closed:0};
   // Exercise the Linux-style AAC gap on every platform, using the real Opus encoder.
   if(globalThis.AudioEncoder){const inspect=AudioEncoder.isConfigSupported.bind(AudioEncoder);AudioEncoder.isConfigSupported=config=>config.codec.startsWith('mp4a')?Promise.resolve({supported:false,config}):inspect(config);}
   for(const [type,Encoder] of [['video',globalThis.VideoEncoder],['audio',globalThis.AudioEncoder]]){
    if(!Encoder)continue;
    const flush=Encoder.prototype.flush,close=Encoder.prototype.close;
    Encoder.prototype.flush=function(){if(window.loopliltCodecFault.type===type){window.loopliltCodecFault.entered=true;return new Promise(()=>{});}return flush.call(this);};
    Encoder.prototype.close=function(){window.loopliltCodecFault.closed++;return close.call(this);};
   }
  });
  const page=await context.newPage(),request={kind:'video',format:'mp4',width:640,endFrame:3};let downloads=0;
  page.on('download',()=>downloads++);
  await page.goto(host.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.loopliltEngine?.status,{timeout:45000});
  assert.equal(await page.evaluate(()=>window.loopliltEngine.status),'ready');
  for(const type of ['video','audio']){
   await page.evaluate(type=>{window.loopliltCodecFault={type,entered:false,closed:0};},type);
   const operation=page.evaluate(request=>window.loopliltEngine.run(request).then(()=>({ok:true}),error=>({ok:false,message:error.message})),request);
   await page.waitForFunction(()=>window.loopliltCodecFault.entered,{timeout:45000});
   const started=performance.now();await page.evaluate(()=>window.loopliltEngine.cancel());
   const result=await awaitBounded(operation,{timeout:5000,label:'Cancelled stalled '+type+' encoder'});
   assert.equal(result.ok,false);assert.match(result.message,/cancelled/i);
   const fault=await page.evaluate(()=>window.loopliltCodecFault);assert.ok(fault.closed>0);assert.equal(downloads,0);
   const checked={name:type+'-stalled-flush-cancellation',elapsedMs:Math.round(performance.now()-started),encoderClosed:true,noDownload:true};report.checks.push(checked);console.log(JSON.stringify(checked));
  }
  await page.evaluate(()=>{window.loopliltCodecFault={type:'video',entered:false,closed:0};});
  const stalled=page.evaluate(request=>window.loopliltEngine.run(request).then(()=>({ok:true}),error=>({ok:false,message:error.message})),request);
  await page.waitForFunction(()=>window.loopliltCodecFault.entered,{timeout:45000});console.log('Checking the actual 60-second encoder-finalization deadline.');
  const started=performance.now(),result=await awaitBounded(stalled,{timeout:70000,label:'Native encoder finalization deadline'});
  assert.equal(result.ok,false);assert.match(result.message,/Video encoder finalization timed out/);
  assert.ok(await page.evaluate(()=>window.loopliltCodecFault.closed)>0);assert.equal(downloads,0);
  report.checks.push({name:'stalled-video-flush-deadline',elapsedMs:Math.round(performance.now()-started),encoderClosed:true,noDownload:true});
  await page.evaluate(()=>{window.loopliltCodecFault={type:null,entered:false,closed:0};});
  const download=page.waitForEvent('download',{timeout:60000}),metadata=await page.evaluate(request=>window.loopliltEngine.run(request),request);
  const file=path.join(root,'recovered-export.mp4');await(await download).saveAs(file);
  const verification=await finalizeGraphArtifact(file,metadata,normalizeRenderRequest(state.document,request));
  assert.equal(verification.verification.decoded,true);assert.equal(verification.verification.audio,'aac');assert.equal(verification.audioNormalization?.from,'opus');assert.equal(downloads,1);
  assert.equal((await workspace.read(state.document.id)).fingerprint,state.fingerprint);
  report.checks.push({name:'same-session-real-export-after-failure',frames:metadata.frames,hasAudio:metadata.hasAudio,fullDecode:true,projectUnchanged:true});
  await context.close();
 },{timeout:240000,graphics:'software'});
 report.passed=true;
}catch(error){report.error=error.message;throw error;}
finally{await host.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(repository,'.validation/latest-codec-failures.json'),JSON.stringify({root,report:path.join(root,'report.json')},null,2));console.log(JSON.stringify({root,passed:report.passed??false,checks:report.checks}));}

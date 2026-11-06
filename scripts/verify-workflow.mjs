import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readProject } from '../lib/project.mjs';
import { makeHtml } from '../lib/build.mjs';
import { makeSound } from '../lib/sound.mjs';
import { withBrowser, filmPage, framePng } from '../lib/browser.mjs';
import { inspectProject, reviseProject, exportFrame } from '../lib/inspect.mjs';
import { startPreview } from '../lib/preview.mjs';
import { renderProject, ffmpeg } from '../lib/render.mjs';
import { run } from '../lib/process.mjs';
import { serveSite } from './site-server.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
await fs.mkdir(path.join(root,'.validation'),{recursive:true});
const folder=await fs.mkdtemp(path.join(root,'.validation/workflow-'));
const dir=path.join(folder,'project with spaces');await fs.mkdir(dir);
const fixture={version:1,title:'The three moments',duration:6,fps:30,audio:{mode:'studio',room:0,delay:0},
 scenes:[{id:'setup',label:'The setup',start:0,end:2,description:'A light starts moving.',params:{accent:'#a94c44'}},
 {id:'turn',label:'The turn',start:2,end:4,description:'The movement finds a rhythm.',params:{accent:'#417f76'}},
 {id:'arrival',label:'The arrival',start:4,end:6,description:'A final quiet landing.',params:{accent:'#7672a0'}}],
 cues:[{id:'turning',at:2}],captions:[],
 score:[{at:.2,length:.5,pitch:60,voice:'bell',gain:.2},{at:4.6,length:1,pitch:67,voice:'piano',gain:.3}],
 music:{bpm:120,patterns:[{id:'pulse',beats:2,notes:[{beat:0,length:.25,pitch:60},{beat:1,length:.25,pitch:67}]}],
 tracks:[{id:'wood',voice:'marimba',gain:.12,pan:-.3,clips:[{pattern:'pulse',at:{cue:'turning'},repeat:2}]}]}};
const drawing="function drawFrame({ctx,w,h,t,shot,motion}) { ctx.fillStyle=shot.params.accent;ctx.fillRect(0,0,w,h);ctx.fillStyle='#f5f2e8';ctx.beginPath();ctx.arc(w*motion.tween(shot.time,0,1.9,.2,.8),h*.5,Math.min(w,h)*.08,0,Math.PI*2);ctx.fill(); }";
await fs.writeFile(path.join(dir,'project.json'),JSON.stringify(fixture));
await fs.writeFile(path.join(dir,'draw.js'),drawing);
const original=await readProject(dir), report={functional:[],media:[],limitations:['Chromium automation is not a physical-device test','No subjective artistic or listening score is asserted']};
const revised=path.join(folder,'revision');
await reviseProject(dir,{version:1,expectedSourceHash:original.hash,changes:[{scene:'arrival',params:{accent:'#b8a4dc'}}]},revised);
const next=await readProject(revised);
const preview=await startPreview(dir);
try{
 await withBrowser(async browser=>{
  const page=await filmPage(browser,await makeHtml(original),1280,900);
  const changed=await filmPage(browser,await makeHtml(next),1280,900);
  for(const t of [0,.5,1.9,2,2.5,3.9])assert.ok((await framePng(page,t)).equals(await framePng(changed,t)),'Unaffected frame '+t);
  assert.ok(!(await framePng(page,4.8)).equals(await framePng(changed,4.8)));
  await page.locator('[data-scene="arrival"]').click();
  assert.equal(Number(await page.locator('#timeline').inputValue()),4);
  await page.evaluate(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type==='audio/wav')window.testAudio=blob;return create(blob)}});
  await page.locator('#sound').click();await page.evaluate(()=>window.Looplilt.prepareSound());
  const bytes=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await window.testAudio.arrayBuffer()))));
  assert.ok(bytes.equals(makeSound(original.data)),'Worker and Node PCM match exactly');
  await page.waitForFunction(()=>document.querySelector('audio').readyState>=2);
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('audio').currentTime>4.1);
  await page.locator('#play').click();
  report.functional.push('scene navigation','unchanged neighboring frames','visible parameter revision','exact browser/Node PCM','real audio playback');
  await page.close();await changed.close();
  const local=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];local.on('pageerror',e=>errors.push(e.message));
  await local.goto(preview.url);await local.waitForFunction(()=>document.querySelector('#scenes').children.length===3);
  await local.locator('#scenes button').nth(1).click();
  const film=local.frameLocator('#film');
  await film.locator('#timeline').evaluate(input=>{input.value=2.5;input.dispatchEvent(new Event('input',{bubbles:true}))});
  await local.waitForTimeout(100);
  const update={...fixture,title:'A changed title'};
  await fs.writeFile(path.join(dir,'project.json'),JSON.stringify(update));await preview.refresh();
  await local.waitForFunction(()=>document.querySelector('#title').textContent==='A changed title');
  await film.locator('h1').filter({hasText:'A changed title'}).waitFor();
  assert.equal(Number(await film.locator('#timeline').inputValue()),2.5,'Reload preserves playhead');
  assert.equal(await film.locator('#play').textContent(),'Play','Reload pauses');
  await fs.writeFile(path.join(dir,'project.json'),'{unfinished');
  await preview.refresh();await local.waitForFunction(()=>document.querySelector('#status').className==='error');
  assert.equal(await film.locator('h1').textContent(),'A changed title','Invalid edit preserves last film');
  await fs.writeFile(path.join(dir,'project.json'),JSON.stringify(fixture));await preview.refresh();
  await local.waitForFunction(()=>document.querySelector('#title').textContent==='The three moments');
  for(const width of [1440,390,320]){
   await local.setViewportSize({width,height:1000});
   assert.ok(await local.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await local.screenshot({path:path.join(folder,'preview-'+width+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);await local.close();
  report.functional.push('live reload at the same moment','invalid-edit recovery','preview 1440/390/320px');
 });
}finally{await preview.close()}
const exported=await exportFrame(dir,path.join(folder,'arrival.png'),{scene:'arrival',at:.5});
assert.equal(exported.time,4.5);assert.equal(exported.frame,135);assert.equal(exported.scene,'arrival');
report.functional.push('exact scene-relative frame export');
const infinite={...original,drawing:'function drawFrame(){while(true){}}'};
const runawayStart=Date.now();
await assert.rejects(withBrowser(async browser=>filmPage(browser,await makeHtml(infinite,'landscape',{sound:false}),1280,720),{timeout:500}),/exceeded/);
assert.ok(Date.now()-runawayStart<12000,'An infinite drawing is bounded by the owned browser lifecycle');
report.functional.push('infinite drawing timeout and browser cleanup');
if(process.env.LOOPLILT_TEST_MEDIA==='1'){
 const file=path.join(folder,'film.mp4'),clip=path.join(folder,'arrival.mp4');
 report.media.push(await renderProject(dir,file,{workers:2}));
 report.media.push(await renderProject(dir,clip,{scene:'arrival',workers:2}));
 assert.equal(report.media[0].frames,180);assert.equal(report.media[1].frames,60);
 assert.equal(report.media[1].duration,2);assert.equal(report.media[1].range.start,4);
 await assert.rejects(renderProject(dir,file),/already exists/);
 const controller=new AbortController(),cancelled=path.join(folder,'cancelled.mp4');
 await assert.rejects(renderProject(dir,cancelled,{signal:controller.signal,onProgress:()=>controller.abort(new Error('test cancellation'))}),/test cancellation/);
 await assert.rejects(fs.stat(cancelled),{code:'ENOENT'});
 await fs.writeFile(path.join(folder,'index.html'),'<!doctype html><video id="video" muted playsinline></video><canvas width="1280" height="720"></canvas>');
 const server=await serveSite(folder);
 try{
  await withBrowser(async browser=>{
   const page=await browser.newPage();await page.goto(server.origin);
   await page.locator('video').evaluate(video=>{video.src='film.mp4';video.load()});
   await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
   for(const [time,expected] of [[.2,[169,76,68]],[2.2,[65,127,118]],[4.2,[118,114,160]]]){
    const pixel=await page.evaluate(async time=>{
     const v=document.querySelector('video');v.currentTime=time;await new Promise(resolve=>v.addEventListener('seeked',resolve,{once:true}));
     const ctx=document.querySelector('canvas').getContext('2d');ctx.drawImage(v,0,0);return Array.from(ctx.getImageData(10,10,1,1).data);
    },time);
    for(let c=0;c<3;c++)assert.ok(Math.abs(pixel[c]-expected[c])<8,'Encoded scene order/color at '+time);
   }
   await page.close();
  });
 }finally{await server.close()}
 const wav=path.join(folder,'range-audio.wav');
 await run(ffmpeg(),['-v','error','-i',clip,'-vn','-c:a','pcm_s16le','-ar','48000',wav]);
 const bytes=await fs.readFile(wav),dataAt=bytes.indexOf(Buffer.from('data'))+8;
 assert.ok(dataAt>8);
 const energy=(start,end)=>{let sum=0,count=0;for(let i=Math.round(start*48000)*4+dataAt;i<Math.min(bytes.length,Math.round(end*48000)*4+dataAt);i+=2){sum+=bytes.readInt16LE(i)**2;count++}return Math.sqrt(sum/count)};
 assert.ok(energy(.75,1.2)>energy(.05,.35)*10+100,'Scene audio starts at its original relative cue, not at film time zero');
 report.functional.push('full/range MP4 decode','encoded scene order','aligned range audio','protected outputs','mid-render cancellation');
}
await fs.writeFile(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({folder,checks:report.functional,media:report.media.map(({width,height,frames,duration,pipeline})=>({width,height,frames,duration,pipeline}))},null,2));

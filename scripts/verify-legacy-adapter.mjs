import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {readProject} from '../lib/project.mjs';
import {makeSound} from '../lib/sound.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),allowed=new Map(),fixtures=[];
const modules=['lib/graph/isolated-legacy.mjs','lib/graph/async.mjs','lib/graph/behaviors.mjs','lib/graph/motion-path.mjs','lib/graph/legacy-runtime.generated.mjs','lib/graph/legacy-source.mjs','lib/project-schema.mjs','lib/graph/schema.mjs','lib/graph/time.mjs','lib/graph/registry.mjs','lib/graph/animation.mjs','lib/music.mjs','lib/studio-sound.mjs','lib/pcm.mjs','lib/motion.mjs','test/fixtures/legacy-frame-v031.mjs'];
for(const file of modules)allowed.set('/'+file,await fs.readFile(path.join(root,file)));
for(const name of ['paper-garden','neon-relay']){
 const project=await readProject(path.join(root,'examples',name)),bytes=await fs.readFile(path.join(root,'examples',name,'project.json')),drawing=await fs.readFile(path.join(root,'examples',name,'draw.js'));
 allowed.set('/fixtures/'+name+'.mjs',project.drawing+'\nexport {drawFrame};');
 fixtures.push({name,project:project.data,projectBytes:Array.from(bytes),script:project.drawing,scriptBytes:Array.from(drawing),audioHash:createHash('sha256').update(makeSound(project.data)).digest('hex')});
}
let origin,probes=0,browser;
const server=http.createServer((req,res)=>{
 if(req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}if(req.url==='/blocked-probe')probes++;
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; frame-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'");
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Looplilt legacy parity</title>');return;}
 const source=allowed.get(req.url);if(!source){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/javascript');res.end(source);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const timer=setTimeout(()=>{console.error('Legacy parity verification timed out');browser?.close().finally(()=>process.exit(124));},180000);
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,timeout:45000,...(process.env.LOOPLILT_BROWSER?{executablePath:process.env.LOOPLILT_BROWSER}:{}),...(process.env.LOOPLILT_SOFTWARE_GRAPHICS==='1'?{args:['--disable-gpu']}:{} )});
 const page=await browser.newPage();await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());await page.goto(origin);
 console.log('Checking original films, isolated source and exact audio');
 const results=await page.evaluate(async({fixtures,origin})=>{
  const {LegacyCanvasSource,synthesizeLegacyAudio}=await import('/lib/graph/isolated-legacy.mjs'),{renderReference}=await import('/test/fixtures/legacy-frame-v031.mjs'),helpers=await import('/lib/motion.mjs');
  const checks=[],encode=text=>new TextEncoder().encode(text),hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  function equal(a,b,label){if(a!==b)throw new Error(label+': '+a+' !== '+b);}
  const canvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});
  for(const fixture of fixtures){
   const bytes=new Uint8Array(fixture.projectBytes),script=new Uint8Array(fixture.scriptBytes),drawing=(await import('/fixtures/'+fixture.name+'.mjs')).drawFrame;
   for(const [format,width,height] of [['landscape',1280,720],['portrait',720,1280],['square',960,960]]){
    const source=await LegacyCanvasSource.open(bytes,script,{format}),reference=canvas(width,height),actual=canvas(width,height);document.body.append(reference,actual);
    try{for(const time of [0,fixture.project.duration*.23,fixture.project.duration*.74,(Math.round(fixture.project.duration*fixture.project.fps)-1)/fixture.project.fps,0]){
      renderReference(reference,fixture.project,drawing,time,helpers);const frame=await source.frame(time);try{actual.getContext('2d').drawImage(frame.image,0,0);}finally{frame.release();}
      const a=reference.getContext('2d').getImageData(0,0,width,height).data,b=actual.getContext('2d').getImageData(0,0,width,height).data;
      let differing=0,maxDifference=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i])differing++;maxDifference=Math.max(maxDifference,Math.abs(a[i]-b[i]));}
      equal(differing,0,fixture.name+' '+format+' at '+time+' (max '+maxDifference+')');
     }}finally{await source.dispose();reference.remove();actual.remove();}
    checks.push(fixture.name+' '+format+': five exact RGBA matches including reverse seek');
   }
   const sound=await synthesizeLegacyAudio(bytes);equal(await hash(sound),fixture.audioHash,fixture.name+' PCM SHA256');checks.push(fixture.name+': byte-identical original PCM');
  }
  const minimal=encode(JSON.stringify({version:1,title:'Worker scope test',duration:1,fps:30,captions:[],score:[]}));
  const hostile=encode("let blocked=false;fetch("+JSON.stringify(origin+'/blocked-probe')+").catch(()=>{blocked=true;});function drawFrame({ctx,w,h}){if(typeof document!=='undefined'||typeof window!=='undefined')throw new Error('Application realm leaked');ctx.fillStyle=blocked?'#00ff00':'#ff0000';ctx.fillRect(0,0,w,h);}");
  const safe=await LegacyCanvasSource.open(minimal,hostile);await new Promise(resolve=>setTimeout(resolve,100));
  try{const frame=await safe.frame(0),c=canvas(1,1);c.getContext('2d').drawImage(frame.image,0,0,1,1);frame.release();equal(String(c.getContext('2d').getImageData(0,0,1,1).data),'0,255,0,255','network attempt blocked');}finally{await safe.dispose();}
  checks.push('Opaque worker cannot access application DOM or make a network request');
  const loop=await LegacyCanvasSource.open(minimal,encode('function drawFrame(){while(true){}}')),controller=new AbortController(),started=performance.now();
  setTimeout(()=>controller.abort(new Error('test cancellation')),75);
  try{await loop.frame(0,{signal:controller.signal});throw new Error('Infinite source did not cancel');}catch(error){if(error.message!=='test cancellation')throw error;}finally{await loop.dispose();}
  if(performance.now()-started>2000)throw new Error('Source cancellation was not responsive');
  const already=new AbortController();already.abort(new Error('already cancelled'));
  try{await LegacyCanvasSource.open(minimal,encode('function drawFrame(){}'),{signal:already.signal});throw new Error('Already-aborted open succeeded');}catch(error){equal(error.message,'already cancelled','early cancellation');}
  const opening=new AbortController(),pending=LegacyCanvasSource.open(minimal,encode('function drawFrame(){}'),{signal:opening.signal});opening.abort(new Error('cancel during load'));
  try{await pending;throw new Error('Loading source did not cancel');}catch(error){equal(error.message,'cancel during load','loading cancellation');}
  equal(document.querySelectorAll('iframe').length,0,'Sandbox cleanup');
  checks.push('Infinite drawing cancels without blocking the application; all sandbox frames released');
  return {checks,framesCompared:30,sourcePairs:fixtures.length};
 },{fixtures,origin});
 assert.equal(probes,0,'No source network probe reached the host');
 await fs.mkdir(path.join(root,'.validation'),{recursive:true});const report={...results,networkRequestsEscaped:probes,browser:browser.version(),verifiedAt:new Date().toISOString()};await fs.writeFile(path.join(root,'.validation/legacy-adapter-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{clearTimeout(timer);await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

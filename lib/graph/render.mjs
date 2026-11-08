import fs from 'node:fs/promises';
import {awaitBounded} from './async.mjs';
import {withBrowser} from '../browser.mjs';
import {run} from '../process.mjs';
import {ffmpeg,ffprobe} from '../media-tools.mjs';
import {startGraphRenderHost} from './render-host.mjs';
import {normalizeRenderRequest} from './render-request.mjs';
import {verifyGraphArtifact} from './render-verify.mjs';
import {redactStudioError} from '../studio/errors.mjs';

/** Render a retained graph through Studio's actual compositor and export code.
 * The caller owns a new scoped staging path; this function never publishes it. */
export async function renderGraphSnapshot(workspace,state,request,staging,{signal,onProgress=()=>{},staticDirectory,timeout=900000,graphics=process.env.LOOPLILT_DISABLE_GPU==='1'?'software':'auto'}={}){
 signal?.throwIfAborted();
 if(!Number.isSafeInteger(timeout)||timeout<1000||timeout>3600000)throw new Error('Render timeout must be1000–3600000ms');
 const normalized=normalizeRenderRequest(state.document,request),deadline=AbortSignal.timeout(timeout),cancellation=signal?AbortSignal.any([signal,deadline]):deadline;
 try{await fs.lstat(staging);throw new Error('Render staging file already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(normalized.kind==='video'){
  await run(ffmpeg(),['-version'],{signal:cancellation,timeout:15000});
  await run(ffprobe(),['-version'],{signal:cancellation,timeout:15000});
 }
 const host=await startGraphRenderHost(workspace,state,{staticDirectory,signal:cancellation}),started=performance.now();
 let requested=0,blocked=0,lastProgress={phase:'preparing',ratio:0,completedFrames:0,totalFrames:normalized.kind==='video'?normalized.outputFrames:normalized.kind==='frame'?1:normalized.frames.length};
 const progress=value=>{lastProgress=value;onProgress(value);},attempts=[];
 let graphicsUsed;
 try{
  const attempt=async(graphics,lifecycle)=>{let activePage;return withBrowser(async browser=>{
   const context=await browser.newContext({viewport:{width:960,height:640},deviceScaleFactor:1,acceptDownloads:true});
   // Do not use Playwright's serviceWorkers:block injection: it accesses
   // navigator.serviceWorker inside opaque Canvas frames. This fresh context,
   // strict CSP and request allowlist provide the network boundary instead.
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());requested++;
    if(url.origin===host.origin||['blob:','data:'].includes(url.protocol))return route.continue();
    blocked++;return route.abort('blockedbyclient');
   });
   const page=await context.newPage();activePage=page;page.setDefaultTimeout(30000);
   page.on('dialog',dialog=>void dialog.dismiss().catch(()=>{}));page.on('popup',popup=>void popup.close().catch(()=>{}));
   const errors=[],diagnostics=[];page.on('pageerror',error=>{if(errors.length<8)errors.push(error.message.slice(0,1000));});
   page.on('console',message=>{if(['error','warning'].includes(message.type())&&diagnostics.length<8)diagnostics.push(message.text().slice(0,500));});
   page.on('requestfailed',request=>{if(diagnostics.length<8)diagnostics.push(new URL(request.url()).pathname+': '+request.failure()?.errorText);});
   let lastProgress=0;
   await page.exposeBinding('loopliltProgress',(_source,value)=>{
    if(!value||!Number.isFinite(value.ratio)||value.ratio<0||value.ratio>1||!Number.isSafeInteger(value.completedFrames)||!Number.isSafeInteger(value.totalFrames))return;
    const now=Date.now();if(now-lastProgress<100&&value.ratio<1)return;lastProgress=now;
    progress({phase:String(value.phase).slice(0,40),ratio:value.ratio,completedFrames:value.completedFrames,totalFrames:value.totalFrames});
   });
   try{
    await page.goto(host.url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>window.loopliltEngine?.status,{timeout:45000});
    const startup=await page.evaluate(()=>({status:window.loopliltEngine.status,error:window.loopliltEngine.error}));
    if(startup.status!=='ready')throw new Error(startup.error||'Studio renderer did not start');
    const downloadPromise=page.waitForEvent('download',{timeout}),renderPromise=page.evaluate(request=>window.loopliltEngine.run(request),request);
    // Observe both immediately, including a rejected download after a render
    // error, so cancellation cannot leave an unhandled promise.
    const [download,result]=await Promise.all([downloadPromise,renderPromise]);
    cancellation.throwIfAborted();
    const expectedName=normalized.kind==='video'?'result.'+normalized.format:normalized.kind+'.png';
    if(result.filename!==expectedName||download.suggestedFilename()!==expectedName||result.fingerprint!==state.fingerprint||!Number.isSafeInteger(result.bytes)||result.bytes<1||result.bytes>256*1024*1024)throw new Error('Renderer returned inconsistent artifact metadata');
    const width=normalized.sheetWidth??normalized.width,height=normalized.sheetHeight??normalized.height,frames=normalized.kind==='video'?normalized.outputFrames:normalized.kind==='frame'?1:normalized.frames.length;
    if(result.width!==width||result.height!==height||result.frames!==frames||typeof result.hasAudio!=='boolean')throw new Error('Renderer output does not match the requested snapshot');
    if(errors.length)throw new Error('Studio renderer error: '+errors.join('; '));
    await download.saveAs(staging);
    if(await download.failure())throw new Error('Browser download failed');
    return result;
   }catch(error){if(diagnostics.length)error.message+='; Browser: '+diagnostics.join(' | ');throw redactStudioError(error);}finally{await awaitBounded(context.close(),{timeout:3000,label:'Render context cleanup'}).catch(()=>{});}
  },{signal:cancellation,timeout,graphics,onCancel:()=>activePage?.evaluate(()=>window.loopliltEngine?.cancel()),onLifecycle:phase=>{lifecycle.push({phase,milliseconds:Math.round(performance.now()-started)});progress({...lastProgress,phase:'browser '+phase});}});};
  let metadata;const initial=graphics;
  for(const graphics of initial==='auto'?['auto','software']:['software']){
   const began=performance.now(),lifecycle=[];graphicsUsed=graphics;
   try{metadata=await attempt(graphics,lifecycle);attempts.push({graphics,elapsedMs:Math.round(performance.now()-began),lifecycle});break;}
   catch(error){
    attempts.push({graphics,elapsedMs:Math.round(performance.now()-began),lifecycle,error:String(error.message).slice(0,1000)});
    const startupFailure=/Source sandbox (?:could not load|load timed out)|page\.(?:goto|waitForFunction): Timeout|browserType\.(?:launchServer|connect)|Target page, context or browser has been closed/.test(error.message);
    if(graphics!=='auto'||cancellation.aborted||!startupFailure)throw error;
    progress({...lastProgress,phase:'retrying with software graphics'});
   }
  }
  progress({phase:'verifying',ratio:1,completedFrames:metadata.frames,totalFrames:metadata.frames});
  const checked=await verifyGraphArtifact(staging,metadata,normalized,{signal:cancellation});
  return {...metadata,...checked,metrics:{elapsedMs:Math.round(performance.now()-started),networkRequests:requested,blockedRequests:blocked,graphics:graphicsUsed,attempts},engine:'studio-canvas-webcodecs'};
 }finally{await host.close();}
}

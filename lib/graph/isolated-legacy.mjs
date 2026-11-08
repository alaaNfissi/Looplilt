import {awaitBounded} from './async.mjs';
import { legacyFrameRuntime, legacyAudioRuntime } from './legacy-runtime.generated.mjs';
import { inspectLegacySource, legacyDimensions } from './legacy-source.mjs';

// The trusted bridge owns a terminable worker. User drawing code never runs in
// the application realm or iframe thread. The opaque sandbox has no network,
// storage, parent DOM, credentials, filesystem, or companion token access.
const bridge = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; media-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><script>
addEventListener('message',function connect(event){
 if(event.source!==parent||event.data?.type!=='looplilt-worker'||event.ports.length!==1)return;
 removeEventListener('message',connect);
 const port=event.ports[0];let worker,url;
 const stop=()=>{worker?.terminate();worker=null;if(url)URL.revokeObjectURL(url);url=null;};
 port.onmessage=({data})=>{
  if(data.type==='stop'){stop();port.postMessage({stopped:true});port.close();return;}
  try{
   if(data.type==='start'){
    if(worker)throw new Error('Worker already initialized');
    url=URL.createObjectURL(new Blob([data.source],{type:'text/javascript'}));
    worker=new Worker(url);
    worker.onmessage=({data:result})=>{
     const transfer=[];if(result.image instanceof ImageBitmap)transfer.push(result.image);
     if(result.bytes instanceof ArrayBuffer)transfer.push(result.bytes);
     port.postMessage(result,transfer);
    };
    worker.onerror=event=>{event.preventDefault();port.postMessage({fatal:String(event.message).slice(0,1000)});stop();};
    worker.postMessage(data.initialize);
   }else if(worker)worker.postMessage(data);else throw new Error('Worker is not running');
  }catch(error){port.postMessage({fatal:String(error.message).slice(0,1000)});stop();}
 };
 port.start();port.postMessage({connected:true});
});
<\/script>`;

/** One request at a time, bounded lifetime, explicit release of late bitmaps. */
class IsolatedWorker {
 #frame;#port;#pending=null;#counter=0;#closed=false;#load;#cancelLoad;#teardown;#finishStop;
 constructor(){
  if(typeof document==='undefined'||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')throw new Error('This browser needs OffscreenCanvas and workers to open editable Canvas projects');
  const frame=document.createElement('iframe');frame.hidden=true;frame.title='Isolated Looplilt source';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('aria-hidden','true');
  this.#frame=frame;
  this.#load=new Promise((resolve,reject)=>{
   let settled=false;const finish=(callback,value)=>{if(settled)return;settled=true;frame.onload=frame.onerror=null;this.#cancelLoad=null;callback(value);};
   this.#cancelLoad=()=>finish(reject,new Error('Source worker closed'));frame.onload=()=>finish(resolve);frame.onerror=()=>finish(reject,new Error('Source sandbox could not load'));
  });
  // A caller may dispose before start has attached its awaited rejection handler.
  this.#load.catch(()=>{});
  frame.srcdoc=bridge;document.body.append(frame);
 }
 async start(source,initialize,signal){
  signal?.throwIfAborted();await awaitBounded(this.#load,{signal,timeout:10000,label:'Source sandbox load',onCancel:()=>this.dispose()});signal?.throwIfAborted();
  if(this.#closed)throw new Error('Source worker is closed');
  const channel=new MessageChannel();this.#port=channel.port1;
  this.#port.onmessage=({data})=>{
   if(data.stopped){this.#finishStop?.();return;}
   if(data.connected)return;
   const pending=this.#pending;
   if(!pending||(!data.fatal&&data.id!==pending.id)){data.image?.close?.();return;}
   if(data.fatal||data.error){pending.reject(new Error(data.fatal??data.error));this.dispose();}
   else pending.resolve(data);
  };
  this.#port.start();this.#frame.contentWindow.postMessage({type:'looplilt-worker'},'*',[channel.port2]);
  return this.request({type:'start',source,initialize:{...initialize,type:'initialize'}},signal,20000);
 }
 request(message,signal,timeout=10000){
  signal?.throwIfAborted();if(this.#closed)throw new Error('Source worker is closed');if(this.#pending)throw new Error('A source request is already running');
  return new Promise((resolve,reject)=>{
   const id=++this.#counter;let settled=false;
   const finish=(callback,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);this.#pending=null;callback(value);};
   const abort=()=>{finish(reject,signal?.reason??new Error('Source rendering timed out'));this.dispose();};
   const timer=setTimeout(()=>{finish(reject,new Error('Source rendering timed out'));this.dispose();},timeout);
   this.#pending={id,resolve:value=>finish(resolve,value),reject:error=>finish(reject,error)};
   signal?.addEventListener('abort',abort,{once:true});
   const data={...message,id};if(data.initialize)data.initialize={...data.initialize,id};
   try{this.#port.postMessage(data);}catch(error){finish(reject,error);this.dispose();}
   if(signal?.aborted)abort();
  });
 }
 dispose(){
  if(this.#closed)return this.#teardown;this.#closed=true;this.#pending?.reject(new Error('Source worker closed'));this.#cancelLoad?.();
  this.#teardown=new Promise(resolve=>{
   let finished=false,timer;
   const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);this.#port?.close();this.#frame?.remove();this.#finishStop=null;resolve();};
   if(!this.#port){finish();return;}
   this.#finishStop=finish;timer=setTimeout(finish,250);
   try{this.#port.postMessage({type:'stop'});}catch{finish();}
  });
  return this.#teardown;
 }
}
export class LegacyCanvasSource {
 #worker;#dimensions;#closed=false;
 static async open(projectBytes,scriptBytes,{format='landscape',signal}={}){
  signal?.throwIfAborted();
  const project=inspectLegacySource('legacy-project',projectBytes).project,script=inspectLegacySource('legacy-script',scriptBytes).text;
  const source=new LegacyCanvasSource();source.#dimensions=legacyDimensions(format);source.#worker=new IsolatedWorker();
  try{await source.#worker.start(legacyFrameRuntime+'\nconst userDrawing=(()=>{\n'+script+'\n;return drawFrame;})();',{project,width:source.#dimensions[0],height:source.#dimensions[1]},signal);return source;}
  catch(error){await source.dispose();throw error;}
 }
 async frame(time,{signal}={}){
  if(this.#closed)throw new Error('Canvas source is closed');if(!Number.isFinite(time)||time<0)throw new Error('Source time must be finite and nonnegative');
  const result=await this.#worker.request({type:'frame',time},signal);
  const image=result.image;
  if(!(image instanceof ImageBitmap)||image.width!==this.#dimensions[0]||image.height!==this.#dimensions[1]){image?.close?.();this.dispose();throw new Error('Source returned an invalid frame');}
  return {image,width:image.width,height:image.height,release:()=>image.close()};
 }
 dispose(){this.#closed=true;return this.#worker?.dispose()??Promise.resolve();}
}
export async function synthesizeLegacyAudio(projectBytes,{signal}={}){
 signal?.throwIfAborted();
 const project=inspectLegacySource('legacy-project',projectBytes).project;
 // Shared original synthesizer allocates several float planes plus its WAV.
 if(project.duration*48000*32>256*1024*1024)throw new Error('This procedural soundtrack exceeds the browser synthesis budget; use the local renderer or a shorter source');
 const worker=new IsolatedWorker();
 try{await worker.start(legacyAudioRuntime,{project},signal);const result=await worker.request({type:'sound'},signal,60000);
  if(!(result.bytes instanceof ArrayBuffer)||result.bytes.byteLength>project.duration*48000*4+128)throw new Error('Procedural audio returned invalid PCM');
  return result.bytes;
 }finally{await worker.dispose();}
}

"use client";
import {useEffect,useState} from "react";
import {CanvasGraphRenderer} from "@graph/canvas-renderer.mjs";
import {normalizeRenderRequest,type RenderRequest} from "@graph/render-request.mjs";
import {validateGraph} from "@graph/schema.mjs";
import {graphFingerprint} from "@graph/transactions.mjs";
import {awaitBounded} from "@graph/async.mjs";
import type {GraphAsset,GraphAssetReader,GraphDocument} from "@graph/types.mjs";
import {GraphMediaProvider} from "./GraphMediaProvider";
import {exportGraph} from "./graphExport";
type Progress={phase:string;ratio:number;completedFrames:number;totalFrames:number};
type Artifact={filename:string;mime:string;bytes:number;width:number;height:number;frames:number;durationSeconds:number;hasAudio:boolean;fingerprint:string};
type Engine={status:'ready'|'error';error?:string;run:(request:RenderRequest)=>Promise<Artifact>;cancel:()=>void};
declare global {interface Window{loopliltEngine?:Engine;loopliltProgress?:(progress:Progress)=>Promise<void>}}
async function body(response:Response,maximum:number):Promise<Uint8Array<ArrayBuffer>>{
 const reader=response.body?.getReader();if(!reader)throw new Error('Render host returned no body');let size=0;const parts:Uint8Array[]=[];
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>maximum)throw new Error('Render response exceeded its byte budget');parts.push(next.value);}}finally{await reader.cancel();reader.releaseLock();}
 const bytes=new Uint8Array(size);let position=0;for(const part of parts){bytes.set(part,position);position+=part.byteLength;}return bytes;
}
class SnapshotAssets implements GraphAssetReader{
 private active=0;private waiting:(()=>void)[]=[];private pending=new Map<string,Promise<Blob>>();private cache=new Map<string,Blob>();private cachedBytes=0;
 constructor(private graph:GraphDocument,private token:string,private signal:AbortSignal){}
 async getAsset(asset:GraphAsset,projectId?:string){
  if(projectId&&projectId!==this.graph.id||this.graph.assets[asset.id]?.sha256!==asset.sha256)throw new Error('Asset is outside this render snapshot');
  this.signal.throwIfAborted();const cached=this.cache.get(asset.sha256);if(cached)return cached;
  let loading=this.pending.get(asset.sha256);
  if(!loading){loading=this.read(asset).finally(()=>this.pending.delete(asset.sha256));this.pending.set(asset.sha256,loading);}
  return loading;
 }
 private async read(asset:GraphAsset){
  if(this.active>=2)await new Promise<void>(resolve=>this.waiting.push(resolve));else this.active++;
  try{
   this.signal.throwIfAborted();
   const response=await fetch('/api/render/assets/'+encodeURIComponent(asset.id),{headers:{Authorization:'Bearer '+this.token},credentials:'omit',redirect:'error',signal:this.signal,cache:'no-store'});
   if(!response.ok)throw new Error('Snapshot media is missing or changed: '+asset.name);
   const bytes=await body(response,asset.bytes),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
   if(bytes.byteLength!==asset.bytes||hash!==asset.sha256)throw new Error('Snapshot media integrity check failed: '+asset.name);
   const blob=new Blob([bytes],{type:asset.mime});
   if(blob.size<=128*1024*1024){while(this.cachedBytes+blob.size>128*1024*1024&&this.cache.size){const [key,old]=this.cache.entries().next().value!;this.cache.delete(key);this.cachedBytes-=old.size;}this.cache.set(asset.sha256,blob);this.cachedBytes+=blob.size;}
   return blob;
  }finally{const next=this.waiting.shift();if(next)next();else this.active--;}
 }
 close(){this.cache.clear();this.cachedBytes=0;}
}
function download(blob:Blob,filename:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
/** Used by the local CLI/MCP host. It invokes the same compositor, decoders,
 * audio mixer and encoders as Studio; no separately implemented render engine. */
export function RenderBridge(){
 const [message,setMessage]=useState('Opening the selected local render snapshot…');
 useEffect(()=>{
  const lifetime=new AbortController();let active:AbortController|null=null;
  const progress=(value:Progress)=>{setMessage(value.phase+' · '+Math.round(value.ratio*100)+'%');void window.loopliltProgress?.(value).catch(()=>{});};
  void(async()=>{
   if(location.hostname!=='127.0.0.1'||location.protocol!=='http:')throw new Error('Open this render workspace through the local Looplilt CLI or MCP service.');
   const token=new URLSearchParams(location.hash.slice(1)).get('render');if(!token||!/^[a-f0-9]{64}$/.test(token))throw new Error('This render session needs its private local link.');
   history.replaceState(null,'',location.pathname);
   const response=await fetch('/api/render/project',{headers:{Authorization:'Bearer '+token},credentials:'omit',redirect:'error',signal:lifetime.signal,cache:'no-store'});
   if(!response.ok)throw new Error('The render snapshot is unavailable');
   const state=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await body(response,12*1024*1024)));validateGraph(state.document);
   const graph=state.document as GraphDocument;if(await graphFingerprint(graph)!==state.fingerprint)throw new Error('Render snapshot integrity check failed');
   const fingerprint=state.fingerprint as string;
   const run=async(request:RenderRequest):Promise<Artifact>=>{
    if(active)throw new Error('This render session already has a job');lifetime.signal.throwIfAborted();
    const normalized=normalizeRenderRequest(graph,request),controller=new AbortController();active=controller;
    const signal=AbortSignal.any([controller.signal,lifetime.signal]),assets=new SnapshotAssets(graph,token,signal);
    let provider:GraphMediaProvider|null=null,renderer:CanvasGraphRenderer|null=null,surface:OffscreenCanvas|null=null;
    try{
     let blob:Blob,filename:string,frames:number,durationSeconds:number,hasAudio=false,width=normalized.width,height=normalized.height;
     if(normalized.kind==='video'){
      const result=await exportGraph(graph,assets,{format:normalized.format,width,height,rate:normalized.rate,startFrame:normalized.startFrame,endFrame:normalized.endFrame,signal,onProgress:progress});
      blob=result.blob;filename='result.'+normalized.format;frames=result.frames;durationSeconds=result.durationSeconds;hasAudio=result.hasAudio;
     }else{
      surface=new OffscreenCanvas(width,height);provider=new GraphMediaProvider(graph,assets);renderer=new CanvasGraphRenderer(surface,graph,{mediaProvider:provider});
      if(normalized.kind==='frame'){
       await renderer.render(normalized.frame,{signal});blob=await awaitBounded(surface.convertToBlob({type:'image/png'}),{signal,label:'Frame image encoding'});frames=1;durationSeconds=0;filename='frame.png';
       progress({phase:'frame',ratio:1,completedFrames:1,totalFrames:1});
      }else{
       const sheet=new OffscreenCanvas(normalized.sheetWidth!,normalized.sheetHeight!),context=sheet.getContext('2d');if(!context)throw new Error('Storyboard canvas is unavailable');
       try{context.fillStyle='#172824';context.fillRect(0,0,sheet.width,sheet.height);context.font='14px sans-serif';
        for(let i=0;i<normalized.frames.length;i++){
         signal.throwIfAborted();const frame=normalized.frames[i];await renderer.render(frame,{signal});
         const x=16+i%normalized.columns!*(width+16),y=16+Math.floor(i/normalized.columns!)*(height+46);
         context.drawImage(surface,x,y);context.fillStyle='#f5f2e8';context.fillText('Frame '+frame+' · '+(frame*graph.frameRate.denominator/graph.frameRate.numerator).toFixed(3)+' s',x,y+height+21);
         progress({phase:'storyboard',ratio:(i+1)/normalized.frames.length,completedFrames:i+1,totalFrames:normalized.frames.length});
        }
        blob=await awaitBounded(sheet.convertToBlob({type:'image/png'}),{signal,label:'Storyboard image encoding'});width=sheet.width;height=sheet.height;
       }finally{sheet.width=1;sheet.height=1;}
       frames=normalized.frames.length;durationSeconds=0;filename='storyboard.png';
      }
     }
     signal.throwIfAborted();if(blob.size>256*1024*1024)throw new Error('Encoded output exceeds its byte budget');download(blob,filename);
     setMessage('Render complete.');return {filename,mime:blob.type,bytes:blob.size,width,height,frames,durationSeconds,hasAudio,fingerprint};
    }finally{renderer?.dispose();provider?.dispose();assets.close();if(surface){surface.width=1;surface.height=1;}active=null;}
   };
   window.loopliltEngine={status:'ready',run,cancel:()=>active?.abort(new Error('Render cancelled'))};setMessage('Ready for a local render job.');
  })().catch(error=>{if(lifetime.signal.aborted)return;const detail=error instanceof Error?error.message:String(error);setMessage(detail);window.loopliltEngine={status:'error',error:detail,run:async()=>{throw error;},cancel:()=>{}};});
  return()=>{lifetime.abort();active?.abort();delete window.loopliltEngine;};
 },[]);
 return <main style={{fontFamily:'system-ui,sans-serif',background:'#14281f',color:'#f2ead9',minHeight:'100vh',display:'grid',placeContent:'center',padding:32}}><p style={{color:'#d8b577',letterSpacing:4,fontSize:11}}>LOOPLILT</p><h1 style={{fontSize:28,fontWeight:500}}>Local render workspace</h1><p role="status">{message}</p><p style={{fontSize:13,color:'#acbeab'}}>Your project stays on your device.</p></main>;
}

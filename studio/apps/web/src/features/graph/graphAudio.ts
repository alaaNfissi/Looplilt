"use client";
import { awaitBounded } from "@graph/async.mjs";
import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import { synthesizeLegacyAudio } from "@graph/isolated-legacy.mjs";
import { inspectLegacySource } from "@graph/legacy-source.mjs";
import { compileGraph } from "@graph/evaluate.mjs";
import type { GraphDocument, GraphNode, GraphAssetReader } from "@graph/types.mjs";

interface AudioSpan {node:GraphNode;start:number;end:number;rate:number;offset:number}
/** Canonical nested source clocks determine both video and soundtrack timing. */
function spansFor(document:GraphDocument,start:number,end:number):AudioSpan[]{
 const spans:AudioSpan[]=[];
 function visit(id:string,parentRate:number,parentOffset:number,from:number,to:number){
  const node=document.nodes[id],speed=node.time.speed.numerator/node.time.speed.denominator;
  const begin=Math.max(from,(node.time.start-parentOffset)/parentRate),finish=Math.min(to,(node.time.start+node.time.duration-parentOffset)/parentRate);
  if(finish<=begin)return;
  const rate=parentRate*speed,offset=node.time.offset.numerator/node.time.offset.denominator+(parentOffset-node.time.start)*speed;
  if(['audio','video','canvas','score'].includes(node.type))spans.push({node,start:begin,end:finish,rate,offset});
  for(const child of node.children)visit(child,rate,offset,begin,finish);
 }
 visit(document.rootId,1,0,start,end);return spans;
}
export async function mixGraphAudio(document:GraphDocument,repository:GraphAssetReader,{startFrame=0,endFrame=document.durationFrames,signal}:{startFrame?:number;endFrame?:number;signal?:AbortSignal}={}):Promise<AudioBuffer|null>{
 const compiled=compileGraph(document),fps=document.frameRate.numerator/document.frameRate.denominator;
 const spans=spansFor(document,startFrame,endFrame).filter(span=>compiled.evaluateNode((span.start+span.end)/2,span.node.id).audioEnabled);
 if(!spans.length)return null;if(spans.length>64)throw new Error('The browser mix supports at most 64 audio clips in one render');
 const length=Math.ceil((endFrame-startFrame)/fps*48000);if(length*2*4>128*1024*1024)throw new Error('This audio mix exceeds the browser memory budget; export a shorter range');
 const context=new OfflineAudioContext(2,length,48000),decoded=new Map<string,AudioBuffer|null>();let decodedBytes=0,scheduled=0;
 for(const span of spans){
  signal?.throwIfAborted();const node=span.node;
  const procedural=node.type==='canvas'||node.type==='score';
  const asset=document.assets[String(node.type==='canvas'?node.props.projectAsset:node.props.asset)];if(!asset)throw new Error(`${node.name}: missing audio asset`);
  let buffer=decoded.get(asset.sha256);
  if(buffer===undefined){
   const blob=await repository.getAsset(asset,document.id);
   if(procedural){
    const bytes=await blob.arrayBuffer(),source=inspectLegacySource(asset.kind,bytes);
    if(!source.metadata.hasAudio)buffer=null;
    else{
     if(source.project.duration*48000*2*4+decodedBytes>128*1024*1024)throw new Error('Decoded audio exceeds the browser memory budget');
     buffer=await awaitBounded(context.decodeAudioData(await synthesizeLegacyAudio(bytes,{signal})),{signal,label:'Procedural audio decoding'});decodedBytes+=buffer.length*buffer.numberOfChannels*4;
    }
   }else{
   const input=new Input({formats:ALL_FORMATS,source:new BlobSource(blob)});
   try{const track=await awaitBounded(input.getPrimaryAudioTrack(),{signal,label:'Audio inspection',onCancel:()=>input.dispose()});
    if(!track){if(node.type==='audio')throw new Error(`${asset.name}: no audio track was found`);buffer=null;}
    else{const duration=await awaitBounded(input.computeDuration([track]),{signal,label:'Audio duration inspection',onCancel:()=>input.dispose()});if(!Number.isFinite(duration)||duration*48000*Math.max(2,track.numberOfChannels)*4+decodedBytes>128*1024*1024)throw new Error('Decoded audio exceeds the browser memory budget');
     buffer=await awaitBounded(context.decodeAudioData(await blob.arrayBuffer()),{signal,label:'Audio decoding',onCancel:()=>input.dispose()});decodedBytes+=buffer.length*buffer.numberOfChannels*4;
    }
   }finally{input.dispose();}
   }decoded.set(asset.sha256,buffer);
  }
  if(!buffer)continue;signal?.throwIfAborted();
  const sourceIn=(span.start*span.rate+span.offset)/fps,seconds=(span.end-span.start)/fps;
  if(sourceIn<0||sourceIn+seconds*span.rate>buffer.duration+1/48000)throw new Error(`${node.name}: audio extends beyond its source; trim it before exporting`);
  const source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=span.rate;
  const gain=context.createGain(),pan=context.createStereoPanner(),count=Math.max(2,Math.ceil((span.end-span.start)*4)+1);
  if(count>400000)throw new Error('Audio automation exceeds the browser curve budget');const levels=new Float32Array(count),pans=new Float32Array(count);
  for(let i=0;i<count;i++){
   const frame=span.start+(span.end-span.start)*i/(count-1),evaluated=compiled.evaluateNode(Math.min(frame,span.end-1e-7),node.id);
   levels[i]=evaluated.audioGain;pans[i]=Number(evaluated.props.pan??0);
   if(i%512===0){signal?.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,0));}
  }
  const when=(span.start-startFrame)/fps;gain.gain.setValueCurveAtTime(levels,when,seconds);pan.pan.setValueCurveAtTime(pans,when,seconds);
  source.connect(gain).connect(pan).connect(context.destination);source.start(when,sourceIn,seconds*span.rate);scheduled++;
 }
 if(!scheduled)return null;signal?.throwIfAborted();const result=await awaitBounded(context.startRendering(),{signal,timeout:60000,label:'Soundtrack mix'});signal?.throwIfAborted();return result;
}

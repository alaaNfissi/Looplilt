"use client";
import { awaitBounded } from "@graph/async.mjs";
import { runVideoExport, type ExportPlan, type ExportProgress } from "@looplilt-studio/export-engine";
import { CanvasGraphRenderer } from "@graph/canvas-renderer.mjs";
import { outputTiming, sampleFrame, frameMicroseconds } from "@graph/time.mjs";
import type { GraphDocument, GraphAssetReader, Rational } from "@graph/types.mjs";
import { MediaContainer } from "@/features/export/MediaContainer";
import { WebCodecsVideoWriter } from "@/features/export/WebCodecsVideoWriter";
import { resolveVideoConfig, resolveAudioConfig } from "@/features/export/capabilities";
import { encodeAudioBuffer } from "@/features/export/encodeAudio";
import { GraphMediaProvider } from "./GraphMediaProvider";
import { mixGraphAudio } from "./graphAudio";

export interface GraphExportOptions {format?:'mp4'|'webm';width?:number;height?:number;rate?:Rational;startFrame?:number;endFrame?:number;signal?:AbortSignal;onProgress?:(progress:ExportProgress)=>void}
export async function exportGraph(document:GraphDocument,repository:GraphAssetReader,options:GraphExportOptions={}){
 const {signal}=options;signal?.throwIfAborted();if(typeof VideoEncoder==='undefined')throw new Error('Video export needs a browser with WebCodecs, such as current Chrome or Edge');
 const start=options.startFrame??0,end=options.endFrame??document.durationFrames,width=options.width??document.width,height=options.height??document.height;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>document.durationFrames)throw new Error('Export range must be within the project, on frame boundaries');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width%2||height%2||width*height>8294400)throw new Error('Choose even video dimensions from 16 pixels up to 4K');
 const timing=outputTiming(end-start,document.frameRate,options.rate??document.frameRate),format=options.format??'mp4';
 const bitrate=Math.min(16000000,Math.max(3000000,width*height*6));
 if(timing.seconds*(bitrate+192000)/8>256*1024*1024)throw new Error('This export exceeds the browser output budget; choose a shorter range or lower resolution');
 const plan:ExportPlan={startFrame:0,endFrame:timing.frames,totalFrames:timing.frames,resolution:{width,height},frameRate:timing.rate.numerator/timing.rate.denominator,durationSeconds:timing.seconds,format,videoCodec:format==='webm'?'vp9':'h264',audioCodec:format==='webm'?'opus':'aac',videoBitrate:bitrate,audioBitrate:192000,warnings:[]};
 options.onProgress?.({phase:'preparing',completedFrames:0,totalFrames:timing.frames,ratio:0});
 const video=await awaitBounded(resolveVideoConfig(plan),{signal,label:'Video codec inspection'}),mixed=await mixGraphAudio(document,repository,{startFrame:start,endFrame:end,signal});
 const audio=mixed?await awaitBounded(resolveAudioConfig(plan,mixed.numberOfChannels,mixed.sampleRate),{signal,label:'Audio codec inspection'}):null;
 if(mixed&&!audio)throw new Error('This browser cannot encode the soundtrack in the selected format; choose another format');
 signal?.throwIfAborted();const container=MediaContainer.create(plan,video,audio);
 if(mixed&&audio)await encodeAudioBuffer(mixed,audio,container,{signal});
 signal?.throwIfAborted();const canvas=new OffscreenCanvas(width,height),provider=new GraphMediaProvider(document,repository),renderer=new CanvasGraphRenderer(canvas,document,{mediaProvider:provider});
 const writer=WebCodecsVideoWriter.create(plan,container,video,{signal});let index=0;
 try{
  const bytes=await runVideoExport<VideoFrame>({plan,signal,onProgress:options.onProgress,
   frameSource:{async renderFrame(outputFrame){await renderer.render(start+sampleFrame(outputFrame,document.frameRate,timing.rate),{signal});return new VideoFrame(canvas,{timestamp:frameMicroseconds(outputFrame,timing.rate)});},dispose(){renderer.dispose();provider.dispose();}},
   videoWriter:{addFrame(frame){const timestamp=frameMicroseconds(index,timing.rate),duration=frameMicroseconds(index+1,timing.rate)-timestamp;index++;return writer.addFrame(frame,timestamp,duration);},finalize:()=>writer.finalize(),dispose:()=>writer.dispose()},
  });
  signal?.throwIfAborted();return {blob:new Blob([bytes as Uint8Array<ArrayBuffer>],{type:format==='mp4'?'video/mp4':'video/webm'}),filename:document.title.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,100)+'.'+format,frames:timing.frames,durationSeconds:timing.seconds,hasAudio:!!mixed,audioCodec:audio?.encoderConfig.codec??null};
 }finally{writer.dispose();provider.dispose();}
}

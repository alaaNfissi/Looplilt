import {assertJson,validateGraph} from './schema.mjs';
import {outputTiming,frameRate} from './time.mjs';
/** Normalized requests are shared by CLI, MCP jobs, and the actual Studio renderer. */
export function normalizeRenderRequest(document,request={}){
 validateGraph(document);assertJson(request);
 if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(key=>!['kind','format','width','height','frame','frames','startFrame','endFrame','rate'].includes(key)))throw new Error('Invalid graph render request');
 const kind=request.kind??'video';if(!['frame','storyboard','video'].includes(kind))throw new Error('Choose frame, storyboard, or video');
 const startFrame=request.startFrame??0,endFrame=request.endFrame??document.durationFrames;
 if(!Number.isSafeInteger(startFrame)||!Number.isSafeInteger(endFrame)||startFrame<0||endFrame<=startFrame||endFrame>document.durationFrames)throw new Error('Render range must be within the project, on frame boundaries');
 const width=request.width??(kind==='storyboard'?Math.min(480,document.width):document.width);
 let height=request.height??Math.round(width*document.height/document.width);
 if(kind==='video'&&request.height===undefined)height=Math.max(16,Math.round(height/2)*2);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096||width*height>16777216)throw new Error('Render dimensions must fit within a 4096-pixel edge and 16-megapixel surface');
 const format=request.format??'mp4';
 if(kind==='video'&&(!['mp4','webm'].includes(format)||width<16||height<16||width%2||height%2||width*height>8294400))throw new Error('Video requires MP4/WebM and even dimensions from16 pixels up to4K');
 const rate=frameRate(request.rate??document.frameRate),timing=outputTiming(endFrame-startFrame,document.frameRate,rate);
 const frame=request.frame??startFrame;
 if(!Number.isSafeInteger(frame)||frame<0||frame>=document.durationFrames)throw new Error('Frame must lie within the project');
 const frames=request.frames??Array.from({length:6},(_,index)=>Math.round(startFrame+(endFrame-startFrame-1)*index/5));
 if(!Array.isArray(frames)||frames.length<1||frames.length>24||!frames.every(value=>Number.isSafeInteger(value)&&value>=startFrame&&value<endFrame))throw new Error('Storyboard needs1–24 frames within the selected range');
 const columns=Math.min(3,frames.length),rows=Math.ceil(frames.length/columns),sheetWidth=columns*width+(columns+1)*16,sheetHeight=rows*(height+30)+(rows+1)*16;
 if(kind==='storyboard'&&(sheetWidth*sheetHeight>16777216||sheetWidth>8192||sheetHeight>8192))throw new Error('Storyboard exceeds its surface budget; use smaller thumbnails or fewer frames');
 if(kind==='video'){const bitrate=Math.min(16000000,Math.max(3000000,width*height*6));if(timing.seconds*(bitrate+192000)/8>256*1024*1024)throw new Error('Video exceeds the256MiB output budget; choose a shorter range or lower resolution');}
 return {kind,format,width,height,frame,frames,startFrame,endFrame,rate,outputFrames:timing.frames,durationSeconds:timing.seconds,...(kind==='storyboard'?{sheetWidth,sheetHeight,columns}:{})};
}

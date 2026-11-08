import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflate} from 'node:zlib';
import {promisify} from 'node:util';
import {run} from '../process.mjs';
import {ffmpeg,ffprobe} from '../media-tools.mjs';

const inflateAsync=promisify(inflate),MAX_OUTPUT=256*1024*1024;
const crcTable=Array.from({length:256},(_,value)=>{for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
function crc32(bytes){let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}

/** Hash a single bounded regular-file handle; never follow a substituted link. */
export async function artifactDigest(file,{signal,maxBytes=MAX_OUTPUT}={}){
 signal?.throwIfAborted();
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const info=await handle.stat();if(!info.isFile()||info.size<1||info.size>maxBytes)throw new Error('Render artifact is empty, oversized, or not a regular file');
  const hash=createHash('sha256');let bytes=0;
  for await(const part of handle.createReadStream({autoClose:false,highWaterMark:65536})){
   signal?.throwIfAborted();bytes+=part.length;if(bytes>maxBytes)throw new Error('Render artifact exceeded its byte budget');hash.update(part);
  }
  if(bytes!==info.size)throw new Error('Render artifact changed while being checked');
  return {bytes,sha256:hash.digest('hex')};
 }finally{await handle.close();}
}

/** Validate the actual PNG stream, including checksums, row filters and bounded
 * decompression. An IHDR signature alone is not evidence of a usable frame. */
export async function verifyFramePng(file,{width,height},{signal}={}){
 signal?.throwIfAborted();
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));let data;
 try{
  const info=await handle.stat();if(!info.isFile()||info.size>80*1024*1024)throw new Error('PNG exceeds its byte budget');
  data=Buffer.alloc(info.size+1);let offset=0;
  while(offset<data.length){signal?.throwIfAborted();const chunk=await handle.read(data,offset,Math.min(65536,data.length-offset),null);if(!chunk.bytesRead)break;offset+=chunk.bytesRead;}
  if(offset!==info.size)throw new Error('PNG changed while reading');data=data.subarray(0,offset);
 }finally{await handle.close();}
 if(data.length<45||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG signature');
 let at=8,header=false,ended=false,channels=0,chunks=0;const compressed=[];
 while(at<data.length){
  signal?.throwIfAborted();if(++chunks>10000||at+12>data.length)throw new Error('Invalid PNG chunk structure');
  const length=data.readUInt32BE(at),type=data.toString('ascii',at+4,at+8),end=at+12+length;
  if(end>data.length||crc32(data.subarray(at+4,end-4))!==data.readUInt32BE(end-4))throw new Error('PNG checksum failed');
  if(!header&&type!=='IHDR')throw new Error('PNG header is missing');
  if(type==='IHDR'){
   if(header||length!==13)throw new Error('Invalid PNG header');header=true;
   if(data.readUInt32BE(at+8)!==width||data.readUInt32BE(at+12)!==height)throw new Error('PNG dimensions do not match the requested output');
   channels=({0:1,2:3,4:2,6:4})[data[at+17]];
   if(data[at+16]!==8||!channels||data[at+18]||data[at+19]||data[at+20])throw new Error('Unexpected PNG pixel format');
  }else if(type==='IDAT')compressed.push(data.subarray(at+8,end-4));
  else if(type==='IEND'){if(length||end!==data.length)throw new Error('Invalid PNG ending');ended=true;}
  else if(type==='acTL')throw new Error('Expected a still PNG, not an animation');
  at=end;
 }
 if(!ended||!compressed.length||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>16777216)throw new Error('Incomplete or oversized PNG');
 const stride=width*channels+1,expected=stride*height;
 const pixels=await inflateAsync(Buffer.concat(compressed),{maxOutputLength:expected});
 signal?.throwIfAborted();if(pixels.length!==expected)throw new Error('PNG pixel data is incomplete');
 for(let row=0;row<height;row++)if(pixels[row*stride]>4)throw new Error('Invalid PNG row filter');
 return {decoded:true,width,height,pixelFormat:channels===4?'rgba8':channels===3?'rgb8':'gray8'};
}

export async function verifyGraphVideo(file,expected,{signal}={}){
 signal?.throwIfAborted();
 const {stdout}=await run(ffprobe(),['-v','error','-protocol_whitelist','file,pipe','-count_frames','-show_streams','-show_format','-of','json',file],{signal,timeout:600000,maxOutput:512*1024});
 const info=JSON.parse(stdout),videos=info.streams.filter(item=>item.codec_type==='video'),audios=info.streams.filter(item=>item.codec_type==='audio');
 if(videos.length!==1||audios.length!==(expected.hasAudio?1:0)||info.streams.length!==videos.length+audios.length)throw new Error('Encoded video contains unexpected or missing tracks');
 const video=videos[0],audio=audios[0],webm=expected.format==='webm';
 if(video.codec_name!==(webm?'vp9':'h264')||!['yuv420p','yuvj420p'].includes(video.pix_fmt))throw new Error('Encoded video has an unexpected codec or pixel format');
 if(audio&&(audio.codec_name!==(webm?'opus':'aac')||Number(audio.sample_rate)!==48000||audio.channels!==2))throw new Error('Encoded audio must be stereo48kHz in the selected codec');
 const [numerator,denominator]=String(video.avg_frame_rate||video.r_frame_rate).split('/').map(Number);
 const measuredRate=numerator/denominator,targetRate=expected.rate.numerator/expected.rate.denominator;
 const frames=Number(video.nb_read_frames),durationSeconds=Number(info.format.duration??video.duration);
 if(video.width!==expected.width||video.height!==expected.height||frames!==expected.frames)throw new Error('Encoded dimensions or frame count do not match the render snapshot');
 // WebM stores millisecond timestamps; its reported average rate can be absent.
 if(Number.isFinite(measuredRate)&&measuredRate>0&&Math.abs(measuredRate-targetRate)>0.01)throw new Error('Encoded frame rate does not match the requested rational timing');
 if(!Number.isFinite(durationSeconds)||Math.abs(durationSeconds-expected.durationSeconds)>Math.max(0.08,1/targetRate))throw new Error('Encoded duration does not match the requested frame range');
 if(Math.abs(Number(video.start_time??0))>1/targetRate+0.001||audio&&Math.abs(Number(audio.start_time??0))>0.08)throw new Error('Encoded streams have an unexpected start offset');
 await run(ffmpeg(),['-hide_banner','-v','error','-xerror','-protocol_whitelist','file,pipe','-i',file,'-f','null','-'],{signal,timeout:600000,maxOutput:512*1024});
 return {decoded:true,width:video.width,height:video.height,frames,durationSeconds,rate:expected.rate,video:video.codec_name,audio:audio?.codec_name??null};
}

export async function verifyGraphArtifact(file,metadata,request,{signal}={}){
 const digest=await artifactDigest(file,{signal});
 if(digest.bytes!==metadata.bytes)throw new Error('Downloaded artifact size does not match the browser result');
 const verification=request.kind==='video'
  ?await verifyGraphVideo(file,{...metadata,format:request.format,rate:request.rate},{signal})
  :await verifyFramePng(file,metadata,{signal});
 signal?.throwIfAborted();return {...digest,verification};
}

/** Bounded inline retrieval rechecks bytes from one handle after metadata lookup. */
export async function readArtifactBytes(file,expected,{signal,maxBytes=5*1024*1024}={}){
 signal?.throwIfAborted();
 if(expected.bytes>maxBytes)throw new Error('Artifact is too large for inline inspection');
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.size!==expected.bytes||stat.size>maxBytes)throw new Error('Artifact changed before retrieval');
  const bytes=Buffer.alloc(stat.size+1);let count=0;
  while(count<bytes.length){signal?.throwIfAborted();const part=await handle.read(bytes,count,Math.min(65536,bytes.length-count),null);if(!part.bytesRead)break;count+=part.bytesRead;}
  const result=bytes.subarray(0,count);
  if(count!==expected.bytes||createHash('sha256').update(result).digest('hex')!==expected.sha256)throw new Error('Artifact failed its retrieval integrity check');
  return result;
 }finally{await handle.close();}
}

"use client";
import { awaitBounded } from "@graph/async.mjs";
import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import { LegacyCanvasSource } from "@graph/isolated-legacy.mjs";
import { inspectMediaHeader } from "@graph/media-signature.mjs";
import type { GraphAsset, GraphDocument, GraphAssetReader } from "@graph/types.mjs";

export interface MediaNode {id:string;type:string;visible:boolean;props:Record<string,string|number|boolean>;time:{seconds:number}}
export interface MediaScene {nodes:Record<string,MediaNode>}
interface VideoEntry {hash:string;input:Input;sink:CanvasSink;duration:number}
function checkPixels(width:number,height:number){if(!width||!height||width>16384||height>16384||width*height>67108864)throw new Error('Media dimensions exceed the 64-megapixel decode budget');}
function deadline<T>(promise:Promise<T>,signal:AbortSignal|undefined,dispose:()=>void):Promise<T>{
 return new Promise((resolve,reject)=>{
  let settled=false;
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',aborted);};
  const fail=()=>{if(settled)return;settled=true;cleanup();try{dispose();}finally{reject(signal?.reason??new Error('Media decoding timed out'));}};
  const timer=setTimeout(fail,20000),aborted=()=>fail();signal?.addEventListener('abort',aborted,{once:true});
  promise.then(value=>{if(settled)return;settled=true;cleanup();resolve(value);},error=>{if(settled)return;settled=true;cleanup();reject(error);});if(signal?.aborted)fail();
 });
}
/** Uses the selected editor's Mediabunny/WebCodecs approach for exact frame
 * access. The same provider supplies preview and export, with no seek fallback. */
export class GraphMediaProvider {
 private legacy=new Map<string,{key:string;source:LegacyCanvasSource}>();
 private images=new Map<string,ImageBitmap>();private imageLoads=new Map<string,Promise<ImageBitmap>>();private videos=new Map<string,VideoEntry>();private fonts=new Map<string,FontFace>();private closed=false;
 constructor(private document:GraphDocument,private repository:GraphAssetReader){}
 replace(document:GraphDocument){this.document=document;}
 async prepare(scene:MediaScene,{signal}:{signal?:AbortSignal}={}){
  const activeAssets=new Set<string>();for(const node of Object.values(scene.nodes)){if(!node.visible)continue;for(const key of node.type==='canvas'?['projectAsset','scriptAsset']:['asset'])if(node.props[key])activeAssets.add(String(node.props[key]));}
  const activeBytes=[...activeAssets].reduce((sum,id)=>sum+(this.document.assets[id]?.bytes??0),0);
  if(activeBytes>256*1024*1024)throw new Error('Active source media exceeds the256MiB budget; use smaller source files or fewer simultaneous clips');
  for(const [id,entry] of this.legacy){const node=scene.nodes[id];if(!node?.visible||node.type!=='canvas'||entry.key!==this.legacyKey(node)){entry.source.dispose();this.legacy.delete(id);}}
  const active=new Set(Object.values(scene.nodes).filter(n=>n.visible&&n.type==='video').map(n=>n.id));
  for(const [id,entry] of this.videos)if(!active.has(id)||this.document.assets[String(scene.nodes[id]?.props.asset)]?.sha256!==entry.hash){entry.input.dispose();this.videos.delete(id);}
  const usedImages=new Set(Object.values(scene.nodes).filter(n=>n.visible&&n.type==='image').map(n=>this.document.assets[String(n.props.asset)]?.sha256));
  for(const [hash,image] of this.images)if(!usedImages.has(hash)){image.close();this.images.delete(hash);}
  const fontAssets=Object.values(this.document.assets).filter(asset=>asset.kind==='font');if(fontAssets.length>16)throw new Error('A project can load at most 16 font assets');
  if(fontAssets.reduce((sum,asset)=>sum+asset.bytes,0)>32*1024*1024)throw new Error('Project fonts exceed the32MiB decode budget');
  const fontHashes=new Set(fontAssets.map(asset=>asset.sha256));for(const [hash,font] of this.fonts)if(!fontHashes.has(hash)){document.fonts.delete(font);this.fonts.delete(hash);}
  for(const asset of fontAssets){if(this.fonts.has(asset.sha256))continue;const font=new FontFace(String(asset.metadata.family??asset.name),await (await this.repository.getAsset(asset,this.document.id)).arrayBuffer());await awaitBounded(font.load(),{signal,label:'Font loading'});if(this.closed)return;document.fonts.add(font);this.fonts.set(asset.sha256,font);}
 }
 private legacyKey(node:MediaNode){return [this.document.assets[String(node.props.projectAsset)]?.sha256,this.document.assets[String(node.props.scriptAsset)]?.sha256,node.props.format].join(':');}
 async frame(node:MediaNode,_scene:MediaScene,{signal}:{signal?:AbortSignal}={}){
  signal?.throwIfAborted();if(this.closed)throw new Error('Media provider is closed');
  if(node.type==='canvas'){
   let entry=this.legacy.get(node.id);
   if(!entry){
    const project=this.document.assets[String(node.props.projectAsset)],script=this.document.assets[String(node.props.scriptAsset)];
    if(!project||!script)throw new Error(node.id+': missing editable Canvas source');
    const [projectBytes,scriptBytes]=await Promise.all([project,script].map(async asset=>(await this.repository.getAsset(asset,this.document.id)).arrayBuffer()));
    const source=await LegacyCanvasSource.open(projectBytes,scriptBytes,{format:String(node.props.format),signal});
    if(this.closed){source.dispose();throw new Error('Media provider is closed');}
    entry={key:this.legacyKey(node),source};this.legacy.set(node.id,entry);
   }
   try{return await entry.source.frame(node.time.seconds,{signal});}catch(error){entry.source.dispose();this.legacy.delete(node.id);throw error;}
  }
  const asset=this.document.assets[String(node.props.asset)];if(!asset)throw new Error(`${node.id}: missing asset reference`);
  if(node.type==='image'){
   let bitmap=this.images.get(asset.sha256);
   if(!bitmap){
    let loading=this.imageLoads.get(asset.sha256);
    if(!loading){loading=(async()=>{const blob=await this.repository.getAsset(asset,this.document.id);inspectMediaHeader(await blob.slice(0,262144).arrayBuffer());const image=await awaitBounded(createImageBitmap(blob),{signal,label:'Image decoding',disposeLate:image=>image.close()});try{checkPixels(image.width,image.height);signal?.throwIfAborted();if(this.closed)throw new Error('Media provider is closed');this.images.set(asset.sha256,image);return image;}catch(error){image.close();throw error;}})().finally(()=>this.imageLoads.delete(asset.sha256));this.imageLoads.set(asset.sha256,loading);}
    bitmap=await loading;
   }
   return {image:bitmap,width:bitmap.width,height:bitmap.height};
  }
  if(node.type!=='video')throw new Error(`Unsupported visual media: ${node.type}`);
  let entry=this.videos.get(node.id);
  if(!entry){
   const input=new Input({formats:ALL_FORMATS,source:new BlobSource(await this.repository.getAsset(asset,this.document.id))});
   try{const track=await deadline(input.getPrimaryVideoTrack(),signal,()=>input.dispose());if(!track||!await deadline(track.canDecode(),signal,()=>input.dispose()))throw new Error(`This browser cannot decode ${asset.name}`);checkPixels(track.displayWidth,track.displayHeight);
    entry={hash:asset.sha256,input,sink:new CanvasSink(track,{poolSize:2,alpha:true}),duration:await deadline(input.computeDuration(),signal,()=>input.dispose())};
    if(this.closed)throw new Error('Media provider is closed');this.videos.set(node.id,entry);
   }catch(error){input.dispose();throw error;}
  }
  if(node.time.seconds<0||node.time.seconds>=entry.duration+.000001)throw new Error(`${node.id}: source time is outside ${asset.name}; trim the clip or relink its media`);
  const current=entry,wrapped=await deadline(entry.sink.getCanvas(node.time.seconds),signal,()=>{current.input.dispose();this.videos.delete(node.id);});
  if(!wrapped)throw new Error(`${asset.name}: no decoded frame at ${node.time.seconds.toFixed(3)} seconds`);
  return {image:wrapped.canvas,width:wrapped.canvas.width,height:wrapped.canvas.height};
 }
 dispose(){this.closed=true;for(const entry of this.legacy.values())entry.source.dispose();this.legacy.clear();for(const image of this.images.values())image.close();for(const entry of this.videos.values())entry.input.dispose();for(const font of this.fonts.values())document.fonts.delete(font);this.images.clear();this.videos.clear();this.fonts.clear();}
}
export async function inspectLocalMedia(file:File,signal?:AbortSignal):Promise<GraphAsset>{
 if(!file.size||file.size>256*1024*1024)throw new Error('Choose a nonempty file of at most 256 MiB');
 signal?.throwIfAborted();const format=inspectMediaHeader(await file.slice(0,262144).arrayBuffer());
 const metadata:GraphAsset['metadata']={...format.metadata};
 if(format.kind==='image'){const image=await awaitBounded(createImageBitmap(file),{signal,label:'Image inspection',disposeLate:image=>image.close()});try{checkPixels(image.width,image.height);metadata.width=image.width;metadata.height=image.height;}finally{image.close();}}
 if(format.kind==='font')metadata.family=file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,120)||'Imported font';
 if(format.kind==='video'||format.kind==='audio'){
  const input=new Input({formats:ALL_FORMATS,source:new BlobSource(file)});
  try{const video=await deadline(input.getPrimaryVideoTrack(),signal,()=>input.dispose()),audio=await deadline(input.getPrimaryAudioTrack(),signal,()=>input.dispose());if(!video&&!audio)throw new Error('No playable media track was found');
   if(video){checkPixels(video.displayWidth,video.displayHeight);if(!await deadline(video.canDecode(),signal,()=>input.dispose()))throw new Error('This browser cannot decode the video codec');metadata.width=video.displayWidth;metadata.height=video.displayHeight;}
   if(audio&&!await deadline(audio.canDecode(),signal,()=>input.dispose()))throw new Error('This browser cannot decode the audio codec');metadata.hasAudio=!!audio;metadata.durationSeconds=await deadline(input.computeDuration(),signal,()=>input.dispose());
   if(!Number.isFinite(metadata.durationSeconds)||Number(metadata.durationSeconds)<=0||Number(metadata.durationSeconds)>3600)throw new Error('Media duration must be within one hour');
   format.kind=video?'video':'audio';
  }finally{input.dispose();}
 }
 signal?.throwIfAborted();const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer()),sha256=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 return {id:`asset_${sha256}`,kind:format.kind,name:file.name.slice(0,200),path:`assets/${sha256}.${format.extension}`,sha256,bytes:file.size,mime:format.mime,metadata};
}

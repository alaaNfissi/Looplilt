import { validateGraph, assertJson, GRAPH_LIMITS } from './schema.mjs';
import { inspectMediaHeader } from './media-signature.mjs';
import { inspectLegacySource, LEGACY_SOURCE_KINDS } from './legacy-source.mjs';

const magic=new TextEncoder().encode('LOOPLILT-BUNDLE\n'),HEADER=magic.length+4;
export const BUNDLE_LIMIT=256*1024*1024;
async function verify(asset,blob,{signal}={}){
 signal?.throwIfAborted();
 if(!(blob instanceof Blob)||blob.size!==asset.bytes||!blob.size||blob.size>BUNDLE_LIMIT)throw new Error('Missing or incorrectly sized asset: '+asset.name);
 const bytes=await blob.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 if(hash!==asset.sha256)throw new Error('Asset integrity check failed: '+asset.name);
 const format=LEGACY_SOURCE_KINDS.includes(asset.kind)?inspectLegacySource(asset.kind,bytes):inspectMediaHeader(new Uint8Array(bytes,0,Math.min(bytes.byteLength,262144)));
 const container=['mp4','webm','ogg'].includes(format.extension)&&['audio','video'].includes(asset.kind)&&['audio','video'].includes(format.kind);
 if((format.kind!==asset.kind&&!container)||asset.path!=='assets/'+asset.sha256+'.'+format.extension||asset.mime!==format.mime)throw new Error('Asset signature does not match its manifest: '+asset.name);
 signal?.throwIfAborted();
}
/** A length-delimited manifest and verified blobs. No archive extraction or paths from a ZIP. */
export async function createProjectBundle(document,repository,{signal,onProgress}={}){
 signal?.throwIfAborted();validateGraph(document,{allowUnsupported:true});const entries=Object.values(document.assets).sort((a,b)=>a.id.localeCompare(b.id));
 let offset=0;const manifest={format:'looplilt-bundle',version:1,project:document,assets:entries.map(asset=>{const entry={id:asset.id,offset,length:asset.bytes};offset+=asset.bytes;return entry;})};
 if(offset>BUNDLE_LIMIT)throw new Error('Portable projects are limited to 256 MiB; keep larger media beside the project JSON');
 const json=new TextEncoder().encode(JSON.stringify(manifest));if(json.byteLength>GRAPH_LIMITS.bytes||HEADER+json.byteLength+offset>BUNDLE_LIMIT)throw new Error('Portable project exceeds its 256 MiB budget');
 const header=new Uint8Array(HEADER);header.set(magic);new DataView(header.buffer).setUint32(magic.length,json.byteLength,true);
 const blobs=[header,json];let completed=0;
 for(const asset of entries){const blob=await repository.getAsset(asset,document.id);await verify(asset,blob,{signal});blobs.push(blob);onProgress?.(++completed,entries.length);}
 signal?.throwIfAborted();return new Blob(blobs,{type:'application/x-looplilt-project'});
}
export async function isProjectBundle(blob){
 if(blob.size<HEADER)return false;const bytes=new Uint8Array(await blob.slice(0,magic.length).arrayBuffer());return magic.every((byte,i)=>bytes[i]===byte);
}
export async function readProjectBundle(blob,{signal,onProgress}={}){
 signal?.throwIfAborted();if(!(blob instanceof Blob)||blob.size<HEADER||blob.size>BUNDLE_LIMIT||!await isProjectBundle(blob))throw new Error('Choose a valid Looplilt portable project of at most 256 MiB');
 const header=await blob.slice(0,HEADER).arrayBuffer(),length=new DataView(header).getUint32(magic.length,true);
 if(!length||length>GRAPH_LIMITS.bytes||HEADER+length>blob.size)throw new Error('Invalid portable project manifest length');
 const manifest=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await blob.slice(HEADER,HEADER+length).arrayBuffer()));
 assertJson(manifest);
 if(manifest.format!=='looplilt-bundle'||manifest.version!==1||Object.keys(manifest).some(key=>!['format','version','project','assets'].includes(key)))throw new Error('Unsupported portable project format');
 validateGraph(manifest.project,{allowUnsupported:true});
 if(!Array.isArray(manifest.assets)||manifest.assets.length!==Object.keys(manifest.project.assets).length)throw new Error('Incomplete portable project asset manifest');
 const assets=new Map();let offset=0,completed=0;
 for(const entry of manifest.assets){
  const asset=manifest.project.assets[entry.id];
  if(!asset||assets.has(entry.id)||Object.keys(entry).some(key=>!['id','offset','length'].includes(key))||entry.offset!==offset||entry.length!==asset.bytes||!Number.isSafeInteger(entry.length)||entry.length<1)throw new Error('Invalid portable asset range');
  const start=HEADER+length+offset,end=start+entry.length;if(end>blob.size)throw new Error('Portable project is truncated');
  const data=blob.slice(start,end,asset.mime);await verify(asset,data,{signal});assets.set(entry.id,data);offset+=entry.length;onProgress?.(++completed,manifest.assets.length);
 }
 if(HEADER+length+offset!==blob.size)throw new Error('Portable project contains unexpected trailing bytes');
 return {document:manifest.project,assets};
}

import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { scopedPath } from './workspace.mjs';
import { assetPath, createGraph, validateGraph, stableId } from './schema.mjs';
import { RevisionConflict } from './transactions.mjs';
import { inspectMediaHeader } from './media-signature.mjs';
import { inspectLegacySource, LEGACY_SOURCE_KINDS, LEGACY_SOURCE_LIMIT } from './legacy-source.mjs';
import { Script } from 'node:vm';

const DEFAULT_LIMIT = 256 * 1024 * 1024;
function limit(value){if(!Number.isSafeInteger(value)||value<1||value>2*1024*1024*1024)throw new Error('Asset limit must be 1 byte to 2 GiB');return value;}
async function hashFile(file,maxBytes,signal){
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const info=await handle.stat();if(!info.isFile()||info.size>maxBytes)throw new Error('Asset exceeds its byte limit or is not a regular file');
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of handle.createReadStream({autoClose:false,highWaterMark:65536})){
   signal?.throwIfAborted();bytes+=chunk.length;if(bytes>maxBytes)throw new Error('Asset grew beyond its byte limit');hash.update(chunk);
  }
  return {sha256:hash.digest('hex'),bytes};
 }finally{await handle.close();}
}

/** Only files deliberately placed under workspace/imports are importable through this API. */
export async function importWorkspaceAsset(workspace,{projectId,source,expectedFingerprint,name},{signal,maxBytes=DEFAULT_LIMIT}={}){
 limit(maxBytes);assetPath(source);
 if(name!==undefined&&(typeof name!=='string'||!name.trim()||name.length>200))throw new TypeError('Asset name must contain 1–200 characters');
 if(!source.startsWith('imports/'))throw new Error('Place approved media under the workspace imports directory first');
 const initial=await workspace.read(projectId);
 if(initial.fingerprint!==expectedFingerprint)throw new RevisionConflict(expectedFingerprint,initial.fingerprint);
 const inputPath=await scopedPath(workspace.root,source);
 const directory=await scopedPath(workspace.root,`projects/${projectId}`);
 const assetDirectory=await scopedPath(directory,'assets',{missingLeaf:true});
 try{await fs.mkdir(assetDirectory);}catch(error){if(error.code!=='EEXIST')throw error;}
 await scopedPath(directory,'assets');
 const staging=await scopedPath(assetDirectory,`import-${randomUUID()}.pending`,{missingLeaf:true});
 const input=await fs.open(inputPath,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 let output,format,bytes=0,sha256;
 try{
  signal?.throwIfAborted();
  const info=await input.stat();if(!info.isFile()||!info.size||info.size>maxBytes)throw new Error('Media must be a nonempty regular file within the import size limit');
  const header=Buffer.alloc(262144),read=await input.read(header,0,header.length,0);format=inspectMediaHeader(header.subarray(0,read.bytesRead));
  output=await fs.open(staging,'wx',0o600);const hash=createHash('sha256');
  for await(const chunk of input.createReadStream({start:0,autoClose:false,highWaterMark:65536})){
   signal?.throwIfAborted();bytes+=chunk.length;if(bytes>maxBytes)throw new Error('Media grew beyond its byte limit');hash.update(chunk);await output.writeFile(chunk);
  }
  await output.sync();await output.close();output=null;sha256=hash.digest('hex');
  const filename=`${sha256}.${format.extension}`,destination=await scopedPath(assetDirectory,filename,{missingLeaf:true});
  try{await fs.link(staging,destination);}catch(error){
   if(error.code!=='EEXIST')throw error;
   const existing=await hashFile(destination,maxBytes,signal);
   if(existing.sha256!==sha256||existing.bytes!==bytes)throw new Error('Existing content-addressed media failed its integrity check');
  }
 }finally{
  await input.close();await output?.close();
  await fs.unlink(staging).catch(error=>{if(error.code!=='ENOENT')throw error;});
 }
 const id=`asset_${sha256}`;
 const asset={id,kind:format.kind,name:name??path.posix.basename(source),path:`assets/${sha256}.${format.extension}`,sha256,bytes,mime:format.mime,metadata:format.metadata??{}};
 const current=await workspace.read(projectId);
 if(current.fingerprint!==expectedFingerprint)throw new RevisionConflict(expectedFingerprint,current.fingerprint);
 if(Object.hasOwn(current.document.assets,id)){
  if(current.document.assets[id].sha256!==sha256||current.document.assets[id].kind!==asset.kind)throw new Error('Existing asset identity does not match its content');
  return {...current,asset:current.document.assets[id],changedNodes:[],changedAssets:[],noop:true};
 }
 const changed=await workspace.transact(projectId,{expectedFingerprint,label:`Import ${asset.name}`.slice(0,200),operations:[{op:'asset.add',asset}]},{signal});
 return {...changed,asset};
}

export async function verifyWorkspaceAssets(workspace,projectId,{signal,maxBytes=DEFAULT_LIMIT}={}){
 limit(maxBytes);const state=await workspace.read(projectId),directory=await scopedPath(workspace.root,`projects/${projectId}`),results=[];
 let inspectedBytes=0;
 for(const asset of Object.values(state.document.assets)){
  signal?.throwIfAborted();
  try{
   if(inspectedBytes+asset.bytes>2*1024*1024*1024)throw new Error('Project asset verification exceeds its 2 GiB budget');
   const checked=await hashFile(await scopedPath(directory,asset.path),Math.min(maxBytes,asset.bytes),signal);inspectedBytes+=checked.bytes;
   results.push({id:asset.id,path:asset.path,status:checked.sha256===asset.sha256&&checked.bytes===asset.bytes?'valid':'changed'});
  }catch(error){
   if(signal?.aborted)throw error;
   results.push({id:asset.id,path:asset.path,status:error.code==='ENOENT'?'missing':'invalid',message:error.message});
  }
 }
 return {projectId,fingerprint:state.fingerprint,valid:results.every(item=>item.status==='valid'),inspectedBytes,assets:results};
}
/** Receive selected browser media without changing the project. Publication of
 * its manifest remains an ordinary, revision-checked graph transaction. */
export async function putWorkspaceAsset(workspace,projectId,asset,contents,{signal,maxBytes=DEFAULT_LIMIT}={}){
 limit(maxBytes);const check=createGraph();check.assets[asset?.id]=asset;validateGraph(check,{allowUnsupported:true});
 if(asset.bytes<1||asset.bytes>maxBytes)throw new Error('Asset exceeds the import byte limit');
 await workspace.read(projectId);
 const directory=await scopedPath(workspace.root,'projects/'+projectId),assets=await scopedPath(directory,'assets',{missingLeaf:true});
 try{await fs.mkdir(assets);}catch(error){if(error.code!=='EEXIST')throw error;}await scopedPath(directory,'assets');
 const staging=await scopedPath(assets,'upload-'+randomUUID()+'.pending',{missingLeaf:true}),output=await fs.open(staging,'wx',0o600);
 const source=LEGACY_SOURCE_KINDS.includes(asset.kind),headerLimit=source?LEGACY_SOURCE_LIMIT:262144;
 if(source&&asset.bytes>LEGACY_SOURCE_LIMIT){await output.close();await fs.unlink(staging);throw new Error('Looplilt source exceeds 2 MiB');}
 let bytes=0,headerBytes=0;const hash=createHash('sha256'),header=[];
 try{
  for await(const part of contents){signal?.throwIfAborted();const chunk=Buffer.from(part);bytes+=chunk.length;if(bytes>asset.bytes||bytes>maxBytes)throw new Error('Upload exceeds its declared byte limit');hash.update(chunk);
   if(headerBytes<headerLimit){const sample=chunk.subarray(0,headerLimit-headerBytes);header.push(sample);headerBytes+=sample.length;}await output.writeFile(chunk);
  }
  if(bytes!==asset.bytes||hash.digest('hex')!==asset.sha256)throw new Error('Uploaded media failed its integrity check');
  const format=source?inspectLegacySource(asset.kind,Buffer.concat(header)):inspectMediaHeader(Buffer.concat(header));
  if(asset.kind==='legacy-script')new Script(format.text+'\n;drawFrame;',{filename:'draw.js'});
  const container= ['mp4','webm','ogg'].includes(format.extension)&&['audio','video'].includes(asset.kind)&&['audio','video'].includes(format.kind);
  if((format.kind!==asset.kind&&!container)||asset.path!=='assets/'+asset.sha256+'.'+format.extension||asset.mime!==format.mime)throw new Error('Media signature does not match its manifest');
  await output.sync();await output.close();signal?.throwIfAborted();
  const destination=await scopedPath(directory,asset.path,{missingLeaf:true});
  try{await fs.link(staging,destination);}catch(error){if(error.code!=='EEXIST')throw error;const found=await hashFile(destination,maxBytes,signal);if(found.sha256!==asset.sha256||found.bytes!==asset.bytes)throw new Error('Existing media failed its integrity check');}
 }finally{await output.close().catch(()=>{});await fs.unlink(staging).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}

/** Bounded, hash-checked bytes from one open handle; never follow an arbitrary URL. */
export async function readWorkspaceAsset(workspace,projectId,assetId,{signal,maxBytes=DEFAULT_LIMIT}={}){
 limit(maxBytes);const state=await workspace.read(projectId),asset=state.document.assets[assetId];if(!asset)throw new Error('Unknown project asset');
 return readGraphAsset(workspace,projectId,asset,{signal,maxBytes});
}

/** Read a retained snapshot reference, independent of later manifest edits. */
export async function readGraphAsset(workspace,projectId,asset,{signal,maxBytes=DEFAULT_LIMIT}={}){
 limit(maxBytes);stableId(projectId);const checked=createGraph();checked.assets[asset?.id]=asset;validateGraph(checked,{allowUnsupported:true});
 if(asset.bytes<1||asset.bytes>maxBytes)throw new Error('Asset exceeds the browser byte limit');
 const file=await scopedPath(workspace.root,'projects/'+projectId+'/'+asset.path),handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const info=await handle.stat();if(!info.isFile()||info.size!==asset.bytes)throw new Error('Missing or changed media: '+asset.name);
  const bytes=Buffer.alloc(asset.bytes+1);let offset=0;
  while(offset<bytes.length){signal?.throwIfAborted();const chunk=await handle.read(bytes,offset,Math.min(65536,bytes.length-offset),null);if(!chunk.bytesRead)break;offset+=chunk.bytesRead;}
  const data=bytes.subarray(0,offset);if(offset!==asset.bytes||createHash('sha256').update(data).digest('hex')!==asset.sha256)throw new Error('Media failed its integrity check: '+asset.name);
  return {asset,bytes:data};
 }finally{await handle.close();}
}

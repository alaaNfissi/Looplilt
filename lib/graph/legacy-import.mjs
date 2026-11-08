import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { Script } from 'node:vm';
import { scopedPath } from './workspace.mjs';
import { assetPath } from './schema.mjs';
import { legacyAsset, LEGACY_SOURCE_LIMIT } from './legacy-source.mjs';
import { putWorkspaceAsset } from './assets.mjs';
import { createNodeOperations } from './commands.mjs';
import { RevisionConflict } from './transactions.mjs';

/** A pair of source assets and its procedural clip are one ordinary graph edit. */
export function legacyImportOperations(document,projectAsset,scriptAsset,{start=0,format='landscape',nodeId='canvas_'+crypto.randomUUID()}={}){
 if(!Number.isSafeInteger(start)||start<0||start>=document.durationFrames)throw new Error('Insert the film at a frame inside the composition');
 const fps=document.frameRate.numerator/document.frameRate.denominator,duration=Math.max(1,Math.floor(Number(projectAsset.metadata.durationSeconds)*fps+1e-7)),end=Math.max(document.durationFrames,start+duration);
 const operations=[];
 for(const asset of [projectAsset,scriptAsset])if(!document.assets[asset.id])operations.push({op:'asset.add',asset});
 if(end!==document.durationFrames)operations.push({op:'project.patch',changes:{durationFrames:end}});
 operations.push(...createNodeOperations(document,[{id:nodeId,type:'canvas',name:String(projectAsset.metadata.title).slice(0,120),start,duration,props:{projectAsset:projectAsset.id,scriptAsset:scriptAsset.id,format,width:document.width,height:document.height}}]));
 return {operations,nodeId};
}
async function readSource(workspace,relative,signal){
 const file=await scopedPath(workspace.root,relative),handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{const info=await handle.stat();if(!info.isFile()||!info.size||info.size>LEGACY_SOURCE_LIMIT)throw new Error('Source must be a regular file of 1 byte to 2 MiB');
  const bytes=Buffer.alloc(info.size+1);let offset=0;
  while(offset<bytes.length){signal?.throwIfAborted();const read=await handle.read(bytes,offset,Math.min(65536,bytes.length-offset),null);if(!read.bytesRead)break;offset+=read.bytesRead;}
  if(offset!==info.size)throw new Error('Source changed while importing');return bytes.subarray(0,offset);
 }finally{await handle.close();}
}
export async function importLegacyProject(workspace,{projectId,source,expectedFingerprint,start=0,format='landscape'},{signal}={}){
 assetPath(source);if(!source.startsWith('imports/'))throw new Error('Place the selected project folder under workspace/imports first');
 const state=await workspace.read(projectId);if(state.fingerprint!==expectedFingerprint)throw new RevisionConflict(expectedFingerprint,state.fingerprint);
 const [projectBytes,scriptBytes]=await Promise.all(['project.json','draw.js'].map(name=>readSource(workspace,source+'/'+name,signal)));
 const [projectAsset,scriptAsset]=await Promise.all([legacyAsset('legacy-project',projectBytes,'project.json'),legacyAsset('legacy-script',scriptBytes,'draw.js')]);
 new Script(new TextDecoder().decode(scriptBytes)+'\n;drawFrame;',{filename:'draw.js'}); // Compile only, never run in Node.
 projectAsset.metadata.scriptAsset=scriptAsset.id;
 for(const [asset,bytes] of [[projectAsset,projectBytes],[scriptAsset,scriptBytes]])await putWorkspaceAsset(workspace,projectId,asset,[bytes],{signal});
 const imported=legacyImportOperations(state.document,projectAsset,scriptAsset,{start,format});
 const changed=await workspace.transact(projectId,{expectedFingerprint,label:'Import editable '+String(projectAsset.metadata.title).slice(0,170),operations:imported.operations},{signal});
 return {...changed,nodeId:imported.nodeId,assets:[projectAsset,scriptAsset]};
}

"use client";
import { legacyAsset, inspectLegacySource } from "@graph/legacy-source.mjs";
import { createNodeOperations } from "@graph/commands.mjs";
import type { GraphDocument,GraphOperation,GraphRepository } from "@graph/types.mjs";

export async function prepareLegacyImport(files:File[],document:GraphDocument,repository:GraphRepository,start:number){
 const project=files.find(file=>file.name==='project.json'),drawing=files.find(file=>file.name==='draw.js');
 if(!project||!drawing||files.length!==2)throw new Error('Select project.json and draw.js from the same Looplilt film.');
 if(project.size>2*1024*1024||drawing.size>2*1024*1024)throw new Error('Each Looplilt source file must fit within 2 MiB');
 const [projectBytes,scriptBytes]=await Promise.all([project.arrayBuffer(),drawing.arrayBuffer()]);
 const checked=inspectLegacySource('legacy-project',projectBytes);
 const [projectAsset,scriptAsset]=await Promise.all([legacyAsset('legacy-project',projectBytes,'project.json'),legacyAsset('legacy-script',scriptBytes,'draw.js')]);
 projectAsset.metadata.scriptAsset=scriptAsset.id;
 await repository.putAsset(projectAsset,project,{projectId:document.id});
 await repository.putAsset(scriptAsset,drawing,{projectId:document.id});
 const duration=Math.max(1,Math.floor(checked.project.duration*document.frameRate.numerator/document.frameRate.denominator+1e-7)),end=Math.max(document.durationFrames,start+duration);
 const operations:GraphOperation[]=[];
 for(const asset of [projectAsset,scriptAsset])if(!document.assets[asset.id])operations.push({op:'asset.add',asset});
 if(end!==document.durationFrames)operations.push({op:'project.patch',changes:{durationFrames:end}});
 const nodeId='canvas_'+crypto.randomUUID();
 operations.push(...createNodeOperations(document,[{id:nodeId,type:'canvas',name:checked.project.title,start,duration,props:{projectAsset:projectAsset.id,scriptAsset:scriptAsset.id,width:document.width,height:document.height}}]));
 return {operations,nodeId};
}

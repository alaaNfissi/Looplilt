import {validateGraph} from './schema.mjs';
function same(a,b){
 if(Object.is(a,b))return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>same(value,b[index]));
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
}
function fields(before,after){
 const result=[];let count=0;
 const add=value=>{count++;if(result.length<64)result.push(value.slice(0,320));};
 for(const key of [...new Set([...Object.keys(before),...Object.keys(after)])].sort()){
  if(same(before[key],after[key]))continue;
  if(['transform','props','animations','transition','time'].includes(key)&&before[key]&&after[key]){
   for(const name of [...new Set([...Object.keys(before[key]),...Object.keys(after[key])])].sort())if(!same(before[key][name],after[key][name]))add(key+'.'+name);
  }else add(key);
 }
 return {fields:result,fieldCount:count,fieldsTruncated:count>result.length};
}
/** Structural differences, never a subjective or pixel-equivalence claim. */
export function compareGraphDocuments(before,after,{offset=0,limit=40}={}){
 validateGraph(before,{allowUnsupported:true});validateGraph(after,{allowUnsupported:true});
 if(before.id!==after.id)throw new Error('Revision comparisons must refer to the same project');
 if(!Number.isInteger(offset)||offset<0||offset>20001||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Use a comparison offset in0..20001 and page size in1..100');
 const changes=[],counts={nodes:{added:0,removed:0,changed:0},assets:{added:0,removed:0,changed:0}};
 const metadata=Object.fromEntries(Object.entries(before).filter(([key])=>!['nodes','assets'].includes(key))),nextMetadata=Object.fromEntries(Object.entries(after).filter(([key])=>!['nodes','assets'].includes(key)));
 const project=fields(metadata,nextMetadata);
 if(project.fieldCount)changes.push({kind:'project',id:before.id,status:'changed',...project});
 for(const kind of ['nodes','assets'])for(const id of [...new Set([...Object.keys(before[kind]),...Object.keys(after[kind])])].sort()){
  const previous=before[kind][id],next=after[kind][id];
  if(!previous||!next){const status=previous?'removed':'added';counts[kind][status]++;changes.push({kind,id,status});}
  else{const diff=fields(previous,next);if(diff.fieldCount){counts[kind].changed++;changes.push({kind,id,status:'changed',...diff});}}
 }
 return {projectId:before.id,fromRevision:before.revision,toRevision:after.revision,counts,items:changes.slice(offset,offset+limit),total:changes.length,nextOffset:offset+limit<changes.length?offset+limit:null};
}

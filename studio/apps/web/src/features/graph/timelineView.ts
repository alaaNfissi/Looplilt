import type { Clip, ClipContent, ProjectDocument } from "@looplilt-studio/types";
import { staticValue } from "@looplilt-studio/types";
import { createClip, createProject, createTrack } from "@looplilt-studio/utils";
import type { GraphDocument, GraphNode, GraphOperation, Keyframe } from "@graph/types.mjs";

export interface Clock { rate:number; offset:number }
export interface GraphClipView { parentClock:Clock; sourceClock:Clock; keys:Record<string,Keyframe[]>; nodeType:string }
const containers=new Set(["composition","group","track","camera"]);
/** View-only projection for the vendored timeline. It is never saved or rendered. */
export function graphClocks(document:GraphDocument):Record<string,Clock> {
 const clocks:Record<string,Clock>={};
 function visit(id:string,parent:Clock){const n=document.nodes[id],speed=n.time.speed.numerator/n.time.speed.denominator;const clock={rate:parent.rate*speed,offset:n.time.offset.numerator/n.time.offset.denominator+(parent.offset-n.time.start)*speed};clocks[id]=clock;for(const child of n.children)visit(child,clock);}
 visit(document.rootId,{rate:1,offset:0});return clocks;
}
function contentFor(node:GraphNode):ClipContent {
 const p=node.props;
 if(node.type==='audio')return {kind:'audio',mediaId:String(p.asset),sourceInFrame:0,speed:1,volume:staticValue(Number(p.gain)),muted:Boolean(p.muted),fadeInFrames:Number(p.fadeIn),fadeOutFrames:Number(p.fadeOut)};
 if(node.type==='video')return {kind:'video',mediaId:String(p.asset),sourceInFrame:0,speed:1,volume:staticValue(Number(p.gain)),muted:Boolean(p.muted)};
 if(node.type==='image')return {kind:'image',mediaId:String(p.asset)};
 return {kind:'plugin',contentType:'looplilt:graph',data:{nodeType:node.type}};
}
export function timelineView(document:GraphDocument):ProjectDocument {
 const project=createProject(document.title),clocks=graphClocks(document);
 project.id=document.id;project.createdAt=0;project.modifiedAt=document.revision;project.settings={...project.settings,resolution:{width:document.width,height:document.height},frameRate:document.frameRate.numerator/document.frameRate.denominator};
 project.durationFrames=document.durationFrames;project.entities={clips:{},tracks:{},media:{},markers:{},captionTracks:{}};project.trackOrder=[];
 function visit(id:string,depth:number){
  const node=document.nodes[id],parentClock=node.parentId?clocks[node.parentId]:{rate:1,offset:0};
  if(containers.has(node.type)){
   const track=createTrack({id,name:`${'· '.repeat(Math.min(depth,6))}${id===document.rootId?'Composition':node.type==='track'?'Track · '+node.name:node.name}`,kind:node.type==='track'&&node.props.kind==='audio'?'audio':'video',index:project.trackOrder.length});
   Object.assign(track,{graphNodeId:id,graphParentId:id,graphMute:Object.hasOwn(node.props,'muted'),graphVisual:!(node.type==='track'&&node.props.kind==='audio'),height:36,locked:node.locked,hidden:!node.visible,muted:Boolean(node.props.muted),solo:Boolean(node.props.solo),volume:Number(node.props.gain??1)});
   project.entities.tracks[id]=track;project.trackOrder.unshift(id);
  }else{
   // Every simultaneously editable object gets a visible lane. Lane IDs are a
   // projection only: edits still target the actual node and its real parent.
   const laneId='lane:'+id,audioOnly=node.type==='audio'||node.type==='score';
   let inheritedLocked=false,ancestorId=node.parentId;while(ancestorId){inheritedLocked||=document.nodes[ancestorId].locked;ancestorId=document.nodes[ancestorId].parentId;}
   const lane=createTrack({id:laneId,name:`${'· '.repeat(Math.min(depth,6))}${node.name}`,kind:audioOnly?'audio':'video',index:project.trackOrder.length});
   Object.assign(lane,{graphNodeId:id,graphParentId:node.parentId??document.rootId,graphMute:Object.hasOwn(node.props,'muted'),graphVisual:!audioOnly,graphInheritedLocked:inheritedLocked,locked:node.locked||inheritedLocked,hidden:!node.visible,muted:Boolean(node.props.muted),height:52,volume:Number(node.props.gain??1)});
   project.entities.tracks[laneId]=lane;project.trackOrder.unshift(laneId);
   const clip=createClip({id,name:node.name,trackId:laneId,startFrame:(node.time.start-parentClock.offset)/parentClock.rate,durationFrames:node.time.duration/parentClock.rate,content:contentFor(node)});
   clip.locked=node.locked;clip.hidden=!node.visible;
   let ancestor=node.parentId;while(ancestor){clip.locked||=document.nodes[ancestor].locked;ancestor=document.nodes[ancestor].parentId;}
   const clock=clocks[id];clip.graph={nodeType:node.type,parentClock,sourceClock:clock,keys:Object.fromEntries(Object.entries(node.animations).map(([property,keys])=>[property,keys.map(key=>({...key,frame:(key.frame-clock.offset)/clock.rate}))]))};
   project.entities.clips[id]=clip;
  }
  for(const child of node.children)visit(child,depth+(id===document.rootId?0:1));
 }
 visit(document.rootId,0);
 project.trackOrder.forEach((id,index)=>project.entities.tracks[id].index=index);
 return project;
}
export function changedClipOperations(document:GraphDocument,before:Clip,after:Clip):GraphOperation[]{
 const node=document.nodes[before.id],ops:GraphOperation[]=[];
 if(!node)throw new Error('This node no longer exists');
 const parent=before.graph?.parentClock??{rate:1,offset:0};
 if(before.startFrame!==after.startFrame||before.durationFrames!==after.durationFrames)ops.push({op:'node.patch',id:node.id,changes:{time:{start:Math.max(0,Math.round(after.startFrame*parent.rate+parent.offset)),duration:Math.max(1,Math.round(after.durationFrames*parent.rate))}}});
 if(after.graph&&before.graph){
  const clock=before.graph.sourceClock;
  for(const property of new Set([...Object.keys(before.graph.keys),...Object.keys(after.graph.keys)])){
   if(JSON.stringify(before.graph.keys[property])===JSON.stringify(after.graph.keys[property]))continue;
   const keys=after.graph.keys[property]?.map(key=>({...key,frame:Math.round(key.frame*clock.rate+clock.offset)}));
   ops.push({op:'animation.set',id:node.id,property,keyframes:keys?.length?keys:null});
  }
 }
 return ops;
}

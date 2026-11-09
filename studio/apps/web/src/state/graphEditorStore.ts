"use client";
import { create } from "zustand";
import type { Clip } from "@looplilt-studio/types";
import { companionFromLocation } from "@graph/remote-workspace.mjs";
import { BrowserGraphWorkspace } from "@graph/browser-workspace.mjs";
import { createGraph, validateGraph } from "@graph/schema.mjs";
import { createNodeOperations } from "@graph/commands.mjs";
import { applyTransaction, graphFingerprint } from "@graph/transactions.mjs";
import type { GraphDocument, GraphOperation, GraphRepository, GraphState } from "@graph/types.mjs";
import { changedClipOperations, graphClocks, timelineView } from "@/features/graph/timelineView";

export const MIN_PIXELS_PER_FRAME=.01,MAX_PIXELS_PER_FRAME=40,DEFAULT_PIXELS_PER_FRAME=4;
const initial=createGraph({id:'unsaved-project'});
type TimelineProject=ReturnType<typeof timelineView>;
interface EditorState {
 graph:GraphDocument;fingerprint:string;project:TimelineProject;history:{undo:string[];redo:string[]};ready:boolean;busy:boolean;dirty:boolean;error:string|null;lastSavedAt:number|null;
 playhead:number;pixelsPerFrame:number;scrollFrame:number;selectedClipIds:string[];isPlaying:boolean;snapEnabled:boolean;inPoint:number|null;outPoint:number|null;
 initialize:()=>Promise<void>;flush:()=>Promise<boolean>;edit:(label:string,operations:GraphOperation[],expectedFingerprint?:string)=>Promise<boolean>;previewEdit:(label:string,operations:GraphOperation[],key:string)=>void;endGesture:()=>void;cancelGesture:()=>void;
 addNode:(type:string)=>Promise<boolean>;newProject:()=>Promise<boolean>;openGraph:(document:GraphDocument)=>Promise<boolean>;openSaved:(id:string)=>Promise<boolean>;refresh:()=>Promise<void>;dismissError:()=>void;
 setPlayhead:(frame:number)=>void;setZoom:(zoom:number)=>void;zoomBy:(factor:number)=>void;setScrollFrame:(frame:number)=>void;selectClips:(ids:string[])=>void;clearSelection:()=>void;togglePlaying:()=>void;toggleSnap:()=>void;
 setInPoint:(frame:number|null)=>void;setOutPoint:(frame:number|null)=>void;clearInOut:()=>void;
 moveClipTo:(id:string,frame:number,trackId?:string)=>void;trimClipTo:(id:string,edge:"start"|"end",frame:number)=>void;updateClip:(id:string,updater:(clip:Clip)=>Clip,label:string,mergeKey?:string)=>void;splitAtPlayhead:()=>void;deleteSelected:()=>void;
 setTrackFlag:(id:string,flag:'locked'|'hidden'|'muted',value:boolean)=>void;addTrack:(kind:'video'|'audio')=>void;
 moveCaptionBlock:(trackId:string,id:string,frame:number)=>void;trimCaptionBlock:(trackId:string,id:string,edge:'start'|'end',frame:number)=>void;removeCaptionTrack:(id:string)=>void;
 undo:()=>void;redo:()=>void;
}
let repository:GraphRepository|null=null,initializing:Promise<void>|null=null;
let committed:GraphState|null=null;
let queue:Promise<void>=Promise.resolve();
let gesture:{base:GraphState;label:string;key:string;operations:GraphOperation[];sequence:number;preview:Promise<void>;invalid:boolean}|null=null;
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
export function graphRepository(){if(!repository)throw new Error('Open a workspace first');return repository;}
function accept(state:GraphState){committed=state;useGraphEditorStore.setState({graph:state.document,fingerprint:state.fingerprint,history:state.history,project:timelineView(state.document),lastSavedAt:state.savedAt,dirty:false,error:null});}
function enqueue(action:()=>Promise<void>){const next=queue.then(async()=>{useGraphEditorStore.setState({busy:true});try{await action();return true;}catch(error){useGraphEditorStore.setState({error:message(error)});return false;}finally{useGraphEditorStore.setState({busy:false});}});queue=next.then(()=>{});return next;}
async function commit(label:string,operations:GraphOperation[],base=committed,expectedFingerprint?:string){
 if(!base)throw new Error('The workspace is still opening');if(!operations.length)return;
 try{accept(await graphRepository().transact(base.document.id,{label,operations,expectedFingerprint:expectedFingerprint??base.fingerprint}));}
 catch(error){try{accept(await graphRepository().read(base.document.id));}catch{/* Preserve the last valid in-memory state. */}throw error;}
}
async function finishGesture(){const current=gesture;if(!current)return;await current.preview;if(gesture!==current)return;gesture=null;if(current.invalid){const error=useGraphEditorStore.getState().error;if(committed)accept(committed);throw new Error(error??"The unfinished edit was not valid");}await commit(current.label,current.operations,current.base);}
function preview(label:string,operations:GraphOperation[],key:string){
 if(!committed||useGraphEditorStore.getState().busy)return;
 if(gesture&&gesture.key!==key){void enqueue(finishGesture).then(ok=>{if(ok)preview(label,operations,key);});return;}
 gesture??={base:committed,label,key,operations:[],sequence:0,preview:Promise.resolve(),invalid:false};
 const current=gesture,sequence=++current.sequence;current.operations=operations;current.invalid=false;
 current.preview=applyTransaction(current.base.document,{label,operations,expectedFingerprint:current.base.fingerprint}).then(result=>{
  if(gesture!==current||current.sequence!==sequence)return;
  useGraphEditorStore.setState({graph:result.document,project:timelineView(result.document),dirty:true,error:null});
 }).catch(error=>{if(gesture!==current||current.sequence!==sequence)return;current.invalid=true;useGraphEditorStore.setState({error:message(error)});});
}
export const useGraphEditorStore=create<EditorState>()((set,get)=>({
 graph:initial,fingerprint:'',project:timelineView(initial),history:{undo:[],redo:[]},ready:false,busy:false,dirty:false,error:null,lastSavedAt:null,
 playhead:0,pixelsPerFrame:DEFAULT_PIXELS_PER_FRAME,scrollFrame:0,selectedClipIds:[],isPlaying:false,snapEnabled:true,inPoint:null,outPoint:null,
 initialize:()=>initializing??=(async()=>{
  try{repository=companionFromLocation()??await BrowserGraphWorkspace.open();const projects=await repository.list();accept(projects.length?await repository.read(projects[0].id):await repository.create(createGraph()));
   repository.subscribe(event=>{if(event.error){set({error:event.error});return;}if(event.projectId!==committed?.document.id||event.fingerprint===committed.fingerprint||get().busy)return;void get().refresh().catch(error=>set({error:message(error)}));});set({ready:true});
  }catch(error){set({error:message(error)});initializing=null;}
 })(),
 flush:()=>enqueue(finishGesture),
 edit:(label,operations,expectedFingerprint)=>enqueue(async()=>{await finishGesture();await commit(label,operations,committed,expectedFingerprint);}),
 previewEdit:preview,endGesture:()=>{void enqueue(finishGesture);},
 cancelGesture:()=>{gesture=null;if(committed)accept(committed);},
 refresh:async()=>{
  if(!committed)return;const next=await graphRepository().read(committed.document.id);
  if(next.fingerprint===committed.fingerprint)return;
  const interrupted=!!gesture;gesture=null;accept(next);if(interrupted)set({error:'The project changed in another window. Your unfinished gesture was cancelled; review the updated scene before continuing.'});
 },
 dismissError:()=>set({error:null}),
 newProject:()=>enqueue(async()=>{await finishGesture();accept(await graphRepository().create(createGraph()));set({playhead:0,selectedClipIds:[],isPlaying:false,inPoint:null,outPoint:null});}),
 openSaved:id=>enqueue(async()=>{await finishGesture();accept(await graphRepository().read(id));set({playhead:0,selectedClipIds:[],isPlaying:false,inPoint:null,outPoint:null});}),
 openGraph:document=>enqueue(async()=>{
  await finishGesture();validateGraph(document,{allowUnsupported:true});const fingerprint=await graphFingerprint(document);
  const existing=(await graphRepository().list()).find(item=>item.id===document.id);
  if(existing?.fingerprint===fingerprint)accept(await graphRepository().read(document.id));
  else accept(await graphRepository().create(existing?{...document,id:crypto.randomUUID(),title:document.title+' (imported copy)'}:document));
  set({playhead:0,selectedClipIds:[],isPlaying:false,inPoint:null,outPoint:null});
 }),
 addNode:type=>enqueue(async()=>{
  await finishGesture();if(!committed)return;const document=committed.document,id=`${type}_${crypto.randomUUID()}`;
  const selected=document.nodes[get().selectedClipIds[0]],parent=selected&&['group','composition','track','camera'].includes(selected.type)?selected.id:document.rootId;
  const padding=Math.max(0,Math.floor(document.width*.08)),fontSize=Math.max(8,Math.min(64,Math.floor(document.width*.05)));
  const props:Record<string,string|number|boolean>=type==='text'?{text:'Your next story',fontSize,maxWidth:Math.max(1,document.width-2*padding)}:type==='rectangle'?{width:Math.max(1,Math.min(320,document.width*.4)),height:Math.max(1,Math.min(180,document.height*.4)),fill:'#ecbd79'}:type==='ellipse'?{width:Math.max(1,Math.min(180,document.width*.4)),height:Math.max(1,Math.min(180,document.height*.4)),fill:'#82c7b1'}:{};
  const operations=createNodeOperations(document,[{id,type,parentId:parent,name:type==='text'?'Title':type.charAt(0).toUpperCase()+type.slice(1),props,transform:{x:padding,y:Math.floor(document.height*.16),rotation:0,scaleX:1,scaleY:1,anchorX:0,anchorY:0}}]);
  await commit(`Add ${type}`,operations);set({selectedClipIds:[id]});
 }),
 setPlayhead:frame=>set({playhead:Math.max(0,Math.min(get().graph.durationFrames-1,Math.round(frame)))}),
 setZoom:zoom=>set({pixelsPerFrame:Math.max(MIN_PIXELS_PER_FRAME,Math.min(MAX_PIXELS_PER_FRAME,zoom))}),zoomBy:factor=>get().setZoom(get().pixelsPerFrame*factor),
 setScrollFrame:frame=>set({scrollFrame:Math.max(0,frame)}),selectClips:ids=>set({selectedClipIds:ids.filter(id=>!!get().graph.nodes[id])}),clearSelection:()=>set({selectedClipIds:[]}),
 togglePlaying:()=>set(state=>({isPlaying:!state.isPlaying})),toggleSnap:()=>set(state=>({snapEnabled:!state.snapEnabled})),
 setInPoint:frame=>set(state=>({inPoint:frame,outPoint:frame!==null&&state.outPoint!==null&&state.outPoint<=frame?null:state.outPoint})),
 setOutPoint:frame=>set(state=>({outPoint:frame,inPoint:frame!==null&&state.inPoint!==null&&state.inPoint>=frame?null:state.inPoint})),clearInOut:()=>set({inPoint:null,outPoint:null}),
 moveClipTo:(id,frame,trackId)=>{
  const document=gesture?.base.document??committed?.document;if(!document)return;const node=document.nodes[id],target=trackId?get().project.entities.tracks[trackId]:undefined,parentId=target?.graphParentId??trackId??node.parentId;if(!parentId)return;
  const parentClock=graphClocks(document)[parentId],start=Math.max(0,Math.round(frame*parentClock.rate+parentClock.offset));
  const operations:GraphOperation[]=[];
  const sibling=target?.graphNodeId,targetNode=sibling?document.nodes[sibling]:undefined;
  if(targetNode&&sibling!==id&&targetNode.parentId===parentId&&!['composition','group','track','camera'].includes(targetNode.type))operations.push({op:'node.move',id,parentId,index:document.nodes[parentId].children.indexOf(sibling!)});
  else if(node.parentId!==parentId)operations.push({op:'node.move',id,parentId});
  operations.push({op:'node.patch',id,changes:{time:{start}}});preview('Move clip',operations,`move:${id}`);
 },
 trimClipTo:(id,edge,frame)=>{
  const document=gesture?.base.document??committed?.document;if(!document)return;const node=document.nodes[id];if(!node.parentId)return;
  const clock=graphClocks(document)[node.parentId],position=Math.round(frame*clock.rate+clock.offset);
  const target=edge==='start'?Math.max(0,Math.min(node.time.start+node.time.duration-1,position)):Math.max(node.time.start+1,position);
  preview('Trim clip',[{op:'clip.trim',id,[edge]:target}],`trim:${id}`);
 },
 updateClip:(id,updater,label,mergeKey)=>{
  const current=get().project.entities.clips[id];if(!current||current.locked)return;const changed=updater(current),base=gesture?.base.document??committed?.document;if(!base)return;
  const operations=changedClipOperations(base,timelineView(base).entities.clips[id],changed);if(!operations.length)return;
  if(mergeKey){set(state=>({project:{...state.project,entities:{...state.project.entities,clips:{...state.project.entities.clips,[id]:changed}}}}));preview(label,operations,mergeKey);}else void get().edit(label,operations);
 },
 splitAtPlayhead:()=>{void enqueue(async()=>{
  await finishGesture();if(!committed)return;const document=committed.document,clocks=graphClocks(document),selected=get().selectedClipIds;
  const candidates=selected.length?selected:Object.keys(get().project.entities.clips),operations:GraphOperation[]=[];
  for(const id of candidates){const node=document.nodes[id];if(!node||node.children.length||!node.parentId)continue;const parent=clocks[node.parentId],at=Math.round(get().playhead*parent.rate+parent.offset);if(at>node.time.start&&at<node.time.start+node.time.duration)operations.push({op:'clip.split',id,at,newId:`clip_${crypto.randomUUID()}`});}
  await commit('Split clips',operations);
 });},
 deleteSelected:()=>{void enqueue(async()=>{
  await finishGesture();if(!committed)return;const document=committed.document;
  const ids=new Set(get().selectedClipIds.filter(id=>id!==document.rootId&&!!document.nodes[id]));
  const operations:GraphOperation[]=[];
  for(const id of ids){
   let parentId=document.nodes[id].parentId,covered=false;
   while(parentId){if(ids.has(parentId)){covered=true;break;}parentId=document.nodes[parentId].parentId;}
   if(!covered)operations.push({op:'node.remove',id,cascade:true});
  }
  await commit('Delete selection',operations);set({selectedClipIds:[]});
 });},
 setTrackFlag:(laneId,flag,value)=>{const id=get().project.entities.tracks[laneId]?.graphNodeId??laneId;void get().edit(`Change layer ${flag}`,[{op:'node.patch',id,changes:flag==='hidden'?{visible:!value}:flag==='muted'?{props:{muted:value}}:{locked:value}}]);},
 addTrack:kind=>{void enqueue(async()=>{await finishGesture();if(!committed)return;await commit(`Add ${kind} track`,createNodeOperations(committed.document,[{id:`track_${crypto.randomUUID()}`,type:'track',name:kind==='audio'?'Audio track':'Visual track',props:{kind:kind==='audio'?'audio':'visual'}}]));});},
 moveCaptionBlock:(_track,id,frame)=>get().moveClipTo(id,frame),
 trimCaptionBlock:(_track,id,edge,frame)=>{const clip=get().project.entities.clips[id];if(!clip)return;get().updateClip(id,c=>({...c,startFrame:edge==='start'?Math.min(frame,c.startFrame+c.durationFrames-1):c.startFrame,durationFrames:edge==='start'?Math.max(1,c.startFrame+c.durationFrames-frame):Math.max(1,frame-c.startFrame)}),'Trim caption',`trim:${id}`);},
 removeCaptionTrack:id=>{void get().edit('Remove captions',[{op:'node.remove',id,cascade:true}]);},
 undo:()=>{void enqueue(async()=>{await finishGesture();if(committed)accept(await graphRepository().undoRedo(committed.document.id,'undo',committed.fingerprint));});},
 redo:()=>{void enqueue(async()=>{await finishGesture();if(committed)accept(await graphRepository().undoRedo(committed.document.id,'redo',committed.fingerprint));});},
}));
export const selectOrderedTracks=(state:EditorState)=>state.project.trackOrder.map(id=>state.project.entities.tracks[id]);
export const selectClipsArray=(state:EditorState)=>Object.values(state.project.entities.clips);

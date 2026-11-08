"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasGraphRenderer } from "@graph/canvas-renderer.mjs";
import { compileGraph, inverseTransform } from "@graph/evaluate.mjs";
import { keyframeValue } from '@graph/animation.mjs';
import { transformPoint } from "@graph/animation.mjs";
import type { GraphDocument, GraphOperation } from "@graph/types.mjs";
import { graphRepository, useGraphEditorStore } from "@/state/graphEditorStore";
import { useElementSize } from "@/hooks/useElementSize";
import { GraphMediaProvider } from "./GraphMediaProvider";

export function GraphPreview(){
 const graph=useGraphEditorStore(s=>s.graph),frame=useGraphEditorStore(s=>s.playhead),ready=useGraphEditorStore(s=>s.ready),selected=useGraphEditorStore(s=>s.selectedClipIds);
 const canvas=useRef<HTMLCanvasElement>(null),pump=useRef<()=>void>(()=>{}),pending=useRef<{graph:GraphDocument;frame:number}|null>(null);
 const drag=useRef<{id:string;x:number;y:number;startX:number;startY:number;inverse:number[];sourceFrame:number}|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [published,setPublished]=useState<{document:GraphDocument;frame:number}|null>(null);
 const current=published?.document===graph&&published.frame===frame;
 const fitting=useRef<HTMLDivElement>(null),size=useElementSize(fitting);
 const fitWidth=Math.max(0,Math.min(size.width,size.height*graph.width/graph.height));
 const width=Math.min(graph.width,1280),height=Math.round(width*graph.height/graph.width);
 const compiled=useMemo(()=>{try{return compileGraph(graph);}catch{return null;}},[graph]);
 const scene=useMemo(()=>{try{return compiled?.evaluate(frame)??null;}catch{return null;}},[compiled,frame]);
 useEffect(()=>{
  const element=canvas.current;if(!element||!ready)return;
  const controller=new AbortController(),media=new GraphMediaProvider(useGraphEditorStore.getState().graph,graphRepository());
  let renderer:CanvasGraphRenderer|null=null,lastDocument:GraphDocument|null=null,running=false,closed=false;
  const drain=async()=>{
   if(running||closed)return;running=true;
   try{while(pending.current&&!closed){const next=pending.current;pending.current=null;
    try{media.replace(next.graph);if(!renderer)renderer=new CanvasGraphRenderer(element,next.graph,{mediaProvider:media});else if(lastDocument!==next.graph)renderer.replace(next.graph);lastDocument=next.graph;
     await renderer.render(next.frame,{signal:controller.signal});if(!closed){element.dataset.frame=String(next.frame);element.dataset.revision=String(next.graph.revision);element.dataset.project=next.graph.id;setPublished({document:next.graph,frame:next.frame});setError(null);}
    }catch(failure){if(!closed)setError(failure instanceof Error?failure.message:String(failure));}
   }}finally{running=false;if(closed){renderer?.dispose();media.dispose();}}
  };
  pump.current=()=>void drain();pending.current={graph:useGraphEditorStore.getState().graph,frame:useGraphEditorStore.getState().playhead};void drain();
  return()=>{closed=true;controller.abort();pump.current=()=>{};if(!running){renderer?.dispose();media.dispose();}};
 },[ready,width,height]);
 useEffect(()=>{pending.current={graph,frame};pump.current();},[graph,frame]);
 const point=(event:React.PointerEvent)=>{const rect=canvas.current!.getBoundingClientRect();return {x:(event.clientX-rect.left)*graph.width/rect.width,y:(event.clientY-rect.top)*graph.height/rect.height};};
 const choose=(event:React.PointerEvent<HTMLCanvasElement>)=>{
  if(!scene||!current)return;const p=point(event);let hit:string|null=null;
  for(const id of [...scene.paintOrder].reverse()){
   const node=scene.nodes[id];let local;try{local=transformPoint(inverseTransform(node.worldMatrix),p.x,p.y);}catch{continue;}
   const w=Number(node.props.width??node.props.maxWidth??0),h=Number(node.props.height??(Number(node.props.fontSize??0)*Number(node.props.lineHeight??1.2)*Math.max(1,String(node.props.text??'').split('\n').length)));
   if(local.x>=0&&local.y>=0&&local.x<=w&&local.y<=h){hit=id;break;}
  }
  const store=useGraphEditorStore.getState();store.selectClips(hit?[hit]:[]);if(!hit||store.busy)return;
  const node=graph.nodes[hit];let ancestor:string|null=hit;while(ancestor){if(graph.nodes[ancestor].locked)return;ancestor=graph.nodes[ancestor].parentId;}
  if(node.constraints.length||node.behaviors?.some(behavior=>behavior.enabled&&behavior.type==='motion-path'&&!behavior.props.relative))return;
  const parent=node.parentId?scene.nodes[node.parentId].worldMatrix:[1,0,0,1,0,0];let inverse;try{inverse=inverseTransform(parent);}catch{return;}
  const local=transformPoint(inverse,p.x,p.y);drag.current={id:hit,x:keyframeValue(node.animations['transform.x']??[],scene.nodes[hit].time.sourceFrame,node.transform.x),y:keyframeValue(node.animations['transform.y']??[],scene.nodes[hit].time.sourceFrame,node.transform.y),startX:local.x,startY:local.y,inverse,sourceFrame:Math.max(0,Math.round(scene.nodes[hit].time.sourceFrame))};event.currentTarget.setPointerCapture(event.pointerId);
 };
 return <div className="graph-preview-area">
  <div ref={fitting} className="graph-preview-fit"><div className="graph-canvas-wrap" style={{width:fitWidth,height:fitWidth*graph.height/graph.width}}>
   <canvas ref={canvas} width={width} height={height} aria-label="Looplilt scene preview; select an object to edit it" tabIndex={0}
    onPointerDown={choose} onPointerMove={event=>{const d=drag.current;if(!d)return;const p=point(event),local=transformPoint(d.inverse,p.x,p.y);const node=graph.nodes[d.id],operations:GraphOperation[]=[];for(const [name,value]of Object.entries({x:d.x+local.x-d.startX,y:d.y+local.y-d.startY})){const property=`transform.${name}`,existing=node.animations[property];if(existing){const keys=existing.filter(key=>key.frame!==d.sourceFrame);keys.push({frame:d.sourceFrame,value,easing:'ease-in-out'});keys.sort((a,b)=>a.frame-b.frame);operations.push({op:'animation.set',id:d.id,property,keyframes:keys});}else operations.push({op:'node.patch',id:d.id,changes:{transform:{[name]:value}}});}useGraphEditorStore.getState().previewEdit('Move object',operations,`canvas:${d.id}`);}}
    onPointerUp={event=>{if(drag.current){drag.current=null;useGraphEditorStore.getState().endGesture();}if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
    onPointerCancel={()=>{drag.current=null;useGraphEditorStore.getState().cancelGesture();}}/>
   {scene&&current&&<svg className="graph-selection" viewBox={`0 0 ${graph.width} ${graph.height}`} aria-hidden="true">{selected.map(id=>{const n=scene.nodes[id];if(!n?.visible)return null;return <rect key={id} transform={`matrix(${n.worldMatrix.join(' ')})`} width={Number(n.props.width??n.props.maxWidth??0)} height={Number(n.props.height??Number(n.props.fontSize??0)*1.3)} fill="none" stroke="#ecbd79" strokeWidth="2" vectorEffect="non-scaling-stroke"/>;})}</svg>}
  </div></div>
  {!current&&ready&&!error&&<div className="graph-preview-pending" role="status">Preparing frame…</div>}
  {error&&<div className="graph-preview-error" role="alert">{error}</div>}
  {!Object.keys(graph.nodes).some(id=>id!==graph.rootId)&&<div className="graph-empty"><span>YOUR STORY STARTS HERE</span><h2>A canvas with possibilities.</h2><p>Add a title, build a scene, or bring in your own footage.</p><button onClick={()=>void useGraphEditorStore.getState().addNode('text')}>Add your first title</button></div>}
 </div>;
}

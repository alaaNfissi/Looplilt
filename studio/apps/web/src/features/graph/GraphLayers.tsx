"use client";
import {memo,useMemo,useState} from "react";
import {ChevronRight,Type,Circle,Square,Search} from "lucide-react";
import type {GraphNode} from "@graph/types.mjs";
import {useGraphEditorStore} from "@/state/graphEditorStore";

/** Layer navigation is a view of the graph. Collapse/search never edit a film.
 * Isolated from the transport's frame updates, so playback does not rebuild
 * every layer row on each frame. */
export const GraphLayers=memo(function GraphLayers(){
 const graph=useGraphEditorStore(state=>state.graph),[query,setQuery]=useState("");
 const nodes=useMemo(()=>Object.values(graph.nodes).filter(node=>node.id!==graph.rootId),[graph]);
 const matches=useMemo(()=>{const needle=query.trim().toLocaleLowerCase();return needle?nodes.filter(node=>node.name.toLocaleLowerCase().includes(needle)):null;},[nodes,query]);
 const tree=useMemo(()=>{
  const visit=(id:string,depth:number):React.ReactNode=>{const node=graph.nodes[id];return <LayerRow key={id} node={node} depth={depth} initiallyExpanded={nodes.length<80||depth===0}>{node.children.slice().reverse().map(child=>visit(child,depth+1))}</LayerRow>;};
  return visit(graph.rootId,0);
 },[graph,nodes.length]);
 return <div className="studio-layer-browser">
  {(nodes.length>8||!!query)&&<label className="studio-layer-search"><Search size={13} aria-hidden="true"/><input type="search" aria-label="Find a layer" placeholder="Find a layer…" value={query} onChange={event=>setQuery(event.target.value)}/></label>}
  {matches?<><p className="studio-layer-results" role="status">{matches.length} {matches.length===1?"layer":"layers"}</p>{matches.map(node=><LayerRow key={node.id} node={node} depth={0}/>)}{!matches.length&&<p className="studio-layer-results">Try another name.</p>}</>:tree}
 </div>;
});
function LayerRow({node,depth,children,initiallyExpanded=true}:{node:GraphNode;depth:number;children?:React.ReactNode;initiallyExpanded?:boolean}){
 const selected=useGraphEditorStore(state=>state.selectedClipIds.includes(node.id)),[expanded,setExpanded]=useState(initiallyExpanded);
 const group=!!node.children.length&&children!==undefined,name=node.parentId===null?"Composition":node.name;
 return <><div className="studio-layer-line" style={{paddingLeft:6+Math.min(depth,8)*12}}>
  {group?<button className="studio-layer-disclosure" aria-label={(expanded?"Collapse ":"Expand ")+name} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><ChevronRight size={12} style={{transform:expanded?"rotate(90deg)":undefined}}/></button>:<span className="studio-layer-disclosure-space" aria-hidden="true"/>}
  <button className={"studio-layer "+(selected?"selected":"")} aria-pressed={selected} title={name} onClick={()=>useGraphEditorStore.getState().selectClips([node.id])}><span className="studio-layer-symbol">{node.type==="text"?<Type size={13}/>:node.type==="ellipse"?<Circle size={12}/>:<Square size={12}/>}</span><span>{name}</span><small>{node.locked?"●":node.visible?"":"○"}</small></button>
 </div>{expanded&&children}</>;
}

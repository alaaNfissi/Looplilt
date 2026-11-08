"use client";
import { useMemo } from "react";
import { standardRegistry, defaults } from "@graph/registry.mjs";
import { referenceTargets } from "@graph/references.mjs";
import type { GraphDocument,GraphNode,GraphOperation,Json } from "@graph/types.mjs";
import type { EvaluatedNode } from "@graph/evaluate.mjs";
import { Field } from "./GraphField";
type Edit=(label:string,operations:GraphOperation[],fingerprint?:string)=>Promise<boolean>;
type Keyframe=(property:string,value:number,fingerprint?:string)=>Promise<boolean>;
export function GraphAdvancedControls({graph,node,evaluated,edit,keyframe}:{graph:GraphDocument;node:GraphNode;evaluated?:EvaluatedNode;edit:Edit;keyframe:Keyframe}){
 const targets=useMemo(()=>referenceTargets(graph,node.id),[graph,node.id]);
 const masks=useMemo(()=>referenceTargets(graph,node.id,{mask:true}).filter(id=>{const definition=standardRegistry.node(graph.nodes[id].type,graph.nodes[id].version);return definition?.visual||definition?.container;}),[graph,node.id]);
 const behaviors=node.behaviors??[];
 const addMotion=(preset:string)=>{
  const make=(type:string,props:Record<string,string|number|boolean>)=>{const definition=standardRegistry.behavior(type)!;return {id:'motion_'+crypto.randomUUID(),type,version:definition.version,enabled:true,props:{...defaults(definition.properties),...props}};};
  const entries=preset==='path'?[make('motion-path',{duration:Math.max(1,Math.min(90,node.time.duration))})]:
   preset==='float'?[make('oscillate',{property:'transform.y',amplitude:12,period:90})]:
   preset==='sway'?[make('oscillate',{property:'transform.rotation',amplitude:6,period:120})]:
   preset==='breathe'?[make('oscillate',{property:'transform.scaleX',amplitude:.06,period:90}),make('oscillate',{property:'transform.scaleY',amplitude:.06,period:90})]:[];
  if(entries.length)void edit('Add '+preset+' motion',entries.map(behavior=>({op:'behavior.add',id:node.id,behavior})));
 };
 const constraints=(values:Record<string,Json>[],fp?:string)=>edit('Edit constraints',[{op:'constraints.set',id:node.id,constraints:values}],fp);
 return <>
  <h3>Motion</h3><p className="graph-help">Combine reusable motion with keyframes. Motion uses the layer’s source clock and stays in phase when you trim or split it.</p>
  {behaviors.map((behavior,index)=>{
   const definition=standardRegistry.behavior(behavior.type,behavior.version),live=evaluated?.behaviors?.[index]??behavior;
   return <section className="graph-motion" key={behavior.id} aria-label={(definition?.label??behavior.type)+' controls'}>
    <header><strong>{definition?.label??behavior.type}</strong><button aria-label={'Remove '+(definition?.label??behavior.type)} onClick={()=>void edit('Remove motion',[{op:'behavior.remove',id:node.id,behaviorId:behavior.id}])}>×</button></header>
    <Field name="Motion enabled" value={behavior.enabled} meta={{kind:'boolean'}} onCommit={(value,fp)=>edit('Toggle motion',[{op:'behavior.patch',id:node.id,behaviorId:behavior.id,enabled:value}],fp)}/>
    {Object.entries(definition?.properties??{}).filter(([name])=>!(behavior.type==='motion-path'&&name==='progress'&&behavior.props.driver==='time'&&!node.animations['behaviors.'+behavior.id+'.progress'])).map(([name,meta])=>{
     const property='behaviors.'+behavior.id+'.'+name;
     return <div className="graph-animated-field" key={name}><Field name={name} value={live.props[name]} meta={meta} onCommit={(value,fp)=>{
      if(node.animations[property]&&typeof value==='number')return keyframe(property,value,fp);
      const props:Record<string,string|number|boolean>={[name]:value};
      if(behavior.type==='motion-path'&&name==='driver'&&value==='progress')props.progress=live.props.progress;
      return edit('Edit motion',[{op:'behavior.patch',id:node.id,behaviorId:behavior.id,props}],fp);
     }}/>{meta.animate&&meta.kind==='number'&&<button className={node.animations[property]?'has-keyframe':''} aria-label={'Set '+name+' motion keyframe at playhead'} onClick={()=>void keyframe(property,Number(live.props[name]))}>◇</button>}</div>;
    })}
    {behavior.type==='motion-path'&&<p className="graph-help">Path commands: M, L, Q, C and Z. Coordinates are in project pixels. Enable Relative to reposition the path by dragging the layer. Progress keyframes override the time driver.</p>}
    {!definition&&<p className="graph-help">This motion is preserved. Its registered evaluator is required for playback.</p>}
   </section>;
  })}
  <label className="graph-field"><span>Add motion</span><select aria-label="Add motion" value="" disabled={behaviors.length>=16} onChange={e=>addMotion(e.target.value)}><option value="">Choose a movement…</option><option value="path">Follow a path</option><option value="float">Float</option><option value="sway">Sway</option><option value="breathe" disabled={behaviors.length>14}>Breathe</option></select></label>
  <h3>Mask</h3><label className="graph-field"><span>Mask layer</span><select aria-label="Mask layer" value={node.mask?.nodeId??''} onChange={e=>void edit('Set mask',[{op:'mask.set',id:node.id,mask:e.target.value?{nodeId:e.target.value,mode:node.mask?.mode??'alpha'}:null}])}><option value="">No mask</option>{masks.map(id=><option key={id} value={id}>{graph.nodes[id].name}</option>)}</select></label>
  {node.mask&&<><Field name="Mask mode" value={node.mask.mode} meta={{kind:'enum',values:['alpha','inverse-alpha']}} onCommit={(value,fp)=>edit('Edit mask',[{op:'mask.set',id:node.id,mask:{nodeId:node.mask!.nodeId,mode:value}}],fp)}/><p className="graph-help">The mask layer supplies transparency and is hidden from the final composition.</p></>}
  <h3>Constraints</h3>
  {node.constraints.map((constraint,index)=><section className="graph-motion" key={index} aria-label={'Constraint '+(index+1)}><header><strong>{constraint.type==='follow'?'Follow position':'Look at'}</strong><button aria-label={'Remove constraint '+(index+1)} onClick={()=>void constraints(node.constraints.filter((_,i)=>i!==index))}>×</button></header>
   <label className="graph-field"><span>Target layer</span><select aria-label={'Constraint '+(index+1)+' target'} value={String(constraint.target)} onChange={e=>void constraints(node.constraints.map((item,i)=>i===index?{...item,target:e.target.value}:item))}>{targets.map(id=><option key={id} value={id}>{graph.nodes[id].name}</option>)}</select></label>
   {constraint.type==='follow'&&<div className="graph-property-grid">{['offsetX','offsetY'].map(name=><Field key={name} name={name} value={Number(constraint[name])} meta={{kind:'number',min:-1000000,max:1000000}} onCommit={(value,fp)=>constraints(node.constraints.map((item,i)=>i===index?{...item,[name]:value}:item),fp)}/>)}</div>}
  </section>)}
  <label className="graph-field"><span>Add constraint</span><select aria-label="Add constraint" value="" disabled={!targets.length||node.constraints.length>=8} onChange={e=>{if(!e.target.value)return;void constraints([...node.constraints,{type:e.target.value,target:targets[0],...(e.target.value==='follow'?{offsetX:0,offsetY:0}:{})}]);}}><option value="">Link to another layer…</option><option value="follow">Follow position</option><option value="look-at">Look at</option></select></label>
 </>;
}

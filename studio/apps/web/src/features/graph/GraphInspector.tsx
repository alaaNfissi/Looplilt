"use client";
import { useMemo } from "react";
import { standardRegistry, TRANSFORM_PROPERTIES } from "@graph/registry.mjs";
import { Field } from "./GraphField";
import { GraphAdvancedControls } from "./GraphAdvancedControls";
import { keyframeValue } from "@graph/animation.mjs";
import { compileGraph } from "@graph/evaluate.mjs";
import type { GraphOperation } from "@graph/types.mjs";
import { useGraphEditorStore } from "@/state/graphEditorStore";

export function GraphInspector(){
 const graph=useGraphEditorStore(s=>s.graph),id=useGraphEditorStore(s=>s.selectedClipIds[0]),frame=useGraphEditorStore(s=>s.playhead),busy=useGraphEditorStore(s=>s.busy),rawEdit=useGraphEditorStore(s=>s.edit),renderedFingerprint=useGraphEditorStore(s=>s.fingerprint);
 const edit=(label:string,operations:GraphOperation[],fingerprint?:string)=>rawEdit(label,operations,fingerprint===useGraphEditorStore.getState().fingerprint?renderedFingerprint:fingerprint??renderedFingerprint);
 const compiled=useMemo(()=>{try{return compileGraph(graph);}catch{return null;}},[graph]);
 const evaluated=useMemo(()=>{try{return compiled?.evaluateNode(frame,id);}catch{return undefined;}},[compiled,frame,id]);
 const node=graph.nodes[id];
 if(!node)return <aside className="graph-inspector"><div className="graph-panel-heading">Properties</div><div className="graph-inspector-empty"><span>MAKE IT YOURS</span><h3>Select something.<br/>Change everything.</h3><p>Pick a layer or an object on the canvas. Its properties, timing, and motion stay editable.</p></div></aside>;
 const type=standardRegistry.node(node.type,node.version),locked=node.locked,root=id===graph.rootId;
 const patch=(changes:Record<string,unknown>,fingerprint?:string)=>{
  const ops:GraphOperation[]=[],remaining={...changes},project:Record<string,unknown>={};
  if(root&&changes.props){const props={...changes.props as Record<string,unknown>};for(const name of ['width','height'])if(name in props){project[name]=props[name];delete props[name];}if(Object.keys(props).length)remaining.props=props;else delete remaining.props;}
  if(root&&changes.time){const time={...changes.time as Record<string,unknown>};if('duration'in time){project.durationFrames=time.duration;delete time.duration;}if(Object.keys(time).length)remaining.time=time;else delete remaining.time;}
  if(Object.keys(project).length)ops.push({op:'project.patch',changes:project});if(Object.keys(remaining).length)ops.push({op:'node.patch',id,changes:remaining});return edit(`Edit ${node.name}`,ops,fingerprint);
 };
 const keyframe=(property:string,value:number,fingerprint?:string)=>{
  if(!evaluated)return Promise.resolve(false);
  const sourceFrame=Math.max(0,Math.round(evaluated.time.sourceFrame)),keys=(node.animations[property]??[]).filter(key=>key.frame!==sourceFrame);
  keys.push({frame:sourceFrame,value,easing:'ease-in-out'});keys.sort((a,b)=>a.frame-b.frame);
  return edit('Set keyframe',[{op:'animation.set',id,property,keyframes:keys}],fingerprint);
 };
 const property=(group:'transform'|'props',name:string,value:string|number|boolean,fingerprint:string)=>node.animations[`${group}.${name}`]&&typeof value==='number'?keyframe(`${group}.${name}`,value,fingerprint):patch({[group]:{[name]:value}},fingerprint);
 const baseTransform=(name:keyof typeof node.transform)=>keyframeValue(node.animations['transform.'+name]??[],evaluated?.time.sourceFrame??0,node.transform[name]);
 const reorder=(front:boolean)=>{if(!node.parentId)return;const siblings=graph.nodes[node.parentId].children;void edit(front?'Bring forward':'Send backward',[{op:'node.move',id,parentId:node.parentId,index:Math.max(0,Math.min(siblings.length-1,siblings.indexOf(id)+(front?1:-1)))}]);};
 return <aside className="graph-inspector"><div className="graph-panel-heading"><span>Properties</span><span className="graph-type">{type?.label??node.type}</span></div><div className="graph-inspector-scroll" key={id}>
  {root&&<Field name="Project title" value={graph.title} meta={{kind:'string',maxLength:200}} onCommit={(value,fp)=>edit('Rename project',[{op:'project.patch',changes:{title:value}}],fp)}/>}
  <Field name="Layer name" value={node.name} meta={{kind:'string',maxLength:120}} onCommit={(value,fp)=>patch({name:value},fp)}/>
  <label className="graph-check"><span>Lock layer</span><input type="checkbox" checked={locked} onChange={e=>void patch({locked:e.target.checked})}/></label>
  {node.type==='canvas'&&<p className="graph-source-note">This film keeps its original project.json and draw.js. Transform, trim, mix, and layer it here. Individual artwork remains editable in its drawing source.</p>}
  <fieldset disabled={locked||busy}>
   {!root&&<div className="graph-order"><button onClick={()=>reorder(false)}>↓ Backward</button><button onClick={()=>reorder(true)}>↑ Forward</button></div>}
   <h3>Transform{node.behaviors?.length?" · base values":""}</h3><div className="graph-property-grid">{Object.entries(TRANSFORM_PROPERTIES).map(([name,meta])=><div className="graph-animated-field" key={name}><Field name={name} value={baseTransform(name as keyof typeof node.transform)} meta={meta} onCommit={(value,fp)=>property('transform',name,value,fp)}/><button className={node.animations[`transform.${name}`]?'has-keyframe':''} aria-label={`Set ${name} keyframe at playhead`} title="Set keyframe at playhead" onClick={()=>void keyframe(`transform.${name}`,baseTransform(name as keyof typeof node.transform))}>◇</button></div>)}</div>
   <Field name="Opacity" value={keyframeValue(node.animations.opacity??[],evaluated?.time.sourceFrame??0,node.opacity)} meta={{kind:'number',min:0,max:1}} onCommit={(value,fp)=>node.animations.opacity?keyframe('opacity',Number(value),fp):patch({opacity:value},fp)}/>
   <h3>{type?.label??'Node'} properties</h3>{type?Object.entries(type.properties).filter(([,meta])=>meta.kind!=='asset').map(([name,meta])=><Field key={name} name={name} value={meta.kind==='number'?keyframeValue(node.animations['props.'+name]??[],evaluated?.time.sourceFrame??0,Number(node.props[name])):node.props[name]} meta={meta} onCommit={(value,fp)=>property('props',name,value,fp)}/>):<p>This node is preserved. Install its renderer before exporting it.</p>}
   <GraphAdvancedControls graph={graph} node={node} evaluated={evaluated} edit={edit} keyframe={keyframe}/>
   <h3>Timing · source frames</h3><div className="graph-property-grid">{(['start','duration'] as const).filter(name=>!root||name!=='start').map(name=><Field key={name} name={name} value={node.time[name]} meta={{kind:'number',integer:true,min:name==='duration'?1:0,max:1000000000}} onCommit={(value,fp)=>patch({time:{[name]:value}},fp)}/>)}</div>
   <h3>Transitions</h3><div className="graph-property-grid">{(['in','out'] as const).map(side=><Field key={side} name={`Fade ${side}`} value={node.transition[side]?.duration??0} meta={{kind:'number',integer:true,min:0,max:node.time.duration}} onCommit={(value,fp)=>edit(`Fade ${side}`,[{op:'transition.set',id,side,transition:Number(value)?{type:'fade',duration:Number(value)}:null}],fp)}/>)}</div>
   <h3>Effects</h3>{node.effects.map(effect=><div className="graph-effect" key={effect.id}><div><strong>{effect.type}</strong><button aria-label={`Remove ${effect.type}`} onClick={()=>void edit('Remove effect',[{op:'effect.remove',id,effectId:effect.id}])}>×</button></div>{Object.entries(standardRegistry.effect(effect.type,effect.version)?.properties??{}).map(([name,meta])=><Field key={name} name={name} value={effect.props[name]} meta={meta} onCommit={(value,fp)=>edit('Edit effect',[{op:'effect.patch',id,effectId:effect.id,props:{[name]:value}}],fp)}/>)}</div>)}
   <select aria-label="Add effect" value="" onChange={e=>{const definition=standardRegistry.effect(e.target.value);if(!definition)return;void edit(`Add ${definition.label}`,[{op:'effect.add',id,effect:{id:`effect_${crypto.randomUUID()}`,type:definition.type,version:definition.version,enabled:true,props:Object.fromEntries(Object.entries(definition.properties).map(([name,meta])=>[name,meta.default]))}}]);}}><option value="">Add an effect…</option>{standardRegistry.catalog().effects.map(effect=><option key={effect.type} value={effect.type}>{effect.label}</option>)}</select>
  </fieldset><p className="graph-node-id">{node.id}</p>
 </div></aside>;
}

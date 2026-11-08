import {compileMotionPath} from './motion-path.mjs';
const number=(value,min,max,extra={})=>({kind:'number',default:value,min,max,animate:true,...extra});
const choice=(value,values)=>({kind:'enum',default:value,values});
export const BUILTIN_BEHAVIORS=[
 {type:'motion-path',version:1,label:'Motion path',properties:{
  path:{kind:'string',default:'M0 0 C90 -100 210 100 300 0',maxLength:30000},
  start:number(0,0,1000000000,{integer:true,animate:false}),duration:number(90,1,1000000000,{integer:true,animate:false}),
  progress:number(0,0,1),driver:choice('time',['time','progress']),repeat:choice('once',['once','loop','ping-pong']),relative:{kind:'boolean',default:true},
  orient:{kind:'boolean',default:false},rotationOffset:number(0,-3600,3600)
 }},
 {type:'oscillate',version:1,label:'Oscillation',properties:{
  property:choice('transform.y',['transform.x','transform.y','transform.rotation','transform.scaleX','transform.scaleY','opacity','props.gain']),
  amplitude:number(12,-1000000,1000000),period:number(90,1,1000000000,{animate:false}),phase:number(0,-360000,360000),
  wave:choice('sine',['sine','triangle'])
 }}
];
function clamp(value,metadata){const bounded=Math.max(metadata.min,Math.min(metadata.max,value));return metadata.integer?Math.round(bounded):bounded;}
export function validateBuiltinBehavior(behavior,node,propertyMetadata){
 if(behavior.type==='motion-path')compileMotionPath(behavior.props.path);
 if(behavior.type==='oscillate'){
  const metadata=propertyMetadata(node,behavior.props.property);
  if(metadata?.kind!=='number'||!metadata.animate)throw new Error('Oscillation requires an animatable numeric property on this node');
 }
}
/** Trusted registry implementation; projects contain declarative settings only. */
export function compileBuiltinBehavior(behavior,{node,propertyMetadata}){
 if(behavior.type==='motion-path'){
  const geometry=compileMotionPath(behavior.props.path),driven=Object.hasOwn(node.animations,'behaviors.'+behavior.id+'.progress');
  return (state,sourceFrame,props)=>{
   let progress=driven||props.driver==='progress'?props.progress:Math.max(0,(sourceFrame-props.start)/props.duration);
   if(!driven&&props.driver==='time'&&props.repeat==='loop')progress=progress-Math.floor(progress);
   if(!driven&&props.driver==='time'&&props.repeat==='ping-pong'){const phase=((progress%2)+2)%2;progress=phase<=1?phase:2-phase;}
   props.progress=Math.max(0,Math.min(1,progress));
   const position=geometry.sample(props.progress);
   state.transform.x=clamp((props.relative?state.transform.x:0)+position.x,propertyMetadata(node,'transform.x'));
   state.transform.y=clamp((props.relative?state.transform.y:0)+position.y,propertyMetadata(node,'transform.y'));
   if(props.orient)state.transform.rotation=clamp(state.transform.rotation+position.rotation+props.rotationOffset,propertyMetadata(node,'transform.rotation'));
  };
 }
 if(behavior.type==='oscillate'){
  const property=behavior.props.property,parts=property.split('.'),metadata=propertyMetadata(node,property);
  if(metadata?.kind!=='number'||!metadata.animate)throw new Error('Oscillation requires an animatable numeric property');
  return (state,sourceFrame,props)=>{
   const phase=sourceFrame/props.period+props.phase/360,wave=props.wave==='triangle'?2/Math.PI*Math.asin(Math.sin(phase*2*Math.PI)):Math.sin(phase*2*Math.PI);
   const parent=parts.length===1?state:state[parts[0]],key=parts.at(-1);parent[key]=clamp(parent[key]+props.amplitude*wave,metadata);
  };
 }
 throw new Error('Behavior has no registered evaluator: '+behavior.type);
}

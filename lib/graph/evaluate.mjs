import {validateGraph, propertyDefinition} from './schema.mjs';
import {standardRegistry} from './registry.mjs';
import {keyframeValue, transformMatrix, multiplyTransform, transformPoint} from './animation.mjs';

const IDENTITY=Object.freeze([1,0,0,1,0,0]);
const clamp01=value=>Math.max(0,Math.min(1,value));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}

export function inverseTransform(matrix){
 const [a,b,c,d,e,f]=matrix,det=a*d-b*c;
 if(!Number.isFinite(det)||Math.abs(det)<1e-15)throw new RangeError('A singular transform cannot be used as a camera or constraint coordinate system');
 const result=[d/det,-b/det,-c/det,a/det,(c*f-d*e)/det,(b*e-a*f)/det];
 if(!result.every(Number.isFinite))throw new RangeError('Transform inversion exceeds numeric limits');
 return result;
}

function animated(node,sourceFrame,registry){
 const state={transform:{...node.transform},props:{...node.props},opacity:node.opacity,effects:node.effects.map(effect=>({...effect,props:{...effect.props}})),behaviors:(node.behaviors??[]).map(behavior=>({...behavior,props:{...behavior.props}}))};
 for(const [property,keys] of Object.entries(node.animations)){
  const metadata=propertyDefinition(node,property,registry);
  let value=keyframeValue(keys,sourceFrame);
  // Curves may overshoot, but a property never leaves its declared domain.
  if(metadata?.kind==='number'){value=Math.max(metadata.min,Math.min(metadata.max,value));if(metadata.integer)value=Math.round(value);}
  const parts=property.split('.');
  if(parts[0]==='behaviors')state.behaviors.find(behavior=>behavior.id===parts[1]).props[parts[2]]=value;
  else if(parts[0]==='effects')state.effects.find(effect=>effect.id===parts[1]).props[parts[2]]=value;
  else if(parts.length===1)state[parts[0]]=value;
  else state[parts[0]][parts[1]]=value;
 }
 return state;
}

function edgeGain(elapsed,duration,fadeIn,fadeOut){
 return (fadeIn?clamp01(elapsed/fadeIn):1)*(fadeOut?clamp01((duration-elapsed)/fadeOut):1);
}

/**
 * Validate and snapshot once per committed revision; evaluate any frame without
 * seek history, I/O or caller mutation. Children are back-to-front. All timing,
 * including animation keys, uses source frames in the project's rational rate.
 * A container's source clock drives its children, so offsets/speed compose.
 */
export function compileGraph(document,{registry=standardRegistry}={}){
 const {evaluationOrder}=validateGraph(document,{registry});
 const project=freeze(structuredClone(document));
 const secondsPerFrame=project.frameRate.denominator/project.frameRate.numerator;
 const behaviorEvaluators=new Map();
 for(const node of Object.values(project.nodes))behaviorEvaluators.set(node.id,(node.behaviors??[]).map(behavior=>{
  if(!behavior.enabled)return null;
  const factory=registry.behaviorFactory(behavior.type,behavior.version);if(!factory)throw new Error('No evaluator registered for behavior '+behavior.type+'@'+behavior.version);
  const apply=factory(behavior,{node,propertyMetadata:(node,property)=>propertyDefinition(node,property,registry)});
  if(typeof apply!=='function'||/^(Async|Generator|AsyncGenerator)Function$/.test(apply.constructor?.name)){if(apply&&typeof apply.then==='function')Promise.resolve(apply).catch(()=>{});throw new TypeError('Behavior factories must return a synchronous evaluator');}
  return apply;
 }));
 const maskSources=Object.freeze([...new Set(Object.values(project.nodes).flatMap(node=>node.mask?[node.mask.nodeId]:[]))]);
 const hiddenMasks=new Set(),excludedBySolo=new Set();
 const hide=id=>{hiddenMasks.add(id);for(const child of project.nodes[id].children)hide(child);};
 for(const id of maskSources)hide(id);
 for(const parent of Object.values(project.nodes)){
  const tracks=parent.children.map(id=>project.nodes[id]).filter(node=>node.type==='track');
  if(tracks.some(node=>node.props.solo))for(const track of tracks)if(!track.props.solo)excludedBySolo.add(track.id);
 }
 const visitOrder=[];
 const visit=id=>{visitOrder.push(id);for(const child of project.nodes[id].children)visit(child);};visit(project.rootId);

 function evaluate(frame,order=evaluationOrder,onlyNode=null){
  if(!Number.isFinite(frame)||frame<0||frame>1000000000)throw new RangeError('Evaluation frame must be finite and in 0..1000000000');
  const nodes={};
  for(const id of order){
   const node=project.nodes[id],parent=node.parentId===null?null:nodes[node.parentId];
   const elapsed=(parent?parent.time.sourceFrame:frame)-node.time.start;
   const speed=node.time.speed.numerator/node.time.speed.denominator;
   const sourceFrame=node.time.offset.numerator/node.time.offset.denominator+elapsed*speed;
   const state=animated(node,sourceFrame,registry),transform=state.transform;
   for(const [index,apply]of behaviorEvaluators.get(id).entries())if(apply){
    const result=apply(state,sourceFrame,state.behaviors[index].props);
    if(result!==undefined){if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});throw new TypeError('Behavior evaluators must finish synchronously and return no value');}
   }
   const parentMatrix=parent?.worldMatrix??IDENTITY;
   for(const constraint of node.constraints){
    const target=nodes[constraint.target];
    const position=transformPoint(inverseTransform(parentMatrix),target.worldPosition.x,target.worldPosition.y);
    if(constraint.type==='follow'){
     transform.x=position.x+constraint.offsetX;transform.y=position.y+constraint.offsetY;
    }else{
     const dx=position.x-transform.x,dy=position.y-transform.y;
     if(dx!==0||dy!==0)transform.rotation=Math.atan2(dy,dx)*180/Math.PI;
    }
   }
   let localMatrix=transformMatrix(transform);
   if(node.type==='camera')localMatrix=multiplyTransform([state.props.zoom,0,0,state.props.zoom,0,0],inverseTransform(localMatrix));
   const worldMatrix=multiplyTransform(parentMatrix,localMatrix);
   if(!worldMatrix.every(Number.isFinite))throw new RangeError(`${id}: composed transform exceeds numeric limits`);
   const active=(parent?.active??true)&&elapsed>=0&&elapsed<node.time.duration;
   const soloAllowed=!excludedBySolo.has(id);
   const visible=active&&(parent?.visible??true)&&node.visible&&soloAllowed;
   const opacity=state.opacity*edgeGain(elapsed,node.time.duration,node.transition.in?.duration,node.transition.out?.duration);
   const localGain=(state.props.gain??1)*(node.type==='audio'?edgeGain(elapsed,node.time.duration,state.props.fadeIn,state.props.fadeOut):1);
   const audioEnabled=active&&(parent?.audioEnabled??true)&&!state.props.muted&&soloAllowed;
   const audioGain=audioEnabled?(parent?.audioGain??1)*localGain:0;
   nodes[id]={id,type:node.type,version:node.version,name:node.name,parentId:node.parentId,children:node.children,
    time:{elapsed,sourceFrame,seconds:sourceFrame*secondsPerFrame,speed:(parent?.time.speed??1)*speed},
    active,visible,opacity,worldOpacity:(parent?.worldOpacity??1)*opacity,blend:node.blend,
    transform,localMatrix,worldMatrix,worldPosition:transformPoint(worldMatrix,transform.anchorX,transform.anchorY),
    props:state.props,effects:state.effects,behaviors:state.behaviors,mask:node.mask,audioEnabled,audioGain};
  }
  if(onlyNode!==null)return nodes[onlyNode];
  const paintOrder=visitOrder.filter(id=>{const node=nodes[id];return node.visible&&!hiddenMasks.has(id)&&registry.node(node.type,node.version)?.visual;});
  const audio=visitOrder.filter(id=>registry.node(nodes[id].type,nodes[id].version)?.audio&&nodes[id].active&&nodes[id].audioGain!==0).map(id=>nodes[id]);
  return {projectId:project.id,revision:project.revision,frame,seconds:frame*secondsPerFrame,width:project.width,height:project.height,
   rootId:project.rootId,nodes,paintOrder,maskSources,audio};
 }
 const subsets=new Map();let cachedIds=0;
 function evaluateNode(frame,id){
  if(!Object.hasOwn(project.nodes,id))throw new Error('Unknown node: '+id);
  let order=subsets.get(id);
  if(!order){
   const needed=new Set(),pending=[id];
   while(pending.length){
    const current=pending.pop();if(needed.has(current))continue;needed.add(current);
    const node=project.nodes[current];if(node.parentId!==null)pending.push(node.parentId);
    for(const constraint of node.constraints)pending.push(constraint.target);
   }
   order=evaluationOrder.filter(item=>needed.has(item));
   while(cachedIds+order.length>100000&&subsets.size){const [key,old]=subsets.entries().next().value;subsets.delete(key);cachedIds-=old.length;}
   subsets.set(id,order);cachedIds+=order.length;
  }
  return evaluate(frame,order,id);
 }
 return Object.freeze({project,evaluate:frame=>evaluate(frame),evaluateNode});
}

export function evaluateGraph(document,frame,options){return compileGraph(document,options).evaluate(frame);}

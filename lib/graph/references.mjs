/** Targets that cannot introduce an evaluation or recursive-mask cycle. */
export function referenceTargets(document,id,{mask=false}={}){
 if(!Object.hasOwn(document.nodes,id))throw new Error('Unknown node: '+id);
 const dependents=new Map(),renderDependents=new Map();
 const edge=(map,dependency,owner)=>{if(!map.has(dependency))map.set(dependency,[]);map.get(dependency).push(owner);};
 for(const node of Object.values(document.nodes)){
  if(node.parentId!==null)edge(dependents,node.parentId,node.id);
  for(const constraint of node.constraints)edge(dependents,constraint.target,node.id);
  if(node.mask)edge(dependents,node.mask.nodeId,node.id);
  if(mask){for(const child of node.children)edge(renderDependents,child,node.id);if(node.mask)edge(renderDependents,node.mask.nodeId,node.id);}
 }
 const excluded=new Set([id]);
 for(const map of mask?[dependents,renderDependents]:[dependents]){
  const visited=new Set(),pending=[id];
  while(pending.length){const next=pending.pop();if(visited.has(next))continue;visited.add(next);excluded.add(next);pending.push(...(map.get(next)??[]));}
 }
 return Object.keys(document.nodes).filter(target=>!excluded.has(target));
}

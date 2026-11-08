import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMotionPath} from '../lib/graph/motion-path.mjs';
import {createGraph,createNode,validateGraph} from '../lib/graph/schema.mjs';
import {standardRegistry,defaults,NodeRegistry} from '../lib/graph/registry.mjs';
import {compileGraph} from '../lib/graph/evaluate.mjs';
import {applyTransaction,graphFingerprint} from '../lib/graph/transactions.mjs';
function add(document,id,type='rectangle',parent='root'){const node=createNode({id,type,parentId:parent});document.nodes[id]=node;document.nodes[parent].children.push(id);return node;}
function behavior(type,id,props={}){return {id,type,version:1,enabled:true,props:{...defaults(standardRegistry.behavior(type).properties),...props}};}
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,a+' differs from '+b);
test('motion paths preserve line distance, relative commands, Bezier endpoints and tangent orientation',()=>{
 const line=compileMotionPath('M0 0 L100 0 L100 100');assert.equal(line.length,200);assert.deepEqual(line.sample(.25),{x:50,y:0,rotation:0});
 near(line.sample(.75).x,100);near(line.sample(.75).y,50);near(line.sample(.75).rotation,90);
 const relative=compileMotionPath('m10 20 l30 0 q20 20 40 0 z');near(relative.sample(0).x,10);near(relative.sample(1).x,10);near(relative.sample(1).y,20);
 const curve=compileMotionPath('M0 0 C0 100 100 100 100 0');near(curve.sample(0).rotation,90);near(curve.sample(1).rotation,-90);near(curve.sample(.5).x,50,1e-6);near(curve.sample(.5).y,75,1e-6);
 for(const invalid of ['M0 0','M0 0 L0 0','L1 2','M0 0 A1 2 3 4 5','M0 0 L1','M0 0 L1e999 2','M0 0 L1 2 M5 6 L7 8','M0 0 L1 2 unsafe'])assert.throws(()=>compileMotionPath(invalid));
});
test('path motion, oscillation and driven progress share source clocks and survive split/undo semantics',async()=>{
 const document=createGraph({id:'motion-story'}),node=add(document,'courier');node.transform.x=20;node.time.speed={numerator:1,denominator:2};
 node.behaviors=[behavior('motion-path','route',{path:'M0 0 L100 0 L100 100',duration:100,orient:true}),behavior('oscillate','bob',{amplitude:4,period:20})];
 const compiled=compileGraph(document),sample=compiled.evaluateNode(50,'courier');near(sample.transform.x,70);near(sample.transform.y,4);
 assert.deepEqual(compiled.evaluateNode(50,'courier'),compiled.evaluate(50).nodes.courier);compiled.evaluate(299);assert.deepEqual(compiled.evaluateNode(50,'courier'),sample);
 const split=await applyTransaction(document,{expectedFingerprint:await graphFingerprint(document),label:'Split motion',operations:[{op:'clip.split',id:'courier',newId:'arrival',at:55}]});
 for(const frame of [54.5,55,90,199])assert.deepEqual(compileGraph(split.document).evaluateNode(frame,frame<55?'courier':'arrival').transform,compiled.evaluateNode(frame,'courier').transform);
 const driven=structuredClone(document);driven.nodes.courier.behaviors.pop();driven.nodes.courier.animations['behaviors.route.progress']=[{frame:0,value:1},{frame:100,value:0}];
 near(compileGraph(driven).evaluateNode(0,'courier').transform.y,100);
 const changed=await applyTransaction(driven,{expectedFingerprint:await graphFingerprint(driven),label:'Remove path',operations:[{op:'behavior.remove',id:'courier',behaviorId:'route'}]});
 assert.equal(changed.document.nodes.courier.behaviors.length,0);assert.deepEqual(changed.document.nodes.courier.animations,{});
});
test('behavior transactions validate settings, preserve unknown versions, and clamp numeric results',async()=>{
 const document=createGraph({id:'behavior-edits'}),node=add(document,'shape');
 const added=await applyTransaction(document,{expectedFingerprint:await graphFingerprint(document),label:'Breathe',operations:[{op:'behavior.add',id:'shape',behavior:behavior('oscillate','breathe',{property:'opacity',amplitude:10,period:40})}]});
 const compiled=compileGraph(added.document);assert.equal(compiled.evaluateNode(10,'shape').opacity,1);assert.equal(compiled.evaluateNode(30,'shape').opacity,0);
 const invalid=structuredClone(added.document);invalid.nodes.shape.behaviors[0].props.property='props.gain';assert.throws(()=>validateGraph(invalid),/numeric property/);
 const unknown=structuredClone(added.document);unknown.nodes.shape.behaviors[0].type='future:motion';unknown.nodes.shape.animations['behaviors.breathe.future']=[{frame:0,value:1}];
 assert.equal(validateGraph(unknown,{allowUnsupported:true}).unsupported[0].kind,'behavior');assert.throws(()=>compileGraph(unknown),/unsupported/);
 const registry=new NodeRegistry();registry.registerNode({type:'own:badge',version:2,label:'Own badge',visual:true,properties:{size:{kind:'number',default:12,min:1,max:100}}});
 assert.equal(createNode({id:'badge',type:'own:badge',version:2},registry).props.size,12);
});
test('mask validation catches ancestor and indirect compositing loops before rendering',()=>{
 const ancestor=createGraph({id:'ancestor-mask'}),child=add(ancestor,'child');child.mask={nodeId:'root',mode:'alpha'};assert.throws(()=>validateGraph(ancestor),/recursive compositing/);
 const indirect=createGraph({id:'mask-loop'});add(indirect,'mask-group','group');const inner=add(indirect,'inner','rectangle','mask-group'),outer=add(indirect,'outer');inner.mask={nodeId:'outer',mode:'alpha'};outer.mask={nodeId:'mask-group',mode:'alpha'};
 assert.throws(()=>validateGraph(indirect),/recursive compositing/);
 const valid=createGraph({id:'valid-mask'}),art=add(valid,'art'),mask=add(valid,'matte','ellipse');art.mask={nodeId:mask.id,mode:'alpha'};assert.equal(validateGraph(valid).valid,true);
});
test('removing an animated effect removes only that effect’s animation',async()=>{
 const document=createGraph({id:'remove-effect'}),node=add(document,'card');node.effects=[{id:'blur',type:'blur',version:1,enabled:true,props:{radius:2}}];node.animations['effects.blur.radius']=[{frame:0,value:0},{frame:50,value:8}];node.animations['transform.x']=[{frame:0,value:0},{frame:50,value:50}];
 const result=await applyTransaction(document,{expectedFingerprint:await graphFingerprint(document),label:'Remove blur',operations:[{op:'effect.remove',id:'card',effectId:'blur'}]});
 assert.equal(result.document.nodes.card.effects.length,0);assert.deepEqual(Object.keys(result.document.nodes.card.animations),['transform.x']);
});

test('reference choices exclude dependent nodes and recursive masks without excluding valid siblings',async()=>{
 const {referenceTargets}=await import('../lib/graph/references.mjs'),document=createGraph({id:'references'});
 add(document,'group','group');add(document,'child','rectangle','group');add(document,'sibling');const follower=add(document,'follower');
 follower.constraints=[{type:'follow',target:'group',offsetX:0,offsetY:0}];
 assert.deepEqual(referenceTargets(document,'group'),['root','sibling']);
 assert.deepEqual(referenceTargets(document,'child',{mask:true}),['sibling','follower']);
 const masked=structuredClone(document);masked.nodes.sibling.mask={nodeId:'child',mode:'alpha'};
 assert.ok(!referenceTargets(masked,'child',{mask:true}).includes('sibling'));
});
test('path start and progress controls match evaluated motion; async extensions are rejected',()=>{
 const document=createGraph({id:'timed-path'}),node=add(document,'traveller');
 node.behaviors=[behavior('motion-path','route',{path:'M0 0 L100 0',start:30,duration:40,repeat:'loop'})];
 const compiled=compileGraph(document);near(compiled.evaluateNode(0,'traveller').transform.x,0);
 const middle=compiled.evaluateNode(50,'traveller');near(middle.behaviors[0].props.progress,.5);near(middle.transform.x,50);
 const definition={type:'own:motion',version:1,label:'Own motion',properties:{}},bad=new NodeRegistry();
 assert.throws(()=>bad.registerBehavior(definition,async()=>()=>{}),/trusted application/);
 bad.registerBehavior(definition,()=>async()=>{});node.behaviors=[{id:'custom',type:'own:motion',version:1,enabled:true,props:{}}];
 assert.throws(()=>compileGraph(document,{registry:bad}),/synchronous evaluator/);
 const promised=new NodeRegistry();promised.registerBehavior(definition,()=>()=>Promise.resolve());
 assert.throws(()=>compileGraph(document,{registry:promised}).evaluate(0),/synchronously/);
});

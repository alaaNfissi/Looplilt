import test from 'node:test';
import assert from 'node:assert/strict';
import {createGraph,createNode,assertJson} from '../lib/graph/schema.mjs';
import {compileGraph,evaluateGraph,inverseTransform} from '../lib/graph/evaluate.mjs';
import {applyTransaction,graphFingerprint} from '../lib/graph/transactions.mjs';

function add(project,id,type,parentId='root',extra={}){
 const node=createNode({id,type,parentId,...extra});project.nodes[id]=node;project.nodes[parentId].children.push(id);return node;
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('nested source clocks, transforms and keyframes compose without seek history',()=>{
 const p=createGraph({id:'timing',frameRate:{numerator:30000,denominator:1001}});
 const g=add(p,'group','group');g.time.start=10;g.time.speed={numerator:2,denominator:1};g.transform.x=100;g.transform.rotation=90;
 const child=add(p,'planet','ellipse','group');child.time.start=5;child.time.offset={numerator:1,denominator:3};child.transform.x=20;
 child.animations['transform.y']=[{frame:0,value:0},{frame:30,value:30}];
 const compiled=compileGraph(p),first=compiled.evaluate(20);compiled.evaluate(250);assert.deepEqual(compiled.evaluate(20),first);
 close(first.nodes.planet.time.sourceFrame,15+1/3);close(first.nodes.planet.time.seconds,(15+1/3)*1001/30000);
 close(first.nodes.planet.worldPosition.x,100-15-1/3);close(first.nodes.planet.worldPosition.y,20);
 assert.equal(first.nodes.planet.time.speed,2);assert.equal(compiled.evaluate(9).nodes.planet.active,false);
 p.nodes.group.transform.x=900;assert.deepEqual(compiled.evaluate(20),first);
});

test('splitting a fractional-speed animated clip preserves its evaluated source and appearance',async()=>{
 const p=createGraph({id:'split'}),node=add(p,'clip','rectangle');node.time.speed={numerator:1,denominator:3};
 node.animations['transform.x']=[{frame:0,value:0},{frame:100,value:900,easing:'ease'}];
 const split=await applyTransaction(p,{expectedFingerprint:await graphFingerprint(p),label:'Split animated clip',operations:[{op:'clip.split',id:'clip',at:41,newId:'right'}]});
 for(const frame of [40.5,41,41.25,83,299]){
  const before=evaluateGraph(p,frame).nodes.clip,after=evaluateGraph(split.document,frame).nodes[frame<41?'clip':'right'];
  close(before.time.sourceFrame,after.time.sourceFrame);close(before.transform.x,after.transform.x);assert.equal(after.active,true);
 }
});

test('constraints resolve dependency targets in world coordinates across transformed parents',()=>{
 const p=createGraph({id:'follow'}),a=add(p,'a','group'),b=add(p,'b','group');a.transform.x=100;b.transform.x=200;b.transform.rotation=90;
 const follower=add(p,'follower','rectangle','b'),target=add(p,'target','ellipse','a');target.transform.x=40;target.transform.y=20;
 follower.constraints=[{type:'follow',target:'target',offsetX:0,offsetY:0}];
 const result=evaluateGraph(p,0);close(result.nodes.follower.worldPosition.x,140);close(result.nodes.follower.worldPosition.y,20);
 follower.constraints=[{type:'look-at',target:'target'}];const looking=evaluateGraph(p,0).nodes.follower;
 close(looking.transform.rotation,Math.atan2(60,20)*180/Math.PI);
});

test('camera zoom and position share one deterministic view transform',()=>{
 const p=createGraph({id:'camera'}),camera=add(p,'camera','camera');camera.transform.x=100;camera.props.zoom=2;
 add(p,'point','ellipse','camera',{transform:{...createNode({id:'template'}).transform,x:125,y:20}});
 const frame=evaluateGraph(p,0);close(frame.nodes.point.worldPosition.x,50);close(frame.nodes.point.worldPosition.y,40);
 assert.throws(()=>inverseTransform([0,0,0,1,0,0]),/singular/);
});

test('layer order, mask dependencies, effects and group opacity remain inspectable',()=>{
 const p=createGraph({id:'layers'}),g=add(p,'group','group');g.opacity=.5;
 const art=add(p,'art','rectangle','group'),matte=add(p,'matte','ellipse');art.mask={nodeId:'matte',mode:'alpha'};
 art.opacity=.8;art.effects=[{id:'blur',type:'blur',version:1,enabled:true,props:{radius:0}}];
 art.animations['effects.blur.radius']=[{frame:0,value:0},{frame:30,value:20}];add(p,'title','text');
 const result=evaluateGraph(p,15);assert.deepEqual(result.paintOrder,['art','title']);assert.deepEqual(result.maskSources,['matte']);
 close(result.nodes.art.worldOpacity,.4);close(result.nodes.art.effects[0].props.radius,10);
 assert.deepEqual(result.nodes.art.mask,{nodeId:'matte',mode:'alpha'});
});

test('audio gain, automation, fades and sibling solo follow the same source clock',()=>{
 const p=createGraph({id:'sound'});p.assets.sound={id:'sound',kind:'audio',name:'Own score',path:'assets/score.wav',bytes:44,sha256:'a'.repeat(64),mime:'audio/wav',metadata:{}};
 const bed=add(p,'bed','track');bed.props.kind='audio';bed.props.gain=.5;
 const voice=add(p,'voice','track');voice.props.kind='audio';
 const a=add(p,'music','audio','bed',{props:{asset:'sound'}});a.props.fadeIn=30;a.animations['props.gain']=[{frame:0,value:1},{frame:30,value:2}];
 const b=add(p,'narration','audio','voice',{props:{asset:'sound'}});b.visible=false;
 const result=evaluateGraph(p,15);close(result.nodes.music.audioGain,.375);assert.equal(result.nodes.narration.audioGain,1);
 voice.props.solo=true;assert.deepEqual(evaluateGraph(p,15).audio.map(n=>n.id),['narration']);
 voice.props.muted=true;assert.equal(evaluateGraph(p,15).audio.length,0);
});

test('fades respect half-open clip ends and easing cannot produce invalid opacity',()=>{
 const p=createGraph({id:'fade'}),a=add(p,'card','rectangle');a.time.start=10;a.time.duration=30;a.transition.in={type:'fade',duration:10};a.transition.out={type:'fade',duration:10};
 close(evaluateGraph(p,15).nodes.card.opacity,.5);close(evaluateGraph(p,35).nodes.card.opacity,.5);assert.equal(evaluateGraph(p,40).nodes.card.active,false);
 a.animations.opacity=[{frame:0,value:0,easing:[.2,4,.8,4]},{frame:30,value:1}];
 for(let frame=10;frame<40;frame+=.25){const value=evaluateGraph(p,frame).nodes.card.opacity;assert.ok(value>=0&&value<=1);}
 assert.throws(()=>evaluateGraph(p,NaN),/finite/);
});

test('sparse and decorated arrays cannot bypass JSON size limits or lose data on save',()=>{
 assert.throws(()=>assertJson(new Array(100000000)),/dense and bounded/);
 const extra=[];extra.note='invisible to JSON';assert.throws(()=>assertJson(extra),/dense and bounded/);
 const unusual=[1];delete unusual[0];unusual.note=2;assert.throws(()=>assertJson(unusual),/array properties/);
});

test('targeted evaluation matches the complete graph through nested clocks, constraints, solo and audio automation',()=>{
 const p=createGraph({id:'selective-evaluation'});
 p.assets.sound={id:'sound',kind:'audio',name:'Own score',path:'assets/score.wav',bytes:44,sha256:'a'.repeat(64),mime:'audio/wav',metadata:{}};
 const camera=add(p,'view','camera');camera.transform.rotation=15;camera.props.zoom=1.2;
 const group=add(p,'group','group','view');group.time.start=12;group.time.speed={numerator:2,denominator:3};
 const bed=add(p,'bed','track','group');bed.props.kind='audio';bed.props.gain=.7;
 bed.animations['props.gain']=[{frame:0,value:.3},{frame:90,value:1.2}];
 const music=add(p,'music','audio','bed',{props:{asset:'sound'}});music.props.fadeIn=17;music.props.fadeOut=33;music.props.pan=.2;
 music.animations['props.gain']=[{frame:0,value:.5},{frame:100,value:1.1,easing:'ease-in-out'}];
 const target=add(p,'target','ellipse');target.animations['transform.y']=[{frame:0,value:0},{frame:150,value:400}];
 music.constraints=[{type:'follow',target:'target',offsetX:5,offsetY:7}];
 for(let i=0;i<200;i++)add(p,'decor-'+i,'rectangle');
 const compiled=compileGraph(p);
 for(const frame of [0,12,13.25,35,98.5,150,299,301,13.25])assert.deepEqual(compiled.evaluateNode(frame,'music'),compiled.evaluate(frame).nodes.music);
 assert.throws(()=>compiled.evaluateNode(1,'missing'),/Unknown node/);
});

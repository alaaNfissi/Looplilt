import {createGraph,createNode,validateGraph} from '../../lib/graph/schema.mjs';
import {legacyAsset} from '../../lib/graph/legacy-source.mjs';
import {validateProject} from '../../lib/project-schema.mjs';
export class Film {
 constructor(id,title,seconds){this.document=createGraph({id,title,durationFrames:seconds*30});this.assets=new Map();this.count=0;}
 add(parent,type,name,props={},transform={},options={}){const id=options.id??'n'+(++this.count),duration=options.duration??this.document.durationFrames;
 const node=createNode({id,type,name,parentId:parent??'root',duration,props});
 Object.assign(node.transform,transform);if(options.start!==undefined)node.time.start=options.start;
 if(options.opacity!==undefined)node.opacity=options.opacity;if(options.blend)node.blend=options.blend;
 this.document.nodes[id]=node;this.document.nodes[node.parentId].children.push(id);return node;}
 group(parent,name,transform={},options={}){return this.add(parent,'group',name,{},transform,options);}
 rect(parent,name,x,y,w,h,fill,radius=0,options={}){if(typeof radius==='object'){options=radius;radius=0;}return this.add(parent,'rectangle',name,{width:w,height:h,fill,radius},{x,y},options);}
 ellipse(parent,name,x,y,w,h,fill,options={}){return this.add(parent,'ellipse',name,{width:w,height:h,fill},{x,y},options);}
 path(parent,name,d,fill,stroke='#00000000',strokeWidth=0,options={}){if(typeof stroke==='object'){options=stroke;stroke='#00000000';strokeWidth=0;}return this.add(parent,'path',name,{d,fill,stroke,strokeWidth},{},options);}
 text(parent,name,text,x,y,size,fill,width=1100,options={}){return this.add(parent,'text',name,{text,fontSize:size,fill,maxWidth:width,fontWeight:options.weight??400,fontFamily:options.serif?'Georgia, serif':'Arial, sans-serif',align:options.align??'left'},{x,y},options);}
 animate(node,property,keys){node.animations[property]=keys.map(([frame,value,easing])=>({frame,value,...(easing?{easing}:{})}));return node;}
 fade(node,inside=15,outside=15){node.transition={in:inside?{type:'fade',duration:inside}:null,out:outside?{type:'fade',duration:outside}:null};return node;}
 oscillate(node,property,amplitude,period,phase=0){node.behaviors??=[];node.behaviors.push({id:'pulse'+node.behaviors.length,type:'oscillate',version:1,enabled:true,props:{property,amplitude,period,phase,wave:'sine'}});return node;}
 async score(project,gain=1){validateProject(project);const bytes=new TextEncoder().encode(JSON.stringify(project,null,2)+'\n'),asset=await legacyAsset('score',bytes,project.title+'.score.json');this.document.assets[asset.id]=asset;this.assets.set(asset.id,bytes);const node=this.add('root','score','Original music · '+project.title,{asset:asset.id,gain});return node;}
 finish(){validateGraph(this.document);return {document:this.document,assets:this.assets};}
}
export const note=(score,at,length,pitch,voice,gain,pan=0,send=.3)=>score.push({at,length,pitch,voice,gain,pan,send});
export function chapter(f,id,label,start,seconds){const node=f.add('root','composition',label,{width:1280,height:720,background:'#101d29'},{},{id,start:start*30,duration:seconds*30});return node.id;}
export function label(f,parent,n,title,start=0,duration=180){const g=f.group(parent,'Chapter '+n,{},{start,duration});f.rect(g.id,'Chapter rule',64,52,30,2,'#eac48e');f.text(g.id,'Chapter label',n+'  /  '+title.toUpperCase(),108,43,12,'#cfdfd6',1000,{weight:600});f.fade(g,18,20);return g;}
export function letterbox(f){f.rect('root','Top cinematic matte',0,0,1280,27,'#08131b');f.rect('root','Bottom cinematic matte',0,693,1280,27,'#08131b');}

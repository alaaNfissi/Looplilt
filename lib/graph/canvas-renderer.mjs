import {standardRegistry} from './registry.mjs';
import {standardCanvasRenderers} from './canvas-render-registry.mjs';
import {canvasFontFamily} from './typography.mjs';
import { compileGraph } from './evaluate.mjs';
import { multiplyTransform } from './animation.mjs';

function resetContext(canvas,ctx){
 // A failed draw may leave a clip or saved state behind. A full reset is needed.
 if(typeof ctx.reset==='function')ctx.reset();else canvas.width=canvas.width;
}
function saved(ctx,draw){ctx.save();try{return draw();}finally{ctx.restore();}}
function surface(width,height){
 if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}
function filterValue(effects,scale){
 return effects.filter(effect=>effect.enabled).map(effect=>{
  if(effect.version!==1)throw new Error(`Renderer does not implement effect ${effect.type}@${effect.version}`);
  const p=effect.props;
  switch(effect.type){
   case 'blur':return `blur(${p.radius*scale}px)`;
   case 'brightness':return `brightness(${p.amount})`;
   case 'contrast':return `contrast(${p.amount})`;
   case 'saturate':return `saturate(${p.amount})`;
   case 'hue':return `hue-rotate(${p.degrees}deg)`;
   case 'grayscale':return `grayscale(${p.amount})`;
   case 'shadow':return `drop-shadow(${p.x*scale}px ${p.y*scale}px ${p.blur*scale}px ${p.color})`;
   default:throw new Error(`Renderer does not implement effect ${effect.type}`);
  }
 }).join(' ')||'none';
}
function linesFor(ctx,text,maxWidth){
 const lines=[];
 for(const paragraph of text.split(/\r?\n/)){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   const next=line?`${line} ${word}`:word;
   if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}
function paintText(ctx,node){
 const p=node.props;
 ctx.font=`${p.fontWeight} ${p.fontSize}px ${canvasFontFamily(p.fontFamily)}`;
 ctx.textBaseline='top';ctx.textAlign=p.align;
 const lines=linesFor(ctx,p.text,p.maxWidth),padding=node.type==='caption'?p.padding:0;
 if(node.type==='caption'){
  ctx.fillStyle=p.background;ctx.beginPath();ctx.roundRect(-padding,-padding,p.maxWidth+2*padding,lines.length*p.fontSize*p.lineHeight+2*padding,Math.min(padding,12));ctx.fill();
 }
 ctx.fillStyle=p.fill;
 const x=p.align==='center'?p.maxWidth/2:p.align==='right'?p.maxWidth:0;
 lines.forEach((line,index)=>ctx.fillText(line,x,index*p.fontSize*p.lineHeight,p.maxWidth));
}
function paintMedia(ctx,node,frame){
 if(!frame?.image||!Number.isFinite(frame.width)||!Number.isFinite(frame.height)||frame.width<=0||frame.height<=0)throw new Error(`${node.id}: media frame is unavailable`);
 const p=node.props,w=p.width,h=p.height,fit=p.fit??'contain';
 if(fit==='stretch'){ctx.drawImage(frame.image,0,0,frame.width,frame.height,0,0,w,h);return;}
 const scale=fit==='cover'?Math.max(w/frame.width,h/frame.height):Math.min(w/frame.width,h/frame.height);
 const dw=frame.width*scale,dh=frame.height*scale;
 saved(ctx,()=>{ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
  ctx.drawImage(frame.image,0,0,frame.width,frame.height,(w-dw)/2,(h-dh)/2,dw,dh);
 });
}

/**
 * The same deterministic compositor runs in the visual preview and Chromium
 * export. Media providers supply already-decoded frame objects; no source code,
 * URLs or filesystem paths are executed by this module. The provider owns
 * decoding and can release each frame after composition.
 */
export class CanvasGraphRenderer {
 #registry;#renderers;#compiled;#canvas;#context;#provider;#factory;#pool=[];#allocated=0;#surfaceBytes;#budget;#rendering=false;#disposed=false;#width;#height;
 constructor(canvas,document,{mediaProvider,canvasFactory=surface,surfaceBudget=160*1024*1024,registry=standardRegistry,renderers=standardCanvasRenderers}={}){
  this.#registry=registry;this.#renderers=renderers;this.#compiled=compileGraph(document,{registry});
  if(!canvas||!Number.isInteger(canvas.width)||!Number.isInteger(canvas.height)||canvas.width<1||canvas.height<1||canvas.width*canvas.height>16777216)throw new Error('Output surface must contain 1–16,777,216 pixels');
  if(!Number.isSafeInteger(surfaceBudget)||surfaceBudget<0||surfaceBudget>512*1024*1024)throw new Error('Compositing surface budget must be 0–512 MiB');
  this.#canvas=canvas;this.#width=canvas.width;this.#height=canvas.height;this.#context=canvas.getContext('2d');
  if(!this.#context)throw new Error('A Canvas 2D context is required');
  this.#provider=mediaProvider;this.#factory=canvasFactory;this.#surfaceBytes=canvas.width*canvas.height*4;this.#budget=surfaceBudget;
 }
 get document(){return this.#compiled.project;}
 replace(document){if(this.#disposed)throw new Error('Renderer has been disposed');if(this.#rendering)throw new Error('Finish or cancel the current frame before replacing its project');this.#compiled=compileGraph(document,{registry:this.#registry});}
 #take(){
  let canvas=this.#pool.pop();
  if(!canvas){
   if((this.#allocated+1)*this.#surfaceBytes>this.#budget)throw new Error('Nested compositing exceeds its surface memory budget');
   canvas=this.#factory(this.#width,this.#height);
   if(!canvas||canvas===this.#canvas||canvas.width!==this.#width||canvas.height!==this.#height||!canvas.getContext('2d'))throw new Error('Could not allocate a compositing surface');
   this.#allocated++;
  }
  const ctx=canvas.getContext('2d');resetContext(canvas,ctx);
  return {canvas,ctx};
 }
 #release(value){this.#pool.push(value.canvas);}
 async render(frame,{signal}={}){
  if(this.#disposed)throw new Error('Renderer has been disposed');
  if(this.#rendering)throw new Error('Frame rendering is serialized; await the current frame before seeking');
  if(this.#canvas.width!==this.#width||this.#canvas.height!==this.#height)throw new Error('Recreate the renderer after resizing its output');
  this.#rendering=true;
  const resources=new Map();let output;
  const releaseResources=async()=>{
   const frames=[...resources.values()];resources.clear();
   const results=await Promise.allSettled(frames.map(async resource=>resource?.release?.()));
   return results.filter(result=>result.status==='rejected').map(result=>result.reason);
  };
  try{
   signal?.throwIfAborted();
   const scene=this.#compiled.evaluate(frame),nodes=scene.nodes;
   const media=Object.values(nodes).filter(node=>node.visible&&['image','video','canvas'].includes(node.type));
   if(media.length>32)throw new Error('This output exceeds the limit of 32 simultaneously decoded media nodes');
   if(media.length&&!this.#provider?.frame)throw new Error('A scoped media provider is required for this project');
   await this.#provider?.prepare?.(scene,{signal});
   // Settle every request before cleanup so a late decoder cannot leak a frame.
   const loaded=await Promise.allSettled(media.map(async node=>({id:node.id,frame:await this.#provider.frame(node,scene,{signal})})));
   let pixels=0,error;
   for(const item of loaded){
    if(item.status==='rejected'){error??=item.reason;continue;}
    const resource=item.value.frame;resources.set(item.value.id,resource);
    if(!resource?.image||!Number.isFinite(resource.width)||!Number.isFinite(resource.height)||resource.width<=0||resource.height<=0)error??=new Error(item.value.id+': media frame is unavailable');
    else pixels+=resource.width*resource.height;
   }
   if(error)throw error;if(pixels>67108864)throw new Error('Decoded media exceeds the 64-megapixel frame budget');
   signal?.throwIfAborted();
   // Output sizes preserve project aspect ratio; effects use project-pixel units.
   const outputScale=Math.min(this.#width/scene.width,this.#height/scene.height);
   const scale=[outputScale,0,0,outputScale,(this.#width-scene.width*outputScale)/2,(this.#height-scene.height*outputScale)/2];
   const maskSources=new Set(scene.maskSources);
   output=this.#take();const ctx=output.ctx;
   const matrix=node=>multiplyTransform(scale,node.worldMatrix);
   const clipAncestors=(context,node)=>{
    const chain=[];let parent=node.parentId===null?null:nodes[node.parentId];
    while(parent){chain.push(parent);parent=parent.parentId===null?null:nodes[parent.parentId];}
    for(const ancestor of chain.reverse())if(ancestor.type==='composition'&&ancestor.props.clip){context.setTransform(...matrix(ancestor));context.beginPath();context.rect(0,0,ancestor.props.width,ancestor.props.height);context.clip();}
   };
   const content=(context,node,maskPass)=>{
    saved(context,()=>{context.setTransform(...matrix(node));
    const p=node.props;
    switch(node.version===1?node.type:"__extension__"){
     case 'composition':
      if(p.clip){context.beginPath();context.rect(0,0,p.width,p.height);context.clip();}
      context.fillStyle=p.background;context.fillRect(0,0,p.width,p.height);break;
     case 'group':case 'track':case 'camera':case 'audio':case 'score':break;
     case 'rectangle':case 'ellipse':case 'path':{
      let shape;
      if(node.type==='path'){try{shape=new Path2D(p.d);}catch{throw new Error(`${node.id}: invalid vector path`);}}
      else{shape=new Path2D();if(node.type==='rectangle')shape.roundRect(0,0,p.width,p.height,Math.min(p.radius,p.width/2,p.height/2));else shape.ellipse(p.width/2,p.height/2,p.width/2,p.height/2,0,0,2*Math.PI);}
      context.fillStyle=p.fill;context.fill(shape,p.fillRule??'nonzero');
      if(p.strokeWidth){context.strokeStyle=p.stroke;context.lineWidth=p.strokeWidth;context.stroke(shape);}break;
     }
     case 'text':case 'caption':paintText(context,node);break;
     case 'image':case 'video':case 'canvas':paintMedia(context,node,resources.get(node.id));break;
     default:{
      const painter=this.#renderers.node(node.type,node.version);
      if(!painter)throw new Error(`Renderer does not implement ${node.type}@${node.version}`);
      const result=painter(context,node,scene,{signal,outputScale});
      if(result!==undefined){if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});throw new TypeError('Canvas painters must finish synchronously and return no value');}
     }
    }
    for(const id of node.children)draw(context,nodes[id],maskPass);
    });
   };
   const draw=(context,node,maskPass=false)=>{
    if(!node.visible||!maskPass&&maskSources.has(node.id))return;
    signal?.throwIfAborted();
    const filter=filterValue(node.effects,outputScale);
    const isolate=!!node.mask||filter!=='none'||node.opacity!==1&&node.children.length>0||node.blend!=='source-over'&&node.children.length>0;
    if(isolate){
     const layer=this.#take();let mask;
     try{
      content(layer.ctx,node,maskPass);
      if(node.mask){
       mask=this.#take();const source=nodes[node.mask.nodeId];
       saved(mask.ctx,()=>{clipAncestors(mask.ctx,source);
        mask.ctx.globalAlpha=source.parentId===null?1:nodes[source.parentId].worldOpacity;
        draw(mask.ctx,source,true);
       });
       saved(layer.ctx,()=>{layer.ctx.resetTransform();layer.ctx.globalCompositeOperation=node.mask.mode==='inverse-alpha'?'destination-out':'destination-in';layer.ctx.drawImage(mask.canvas,0,0);});
      }
      saved(context,()=>{context.resetTransform();context.globalAlpha*=node.opacity;context.globalCompositeOperation=node.blend;
       if(filter!=='none'&&!('filter'in context))throw new Error('This browser cannot render the requested Canvas filters');
       context.filter=filter;context.drawImage(layer.canvas,0,0);
      });
     }finally{if(mask)this.#release(mask);this.#release(layer);}
    }else{
     saved(context,()=>{context.globalAlpha*=node.opacity;context.globalCompositeOperation=node.blend;content(context,node,maskPass);});
    }
   };
   draw(ctx,nodes[scene.rootId]);
   const releaseErrors=await releaseResources();
   if(releaseErrors.length)throw new AggregateError(releaseErrors,'Media frame cleanup failed');
   signal?.throwIfAborted();
   // Publish only a fully rendered frame, including successful decoder cleanup.
   resetContext(this.#canvas,this.#context);this.#context.drawImage(output.canvas,0,0);
   return {frame:scene.frame,revision:scene.revision,scene,surfaceBytes:this.#allocated*this.#surfaceBytes};
  }finally{
   try{await releaseResources();}finally{if(output)this.#release(output);this.#rendering=false;}
  }
 }
 dispose(){
  if(this.#rendering)throw new Error('Cancel and await the current frame before disposal');
  for(const canvas of this.#pool){canvas.width=1;canvas.height=1;}
  this.#pool=[];this.#allocated=0;this.#disposed=true;
 }
}
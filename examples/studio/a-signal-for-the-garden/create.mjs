import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {Film,note} from '../authoring.mjs';import {legacyAsset} from '../../../lib/graph/legacy-source.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function createFilm(){
 const f=new Film('a-signal-for-the-garden','A Signal for the Garden',52),d=f.document;d.nodes.root.props.background='#101b30';d.nodes.root.transition.out={type:'fade',duration:24};
 const scenes=[['waiting','The garden is waiting',0,12],['repair','The rain engine',12,24],['outside','The last connection',24,36],['garden','A small world begins again',36,52]].map(([id,label,start,end])=>({id,label,start,end}));
 const source={version:1,title:'A Signal for the Garden · original pixel world',duration:52,fps:30,scenes,captions:[],score:[]};
 const projectBytes=new TextEncoder().encode(JSON.stringify(source,null,2)+'\n'),scriptBytes=new Uint8Array(await fs.readFile(path.join(here,'draw.js')));
 const project=await legacyAsset('legacy-project',projectBytes,'Pixel world.project.json'),script=await legacyAsset('legacy-script',scriptBytes,'Pixel world.draw.js');project.metadata.scriptAsset=script.id;
 for(const [asset,bytes]of [[project,projectBytes],[script,scriptBytes]]){d.assets[asset.id]=asset;f.assets.set(asset.id,bytes);}
 f.add('root','canvas','Pixel world · original source at320 ×180',{projectAsset:project.id,scriptAsset:script.id,format:'landscape',width:1280,height:720,gain:0},{},{id:'pixel-world'});
 const media={};
 for(const [name,kind,mime]of [['rain-memory.mp4','video','video/mp4'],['rain-memory.png','image','image/png']]){
  const bytes=new Uint8Array(await fs.readFile(path.join(here,'inputs',name))),sha256=createHash('sha256').update(bytes).digest('hex'),asset={id:'asset_'+sha256,kind,name:'Original Looplilt rain memory',path:'assets/'+sha256+path.extname(name),sha256,bytes:bytes.length,mime,metadata:{width:640,height:360,...(kind==='video'?{durationSeconds:6,hasAudio:false}:{}),source:'The Shape of Returning · own Looplilt render'}};
  d.assets[asset.id]=asset;f.assets.set(asset.id,bytes);media[kind]=asset;
 }
 function memory(id,x,start,duration){
  const panel=f.group('root',id,{x,y:268},{start:start*30,duration:duration*30});f.fade(panel,14,18);
  panel.effects.push({id:'memory-glow',type:'shadow',version:1,enabled:true,props:{x:0,y:0,blur:10,color:'#65cfad66'}});
  const mask=f.rect(panel.id,'Monitor aperture',0,0,344,192,'#ffffff');
  const still=f.add(panel.id,'image','Rain memory · still',{asset:media.image.id,width:344,height:192,fit:'cover'});still.mask={nodeId:mask.id,mode:'alpha'};
  const clip=f.add(panel.id,'video','Rain memory · half-speed footage',{asset:media.video.id,width:344,height:192,fit:'cover',gain:0},{},{duration:Math.min(360,duration*30)});clip.time.speed={numerator:1,denominator:2};clip.mask={nodeId:mask.id,mode:'alpha'};clip.effects.push({id:'archive-tone',type:'saturate',version:1,enabled:true,props:{amount:.72}});f.fade(clip,12,12);
  f.rect(panel.id,'Monitor glass',0,0,344,192,'#8ed8cb18',{blend:'screen'});
  for(let y=0;y<192;y+=8)f.rect(panel.id,'Pixel display scanline '+y,0,y,344,2,'#101b3022');
  f.text(panel.id,'Archive label','EARTH ARCHIVE  /  RAIN',0,-19,10,'#8ed8cb',344,{weight:600});
  return panel;
 }
 memory('Remembering rain',820,1.5,10);memory('A memory becomes a garden',144,37,12);
 const chapters=[
 [0,12,'STATION 07 · NIGHT 906','The garden is waiting.','One seed. No rain. And a memory of home.'],
 [12,12,'01  /  LISTEN','A signal in the silence.','The old rain engine still has something to give.'],
 [24,12,'02  /  RECONNECT','One wire. One chance.','The last connection has to be made outside.'],
 [36,16,'03  /  GROW','Someone kept the promise.','The pump wakes. A small world begins again.']];
 for(const [start,seconds,kicker,title,body]of chapters){
  const group=f.group('root','Story · '+title,{},{start:start*30,duration:seconds*30});
  f.rect(group.id,'Title shade',0,0,1280,174,'#101b30ef');f.text(group.id,'Chapter',kicker,47,29,11,'#d2a35f',1180,{weight:600});
  const headline=f.text(group.id,'Editable title · '+start,title,44,62,43,'#e5d3a7',1180,{weight:600});f.animate(headline,'transform.y',[[0,72,'ease-out'],[18,62]]);
  f.text(group.id,'Story caption · '+start,body,47,123,19,'#94b5b0',1160);f.fade(group,16,15);
 }
 const signal=f.ellipse('root','The connection · path-driven packet',0,0,12,12,'#a4ddaf',{start:930,duration:100,blend:'screen'});
 signal.behaviors=[{id:'route',type:'motion-path',version:1,enabled:true,props:{path:'M392 596 C470 520 780 500 976 384',start:0,duration:85,progress:0,driver:'time',repeat:'once',relative:false,orient:false,rotationOffset:0}}];f.fade(signal,8,12);signal.effects.push({id:'signal-halo',type:'shadow',version:1,enabled:true,props:{x:0,y:0,blur:12,color:'#8ed8cbcc'}});
 const closing=f.group('root','Closing dedication',{},{start:46*30,duration:6*30});f.rect(closing.id,'Closing strip',0,650,1280,70,'#101b30e6');f.text(closing.id,'Dedication','FOR EVERYONE WHO KEEPS SOMETHING GROWING.',47,669,13,'#a4ddaf',1080,{weight:600});f.text(closing.id,'Credit','AN ORIGINAL LOOPLILT FILM',47,693,9,'#94b5b0',1080);f.fade(closing,18,24);
 const score=[],chords=[[50,57,60,64],[43,50,57,62],[48,55,59,64],[45,52,55,60],[50,57,60,64],[46,53,57,62],[43,50,57,62],[45,52,56,60],[50,57,60,65],[43,50,57,62],[48,55,59,64],[45,52,55,60],[53,60,64,67],[43,50,57,62],[48,55,59,64],[48,55,59,64]];
 const beat=.8125;
 for(let bar=0;bar<16;bar++){
  const at=bar*3.25,ch=chords[bar],energy=bar<3?.58:bar<7?.85:bar<11?1:.86;
  for(const [b,p]of [[0,0],[1.5,0],[2.25,1],[3.5,0]]){const when=at+b*beat;if(when<51.5)note(score,when,.5,ch[p]-12,'bass',.23*energy,-.04,.08);}
  for(const b of [.5,2,3.25])for(let i=1;i<4;i++){const when=at+b*beat;if(when<51)note(score,when,.35,ch[i]+12,'piano',.052*energy,(i-2)*.55,.22);}
  if(bar>1&&bar<15){for(const b of [0,1.75,2.5])note(score,at+b*beat,.18,48,'kick',.16*energy,.04,.06);for(const b of [1,3])note(score,at+b*beat,.2,60,'snare',.065*energy,-.12,.2);
   for(let k=0;k<8;k++)note(score,at+k*beat/2+(k%2?.035:0),.07,72,'hat',.022*(k%2?1:.65),.38,.15);
  }
  for(let i=1;i<4;i++)note(score,at+.04,Math.min(3.12,51.8-at-.04),ch[i],'pad',.023*energy,(i-2)*.6,.55);
  if(bar>=4&&bar<14)for(let k=0;k<4;k++){const when=at+.40625+k*.6;note(score,when,.17,ch[(k+bar)%4]+24,'chip',.024*energy,k%2?-.25:.25,.4);}
 }
 const melody=[74,77,81,79,77,74,72,69,74,76,77,81,84,81,79,76];
 melody.forEach((pitch,i)=>note(score,36+i*.82,Math.min(1.2,51.7-36-i*.82),pitch,'marimba',.11,Math.sin(i)*.4,.42));
 for(const [at,pitch]of [[5,76],[7,81],[18.4,74],[20.2,79],[32.2,86],[36,84]])note(score,at,.85,pitch,'bell',.065,.2,.6);
 note(score,0,11.8,36,'wind',.016,-.4,.35);note(score,24,11.8,39,'wind',.022,.35,.3);note(score,37,13.9,48,'rain',.016,0,.25);
 for(const at of [12.9,13.4,13.9,14.4,25.4,26.1,27.1,28.2,29.3])note(score,at,.14,50,'footstep',.16,-.15,.18);
 const soundtrack=await f.score({version:1,title:'Reconnect · original downtempo electro-acoustic score',duration:52,fps:30,audio:{mode:'studio',room:.3,delay:.11,echoSeconds:.40625},captions:[],score},3.2);
 d.extensions={looplilt:{style:'Pixel art × moving-image collage',description:'A tiny caretaker reconnects a silent station and brings its last garden back to life.',chapters:scenes.map(s=>({name:s.label,start:s.start*30})),soundtrackNode:soundtrack.id,posterFrame:1350,reviewFrame:1335,importedMedia:{source:'The Shape of Returning',creation:'node scripts/prepare-garden-memory.mjs',frames:180,seconds:6,silent:true},artwork:'Original320×180 pixel drawings with nearest-neighbor enlargement. Imported own footage, masks, color treatment, display compositing, titles and a path-driven signal remain graph layers.'}};
 await fs.writeFile(path.join(here,'project.json'),projectBytes);return f.finish();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {document,assets}=await createFilm();await fs.mkdir(path.join(here,'assets'),{recursive:true});for(const asset of Object.values(document.assets))await fs.writeFile(path.join(here,asset.path),assets.get(asset.id));await fs.writeFile(path.join(here,'project.looplilt.json'),JSON.stringify(document,null,2)+'\n');console.log(JSON.stringify({title:document.title,nodes:Object.keys(document.nodes).length,assets:assets.size,seconds:document.durationFrames/30}));}

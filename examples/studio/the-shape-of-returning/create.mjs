import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Film,note} from '../authoring.mjs';
import {legacyAsset} from '../../../lib/graph/legacy-source.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function createFilm(){
 const f=new Film('the-shape-of-returning','The Shape of Returning',60),d=f.document;
 const scenes=[
 {id:'ocean',label:'A departure',start:0,end:8,description:'A drop leaves the ocean as invisible water vapor.'},
 {id:'evaporation',label:'An invisible departure',start:8,end:18,description:'Sunlight supplies energy for evaporation; a magnified symbolic view makes water vapor visible.'},
 {id:'condensation',label:'A gathering',start:18,end:29,description:'Cooling water vapor condenses into tiny liquid droplets suspended in a cloud.'},
 {id:'rain',label:'The fall',start:29,end:39,description:'Precipitation returns water to land; the scene follows one possible path.'},
 {id:'groundwater',label:'The hidden journey',start:39,end:50,description:'Water infiltrates soil and flows slowly through pores and cracks, with timescales compressed.'},
 {id:'return',label:'A return, not an ending',start:50,end:60,description:'Rivers and groundwater connect back to the sea while other pathways remain possible.'}];
 const legacy={version:1,title:'The Shape of Returning · original procedural landscape',duration:60,fps:30,scenes,captions:[],score:[]};
 const projectBytes=new TextEncoder().encode(JSON.stringify(legacy,null,2)+'\n'),scriptBytes=new Uint8Array(await fs.readFile(path.join(here,'draw.js')));
 const project=await legacyAsset('legacy-project',projectBytes,'Water-cycle landscape.project.json'),script=await legacyAsset('legacy-script',scriptBytes,'Water-cycle landscape.draw.js');project.metadata.scriptAsset=script.id;
 for(const [asset,bytes]of [[project,projectBytes],[script,scriptBytes]]){d.assets[asset.id]=asset;f.assets.set(asset.id,bytes);}
 const illustration=f.add('root','canvas','Original landscape · editable procedural source',{projectAsset:project.id,scriptAsset:script.id,format:'landscape',width:1280,height:720,gain:0},{},{id:'landscape'});
 illustration.transition.out={type:'fade',duration:24};d.nodes.root.props.background='#e9e1cc';
 // Every title, chapter, caption and editorial label is an ordinary graph node.
 const ink='#274f51',muted='#63766b',rust='#9a633d';
 f.rect('root','Top paper edge',0,0,1280,24,'#eee7d4');f.rect('root','Bottom paper edge',0,683,1280,37,'#eee7d4');
 f.text('root','Running folio','FIELD NOTES  /  THE WATER CYCLE',48,31,10,rust,800,{weight:600});
 f.text('root','Source note','ONE POSSIBLE JOURNEY · TIME AND SCALE COMPRESSED',48,696,9,muted,1000);
 f.text('root','Film credit','LOOPLILT',1162,696,10,rust,90,{weight:600});
 const sections=[
 [0,8,'A small departure.','The shape\\nof returning.','A journey through water, weather and the spaces between.'],
 [8,10,'01  /  EVAPORATION','Leaving without a trace.','Water becomes invisible vapor. Sunlight supplies the energy.'],
 [18,11,'02  /  CONDENSATION','Finding each other.','As moist air cools, vapor can condense into tiny liquid droplets.'],
 [29,10,'03  /  PRECIPITATION','The sky lets go.','Rain returns water to the land. Its next path is still unwritten.'],
 [39,11,'04  /  INFILTRATION & GROUNDWATER','A quieter way home.','Some water enters soil, moving through pores and cracks.'],
 [50,10,'05  /  CONNECTION','A return. Not an ending.','Rivers and groundwater meet the sea. The cycle has many routes.']];
 for(const [start,seconds,kicker,title,body]of sections){
  const g=f.group('root','Chapter · '+kicker,{},{start:start*30,duration:seconds*30});
  f.text(g.id,'Chapter label',kicker.toUpperCase(),49,67,11,rust,1100,{weight:600});
  f.text(g.id,'Chapter title',title.replace('\\n','\n'),45,start===0?96:103,start===0?61:48,ink,start===0?720:1160,{serif:true});
  f.text(g.id,'Explanation',body,49,start===0?257:176,19,muted,1100);
  f.fade(g,15,12);
 }
 function callout(name,text,x,y,start,seconds,width=260){
  const group=f.group('root',name,{},{start:start*30,duration:seconds*30});f.rect(group.id,name+' rule',x,y,25,2,'#a88c62');f.text(group.id,name+' text',text,x,y+13,13,ink,width,{weight:600});f.fade(group,18,18);
 }
 callout('Vapor detail','WATER VAPOR · A GAS',905,72,9,8,300);
 // The vapor title and inset label are separated vertically to avoid collisions.
 d.nodes[Object.keys(d.nodes).find(id=>d.nodes[id].name==='Vapor detail rule')].transform.y=383;
 d.nodes[Object.keys(d.nodes).find(id=>d.nodes[id].name==='Vapor detail text')].transform.y=396;
 callout('Liquid detail','CLOUD DROPLETS · LIQUID',930,580,19,9,300);
 callout('Groundwater detail','WATER IN PORES AND CRACKS',954,664-38,40,9,300);
 callout('Timing reminder','THESE JOURNEYS TAKE DIFFERENT AMOUNTS OF TIME.',48,636,40,9,760);
 const score=[],chords=[[45,52,57,60],[41,48,53,57],[48,55,60,64],[43,50,55,59],[45,52,57,60],[41,48,53,57],[50,57,60,65],[43,50,55,59],[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59],[50,57,60,65],[46,53,58,62],[43,50,55,59],[45,52,57,60],[41,48,53,57],[48,55,60,64],[50,57,60,65],[43,50,55,59],[48,55,60,64],[41,48,53,57],[43,50,55,59],[48,55,60,64]];
 for(let bar=0;bar<24;bar++){
  const at=bar*2.5,ch=chords[bar],strength=bar<3?.65:bar<7?.78:bar<12?.85:bar<16?1:bar<20?.72:.92;
  const pattern=[0,2,1,3,2,1];for(let i=0;i<6;i++)note(score,at+i*5/12,Math.min(1.7,59.9-at-i*5/12),ch[pattern[i]]+12,'guitar',.18*strength,i%2?-.4:.4,.37);
  note(score,at,1.7,ch[0]-12,'bass',.13*strength,-.02,.12);
  if(bar>2&&bar<23){for(let i=1;i<4;i++)note(score,at+.09,2.32,ch[i],'strings',.035*strength,(i-2)*.4,.5);}
  if(bar>=7&&bar<=14)for(let i=0;i<3;i++)note(score,at+.208+i*.833,1.1,ch[(i+bar)%4]+24,'marimba',.075*strength,i%2?.48:-.48,.5);
  if(bar>=10&&bar<22)for(let beat=0;beat<6;beat++){note(score,at+beat*5/12,.14,60,'brush',.036*(beat%3===0?1:.6),-.27,.12);if(beat%3===0)note(score,at+beat*5/12,.16,48,'kick',.055,.1,.08);}
  if(bar>=20)for(let i=0;i<3;i++)note(score,at+.15+i*.75,Math.min(1.5,59.8-at-.15-i*.75),ch[i]+24,'piano',.075,i%2?-.2:.2,.45);
 }
 const melody=[[18,76],[19.25,74],[20.5,72],[22,69],[24,72],[25.25,76],[27,79],[29,77],[30.25,76],[31.5,72],[33,74],[35,69],[36.25,67],[38,65],[50.5,72],[51.75,76],[53,79],[54.25,77],[55.5,76],[57,72]];
 for(const [at,pitch]of melody)note(score,at,1.8,pitch,'marimba',.095,Math.sin(at)*.25,.5);
 note(score,0,7.7,40,'surf',.038,-.35,.22);
 note(score,8,9.5,45,'wind',.014,.15,.35);
 note(score,18,10.7,52,'wind',.018,-.15,.35);
 note(score,29,9.9,48,'rain',.025,0,.2);
 note(score,39,10.6,38,'wind',.011,.35,.38);
 note(score,50,9.6,40,'surf',.035,-.2,.3);
 for(const at of [29.25,30.6,32.3,34.8,39.9,41.2,44.5,47.1])note(score,at,.55,79+Math.floor(at)%5,'pluck',.05,Math.sin(at)*.7,.7);
 const sound=await f.score({version:1,title:'The ways water remembers · original acoustic score',duration:60,fps:30,audio:{mode:'studio',room:.37,delay:.1,echoSeconds:.4166667},captions:[],score},3.9);
 d.extensions={looplilt:{style:'Illustrated scientific fieldbook',description:'An original water-cycle journey with six cutaway landscapes, editable graph typography and a fingerpicked acoustic score.',chapters:scenes.map(s=>({name:s.label,start:s.start*30})),soundtrackNode:sound.id,posterFrame:100,reviewFrame:1320,sourceReferences:[{title:'NASA: What is the water cycle?',url:'https://gpm.nasa.gov/resources/faq/what-water-cycle'},{title:'USGS: The water cycle',url:'https://www.usgs.gov/water-science-school/water-cycle'}],artwork:'Original draw.js kept byte-for-byte in the project bundle. Procedural marks remain editable as source; titles and callouts are individual graph objects.'}};
 await fs.writeFile(path.join(here,'project.json'),projectBytes);
 return f.finish();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {document,assets}=await createFilm();await fs.mkdir(path.join(here,'assets'),{recursive:true});for(const asset of Object.values(document.assets))await fs.writeFile(path.join(here,asset.path),assets.get(asset.id));await fs.writeFile(path.join(here,'project.looplilt.json'),JSON.stringify(document,null,2)+'\n');console.log(JSON.stringify({title:document.title,nodes:Object.keys(document.nodes).length,assets:assets.size,seconds:document.durationFrames/30}));
}

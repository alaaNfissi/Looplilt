import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Film,note,chapter,label,letterbox} from '../authoring.mjs';
import {validateGraph} from '../../../lib/graph/schema.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const seed=JSON.parse(await fs.readFile(path.join(here,'handoff.looplilt.json'),'utf8'));validateGraph(seed);
export async function createFilm(){
 const f=new Film('the-last-light-directors-cut','The Last Light · a city in four small moments',48),d=f.document;
 const P={sky:'#101f2b',ink:'#0a1721',far:'#23404c',wall:'#32565e',pale:'#e8dfc7',gold:'#f5c681',mint:'#93bba8'};
 function glow(p,name,x,y,r,color='#f7c47c'){for(let i=4;i>=1;i--)f.ellipse(p,name+' halo '+i,x-r*i/4,y-r*i/4,r*i/2,r*i/2,color,{opacity:.025+(4-i)*.025,blend:'screen'});}
 function sky(p,seconds){f.rect(p,'Ink blue sky',0,0,1280,720,P.sky);
  for(let i=0;i<14;i++)f.rect(p,'Atmospheric horizon '+i,0,275+i*22,1280,23,['#172a36','#192e3a','#1c333d','#1e3941'][Math.min(3,Math.floor(i/4))]);
  for(let i=0;i<70;i++){const x=30+(i*241)%1230,y=35+(i*71)%310;const n=f.ellipse(p,'Distant star '+i,x,y,1+i%3,1+i%3,i%4?'#a6bab6':'#efcf96',{opacity:.15+(i%7)/12});f.oscillate(n,'opacity',.12,100+i*3,i*33);}
  glow(p,'Moonlight',1045,115,250,'#92c1c3');f.ellipse(p,'Lunar disc',1005,70,91,91,'#e2dec9');f.ellipse(p,'Lunar shadow',986,58,86,86,P.sky);
  for(let i=0;i<4;i++){const g=f.group(p,'Cloud bank '+i,{x:i*410-170,y:180+(i%2)*42});for(let j=0;j<4;j++)f.ellipse(g.id,'Cloud curl '+j,j*63,-(j%2)*15,140,28,'#314b53',{opacity:.23});f.animate(g,'transform.x',[[0,i*410-170],[seconds*30-1,i*410-95]]);}
 }
 function buildings(p,night=false,lightsStart=0){for(let i=0;i<12;i++){let x=i*120-40,y=320+(i*43)%90;f.rect(p,'Distant roof '+i,x,y,97,340,'#1e3742');f.rect(p,'Roofline '+i,x-3,y-7,103,9,'#29444e');for(let k=0;k<5;k++)f.rect(p,'Distant window '+i+'.'+k,x+15+(k%3)*24,y+22+Math.floor(k/3)*31,10,18,'#7e9e96',{opacity:night?.13:.3});}
  const city=f.group(p,'Townhouses · editable original scene',{x:0,y:30});const allowed=id=>/^(house-|roof-|window-|door-)/.test(id);
  for(const original of Object.values(seed.nodes).filter(n=>allowed(n.id))){const copy=structuredClone(original);copy.id='city-'+(++f.count);copy.parentId=city.id;copy.time.duration=1440;copy.animations={};copy.effects=[];copy.children=[];d.nodes[copy.id]=copy;d.nodes[city.id].children.push(copy.id);
   if(original.id.startsWith('window-')){copy.opacity=night?.09:.55;
    if(lightsStart>0){const at=lightsStart+(Number(original.id.split('-')[1])*11+Number(original.id.split('-')[2])*5);f.animate(copy,'opacity',[[0,.09,'hold'],[at,.09,'ease-out'],[at+22,1]]);}
    f.rect(city.id,'Window sill',copy.transform.x-3,copy.transform.y+copy.props.height+1,copy.props.width+6,3,'#607975');
    f.rect(city.id,'Window mullion',copy.transform.x+copy.props.width/2-1,copy.transform.y,2,copy.props.height,'#244047');
    f.rect(city.id,'Window crossbar',copy.transform.x,copy.transform.y+12,copy.props.width,2,'#244047');}
  }
  for(let i=0;i<7;i++){const x=40+i*178,y=350-(i%3)*22+30;f.path(p,'Roof silhouette '+i,'M'+(x-9)+' '+(y-10)+' L'+(x+71)+' '+(y-65)+' L'+(x+151)+' '+(y-10)+'Z',i%2?'#21363f':'#19313c');
   f.rect(p,'Roof chimney '+i,x+22,y-57,17,46,'#3d595b');f.rect(p,'Chimney cap '+i,x+18,y-59,25,5,'#6a8176');f.rect(p,'Facade edge '+i,x+138,y,4,224,'#203b44');
   for(let j=0;j<9;j++)f.rect(p,'Stone joint '+i+'.'+j,x+8+(j%2)*57,y+9+j*21,28,1,'#66817a',{opacity:.18});
   f.rect(p,'Door highlight '+i,x+56,y+175,3,52,'#6d8880');
   f.ellipse(p,'Door handle '+i,x+82,y+201,3,3,'#d5b177');
   f.rect(p,'Window box '+i,x+21,y+117,39,7,'#8e7161');for(let j=0;j<5;j++)f.ellipse(p,'Window box leaf '+i+'.'+j,x+22+j*7,y+111-(j%2)*4,8,11,j%2?'#6f9e7d':'#4b826c');
  }
  f.rect(p,'Pavement',0,608,1280,25,'#6e8782');f.rect(p,'Curb highlight',0,608,1280,4,'#a5b6a0');f.rect(p,'Night road',0,633,1280,90,'#0c1b26');
  for(let i=0;i<24;i++){f.rect(p,'Paving seam '+i,i*61,612,1,20,'#425c5e');f.rect(p,'Rain reflection '+i,i*59+11,638+(i%3)*15,28+(i%4)*13,2,'#51766e',{opacity:.22});}
  for(let i=0;i<8;i++)f.rect(p,'Road line '+i,i*180+23,681,62,3,'#7f9384',{opacity:.4});
 }
 function foreground(p,offset=0){
 const g=f.group(p,'Foreground plane · railings and leaves',{x:offset,y:0});
 for(const x of [28,1189]){f.path(g.id,'Tree trunk','M'+x+' 714L'+(x+7)+' 505L'+(x+20)+' 400L'+(x+29)+' 505L'+(x+36)+' 714Z','#081922');f.path(g.id,'Tree branches','M'+(x+17)+' 530L'+(x-23)+' 470 M'+(x+21)+' 492L'+(x+64)+' 435','#00000000','#081922',9);
 for(let j=0;j<13;j++){const leaf=f.ellipse(g.id,'Night leaves',x-53+(j*37)%125,382+(j*17)%133,57+(j%3)*13,24+(j%4)*8,j%2?'#102b32':'#0b222c');f.oscillate(leaf,'transform.rotation',1.5,132,j*27);}}
 for(let i=0;i<16;i++)f.rect(g.id,'Iron railing '+i,12+i*30,671,3,49,'#0a1923');f.rect(g.id,'Iron rail',0,678,478,3,'#102832');return g;
 }
 function frameCamera(parent,name,keys){const group=f.group(parent,name);const children=[...d.nodes[parent].children].filter(id=>id!==group.id);d.nodes[parent].children=d.nodes[parent].children.filter(id=>!children.includes(id));group.children=children;for(const id of children)d.nodes[id].parentId=group.id;
 for(const property of ['x','y','scaleX','scaleY'])f.animate(group,'transform.'+property,keys.map(k=>[k[0],k[property],k.easing]));return group;
 }
 function lamp(p,x,y,lit=true){f.rect(p,'Cast iron lamppost',x,y,5,158,'#0b202a');f.rect(p,'Foot of lamp',x-7,y+152,19,8,'#122c34');f.path(p,'Lamp arm','M'+(x+2)+' '+(y+12)+' Q'+(x+2)+' '+(y-28)+' '+(x+34)+' '+(y-23),'#00000000','#10252e',5);
  f.path(p,'Lamp shade','M'+(x+20)+' '+(y-20)+' Q'+(x+34)+' '+(y-40)+' '+(x+49)+' '+(y-20)+'Z','#344d50');
  if(lit){f.path(p,'Pool of light','M'+(x+23)+' '+(y-16)+' L'+(x-55)+' '+(y+156)+' L'+(x+124)+' '+(y+156)+' L'+(x+45)+' '+(y-16)+'Z','#edc788',{opacity:.075,blend:'screen'});glow(p,'Warm lamplight',x+35,y-15,90);f.ellipse(p,'Lamp bulb',x+26,y-19,18,6,'#f8dfaa');}}
 function van(p,x,y,scale=1,travel=null){const g=f.group(p,'Courier · original editable character',{x,y,scaleX:scale,scaleY:scale});
  const sourceIds=new Set(['courier-shadow','van-body','van-cab','windshield','wheel-back','wheel-front','hub-back','hub-front','parcel']);
  for(const old of Object.values(seed.nodes).filter(n=>sourceIds.has(n.id))){const copy=structuredClone(old);copy.id='van-'+(++f.count);copy.parentId=g.id;copy.time.duration=1440;d.nodes[copy.id]=copy;g.children.push(copy.id);}
  f.rect(g.id,'Cargo panel bevel',5,7,89,3,'#f3d0a0',1);f.rect(g.id,'Cargo door seam',94,8,1,45,'#ac7958');f.rect(g.id,'Door handle',106,42,8,2,'#476568');f.rect(g.id,'Bumper',135,57,16,5,'#aebba5',2);f.ellipse(g.id,'Headlight',142,40,7,9,'#ffe4aa');f.rect(g.id,'Rear red lamp',-1,39,4,8,'#e58069',1);
  f.path(g.id,'Headlight beam','M149 40 L245 20 L245 74 L149 49Z','#f6c67c');
  const beam=d.nodes[g.children.at(-1)];beam.props.stroke='#00000000';beam.props.strokeWidth=0;beam.opacity=.11;
  f.text(g.id,'Delivery badge','LIGHT POST',12,35,7,'#805d4c',80,{weight:600});
  if(travel)f.animate(g,'transform.x',travel);
  f.oscillate(g,'transform.y',.8,13,20);return g;
 }
 const a=chapter(f,'night','01 · The city exhales',0,12);sky(a,12);const ac=f.group(a,'Slow cinematic push',{x:0,y:0});
 buildings(ac.id,false);lamp(ac.id,240,451);lamp(ac.id,850,451);
 const firstVan=van(ac.id,-180,554,.8,[[0,-180,'ease-in-out'],[359,600]]);
 f.animate(ac,'transform.scaleX',[[0,1],[359,1.05]]);f.animate(ac,'transform.scaleY',[[0,1],[359,1.05]]);f.animate(ac,'transform.y',[[0,0],[359,-25]]);
 foreground(a);label(f,a,'01','One last delivery',0,150);
 const opening=f.group(a,'Opening title',{},{start:18,duration:190});f.text(opening.id,'Title','The last light.',63,94,79,P.pale,930,{serif:true});f.text(opening.id,'Opening premise','The city was going to sleep. One parcel was still awake.',68,191,20,'#adc2ba',1100);f.fade(opening,23,25);
 const b=chapter(f,'cargo','02 · Something worth carrying',12,10);sky(b,10);
 const window=f.rect(b,'Windshield aperture',135,116,1010,398,'#ffffff',55);
 const view=f.group(b,'Passing city through glass');buildings(view.id,true);view.mask={nodeId:window.id,mode:'alpha'};f.animate(view,'transform.x',[[0,80],[299,-350]]);f.animate(view,'transform.y',[[0,-100],[299,-100]]);
 const frame=f.path(b,'Windshield surround','M0 0H1280V720H0Z M135 116V514H1145V116Z','#10252c');frame.props.fillRule='evenodd';
 f.rect(b,'Window inner frame',124,105,1032,420,'#00000000',60);const rim=d.nodes[b].children.at(-1);d.nodes[rim].props.stroke='#547270';d.nodes[rim].props.strokeWidth=9;
 for(let i=0;i<36;i++){const x=165+(i*173)%930,y=130+(i*67)%280;const r=f.path(b,'Rain on glass '+i,'M'+x+' '+y+' l-5 19','#00000000','#8db2b0',1.3,{opacity:.3});f.oscillate(r,'transform.y',14,45+i*3,i*50);}
 f.path(b,'Windshield wiper','M640 518 L890 190','#00000000','#0a1720',10);const w=d.nodes[d.nodes[b].children.at(-1)];w.transform.anchorX=640;w.transform.anchorY=518;w.transform.x=640;w.transform.y=518;f.oscillate(w,'transform.rotation',21,92);
 f.path(b,'Dashboard','M0 513 Q640 455 1280 513 L1280 720 L0 720Z','#223b40');f.path(b,'Dashboard trim','M0 535 Q640 480 1280 535','#00000000','#59756c',5);
 f.ellipse(b,'Steering wheel outside',27,469,268,268,'#112731');f.ellipse(b,'Steering wheel inside',49,491,224,224,'#29464b');f.path(b,'Steering wheel spokes','M160 601L63 540 M160 601L251 540 M160 601L160 716','#00000000','#142a33',17);
 const parcel=f.group(b,'The parcel',{x:600,y:375});glow(parcel.id,'Parcel glow',105,85,340);f.path(parcel.id,'Package top','M0 35 L70 0 L262 18 L205 59Z','#f3d1a0');f.path(parcel.id,'Package front','M0 35 L205 59 L205 202 L0 175Z','#c59260');f.path(parcel.id,'Package side','M205 59 L262 18 L262 165 L205 202Z','#94694f');
 f.path(parcel.id,'Linen ribbon','M88 9 L117 12 L52 43 L52 181 L31 179 L31 39Z','#eadfbd');f.path(parcel.id,'Ribbon across','M0 101 L205 122 L262 84 L262 104 L205 144 L0 123Z','#eadfbd');
 f.rect(parcel.id,'Paper address label',81,71,97,60,'#f4e5c4',3);f.text(parcel.id,'Address','THE HOUSE',90,84,12,'#785c47',85,{weight:600});f.text(parcel.id,'Address line','AT THE END',90,101,10,'#785c47',85);f.text(parcel.id,'Address line 2','OF THE STREET',90,116,9,'#785c47',85);
 f.oscillate(parcel,'transform.y',2.2,56);f.animate(parcel,'transform.x',[[0,600],[299,628]]);
 parcel.effects.push({id:'paper-shadow',type:'shadow',version:1,enabled:true,props:{x:7,y:14,blur:18,color:'#06151d66'}});
 frameCamera(b,'Slow push into the precious cargo',[{0:0,x:0,y:0,scaleX:1,scaleY:1},{0:299,x:-95,y:-46,scaleX:1.12,scaleY:1.12}]);label(f,b,'02','Fragile. Handle with hope.',0,230);
 const c=chapter(f,'arrival','03 · A dark window',22,12);sky(c,12);buildings(c,true);
 const house=f.group(c,'Last house · layered cutaway',{x:480,y:118});
 f.path(house.id,'Gabled roof','M-33 80L150 -34L335 80Z','#213642');f.rect(house.id,'Building front',0,74,303,443,'#3c6064');f.rect(house.id,'Side wall',303,74,42,443,'#26434d');
 f.rect(house.id,'Roof fascia',-8,71,319,12,'#8fa797');f.rect(house.id,'Cornice detail',12,96,279,5,'#70958b');
 for(let floor=0;floor<3;floor++)for(let col=0;col<2;col++){const x=41+col*140,y=128+floor*110;f.rect(house.id,'Window reveal',x-9,y-9,83,89,'#26414b',3);f.rect(house.id,'Window frame',x-3,y-3,71,77,'#9aab94',2);const glass=f.rect(house.id,'Window glass',x,y,65,70,'#152c37');
  f.rect(house.id,'Window sash',x+31,y,3,70,'#77968c');f.rect(house.id,'Window rail',x,y+29,65,3,'#77968c');
  if(floor===0&&col===1){glass.props.fill='#f1c58b';f.animate(glass,'opacity',[[0,.1,'hold'],[135,.1,'ease-in-out'],[172,1]]);const silhouette=f.group(house.id,'Someone waiting',{x:x+9,y:y+21});f.ellipse(silhouette.id,'Head',15,0,17,19,'#d9b88f');f.path(silhouette.id,'Shoulders','M0 46 Q3 23 23 21 Q43 22 47 46Z','#845d4d');f.rect(silhouette.id,'Neck',21,16,7,10,'#d9b88f');f.path(silhouette.id,'Soft dark hair','M14 8Q11 -2 23 -3Q35 -1 33 10L29 4Q22 8 17 4L16 10Z','#493c36');f.ellipse(silhouette.id,'Eye',27,8,1.6,1.8,'#413a35');f.path(silhouette.id,'Small smile','M25 14Q28 16 30 13','#00000000','#8e5c46',.7);f.path(silhouette.id,'Wool scarf','M16 23L31 23L30 28L23 27L21 40L17 39L19 27Z','#d7b676');const arm=f.path(silhouette.id,'A welcoming wave','M36 35Q48 25 44 12','#00000000','#845d4d',7);arm.transform={...arm.transform,x:36,y:35,anchorX:36,anchorY:35};f.oscillate(arm,'transform.rotation',11,53);f.ellipse(silhouette.id,'Waving hand',40,8,7,9,'#d9b88f');f.fade(silhouette,12,0);silhouette.time.start=164;
   for(let i=4;i>=1;i--){const warm=f.ellipse(house.id,'Window warm bloom '+i,x+32-i*42,y+35-i*35,i*84,i*70,'#f5b968',{opacity:0,blend:'screen'});f.animate(warm,'opacity',[[0,0,'hold'],[140,0],[188,.04]]);}}
 }
 f.rect(house.id,'Ground doorway',107,402,86,115,'#19343d',3);f.rect(house.id,'Door panel',117,411,66,106,'#9d7962');f.ellipse(house.id,'Doorknob',170,466,5,5,'#e6c38a');f.rect(house.id,'Welcome step',98,510,104,9,'#adc0a5');
 f.path(house.id,'Drainpipe','M283 90V492Q283 510 299 510','#00000000','#183540',6);
 lamp(c,179,449);lamp(c,1055,449);van(c,140,552,.85,[[0,140,'ease-out'],[115,402],[359,402]]);
 const courier=f.group(c,'Delivery carrier',{x:534,y:559},{start:100,duration:260});f.ellipse(courier.id,'Carrier head',7,-25,16,18,'#dfc59d');f.path(courier.id,'Carrier coat','M8 -9L24 -9L30 22L0 22Z','#dfaa74');f.path(courier.id,'Carrier trousers','M5 22L3 42 M22 22L25 42','#00000000','#203943',6);f.rect(courier.id,'Small parcel',26,-2,14,14,'#ffe4ad',2);f.animate(courier,'transform.x',[[0,534,'ease-in-out'],[64,596],[259,596]]);
 const spark=f.ellipse(c,'A little care',620,568,8,8,'#ffe3a0',{start:137,duration:160,blend:'screen'});spark.behaviors=[{id:'rise',type:'motion-path',version:1,enabled:true,props:{path:'M0 0 C80 -75 210 -130 65 -300',start:0,duration:97,progress:0,driver:'time',repeat:'once',relative:true,orient:false,rotationOffset:0}}];f.fade(spark,8,22);glow(c,'Street warm pool',650,630,140);
 foreground(c);frameCamera(c,'Camera follows the light to the window',[{0:0,x:0,y:0,scaleX:1,scaleY:1,easing:'hold'},{0:138,x:0,y:0,scaleX:1,scaleY:1,easing:'ease-in-out'},{0:315,x:-1439,y:-490,scaleX:3,scaleY:3},{0:359,x:-1439,y:-490,scaleX:3,scaleY:3}]);label(f,c,'03','A small knock. A little light.',0,230);
 const e=chapter(f,'reply','04 · The whole street answers',34,14);sky(e,14);const city=f.group(e,'Return to the city',{x:0,y:0});buildings(city.id,true,18);lamp(city.id,240,451);lamp(city.id,850,451);
 van(city.id,700,553,.8,[[0,700,'ease-in-out'],[310,1350],[419,1350]]);
 for(let i=0;i<16;i++){const s=f.ellipse(e,'Rising light '+i,140+(i*151)%1040,420+(i%3)*23,3+(i%3),3+(i%3),P.gold,{start:50+i*7,duration:220});f.animate(s,'transform.y',[[0,420+(i%3)*23,'ease-out'],[219,100+(i*31)%170]]);f.oscillate(s,'transform.x',15,95,i*21);f.fade(s,20,35);}
 f.animate(city,'transform.scaleX',[[0,1.08],[419,1]]);f.animate(city,'transform.scaleY',[[0,1.08],[419,1]]);f.animate(city,'transform.x',[[0,-45],[419,0]]);f.animate(city,'transform.y',[[0,-41],[419,0]]);
 foreground(e);label(f,e,'04','Warmth travels',0,125);
 const close=f.group(e,'The human-edited message',{},{start:150,duration:270});f.text(close.id,'Message',seed.nodes.message.props.text,65,94,42,P.pale,1170,{serif:true});f.text(close.id,'Final reflection','A little care goes a long way.',68,156,20,'#b5c8ba',1000);f.fade(close,28,22);
 const card=f.group(e,'Closing credit',{},{start:285,duration:135});f.text(card.id,'Studio credit','AN ORIGINAL LOOPLILT FILM',68,224,11,'#d1b992',1000,{weight:600});f.text(card.id,'Editable promise','Every light, window and camera move stays editable.',68,247,14,'#9bb7ac',1000);f.fade(card,20,24);
 letterbox(f);
 const score=[],chords=[[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,58,62],[50,57,60,64],[46,53,57,60],[55,62,65,69],[45,52,55,61],[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,58,62],[55,62,65,69],[45,52,55,61],[50,57,61,66],[50,57,61,66]];
 for(let bar=0;bar<16;bar++){const at=bar*3,ch=chords[bar],rise=bar<4?.65:bar<8?.85:bar<12?1:1.08;
  for(let i=0;i<4;i++)note(score,at+i*.75,Math.min(2,48-at-i*.75),ch[i]+12,'piano',.105*rise,i%2?.33:-.28,.4);
  if(bar>1)for(let i=0;i<3;i++)note(score,at+.06,Math.min(2.85,48-at-.06),ch[i],'strings',.042*rise,(i-1)*.45,.55);
  note(score,at,1.2,ch[0]-12,'bass',.15*rise,-.05,.1);if(bar>3&&bar<15)note(score,at+1.5,.9,ch[1]-12,'bass',.095,.07,.12);
  if(bar>3&&bar<14)for(let beat=0;beat<4;beat++){note(score,at+beat*.75,.3,60,'brush',.035,-.32,.1);if(beat%2)note(score,at+beat*.75,.18,60,'hat',.02,.38,.12);}
  if(bar>7&&bar<15)for(let i=0;i<4;i++)note(score,at+.375+i*.6,.8,ch[i]+12,'guitar',.058,i%2?-.55:.55,.4);
 }
 const melody=[69,72,74,76,72,69,67,65,69,72,74,77,76,74,73,74];
 melody.forEach((pitch,i)=>note(score,24+i*1.35,Math.min(1.7,48-(24+i*1.35)),pitch,i<8?'marimba':'piano',i<8?.075:.11,i%2?.15:-.15,.48));
 note(score,0,11.8,48,'wind',.028,-.4,.5);note(score,12,9.9,48,'rain',.013,0,.2);note(score,22,11.9,48,'wind',.025,.3,.4);
 for(const at of [25.5,25.9])note(score,at,.13,54,'footstep',.22,-.1,.2);
 for(const [at,pitch]of [[27.2,81],[29,84],[34.8,86],[37.1,81]])note(score,at,2,pitch,'bell',.075,.23,.6);
 const soundtrack=await f.score({version:1,title:'Warmth travels · original chamber score',duration:48,fps:30,audio:{mode:'studio',room:.4,delay:.075,echoSeconds:.75},captions:[],score},3.65);
 f.animate(soundtrack,'props.gain',[[0,3.65],[1380,3.65],[1440,0]]);d.nodes.root.props.background='#08131b';d.nodes.reply.transition.out={type:'fade',duration:30};
 d.extensions={looplilt:{description:'An original night-time city story with a piano, bowed-string, guitar and brushed-percussion score.',style:'Cinematic vector illustration',chapters:[{name:'One last delivery',start:0},{name:'Fragile. Handle with hope.',start:360},{name:'A dark window',start:660},{name:'Warmth travels',start:1020}],humanHandoff:{source:'handoff.looplilt.json',message:seed.nodes.message.props.text,confirmedPersonEdit:true,subsequentMcpChange:'Courier arrival from frame370 to390',preservedUntargetedNodes:120},soundtrackNode:soundtrack.id}};
 return f.finish();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {document,assets}=await createFilm();await fs.mkdir(path.join(here,'assets'),{recursive:true});for(const asset of Object.values(document.assets))await fs.writeFile(path.join(here,asset.path),assets.get(asset.id));await fs.writeFile(path.join(here,'project.looplilt.json'),JSON.stringify(document,null,2)+'\n');console.log(JSON.stringify({title:document.title,nodes:Object.keys(document.nodes).length,assets:assets.size,seconds:document.durationFrames/30}));}

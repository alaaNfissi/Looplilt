// Original Looplilt artwork. All marks are drawn from time; no fetched images.
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{const v=Math.sin(n*127.17+73.31)*43758.5453;return v-Math.floor(v);};
let C;
function line(points,color,width=1){C.beginPath();points.forEach((p,i)=>i?C.lineTo(...p):C.moveTo(...p));C.strokeStyle=color;C.lineWidth=width;C.lineCap='round';C.lineJoin='round';C.stroke();}
function poly(points,color){C.beginPath();points.forEach((p,i)=>i?C.lineTo(...p):C.moveTo(...p));C.closePath();C.fillStyle=color;C.fill();}
function ellipse(x,y,rx,ry,color){C.beginPath();C.ellipse(x,y,rx,ry,0,0,TAU);C.fillStyle=color;C.fill();}
function rect(x,y,w,h,color){C.fillStyle=color;C.fillRect(x,y,w,h);}
function curve(points,color,width){C.beginPath();C.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=6)C.bezierCurveTo(...points.slice(i,i+6));C.strokeStyle=color;C.lineWidth=width;C.lineCap='round';C.stroke();}
function gradient(y1,y2,top,bottom){const g=C.createLinearGradient(0,y1,0,y2);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;}
function circleLine(x,y,r,color,width=1){C.beginPath();C.arc(x,y,r,0,TAU);C.strokeStyle=color;C.lineWidth=width;C.stroke();}
function drop(x,y,r,opacity=1){C.save();C.globalAlpha*=opacity;C.translate(x,y);C.beginPath();C.moveTo(0,-r*1.4);C.bezierCurveTo(r*.25,-r*.6,r*.9,-r*.2,r*.8,r*.45);C.bezierCurveTo(r*.7,r*1.4,-r*.8,r*1.4,-r*.8,r*.45);C.bezierCurveTo(-r*.9,-r*.2,-r*.2,-r*.8,0,-r*1.4);C.fillStyle='#218f9a';C.fill();C.strokeStyle='#174f61';C.lineWidth=Math.max(1,r*.04);C.stroke();curve([-r*.38,r*.12,-r*.5,r*.5,-r*.25,r*.78,r*.06,r*.75],'#b7e4dc',Math.max(1,r*.12));C.restore();}
function sun(x,y,r,t){for(let i=0;i<24;i++){const a=i*TAU/24+t*.018;line([[x+Math.cos(a)*(r+12),y+Math.sin(a)*(r+12)],[x+Math.cos(a)*(r+28),y+Math.sin(a)*(r+28)]],'#d8ad6b',1);}ellipse(x,y,r,r,'#e5b56b');ellipse(x-r*.12,y-r*.12,r*.77,r*.77,'#f0cb86');circleLine(x,y,r+4,'#c58f51',.7);}
function paper(){C.save();C.globalAlpha=.085;for(let i=0;i<2800;i++){const x=hash(i*3+1)*1280,y=hash(i*3+2)*720;rect(x,y,hash(i*3+3)*1.8+.4,.6,i%2?'#fff8dd':'#6d614b');}C.restore();}
function haze(t){C.save();C.globalAlpha=.17;for(let i=0;i<18;i++){const x=(i*173+t*(4+i%4))%1590-180;ellipse(x,140+(i%5)*24,100+i%3*32,6,'#fff9e4');}C.restore();}
function bird(x,y,s,t){const flap=Math.sin(t*4)*s*.25;curve([x-s,y-flap,x-s*.6,y-s*.35,x-s*.2,y-s*.3,x,y,x+s*.2,y-s*.3,x+s*.6,y-s*.35,x+s,y-flap],'#56746f',1.7);}
function pine(x,y,s,color='#365d59'){C.save();C.translate(x,y);C.scale(s,s);line([[0,0],[0,-77]],'#775c43',3);for(let j=0;j<5;j++){const yy=-75+j*13,ww=8+j*5;poly([[-ww,yy+20],[0,yy-7],[ww,yy+20],[4,yy+16],[0,yy+24],[-5,yy+16]],color);}C.restore();}
function reeds(x,y,s,t){C.save();C.translate(x,y);C.scale(s,s);for(let i=0;i<7;i++){const bend=(i-3)*4+Math.sin(t+i)*2;curve([0,0,bend*.5,-20,bend,-45,bend*1.2,-60-i%3*11],'#355e57',1.5);ellipse(bend*1.2,-60-i%3*11,2,9,'#9d7654');}C.restore();}
function mountain(points,color){poly([...points,[1280,590],[0,590]],color);C.save();C.globalAlpha=.13;for(let j=0;j<35;j++){const yy=350+j*6;line([[610,yy],[1280,yy-60]],'#234c50',.6);}C.restore();}
function cloud(x,y,s,t,color='#faf5e6'){C.save();C.translate(x,y);C.scale(s,s);for(let i=0;i<11;i++){const xx=(i-5)*17,yy=-Math.sin(i*.9)*10+Math.sin(t*.2+i)*2;ellipse(xx,yy,29+(i%3)*6,19+(i%4)*5,color);}C.restore();}
function ocean(t,close=false){
 rect(0,0,1280,720,gradient(0,720,'#ece4ce','#dbded1'));sun(1025,147,47,t);haze(t);
 poly([[0,345],[105,320],[170,330],[232,307],[345,340],[463,335],[580,359],[1280,360],[1280,720],[0,720]],'#a5bbb1');
 const horizon=close?370:388;rect(0,horizon,1280,720-horizon,gradient(horizon,720,'#88b6b0','#245e67'));
 for(let row=0;row<38;row++){const yy=horizon+row*9,s=(yy-horizon)/320,points=[];for(let x=-40;x<=1320;x+=12)points.push([x,yy+Math.sin(x*.013+t*.75+row*.5)*(2+s*9)+Math.sin(x*.041-t*.5)*s*3]);line(points,row%3===0?'#d8ddd0':row%2?'#4b8b8d':'#75aaa4',.5+s*1.6);}
 for(let i=0;i<48;i++){const y=horizon+hash(i+600)*235,x=1030+Math.sin(i*4)*((y-horizon)*.57+8);line([[x-8,y+Math.sin(t+i)*2],[x+8+hash(i)*24,y+Math.sin(t+i)*2]],'#e8d3a2',1.3);}
 // Survey sailboat and its broken reflection.
 const bx=400+t*5,by=441+Math.sin(t)*3;poly([[bx-29,by],[bx+39,by-2],[bx+24,by+12],[bx-15,by+12]],'#8f563e');line([[bx+4,by],[bx+4,by-80]],'#795f4b',2);poly([[bx+1,by-76],[bx-33,by-4],[bx+1,by-4]],'#f5e8c9');poly([[bx+8,by-69],[bx+34,by-5],[bx+8,by-5]],'#cc885a');for(let i=0;i<5;i++)line([[bx-20+i*4,by+20+i*7],[bx+25-i*2,by+20+i*7]],'#b7b9a3',1.1);
 poly([[0,618],[75,582],[165,611],[240,584],[312,628],[331,720],[0,720]],'#a69b72');poly([[0,634],[74,605],[190,651],[268,637],[298,720],[0,720]],'#677c63');
 for(let i=0;i<23;i++){const x=hash(i+710)*290,y=640+hash(i+730)*75;ellipse(x,y,3+hash(i+10)*16,2+hash(i+20)*5,i%3?'#bac1a0':'#526e61');}
 reeds(64,679,.8,t);reeds(210,700,.55,t);
 for(let i=0;i<5;i++)bird(620+i*37+t*2,304-i%2*18,.6*16,t+i);
 const q=ease((t-2)/5),dx=mix(880,820,q),dy=mix(555,375,q);circleLine(dx,dy+12,27+Math.sin(t*2)*3,'#e1e9ce',1);drop(dx,dy,19+q*5);for(let j=0;j<3;j++)ellipse(dx,dy+35+j*9,18-j*4,1.4,'#d6e2cf');
}
function landscape(t,{cutaway=false,rain=false}={}){
 rect(0,0,1280,720,gradient(0,720,rain?'#d4dfd6':'#ece5d1','#e4e0ca'));if(!rain)sun(173,254,39,t);haze(t);
 mountain([[0,480],[510,444],[627,362],[710,370],[825,228],[910,352],[1001,201],[1110,329],[1201,267],[1280,355]],rain?'#9eb2a9':'#a5b5a1');
 poly([[670,465],[825,228],[904,352],[979,244],[1001,201],[1101,347],[1280,400],[1280,560]],'#78998c');
 poly([[825,228],[796,286],[820,276],[837,310],[849,277],[870,305]],'#edf0d8');
 poly([[1001,201],[962,271],[994,257],[1008,285],[1023,266],[1034,280]],'#f3efd8');
 poly([[825,244],[837,369],[913,476],[853,445],[781,402]],'#5e857b');
 for(let i=0;i<22;i++){const x=715+i*23,y=390+Math.sin(i*.33)*29+hash(i+123)*35;pine(x,y,.3+hash(i)*.35,i%2?'#4d756b':'#527e6d');}
 const coast=[[0,480],[330,480],[452,448],[518,420],[670,426],[753,459],[840,447],[954,453],[1092,477],[1280,465]];
 poly([...coast,[1280,720],[0,720]],'#9da477');
 poly([[0,485],[330,485],[457,452],[542,437],[687,455],[758,488],[926,478],[1129,493],[1280,480],[1280,508],[968,504],[744,510],[518,463],[331,512],[0,512]],'#c2bd90');
 // The river follows the valley to the sea, widening toward its mouth.
 curve([1026,344,981,372,1050,400,929,418,828,434,863,460,733,474,619,483,603,508,492,510,405,513,387,535,321,534],'#cfddc4',15);
 curve([1026,344,981,372,1050,400,929,418,828,434,863,460,733,474,619,483,603,508,492,510,405,513,387,535,321,534],'#4d9b9d',8);
 for(let i=0;i<64;i++){const x=470+hash(i+100)*800,y=454+hash(i+200)*78;if(x>640&&y<480||x<700&&y>475)pine(x,y,.22+hash(i+17)*.36,i%3?'#52765a':'#6b815d');}
 // Farm terraces, a tiny mill and an old stone bridge.
 for(let j=0;j<5;j++)curve([780,513+j*7,890,498+j*7,1000,515+j*7,1140,511+j*7],'#818a60',1.2);
 rect(888,439,24,25,'#e9d1a3');poly([[885,440],[900,429],[917,440]],'#a56d4c');rect(898,452,5,12,'#56746a');ellipse(918,459,10,10,'#8c7656');circleLine(918,459,8,'#e5d8ae',1);for(let k=0;k<8;k++){const a=k*TAU/8+t*.7;line([[918,459],[918+Math.cos(a)*8,459+Math.sin(a)*8]],'#d5c7a2',1);}
 curve([599,493,620,471,642,472,663,491],'#b4aa86',10);curve([599,493,620,477,642,478,663,491],'#e2d4b0',3);
 if(cutaway){
  poly([[330,534],[1280,506],[1280,720],[330,720]],'#ba9c72');
  for(let j=0;j<8;j++){const pts=[];for(let x=330;x<=1280;x+=25)pts.push([x,550+j*26+Math.sin(x*.012+j*.7)*9]);line(pts,j%2?'#8d8a65':'#d4b68b',5+j%3);}
  for(let i=0;i<185;i++){const x=350+hash(i+82)*920,y=548+hash(i+12)*172;ellipse(x,y,2+hash(i)*6,1+hash(i+1)*3,i%3?'#a28d68':'#cfb896');}
 }
 rect(0,480,330,240,gradient(480,720,'#6da7a1','#286c76'));
 for(let j=0;j<19;j++){const yy=492+j*11,pts=[];for(let x=0;x<335;x+=9)pts.push([x,yy+Math.sin(x*.029+j-t)*2]);line(pts,j%3?'#7eb5aa':'#b4c9af',.8);}
}
function vapor(t){
 landscape(t,{cutaway:true});
 const up=ease(t/3);C.save();C.globalAlpha=up;
 for(let i=0;i<62;i++){const p=(t*.11+hash(i+44))%1,x=90+hash(i+9)*230+Math.sin(p*5+i)*23,y=497-p*240;ellipse(x,y,2.1-p*.9,2.1-p*.9,'#659c98');}
 // An enlarged, editorial magnifying glass makes invisible vapor explicit.
 const cx=1040,cy=235;ellipse(cx,cy,138,138,'#e5e3cc');circleLine(cx,cy,138,'#a79b7d',1);circleLine(cx,cy,127,'#d1c6a3',.6);
 for(let i=0;i<25;i++){const a=hash(i+111)*TAU+t*.08,rr=20+hash(i+222)*95,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;ellipse(x,y,3.4,3.4,'#558e92');ellipse(x+5.8,y-3,2,2,'#a4c9ba');ellipse(x-3,y-5,2,2,'#a4c9ba');}
 curve([290,312,520,340,672,206,890,235],'#8d9d84',1);ellipse(290,312,5,5,'#ce995b');
 C.restore();
 for(let i=0;i<4;i++){const p=(t*.09+i*.25)%1;C.save();C.globalAlpha=Math.sin(p*Math.PI)*.45;curve([185+i*19,463,165+i*23,405,211+i*20,386,198+i*25,334],'#d4a56a',1.6);C.restore();}
 cloud(508,257,.8,t,'#e8ead7');cloud(685,224,.65,t,'#f5eed8');
}
function condensation(t){
 rect(0,0,1280,720,gradient(0,720,'#d9e1d3','#c2d3c8'));sun(1100,174,32,t);haze(t);
 mountain([[0,595],[200,508],[290,565],[411,447],[583,590],[706,466],[845,515],[981,410],[1140,504],[1280,452]],'#a0b8ac');
 mountain([[0,660],[201,590],[378,609],[516,534],[735,635],[914,571],[1080,602],[1280,531]],'#7b9c90');
 const cx=660,cy=410,s=1.75+ease(t/11)*.15;
 C.save();C.translate(cx,cy);C.scale(s,s);
 for(let layer=0;layer<4;layer++)for(let i=0;i<14;i++){const x=(i-6.5)*25,y=Math.sin(i*.9+layer)*18-layer*15+Math.sin(t*.25+i)*3;ellipse(x,y,39+(i%3)*5,25+layer*4,['#a3bfb4','#c0d0c1','#e7e9d4','#f2efda'][layer]);}
 C.restore();
 for(let i=0;i<150;i++){const a=hash(i+71)*TAU,rr=20+hash(i+32)*260,p=ease((t-hash(i+10)*3)/6),x=cx+Math.cos(a)*mix(rr+180,rr*.7,p),y=cy+Math.sin(a)*mix(rr*.43+90,rr*.22,p)-20;C.save();C.globalAlpha=.18+.65*p;ellipse(x,y,1.2+p*2.3,1.2+p*2.3,'#7caba6');C.restore();}
 // A microscope-like inset reveals suspended liquid droplets, with no vapor-as-cloud shortcut.
 const mx=1050,my=440;ellipse(mx,my,121,121,'#eee9d3');circleLine(mx,my,121,'#8aa79a',1.2);circleLine(mx,my,112,'#d1ceae',1);
 for(let i=0;i<19;i++){const a=hash(i+40)*TAU+t*.04,rr=20+hash(i+70)*76,x=mx+Math.cos(a)*rr,y=my+Math.sin(a)*rr;ellipse(x,y,4+hash(i)*6,4+hash(i)*6,'#61a4a5');ellipse(x-2,y-2,1.7,1.7,'#cee1d0');}
 curve([828,410,883,394,897,425,930,438],'#779e93',1);circleLine(815,409,13,'#779e93',1);
 if(t>7){const a=ease((t-7)/4);drop(645,470+a*120,17+a*9,a);}
}
function rainfall(t){
 landscape(t,{rain:true});
 cloud(695,277,2.3,t,'#a7bdb3');cloud(950,254,1.9,t+1,'#b8c9bd');cloud(530,294,1.2,t,'#c0cec0');
 const amount=ease(t/2)*(1-ease((t-8)/3));
 C.save();C.globalAlpha=amount*.62;
 for(let i=0;i<135;i++){const x=424+hash(i+700)*840,p=(hash(i)+t*(.55+hash(i+14)*.4))%1,y=304+p*255;line([[x,y],[x-4,y+12]],i%3?'#5d9998':'#e4ebd7',1);}
 C.restore();
 for(let i=0;i<20;i++){const phase=(t*.85+hash(i))%1,x=580+hash(i+91)*580,y=487+hash(i+2)*55;C.save();C.globalAlpha=(1-phase)*amount*.5;C.beginPath();C.ellipse(x,y,2+phase*12,1+phase*4,0,0,TAU);C.strokeStyle='#dce6cc';C.lineWidth=1;C.stroke();C.restore();}
 const p=ease(t/9),x=mix(775,687,p),y=mix(315,491,p);drop(x,y,19,Math.sin(Math.PI*clamp((t+.5)/11))*.8+.2);
 // Foreground botanicals and puddles give the rainfall physical scale.
 poly([[0,635],[100,614],[240,625],[320,654],[1280,651],[1280,720],[0,720]],'#557d66');
 for(let i=0;i<10;i++)reeds(15+i*138,719, .55+hash(i)*.6,t);
 ellipse(827,688,130,15,'#89aea0');for(let i=0;i<5;i++){const p=(t*.5+i*.2)%1;C.save();C.globalAlpha=1-p;C.beginPath();C.ellipse(805,686,10+p*95,2+p*10,0,0,TAU);C.strokeStyle='#d1ddc4';C.lineWidth=1;C.stroke();C.restore();}
}
function underground(t){
 rect(0,0,1280,720,gradient(0,720,'#e9e2cc','#c5b58c'));sun(1121,163,37,t);
 const ground=308;poly([[0,ground+7],[140,ground-12],[290,ground+4],[440,ground-5],[610,ground+12],[780,ground-3],[970,ground+4],[1280,ground-7],[1280,720],[0,720]],'#bca279');
 for(let i=0;i<5;i++){const y=ground+62+i*67;C.beginPath();C.moveTo(0,y);for(let x=0;x<=1280;x+=32)C.lineTo(x,y+Math.sin(x*.009+i)*10);C.lineTo(1280,720);C.lineTo(0,720);C.closePath();C.fillStyle=['#cfb38a','#b99571','#a68a6c','#91a095','#879b8e'][i];C.fill();}
 // Roots and pores, not a fictional open underground river.
 for(let i=0;i<12;i++){const x=70+i*109;pine(x,ground+Math.sin(i)*6,.34+hash(i)*.26,i%2?'#648269':'#4c7163');for(let j=0;j<4;j++)curve([x,ground,x+Math.sin(j)*18,ground+23,x+Math.cos(j)*29,ground+40,x+(j-1.5)*25,ground+57+hash(i+j)*15],'#857156',1.4);}
 for(let i=0;i<430;i++){const x=hash(i+1)*1280,y=ground+38+hash(i+19)*370,r=2+hash(i+25)*9;ellipse(x,y,r,r*.65,i%4?'#d7c2a0':'#6b8179');if(i%5===0)ellipse(x,y,r*.38,r*.24,'#4d9594');}
 for(let row=0;row<7;row++){const y=395+row*36;for(let col=0;col<8;col++){const x=40+col*172+(row%2)*33;curve([x,y,x+27,y+13,x+43,y-16,x+73,y+5,x+94,y+27,x+120,y+11,x+155,y+28],'#7f8069',1.1);}}
 const down=clamp(t/4),flow=clamp((t-3)/7);
 for(let i=0;i<46;i++){const pp=(i/46+t*.06)%1,x=880-pp*790,y=520+Math.sin(pp*TAU*1.8)*24;C.save();C.globalAlpha=.2+flow*.7;ellipse(x,y,2.4,2.4,'#307f8b');C.restore();}
 for(let i=0;i<14;i++){const p=(i/14+t*.1)%1;ellipse(840+Math.sin(i*1.4+p)*24,ground+25+p*190,2.3,2.3,'#468f95');}
 drop(mix(842,450,flow),mix(326,530,down)+Math.sin(t)*3,16,.8);
 // Recharge from above and discharge at the coast.
 poly([[0,315],[66,315],[80,720],[0,720]],gradient(315,720,'#7db1a7','#2f7480'));
 for(let i=0;i<16;i++)line([[2,340+i*23],[65,341+i*23]],'#c6d6ba',.8);
 // A small magnification reveals water held in the spaces between grains.
 const cx=1100,cy=526;ellipse(cx,cy,132,132,'#e7d8b4');circleLine(cx,cy,132,'#9a8868',1.5);
 C.save();C.beginPath();C.arc(cx,cy,125,0,TAU);C.clip();rect(cx-130,cy-130,260,260,'#5e9b9c');
 for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const x=cx+i*54+j%2*23,y=cy+j*48;ellipse(x,y,23+hash(i*17+j)*5,21+hash(j*29+i)*4,'#bfa57b');ellipse(x-7,y-6,12,8,'#d9bf94');}
 for(let i=0;i<26;i++){const p=(hash(i)+t*.13)%1;ellipse(cx-125+p*250,cy-108+hash(i+11)*210,2,2,'#d3e6d4');}C.restore();
 curve([850,525,887,519,929,517,967,526],'#688d82',1);
}
function returning(t){
 landscape(t,{cutaway:true});cloud(600,257,1.2,t,'#f0edd6');cloud(876,226,.8,t,'#f5eedb');
 // Show a whole connected system; more than one pathway remains visible.
 const routes=[
 [217,471,150,381,223,285,460,256],
 [492,256,560,206,690,216,790,275],
 [813,293,835,341,873,363,912,397],
 [928,417,806,454,587,489,331,532],
 [889,479,867,583,563,627,331,626]];
 for(let j=0;j<routes.length;j++){const p=routes[j];C.save();C.globalAlpha=.15+ease((t-j*.6)/3)*.45;C.setLineDash([3,8]);curve(p,j===4?'#297f88':'#ae8554',1.5);C.setLineDash([]);C.restore();
  const u=(t*.11+j*.21)%1,iv=1-u,x=iv**3*p[0]+3*iv**2*u*p[2]+3*iv*u**2*p[4]+u**3*p[6],y=iv**3*p[1]+3*iv**2*u*p[3]+3*iv*u**2*p[5]+u**3*p[7];ellipse(x,y,4,4,j===4?'#328f94':'#c79453');}
 for(let i=0;i<5;i++)bird(432+i*35+t*3,330+(i%2)*15,9,t+i);
 const at=ease((t-4)/4);C.save();C.globalAlpha=at;circleLine(189,546,26+Math.sin(t)*3,'#e3ddbf',1);drop(189,537,18);C.restore();
}
function drawFrame({ctx,w,h,t}){
 C=ctx;C.save();C.scale(w/1280,h/720);C.lineCap='round';
 const starts=[0,8,18,29,39,50,60],scenes=[ocean,vapor,condensation,rainfall,underground,returning];
 let index=0;for(let i=0;i<6;i++)if(t>=starts[i])index=i;
 const local=t-starts[index],phase=ease(local/(starts[index+1]-starts[index]));
 const zoom=index===5?mix(1.065,1,phase):mix(1,1.045,phase);
 C.save();C.translate(640,420);C.scale(zoom,zoom);C.translate(-640,-420);scenes[index](local);C.restore();
 // A brief paper-colored shutter provides deliberate chapter cuts.
 const fade=index>0?1-ease(local/.38):1-ease(local/.8);if(fade>0){C.save();C.globalAlpha=fade;rect(0,0,1280,720,'#eee7d4');C.restore();}
 paper();C.restore();
}

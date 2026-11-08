// Original 320×180 pixel artwork, enlarged with nearest-neighbor sampling.
// All scenes are functions of time. No sprite sheets or external images.
const W=320,H=180,TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const hash=n=>{const v=Math.sin(n*127.1+38.7)*43758.5453;return v-Math.floor(v);};
const P={space:'#101b30',deep:'#182a40',navy:'#223c50',steel:'#39566a',slate:'#5f8189',light:'#94b5b0',cream:'#e5d3a7',gold:'#d2a35f',yellow:'#edc77a',rust:'#a66a53',coral:'#db8c70',leaf:'#6ea389',mint:'#a4ddaf',cyan:'#8ed8cb',purple:'#736d91'};
let S,X;function r(x,y,w,h,color){X.fillStyle=color;X.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(x0,y0,x1,y1,color,width=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(let n=0;n<1400;n++){r(x0,y0,width,width,color);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}}
function ellipse(cx,cy,rx,ry,color){for(let y=-Math.ceil(ry);y<=Math.ceil(ry);y++){const half=Math.sqrt(Math.max(0,1-y*y/(ry*ry)))*rx;r(cx-half,cy+y,half*2+1,1,color);}}
function poly(points,color){const low=Math.ceil(Math.min(...points.map(p=>p[1]))),high=Math.floor(Math.max(...points.map(p=>p[1])));for(let y=low;y<=high;y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,color);}}
function panel(x,y,w,h,color=P.steel){r(x,y,w,h,P.space);r(x+1,y+1,w-2,h-2,color);r(x+2,y+2,w-4,1,P.slate);for(const [xx,yy]of [[x+3,y+3],[x+w-4,y+3],[x+3,y+h-4],[x+w-4,y+h-4]])r(xx,yy,1,1,P.light);}
function stars(t,shift=0){r(0,0,W,H,P.space);for(let i=0;i<135;i++){const x=(hash(i+1)*390+shift+t*(.07+i%3*.018))%370-25,y=hash(i+99)*180;const bright=Math.sin(t*.8+i*1.7)>.85;r(x,y,bright?2:1,1,i%4?P.slate:P.cream);if(bright&&i%4===0)r(x,y-1,1,3,P.light);}
 for(let band=0;band<9;band++){const y=45+band*6;for(let i=0;i<95;i++){const x=i*4+Math.sin(band)*8;if(hash(i+band*199)>.63)r(x,y+Math.sin(x*.017)*15,2,1,band%3?P.deep:'#26324b');}}
}
function planet(cx,cy,radius,t){ellipse(cx,cy,radius+2,radius+2,P.slate);ellipse(cx,cy,radius,radius,'#547e86');for(let row=-radius;row<radius;row++){const half=Math.sqrt(radius*radius-row*row);for(let x=-half;x<half;x++){const u=x*.19+row*.11+t*.025;if(Math.sin(u)+Math.sin(x*.09-row*.2)>.68)r(cx+x,cy+row,1,1,row<0?'#89aa91':'#70967f');}}poly([[cx+radius*.3,cy-radius],[cx+radius,cy-radius*.2],[cx+radius,cy+radius],[cx-radius*.1,cy+radius]],'#365e73');}
function bolt(x,y){r(x,y,2,2,P.slate);r(x,y,1,1,P.light);}
function meter(x,y,w,value,color=P.cyan){r(x,y,w,5,P.space);r(x+1,y+1,Math.floor((w-2)*clamp(value)),3,color);for(let i=5;i<w;i+=5)r(x+i,y,1,5,P.steel);}
function pipe(points,on,t){for(let i=1;i<points.length;i++){line(...points[i-1],...points[i],P.space,5);line(points[i-1][0]+1,points[i-1][1]+1,points[i][0]+1,points[i][1]+1,P.slate,3);line(points[i-1][0]+2,points[i-1][1]+2,points[i][0]+2,points[i][1]+2,on?P.cyan:P.deep,1);}if(on){for(let i=0;i<12;i++){const p=(t*.27+i/12)%1,j=Math.min(points.length-2,Math.floor(p*(points.length-1))),a=points[j],b=points[j+1],u=p*(points.length-1)-j;r(a[0]+(b[0]-a[0])*u+2,a[1]+(b[1]-a[1])*u+2,1,1,P.cream);}}}
function bot(x,y,t,{color=P.gold,walk=false,work=false,happy=false,scale=1}={}){X.save();X.translate(Math.round(x),Math.round(y));X.scale(scale,scale);const step=walk?Math.round(Math.sin(t*9)*2):0,bob=happy?Math.round(Math.sin(t*7)*2):walk?Math.abs(step)/2:0;
 ellipse(0,2,9,2,P.space);r(-7,-20-bob,14,13,P.deep);r(-8,-19-bob,16,10,color);r(-6,-21-bob,12,1,P.cream);r(-5,-17-bob,10,5,P.space);r(-4,-16-bob,3,2,happy?P.mint:P.cyan);r(2,-16-bob,3,2,happy?P.mint:P.cyan);if(Math.sin(t*.7)>.99)r(-5,-16-bob,10,2,P.deep);
 r(-5,-8-bob,10,7,color);r(-4,-7-bob,8,1,P.cream);r(-3,-5-bob,2,2,P.rust);r(1,-5-bob,2,2,P.space);r(-5,-1,4,3+step,P.slate);r(2,-1,4,3-step,P.slate);r(-6,1+step,5,2,P.light);r(2,1-step,5,2,P.light);
 r(-9,-9-bob,3,7,P.slate);r(7,-9-bob,3,work?3:7,P.slate);if(work){line(9,-8-bob,14,-13-bob,P.light,2);r(13,-17-bob,2,6,P.cream);r(12,-18-bob,4,2,P.cream);}else if(happy){line(-9,-8-bob,-13,-14-bob,P.light,2);line(9,-8-bob,13,-13-bob,P.light,2);}
 r(-1,-24-bob,2,4,P.slate);r(-2,-25-bob,4,2,Math.sin(t*3)>0?P.coral:P.gold);X.restore();}
function plant(x,y,growth,t){panel(x-13,y-1,26,9,P.rust);r(x-10,y-3,20,3,P.deep);r(x-9,y+5,18,1,P.gold);const height=5+growth*38;line(x,y-3,x,y-height,P.leaf,2);
 for(let i=0;i<5;i++){const yy=y-9-i*7;if(yy<y-height)break;const side=i%2?1:-1,sway=Math.round(Math.sin(t+i)*.8);ellipse(x+side*(5+i%2)+sway,yy,5+growth*3,2+growth*2,i%2?P.leaf:P.mint);line(x,yy+3,x+side*8,yy,P.light,1);}
 if(growth<.1){r(x-1,y-9,2,2,P.gold);line(x,y-7,x+4,y-6,P.rust);}
 if(growth>.8){ellipse(x-1,y-height,4,3,P.yellow);r(x-2,y-height-1,2,2,P.cream);}
}
function chamber(t,restored=false){
 stars(t);planet(restored?64:79,76,34,t);
 // Recessed greenhouse windows and a structural grid.
 r(0,44,320,4,P.steel);r(0,48,320,3,P.slate);r(0,51,320,3,P.deep);
 for(let i=0;i<5;i++){const x=i*80;r(x,51,5,88,P.steel);r(x+1,51,1,88,P.slate);r(x+4,51,2,88,P.space);}
 for(let i=0;i<4;i++){const x=9+i*80;r(x,57,64,1,P.slate);r(x,57,1,66,P.slate);r(x+63,57,1,66,P.deep);r(x,123,64,2,P.steel);line(x,122,x+63,59,P.deep);}
 r(0,133,320,47,P.deep);r(0,133,320,4,P.steel);r(0,137,320,2,P.light);
 for(let x=-30;x<350;x+=20){line(160,130,x*2-160,180,P.steel);r(x,151,14,1,P.slate);r(x+4,168,21,1,P.navy);}
 for(let y=146;y<180;y+=12)r(0,y,320,1,P.steel);
 // Pixel framing surrounds a separately editable imported-video insert.
 const mx=restored?30:199;panel(mx,60,98,65,P.steel);r(mx+5,66,88,51,P.space);r(mx+6,67,86,48,P.navy);r(mx+15,120,33,2,P.deep);for(let i=0;i<5;i++)r(mx+58+i*6,120,3,2,restored?P.cyan:i%2?P.gold:P.coral);
 pipe([[7,57],[7,129],[148,129],[148,95],[186,95]],restored&&t>1,t);
 panel(140,58,32,20,P.steel);meter(144,64,24,restored?ease(t/3):.1,restored?P.cyan:P.coral);r(145,73,5,2,P.gold);r(154,73,12,1,P.slate);
 panel(178,75,17,23,P.navy);for(let j=0;j<3;j++)r(183,80+j*5,7,2,restored?P.cyan:P.rust);
 const px=restored?190:107,growth=restored?ease((t-1)/7):.03;plant(px,135,growth,t);
 // Glass specimen dome with specular pixel bands and sprinklers.
 line(px-25,131,px-25,89,P.slate);line(px+26,131,px+26,89,P.slate);line(px-25,89,px-16,80,P.slate);line(px-16,80,px+17,80,P.slate);line(px+17,80,px+26,89,P.slate);r(px-23,91,1,28,P.light);r(px-20,87,1,12,P.light);r(px-27,131,56,3,P.light);r(px-29,134,60,3,P.steel);
 if(restored&&t>1)for(let i=0;i<18;i++){const p=(t*.45+i/18)%1;r(px-18+hash(i)*36,91+p*35,1,2,i%3?P.cyan:P.cream);}
 const bx=restored?258:mix(34,68,ease(t/8));bot(bx,149,t,{walk:!restored&&t<8,happy:restored&&t>7});
 if(restored){bot(231,149,t+.8,{color:P.rust,happy:t>7,scale:.72});for(let i=0;i<25;i++){const a=hash(i)*TAU,rr=(t*8+i*3)%40;if(t>7)r(px+Math.cos(a)*rr,112+Math.sin(a)*rr,1,1,i%2?P.mint:P.gold);}}
 // Crates, specimen bottles and handwritten-looking strips add inhabited detail.
 panel(9,150,19,15,P.rust);r(12,154,12,6,P.gold);line(12,154,23,160,P.cream);panel(287,141,24,21,P.steel);for(let i=0;i<4;i++){r(291+i*5,145,3,10,P.light);r(292+i*5,144,1,2,P.cream);r(291+i*5,150,3,5,P.cyan);}
}
const mix=(a,b,t)=>a+(b-a)*t;
function workshop(t){
 r(0,0,320,180,P.deep);for(let i=0;i<8;i++){r(i*43,43,1,112,P.steel);r(i*43+2,45,40,2,P.navy);}
 r(0,42,320,6,P.steel);r(0,48,320,2,P.slate);r(0,144,320,36,P.space);
 for(let i=0;i<10;i++){r(i*35,148,29,2,P.steel);r(i*35+9,163,28,1,P.slate);}
 // The dormant rain engine, with layered ribs, gauges and a flywheel.
 panel(43,62,93,79,P.steel);ellipse(88,76,44,12,P.light);r(45,76,87,50,P.slate);ellipse(88,126,44,12,P.steel);ellipse(88,76,36,7,P.deep);r(52,79,72,45,P.navy);
 for(let i=0;i<8;i++){r(54+i*9,80,3,43,P.steel);r(54+i*9,80,1,43,P.light);}
 const on=t>6,amount=ease((t-6)/4);ellipse(88,103,24,24,P.space);ellipse(88,103,21,21,on?P.leaf:P.rust);ellipse(88,103,17,17,P.deep);
 for(let j=0;j<8;j++){const a=j*TAU/8+(on?t*t*.07:t*.07),x=88+Math.cos(a)*14,y=103+Math.sin(a)*14;line(88,103,x,y,on?P.cyan:P.slate,2);}ellipse(88,103,4,4,P.gold);
 pipe([[132,86],[163,86],[163,130],[286,130],[286,60]],on,t);
 panel(186,58,64,44,P.steel);panel(191,63,23,23,P.space);ellipse(202,75,9,9,P.cream);line(202,75,202+Math.cos(-2+amount*2.7)*7,75+Math.sin(-2+amount*2.7)*7,P.rust,1);meter(220,66,22,amount,on?P.cyan:P.coral);meter(220,76,22,amount*.8,P.gold);
 for(let i=0;i<4;i++)r(193+i*13,92,7,3,i===3&&on?P.cyan:P.rust);
 panel(270,60,32,38,P.deep);for(let i=0;i<7;i++){r(274,65+i*4,5+i%3*4,1,P.slate);r(295,65+i*4,2,1,on&&i%2?P.cyan:P.coral);}
 r(177,111,77,4,P.slate);r(181,115,3,30,P.steel);r(247,115,3,30,P.steel);r(192,106,14,4,P.gold);r(210,107,15,2,P.light);line(228,110,239,103,P.cream,2);r(238,101,3,4,P.cream);
 const bx=mix(298,165,ease(t/4));bot(bx,146,t,{walk:t<4,work:t>=4&&t<7,happy:t>9});
 if(t>5&&t<7)for(let i=0;i<9;i++){const p=(t*3+i/9)%1;r(178+Math.cos(i*2)*p*12,126-Math.sin(i*.8)*p*10,1,1,i%2?P.gold:P.cream);}
 // Red status light becomes steady mint only when the connection is restored.
 r(21,55,5,20,P.space);r(22,57,3,5,on?P.cyan:Math.sin(t*7)>0?P.coral:P.rust);r(22,66,3,5,on?P.gold:P.deep);
}
function exterior(t){
 stars(t,-t*2);planet(51,100,48,t);for(let i=0;i<12;i++){const x=(hash(i)*360-t*(1.2+i%3))%360;r(x,52+hash(i+100)*73,2+i%3,1,P.purple);}
 // Foreground hull, rails, tile seams and an exterior cable.
 poly([[0,151],[54,132],[197,132],[221,148],[320,148],[320,180],[0,180]],P.steel);
 poly([[0,159],[56,140],[194,140],[218,156],[320,156],[320,180],[0,180]],P.navy);
 for(let i=0;i<14;i++){const x=i*25;line(x,157,x+22,180,P.slate);r(x+4,167,9,2,P.deep);bolt(x+17,172);}
 pipe([[38,143],[107,143],[107,153],[237,153],[237,105],[251,105]],t>8,t);
 for(let x=10;x<200;x+=23){line(x,133,x,119,P.slate,2);r(x,118,2,1,P.light);}line(10,118,195,118,P.slate,1);
 // Antenna rotated by hand into alignment; pixel scanline polygon fill.
 const angle=mix(-.45,.13,ease((t-4)/4)),cx=253,cy=87;
 X.save();X.translate(cx,cy);X.rotate(angle);poly([[-33,-29],[-25,-33],[-9,-17],[10,2],[31,22],[27,29],[12,29],[-8,17],[-25,-7]],P.light);
 poly([[-28,-27],[-10,-14],[11,6],[27,23],[21,24],[6,13],[-14,-9]],P.steel);
 line(-24,-24,15,17,P.cream);line(12,16,38,-11,P.slate,2);r(36,-14,5,5,P.gold);X.restore();
 poly([[246,94],[256,94],[265,141],[235,141]],P.slate);poly([[248,102],[253,102],[257,136],[243,136]],P.deep);r(232,140,35,5,P.light);r(239,145,22,3,P.steel);
 for(let y=109;y<138;y+=5)line(244,y,256,y,P.gold,1);
 const x=mix(52,229,ease(t/6));bot(x,146,t,{walk:t<6,work:t>=6&&t<9,happy:t>10});line(48,141,x-8,140,P.rust,1);
 if(t>8)for(let i=0;i<4;i++){const radius=8+((t-8)*22+i*12)%62;X.globalAlpha=(1-radius/75)*.65;for(let a=-1.6;a<-.1;a+=.06)r(288+Math.cos(a)*radius,73+Math.sin(a)*radius,1,1,P.cyan);X.globalAlpha=1;}
 if(t>2&&t<5){const p=ease((t-2)/3);line(150+p*120,62+p*26,160+p*120,64+p*26,P.gold);r(160+p*120,64+p*26,2,1,P.cream);}
}
function drawFrame({ctx,w,h,t}){
 if(!S){S=new OffscreenCanvas(320,180);X=S.getContext('2d');}X.reset();X.imageSmoothingEnabled=false;
 if(t<12)chamber(t);else if(t<24)workshop(t-12);else if(t<36)exterior(t-24);else chamber(t-36,true);
 // Sparse film grain remains on the same pixel grid.
 for(let i=0;i<100;i++){const x=hash(i+42)*320,y=hash(i+93)*180;if(i%3===0){X.globalAlpha=.08;r(x,y,1,1,P.cream);}}X.globalAlpha=1;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(S,0,0,w,h);ctx.restore();
}

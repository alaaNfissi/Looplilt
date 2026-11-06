// Make Room — original kinetic typography and geometric staging.
function drawFrame({ctx:c,w,h,t,shot:s,motion:m}) {
 const U=Math.min(w,h)/720,tall=h>w,q=s.time,tau=2*Math.PI;
 const P={paper:'#f4e8cb',ink:'#202c36',blue:'#3854a6',coral:s.params.accent,yellow:'#e1af36',mint:'#7f9c86'};
 function rect(x,y,ww,hh,col,r=0){c.fillStyle=col;c.beginPath();c.roundRect(x,y,ww,hh,r);c.fill()}
 function line(p,col,ww=2){c.strokeStyle=col;c.lineWidth=ww;c.lineCap='round';c.lineJoin='round';c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
 function circle(x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,Math.max(.01,r),0,tau);c.fill()}
 function label(str,x,y,size,col=P.ink,align='left',weight=650){c.fillStyle=col;c.font=weight+' '+size+'px system-ui,sans-serif';c.textBaseline='middle';c.textAlign=align;c.fillText(str,x,y)}
 function word(str,x,y,size,col,spacing=0,rotation=0){
  m.transform(c,{x,y,rotation},()=>{
   c.font='900 '+size+'px Arial,sans-serif';c.textBaseline='alphabetic';c.textAlign='left';
   const widths=[...str].map(z=>c.measureText(z).width),total=widths.reduce((a,b)=>a+b,0)+spacing*(str.length-1);let xx=-total/2;
   for(let i=0;i<str.length;i++){c.fillStyle=P.ink;c.fillText(str[i],xx+5*U,5*U);c.fillStyle=col;c.fillText(str[i],xx,0);xx+=widths[i]+spacing}
  });
 }
 function dot(x,y,r=22*U,angle=0,stretch=1){
  m.transform(c,{x,y,rotation:angle},()=>{c.scale(stretch,1/stretch);circle(4*U,6*U,r,P.ink);circle(0,0,r,P.coral);line([[-r*.35,-r*.4],[-r*.05,-r*.58]],'#ffe6b6',3*U)});
 }
 function marks(){
  for(const [x,y,sx,sy] of [[24*U,24*U,1,1],[w-24*U,24*U,-1,1],[24*U,h-24*U,1,-1],[w-24*U,h-24*U,-1,-1]]){
   line([[x+sx*15*U,y],[x,y],[x,y+sy*15*U]],P.ink,U);
  }
  label('AN EXERCISE IN MAKING SPACE',40*U,h-40*U,10*U);
  label('LOOPLILT / TYPE STUDY 03',w-40*U,42*U,10*U,P.ink,'right');
 }
 function hatch(x,y,ww,hh,col){
  c.save();c.beginPath();c.rect(x,y,ww,hh);c.clip();
  for(let d=-hh;d<ww+hh;d+=12*U)line([[x+d,y],[x+d+hh,y+hh]],col,1.2*U);
  c.restore();
 }
 function tile(x,y,ww,hh,col,txt,angle=0){
  m.transform(c,{x,y,rotation:angle},()=>{rect(5*U,7*U,ww,hh,P.ink,3*U);rect(0,0,ww,hh,col,3*U);if(txt)label(txt,ww/2,hh*.54,hh*.75,P.paper,'center',900)});
 }
 function petals(x,y,r,turn,open){
  for(let i=0;i<12;i++){const a=i*tau/12+turn;
   m.transform(c,{x,y,rotation:a},()=>{rect(r*.24, -r*.075, r*.75*open,r*.15,i%2?P.blue:P.yellow,r*.075)})}
  circle(x,y,r*.2,P.ink);circle(x,y,r*.12,P.paper);
 }
 rect(0,0,w,h,P.paper);marks();
 if(s.id==='full'){
  const cx=w*.5,cy=h*(tall?.39:.43),size=(tall?150:200)*U;
  label('EVERYTHING IN ITS PLACE.',w*.08,h*.18,16*U);
  word('FULL',cx,cy,size,P.blue,-9*U);
  const rowY=cy+28*U,tw=(w*.78)/5;
  for(let i=0;i<5;i++)tile(w*.11+i*tw,rowY,tw-11*U,65*U,[P.mint,P.yellow,P.blue,P.mint,P.yellow][i],['A','B','C','D','E'][i]);
  hatch(w*.11,rowY+88*U,w*.78,18*U,P.ink);
  const enter=m.tween(q,0,1.8,0,1),x=m.mix(-30*U,w*.83,enter),y=rowY+165*U-Math.abs(Math.sin(q*4))*12*U*(1-enter);
  dot(x,y,24*U,q*2);
  const knock=Math.max(0,Math.sin((q-2)*tau*3))*m.tween(q,1.8,2.1,0,1)*(1-m.tween(q,3.4,4,0,1));
  line([[x-17*U,y-53*U-knock*8*U],[x-17*U,y-63*U-knock*8*U]],P.coral,3*U);
  line([[x+17*U,y-53*U-knock*8*U],[x+17*U,y-63*U-knock*8*U]],P.coral,3*U);
  label('One more?',w*.25,rowY+165*U,27*U,P.ink,'center',500);
 }else if(s.id==='try'){
  label('A PERFECTLY BAD FIT.',w*.08,h*.16,16*U);
  const bx=w*.5,by=h*.48,bs=(tall?180:215)*U;
  rect(bx-bs/2+8*U,by-bs/2+10*U,bs,bs,P.ink,5*U);rect(bx-bs/2,by-bs/2,bs,bs,P.blue,5*U);
  const hole=34*U;rect(bx-hole/2,by-hole/2,hole,hole,P.paper);
  for(let i=0;i<4;i++){circle(bx+(i%2?1:-1)*(bs/2-14*U),by+(i<2?-1:1)*(bs/2-14*U),3*U,P.paper)}
  const approach=m.keyframes(q,[[0,-w*.36],[1.2,-bs*.62],[1.55,-bs*.74],[2.2,-bs*.62],[2.55,-bs*.75],[3.3,-bs*.62],[3.8,-bs*.87],[5.8,-bs*.87]]);
  dot(bx+approach,by,25*U,q*2,1+Math.max(0,Math.sin(q*tau*1.4))*.08);
  for(let i=0;i<3;i++){const active=m.tween(q,.9+i*1.05,1.1+i*1.05,0,1);c.globalAlpha=active;line([[w*.39+i*40*U,h*.77-8*U],[w*.39+i*40*U+16*U,h*.77+8*U]],P.coral,3*U);line([[w*.39+i*40*U+16*U,h*.77-8*U],[w*.39+i*40*U,h*.77+8*U]],P.coral,3*U)}c.globalAlpha=1;
  label('Maybe the shape is fine.',w*.5,h*.86,21*U,P.ink,'center',500);
 }else if(s.id==='open'){
  label('CHANGE THE ARRANGEMENT.',w*.08,h*.16,16*U);
  const y=h*.51,step=w*.18,size=110*U;
  for(let i=0;i<4;i++){
   const x=w*.14+i*step,a=m.clamp(m.spring(q-.6-i*.12,{frequency:1.3,damping:.68}),0,1.12);
   m.transform(c,{x,y,rotation:(i%2?1:-1)*a*.42},()=>{
    rect(-size*.45,-size*.57,size*.9,size*1.14,i%2?P.mint:P.blue,4*U);
    label(['M','O','R','E'][i],0,0,size*.9,P.paper,'center',900);
   });
  }
  const path=[[w*.07,y+140*U],[w*.2,y-240*U],[w*.64,y+200*U],[w*.88,y-60*U]],move=m.tween(q,1.2,4.8,0,1);
  const trail=[];for(let i=0;i<50;i++)trail.push(m.bezier(path,move*i/49));line(trail,P.coral,3*U);
  const point=m.bezier(path,move);dot(point[0],point[1],24*U,q*3);
  label('A little movement opens a way.',w*.5,h*.83,21*U,P.ink,'center',500);
 }else if(s.id==='room'){
  label('SPACE IS SOMETHING WE MAKE.',w*.08,h*.16,16*U);
  const size=(tall?120:156)*U,cx=w*.5,top=h*.42,bottom=h*.66;
  const spread=m.tween(q,0,2.4,-14*U,12*U),rotate=m.tween(q,0,2.4,-.06,0);
  word('MAKE',cx,top,size,P.blue,spread,rotate);
  word('ROOM',cx,bottom,size,P.mint,spread,-rotate);
  const p=m.bezier([[w*.92,h*.27],[w*.67,h*.35],[w*.4,h*.5],[w*.5,h*.52]],m.tween(q,.4,2.9,0,1));
  dot(p[0],p[1],22*U,q*2);
  const a=m.tween(q,2.7,4.8,0,1);for(let i=0;i<8;i++){
    const angle=i*tau/8;line([[w*.5+Math.cos(angle)*40*U,h*.52+Math.sin(angle)*40*U],[w*.5+Math.cos(angle)*(40+35*a)*U,h*.52+Math.sin(angle)*(40+35*a)*U]],P.coral,3*U*a+.1)
  }
 }else{
  const open=m.tween(q,.2,2,0,1),r=(tall?160:165)*U,xx=w*(tall?.5:.73),yy=h*(tall?.39:.49);
  petals(xx,yy,r,q*.15,open);dot(xx,yy,28*U,q*.1);
  if(tall){word('MAKE',w*.5,h*.67,108*U,P.blue,5*U);word('ROOM',w*.5,h*.78,108*U,P.mint,5*U)}
  else {word('MAKE',w*.3,h*.43,115*U,P.blue,6*U);word('ROOM',w*.3,h*.62,115*U,P.mint,6*U)}
  label('For what comes next.',w*.5,h*.89,24*U,P.ink,'center',500);
 }
}

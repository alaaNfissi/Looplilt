// A Small Delivery — original, time-addressable rooftop miniature.
// Beats: 0–3.6 a failed leap; 3.6–7.6 a springboard solution; 7.6–12 a garden.
function drawFrame({ ctx, w, h, t, portrait }) {
  const C = { ink:'#233f42', teal:'#39756f', dark:'#295952', mint:'#a2c89c', cream:'#fff0c8', sky:'#f4c6a3', brick:'#b96950', red:'#ce5f47', gold:'#f6bb54', lilac:'#aa9bb5' };
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x=clamp(x); return x*x*(3-2*x); };
  const ramp = (a,b) => ease((t-a)/(b-a));
  const lerp = (a,b,q) => a+(b-a)*q;
  const s = w / 1000;
  const H = h / s;
  const roof = portrait ? H * .60 : H * .735;
  const ellipse = (x,y,rx,ry,color) => { ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); };
  const line = (x1,y1,x2,y2,width,color) => { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); };
  const round = (x,y,width,height,r,color) => { ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(x,y,width,height,r); ctx.fill(); };
  const path = (points,color) => { ctx.fillStyle=color; ctx.beginPath(); points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p)); ctx.closePath(); ctx.fill(); };
  const curve = (points,width,color) => { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(points[0],points[1]); ctx.bezierCurveTo(...points.slice(2)); ctx.stroke(); };
  ctx.save(); ctx.scale(s,s); ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.save();
  // The tall cut closes in on the garden after the crossing is complete.
  if(portrait) {
    const close=ramp(9.25,10.65), zoom=1+.8*close;
    ctx.translate(500,roof-130); ctx.scale(zoom,zoom); ctx.translate(-(500+285*close),-(roof-130));
  }

  // Warm paper sky and a distant, deliberately quiet city.
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#edaa8a'); sky.addColorStop(.66,'#f9dfb6'); sky.addColorStop(1,'#eee0bd');
  ctx.fillStyle=sky; ctx.fillRect(-1000,-H,3000,H*3);
  const sunY = portrait ? roof-440 : roof-262;
  ellipse(790,sunY,80,80,'#ffe7af');
  ellipse(790,sunY,95,95,'#ffe7af22');
  for(let i=0;i<5;i++) {
    const x = ((i*271+t*(2+i*.15))%1220)-110;
    const y = roof-220-(i%3)*48-(portrait?170:0);
    ellipse(x,y,62,9,'#fff1d866'); ellipse(x+42,y-3,40,12,'#fff1d866');
  }
  for(let i=0;i<14;i++) {
    const x=i*82-25, bh=48+(i*37)%125;
    ctx.fillStyle=i%2?'#c59c93':'#d4aa96'; ctx.fillRect(x,roof-bh,71,H);
    if(i%3===0) { line(x+34,roof-bh,x+34,roof-bh-28,3,'#c59c93'); line(x+18,roof-bh-20,x+48,roof-bh-20,2,'#c59c93'); }
    for(let row=0;row<3;row++) for(let col=0;col<3;col++) ctx.fillRect(x+12+col*18,roof-bh+18+row*27,5,10);
  }
  // Three tiny birds repeat the courier's eventual upward arc.
  for(let i=0;i<3;i++) { const bx=555+i*23+t*3, by=roof-228-i*9-(portrait?210:0); const flap=3+Math.sin(t*4+i)*3; curve([bx-7,by-flap,bx-3,by-3,bx-1,by-1,bx,by],1.6,'#9b807a'); curve([bx,by,bx+2,by-4,bx+5,by-flap,bx+8,by-flap],1.6,'#9b807a'); }

  // The gap remains exposed throughout, making both attempts readable.
  ctx.fillStyle=C.brick; ctx.fillRect(-20,roof,460,H-roof+20);
  ctx.fillStyle=C.dark; ctx.fillRect(640,roof,760,H-roof+20);
  ctx.fillStyle='#a05245'; ctx.fillRect(414,roof,26,H-roof+20);
  ctx.fillStyle='#214846'; ctx.fillRect(640,roof,25,H-roof+20);
  for(let y=roof+35,row=0;y<H;y+=40,row++) {
    line(0,y,414,y,1.5,'#d18b67');
    for(let x=(row%2)*42;x<414;x+=84) line(x,y-36,x,y,1.2,'#d18b67');
  }
  for(let row=0;row<4;row++) for(let col=0;col<3;col++) {
    const x=690+col*100, y=roof+44+row*104;
    round(x,y,52,66,6,'#1f4746'); round(x+6,y+5,40,52,3,row%2===col%2?'#d9c18c':'#6a9688');
    line(x+26,y+5,x+26,y+57,4,'#295952'); line(x+6,y+30,x+46,y+30,4,'#295952');
  }
  round(-20,roof-8,464,17,4,C.cream); round(637,roof-8,760,17,4,C.cream);
  line(0,roof+17,438,roof+17,5,'#6e493e'); line(641,roof+17,1400,roof+17,5,'#203e3e');
  // Left rooftop fixtures: chimney, low water tank and the flexible direction sign.
  round(46,roof-66,62,58,3,'#b37565'); round(40,roof-74,74,13,3,C.cream);
  line(56,roof-52,96,roof-52,2,'#d89c7b'); line(56,roof-33,96,roof-33,2,'#d89c7b');
  round(135,roof-35,60,27,9,'#79958a'); ellipse(165,roof-35,30,6,'#a6b8a0');
  // Spring mechanism is visible before it becomes useful.
  line(305,roof-9,305,roof-53,7,C.ink);
  for(let k=0;k<5;k++) ellipse(305,roof-18-k*7,15,4,'#698e7e');
  const load = ramp(5.12,6.08);
  const snap = t<6.12 ? 0 : Math.exp(-(t-6.12)*4)*Math.sin((t-6.12)*17);
  const flex = t<6.12 ? load*49 : -snap*56;
  const tipY = roof-62+flex;
  ctx.strokeStyle=C.ink; ctx.lineWidth=15; ctx.beginPath(); ctx.moveTo(288,roof-53); ctx.quadraticCurveTo(357,roof-57,425,tipY); ctx.stroke();
  ctx.strokeStyle=C.gold; ctx.lineWidth=10; ctx.stroke();
  path([[413,tipY-13],[443,tipY],[413,tipY+11]],C.ink); path([[418,tipY-8],[436,tipY],[418,tipY+7]],C.gold);
  ellipse(304,roof-54,5,5,C.cream);

  // Planters wait on the far roof from the opening shot.
  round(750,roof-23,83,22,4,'#9d5948'); ellipse(791,roof-23,41,7,'#4a4a38');
  path([[751,roof-20],[832,roof-20],[822,roof+2],[760,roof+2]],'#cb8260');
  round(878,roof-20,96,18,3,'#b97a5e'); ellipse(926,roof-20,47,5,'#4a4a38');
  round(656,roof-16,51,14,3,'#b97a5e'); ellipse(681,roof-16,25,4,'#4a4a38');

  // Couriers are drawn with a bright parcel, a scarf and readable poses.
  let x=220, y=roof-8, gait=0, bend=0, tilt=0, hang=false, face=1;
  if(t<1.1) { x=lerp(215,290,ramp(0,1.1)); gait=Math.sin(t*14); }
  else if(t<1.85) { x=lerp(290,407,ramp(1.1,1.85)); gait=Math.sin(t*19); tilt=.1; }
  else if(t<2.72) {
    const q=clamp((t-1.85)/.87); x=lerp(407,477,q); y=roof-8-99*Math.sin(Math.PI*q)+72*q*q; tilt=.15; gait=.8;
  } else if(t<3.1) { x=477; y=roof+64+Math.sin((t-2.72)*11)*3; hang=true; tilt=-.13; }
  else if(t<3.6) { const q=ramp(3.1,3.6); x=lerp(477,418,q); y=lerp(roof+64,roof-8,q); tilt=-.18*(1-q); }
  else if(t<4.14) { x=418; face=-1; }
  else if(t<4.7) { x=lerp(418,348,ramp(4.14,4.7)); face=-1; gait=Math.sin(t*16); }
  else if(t<5.12) { const q=ramp(4.7,5.12); x=lerp(348,415,q); y=lerp(roof-8,roof-62,q)-30*Math.sin(Math.PI*q); gait=.4; }
  else if(t<6.12) { x=415; y=tipY; bend=load*.75; }
  else if(t<7.5) { const q=clamp((t-6.12)/1.38); x=lerp(415,700,q); y=lerp(roof-13,roof-8,q)-(portrait?315:226)*Math.sin(Math.PI*q); tilt=-.2+q*.3; gait=1; }
  else if(t<7.85) { x=700; bend=Math.sin(Math.PI*clamp((t-7.5)/.35))*.85; }
  else if(t<8.45) { x=lerp(700,749,ramp(7.85,8.45)); gait=Math.sin(t*15); }
  else if(t<8.95) { x=749; bend=.7*Math.sin(Math.PI*clamp((t-8.45)/.7)); }
  else if(t<9.6) { x=lerp(749,716,ramp(8.95,9.6)); face=-1; gait=Math.sin(t*14); }
  else { x=716; y=roof-8; face=1; }

  // A small shadow stays on the rooftop, becoming softer during the long leap.
  if(x<440 || x>640) ellipse(x,roof-7,24,5,'#253e3c30');
  const handSeed = t < 8.68;
  function drawCourier() {
  ctx.save(); ctx.translate(x,y); ctx.rotate(tilt); ctx.scale(face,1);
  const crouch=bend*17, bodyY=-53+crouch;
  // Satchel and trailing scarf form a silhouette readable at phone width.
  const flutter=Math.sin(t*11)*4;
  path([[-8,-64+crouch],[-39,-61+crouch],[-56,-67+flutter+crouch],[-43,-51+flutter+crouch],[-10,-55+crouch]],C.red);
  round(-29,bodyY+7,22,29,6,'#efcf8a'); line(-26,bodyY+18,-8,bodyY+18,2,'#a47f4a');
  line(-11,-23+crouch,-17-gait*8,-5,8,C.ink); line(10,-23+crouch,16+gait*8,-5,8,C.ink);
  line(-19-gait*8,-4,-9-gait*8,-4,7,C.ink); line(12+gait*8,-4,25+gait*8,-4,7,C.ink);
  round(-20,bodyY,40,38,12,C.gold); line(-17,bodyY+25,16,bodyY+25,3,'#d58c3a');
  line(-7,bodyY+2,10,bodyY+36,4,'#a57448'); ellipse(10,bodyY+35,3,3,C.cream);
  ellipse(0,-76+crouch,24,23,C.cream);
  ctx.fillStyle=C.teal; ctx.beginPath(); ctx.arc(-2,-80+crouch,25,Math.PI,Math.PI*2); ctx.lineTo(23,-74+crouch); ctx.lineTo(-27,-74+crouch); ctx.fill();
  round(-27,-80+crouch,58,9,4,C.teal); ellipse(-16,-78+crouch,5,5,C.gold);
  ellipse(9,-70+crouch,2.5,3.2,C.ink); ellipse(21,-70+crouch,2,3,C.ink);
  if(hang) { ellipse(16,-59+crouch,3,4,C.ink); }
  else { curve([10,-60+crouch,13,-56+crouch,16,-56+crouch,20,-60+crouch],2,C.ink); }
  ellipse(20,-64+crouch,4,2.4,'#ecac7c');
  if(hang) { line(-18,bodyY+6,-37,-60,8,C.gold); line(-37,-60,-42,-69,7,C.cream); }
  else { line(-17,bodyY+5,-26+gait*5,bodyY+24,8,C.gold); ellipse(-26+gait*5,bodyY+24,4.5,4.5,C.cream); }
  const plantReach = ramp(8.45,8.68)*(1-ramp(8.82,8.95));
  const armX=lerp(32,42,plantReach), armY=lerp(bodyY+8,-19,plantReach);
  line(16,bodyY+5,armX,armY,8,C.gold); ellipse(armX,armY,6,6,C.cream);
  if(handSeed) {
    ellipse(armX+1,armY-10,15,16,'#fff6d53a'); ellipse(armX+1,armY-10,7,10,C.cream);
    ellipse(armX+1,armY-10,4,7,'#a96f3e'); line(armX-1,armY-14,armX+2,armY-7,1.2,C.gold);
  }
  ctx.restore();
  }
  // At the failed attempt the extended hand actually meets the left ledge.
  if(hang) { line(440,roof-6,451,roof+5,6,C.cream); ellipse(440,roof-7,7,4,C.cream); }
  // A restrained idea glint calls attention to the sign, without a caption.
  if(t>3.87 && t<4.35) { const a=Math.sin(Math.PI*clamp((t-3.87)/.48)); ctx.globalAlpha=a; for(let i=0;i<4;i++) { const a=i*Math.PI/2; line(347+Math.cos(a)*12,roof-114+Math.sin(a)*12,347+Math.cos(a)*21,roof-114+Math.sin(a)*21,3,C.cream); } ellipse(347,roof-114,4,4,C.cream); ctx.globalAlpha=1; }
  if(t>=8.68 && t<8.92) { const q=clamp((t-8.68)/.24); ellipse(791,lerp(roof-31,roof-23,q),4*(1-q)+1,7*(1-q)+1,C.gold); }

  // A seed unfurls into a roof full of useful, exuberant life.
  const grow = ramp(8.91,10.75);
  function leaf(lx,ly,size,angle,color) { ctx.save(); ctx.translate(lx,ly); ctx.rotate(angle); ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(size*.2,-size*.7,size*.85,-size*.6,size,0); ctx.bezierCurveTo(size*.7,size*.45,size*.2,size*.4,0,0); ctx.fill(); line(2,0,size*.83,0,1.1,'#e0dfa055'); ctx.restore(); }
  function plant(px,height,delay,flower) {
    const g=ease((grow-delay)/(1-delay)); if(!g) return;
    const yy=roof-23, tip=yy-height*g, sway=Math.sin(t*2+px*.01)*4*g;
    curve([px,yy,px-18*g,yy-height*.35*g,px+18*g,yy-height*.72*g,px+sway,tip],5,C.dark);
    for(let j=1;j<=4;j++) { const frac=j/5; const leafG=ease((g-frac*.55)/.45); const py=yy-height*g*frac; leaf(px+(j%2?2:-2),py,(20+height*.12)*leafG,j%2?-2.7:-.4,j%2?C.teal:'#75a379'); }
    if(flower) { const bloom=ease((g-.65)/.35); for(let j=0;j<7;j++) { const a=j*Math.PI*2/7; ellipse(px+sway+Math.cos(a)*13*bloom,tip+Math.sin(a)*13*bloom,10*bloom,10*bloom,flower); } ellipse(px+sway,tip,8*bloom,8*bloom,C.gold); }
    else { leaf(px+sway,tip,35*g,-2.1,C.teal); leaf(px+sway,tip,32*g,-.85,'#75a379'); }
  }
  plant(790,190,0,null); plant(765,110,.15,C.cream); plant(817,138,.2,'#e7a37a');
  plant(902,100,.25,C.cream); plant(940,142,.35,'#e4b3af'); plant(681,68,.3,C.cream);
  if(grow>.25) {
    for(let i=0;i<15;i++) { const a=t*.7+i*2.4, fade=clamp((grow-.25)*2); ctx.globalAlpha=fade*.75; const px=795+Math.sin(a)*150, py=roof-70-(i*29)%190+Math.cos(a*1.2)*9; ellipse(px,py,1.7,1.7,C.cream); } ctx.globalAlpha=1;
  }
  drawCourier();

  // Paper flecks are deterministic; no assets, randomness or frame history.
  ctx.fillStyle='#563e3420';
  for(let i=0;i<180;i++) { const px=(i*173+23)%1000, py=(i*257+71)%Math.ceil(H); ctx.fillRect(px,py,1,1); }
  ctx.restore();
  let titleAlpha=(1-ramp(.95,1.55));
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(titleAlpha>0) { ctx.globalAlpha=titleAlpha; ctx.fillStyle=C.ink; ctx.font='600 23px Georgia, serif'; ctx.fillText('A SMALL DELIVERY',500,portrait?H*.16:61); ctx.font='12px Arial, sans-serif'; ctx.fillStyle='#8f695c'; ctx.fillText('one seed  /  a little ingenuity',500,portrait?H*.16+28:89); ctx.globalAlpha=1; }
  const finalAlpha=ramp(10.45,11.08);
  if(finalAlpha>0) { ctx.globalAlpha=finalAlpha; ctx.fillStyle=C.ink; ctx.font='600 25px Georgia, serif'; ctx.fillText('ROOM TO GROW',500,portrait?H*.2:65); ctx.globalAlpha=1; }
  ctx.restore();
}

// Original artwork for this trial. All animation derives from absolute or local shot time.
function drawFrame({ ctx, w, h, t, portrait, shot, motion, cue }) {
  const W = portrait ? 760 : 1000;
  const scale = w / W;
  const H = h / scale;
  const roof = H * (portrait ? 0.62 : 0.74);
  const left = W * 0.40;
  const right = W * 0.65;
  const gap = right - left;
  const charScale = portrait ? 1.14 : 1;
  const ink = '#263c46';
  const p = shot.params;
  const local = shot.time;
  const mix = motion.mix;
  const clamp = x => motion.clamp(x, 0, 1);
  const smooth = (a, b, x) => motion.tween(x, a, b, 0, 1);
  const stroke = (color, width=2) => { ctx.strokeStyle=color; ctx.lineWidth=width; ctx.lineCap='round'; ctx.lineJoin='round'; };
  const line = (x1,y1,x2,y2,color,width=2) => { stroke(color,width); ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke(); };
  const ellipse = (x,y,rx,ry,color) => {ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  const rounded = (x,y,ww,hh,r,color) => {ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,ww,hh,r);ctx.fill();};
  ctx.scale(scale,scale);
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#e8e4d1'); sky.addColorStop(1,'#f8d8b1');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Graphic grain is deterministic and intentionally sparse.
  for(let i=0;i<160;i++){const x=(i*137.9+13)%W;const y=(i*83.7+11)%H;ellipse(x,y,.65,.65,'#bfb8a32b');}
  const sunX=W*.75, sunY=roof-(portrait ? 340 : 230);
  ellipse(sunX,sunY,portrait?66:58,portrait?66:58,'#efb36b');
  ellipse(sunX-12,sunY-13,portrait?46:40,portrait?46:40,'#f3c58c');
  // Slow layered clouds and distant architecture.
  for(let i=0;i<3;i++){
    const x=W*(.12+i*.29)+Math.sin(t*.13+i)*10;
    const y=roof-(portrait?300:205)-i*23;
    rounded(x,y,100+i*15,7,4,'#f8f0dd');
    rounded(x+20,y-8,48,12,6,'#f8f0dd');
  }
  for(let i=0;i<11;i++){
    const x=i*W/10-20, top=roof-22-((i*37)%86);
    ctx.fillStyle=i%2?'#b2beb4':'#bdc7b8';ctx.fillRect(x,top,W/10+7,H-top);
    for(let j=0;j<3;j++) rounded(x+13+j*20,top+18,6,13,1,'#dce0ca');
  }
  // Rooftop silhouettes retain the same world layout in all scenes.
  ctx.fillStyle='#56736f';ctx.fillRect(0,roof,left,H-roof);
  ctx.fillStyle='#466766';ctx.fillRect(right,roof,W-right,H-roof);
  rounded(-8,roof-2,left+16,16,3,ink);rounded(right-8,roof-2,W-right+16,16,3,ink);
  line(0,roof+18,left-1,roof+18,'#94a49a',3);line(right,roof+18,W,roof+18,'#90a298',3);
  for(let row=0;row<6;row++){
    for(let col=0;col<6;col++){
      const xx=col*62+24, yy=roof+52+row*87;
      if(xx<left-40) {rounded(xx,yy,22,36,3,'#293e48');rounded(xx+4,yy+4,6,26,1,'#e2bb7f');}
      const xr=right+24+col*62;
      if(xr<W-20){rounded(xr,yy,22,36,3,'#293e48');rounded(xr+4,yy+4,6,26,1,'#d3b983');}
    }
  }
  // Simple vent, chimneys, and a bridge anchor communicate scale and place.
  rounded(W*.08,roof-52,48,52,4,'#69877b');rounded(W*.07,roof-60,68,11,3,ink);
  line(right+12,roof,right+12,roof-43,ink,6);ellipse(right+12,roof-45,6,6,'#e7ad61');
  line(left-12,roof,left-12,roof-39,ink,6);ellipse(left-12,roof-41,6,6,'#e7ad61');
  // Waiting planter on the receiving roof.
  const potX=W*.83;
  ctx.fillStyle='#bb6958';ctx.beginPath();ctx.moveTo(potX-35,roof-28);ctx.lineTo(potX+35,roof-28);ctx.lineTo(potX+27,roof);ctx.lineTo(potX-27,roof);ctx.closePath();ctx.fill();
  rounded(potX-40,roof-34,80,10,3,'#8f514d');ellipse(potX,roof-33,33,4,'#523e3b');
  // Scarf bridge: it remains visible after the second attempt succeeds.
  const bridgeProgress=t<4?0:t<8?smooth(.8,1.8,local):1;
  const bridgeSag=shot.id==='clever-crossing'?p.bridgeSag:18;
  if(bridgeProgress>0){
    const end=motion.bezier([[left-12,roof-40],[left+gap*.27,roof-146],[right-5,roof-100],[right+12,roof-43]],bridgeProgress);
    const finish=smooth(1.65,1.9,local);
    const yEnd=t>=8?roof-43:mix(end[1],roof-43,finish);
    const xEnd=t>=8?right+12:end[0];
    stroke(shot.id==='clever-crossing'?p.scarfColor:'#e57e6c',13);
    ctx.beginPath();ctx.moveTo(left-12,roof-40);
    ctx.quadraticCurveTo((left+xEnd)/2,roof-40+(t>=8?bridgeSag:bridgeSag*finish),xEnd,yEnd);ctx.stroke();
    stroke('#f3b592',2);ctx.beginPath();ctx.moveTo(left-12,roof-44);ctx.quadraticCurveTo((left+xEnd)/2,roof-44+(t>=8?bridgeSag:bridgeSag*finish),xEnd,yEnd-4);ctx.stroke();
    if(bridgeProgress>.97){for(let j=0;j<4;j++)line(right+12+j*3,roof-42,right+14+j*4,roof-27,'#e57e6c',2);}
  }
  let x,y=roof,walk=0,lean=0,squash=1,seed=true,scarf=true;
  if(shot.id==='first-try'){
    x=motion.keyframes(local,[[0,W*.23],[.95,left-42],[1.45,left+gap*.20,'outCubic'],[1.75,left+gap*.38],[2.6,left-35,'inCubic'],[3.05,left-35-p.recoil],[4,left-35-p.recoil]]);
    y+=motion.keyframes(local,[[0,0],[.95,0],[1.5,-p.jumpHeight,'outCubic'],[1.8,-p.jumpHeight*.64],[2.6,0,'inCubic'],[4,0]]);
    walk=local<.95?Math.sin(local*15)*7:0;
    lean=motion.keyframes(local,[[0,.06],[1,.12],[1.6,.2],[2.2,-.28],[2.6,-.12],[3.1,0],[4,0]]);
    squash=1-.16*Math.exp(-Math.pow((local-2.63)/.13,2));
    const gust=smooth(cue('gust')-.2,cue('gust')+.03,t)*(1-smooth(2.1,2.55,t));
    if(gust>0){ctx.globalAlpha=gust;for(let i=0;i<4;i++){const yy=roof-132+i*22;stroke('#f8f2dc',3);ctx.beginPath();ctx.moveTo(right+35,yy);ctx.bezierCurveTo(right-10,yy-8,left+80,yy+10,left+25,yy);ctx.stroke();}ctx.globalAlpha=1;}
  } else if(shot.id==='clever-crossing'){
    const cross=smooth(1.9,3.75,local);
    x=mix(left-59,W*.75,cross);
    // Feet follow the same quadratic scarf curve, with an eased step up/down.
    let bridgeFoot;
    if(x<left-12) bridgeFoot=roof-40*smooth(left-59,left-12,x);
    else if(x<=right+12){const u=(x-(left-12))/(gap+24);bridgeFoot=roof+mix(-40,-43,u)+2*bridgeSag*u*(1-u);}
    else bridgeFoot=mix(roof-43,roof,smooth(right+12,W*.75,x));
    y=bridgeFoot-Math.abs(Math.sin(local*15))*p.crossingBounce*.4*Math.sin(Math.PI*cross);
    walk=local>1.9?Math.sin(local*15)*7:0;
    lean=.09*Math.sin(Math.PI*cross);
    scarf=local<.8;
    if(local>.35&&local<1.1){ctx.globalAlpha=Math.sin((local-.35)/.75*Math.PI);for(let i=0;i<3;i++){const a=-2.15+i*.55;line(x+Math.cos(a)*30,roof-125+Math.sin(a)*23,x+Math.cos(a)*39,roof-125+Math.sin(a)*32,'#be8050',3);}ctx.globalAlpha=1;}
  } else {
    x=W*.75;seed=local<.7;scarf=false;
    lean=.32*Math.sin(Math.PI*smooth(.05,1.0,local));
    if(local<.7){const u=smooth(.2,.7,local);const seedX=mix(x+35,potX,u);const seedY=mix(roof-70,roof-38,u);drawSeed(seedX,seedY,1);seed=false;}
  }
  // Garden grows as separate stems, unfurling leaves, then bright seed heads.
  if(shot.id==='garden'){
    const g=smooth(.85,2.65,local*p.bloomSpeed);
    const flowerColor=p.flowerColor,leafColor=p.leafColor;
    for(let j=0;j<7;j++){
      const delay=j*.055;const q=clamp((g-delay)/(1-delay));
      const rootX=potX+(j-3)*8, height=(75+(j*31)%66)*p.bloomScale;
      const sway=Math.sin(t*1.6+j)*3*q;
      const tipX=rootX+(j-3)*12*q+sway,tipY=roof-35-height*q;
      stroke(leafColor,3.6);ctx.beginPath();ctx.moveTo(rootX,roof-33);ctx.bezierCurveTo(rootX-10*q,roof-45-height*q*.4,tipX+8*q,tipY+20*q,tipX,tipY);ctx.stroke();
      for(let k=0;k<3;k++){
        const u=.28+k*.22;const xx=mix(rootX,tipX,u),yy=mix(roof-35,tipY,u);
        const side=(k+j)%2?1:-1;motion.transform(ctx,{x:xx,y:yy,rotation:side*.5,scale:q},()=>{ctx.fillStyle=leafColor;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(side*28,-25,side*30,-4);ctx.quadraticCurveTo(side*15,9,0,0);ctx.fill();});
      }
      const bloom=smooth(.52,.9,q);
      if(bloom>0)motion.transform(ctx,{x:tipX,y:tipY,scale:bloom},()=>{for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ellipse(Math.cos(a)*8,Math.sin(a)*8,7,7,j%2?flowerColor:'#efbc68');}ellipse(0,0,5,5,'#6d5942');});
    }
    // Small satellite pots turn a single delivery into a garden.
    for(let j=0;j<3;j++){
      const q=smooth(1.8+j*.12,2.8+j*.12,local*p.bloomSpeed);
      const px=right+26+j*40;
      if(q>0){rounded(px-10,roof-14,20,14,2,'#d18b6d');stroke(leafColor,2);ctx.beginPath();ctx.moveTo(px,roof-15);ctx.lineTo(px+Math.sin(t+j)*2,roof-15-45*q);ctx.stroke();ellipse(px-7*q,roof-20-22*q,10*q,4*q,leafColor);ellipse(px+7*q,roof-20-32*q,10*q,4*q,leafColor);}
    }
  }
  // Courier: round head, oversized cap, pocket, seed tucked safely in both hands.
  motion.transform(ctx,{x,y,rotation:lean,scale:charScale},()=>{
    ctx.scale(1+(1-squash)*.5,squash);
    ellipse(0,2,25,5,'#243d4430');
    line(-10,-21,-13+walk,0,ink,7);line(11,-21,14-walk,0,ink,7);
    line(-13+walk,0,-7+walk,0,ink,7);line(14-walk,0,21-walk,0,ink,7);
    rounded(-24,-72,48,53,13,p.coatColor);
    line(-16,-63,22,-28,'#8a6548',4);rounded(-30,-42,19,24,5,'#a8714a');
    line(-13,-58,18,-48,ink,5);line(22,-58,29,-50,ink,5);
    ellipse(0,-90,23,24,'#f1d6ad');
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(-2,-96,25,Math.PI,Math.PI*2);ctx.lineTo(23,-95);ctx.closePath();ctx.fill();
    rounded(-27,-98,61,9,4,ink);ellipse(-17,-110,6,7,ink);
    ellipse(12,-89,2.3,2.3,ink);line(14,-78,20,-81,ink,1.7);
    if(scarf){stroke('#e57e6c',10);ctx.beginPath();ctx.moveTo(-13,-71);ctx.quadraticCurveTo(-38,-68,-52-9*Math.sin(t*5),-82+5*Math.sin(t*4));ctx.stroke();rounded(-20,-76,43,9,4,'#e57e6c');}
    if(seed)drawSeed(31,-54,.85);
  });
  // No explanatory captions: a small title arrives after the garden has resolved.
  if(shot.id==='garden'){
    const alpha=smooth(2.5,3.1,local);
    ctx.globalAlpha=alpha;ctx.fillStyle=ink;ctx.textAlign='center';
    ctx.font=`500 ${portrait?26:25}px Georgia, serif`;
    ctx.fillText('The smallest delivery.',W*.5,roof-(portrait?255:206));
    ctx.font=`${portrait?12:11}px Arial, sans-serif`;ctx.letterSpacing='2px';
    ctx.fillText('SOMETHING GOOD TAKES ROOT',W*.5,roof-(portrait?226:180));
    ctx.letterSpacing='0px';ctx.globalAlpha=1;
  }
  // The distant bird is a sparse time-based counterpoint.
  const birdX=W*.13+Math.sin(t*.2)*W*.04,birdY=roof-(portrait?420:295);
  const flap=Math.sin(t*3)*3;line(birdX-10,birdY+flap,birdX,birdY,ink,1.5);line(birdX,birdY,birdX+10,birdY+flap,ink,1.5);
  function drawSeed(sx,sy,size){
    motion.transform(ctx,{x:sx,y:sy,scale:size},()=>{ellipse(0,0,10,14,'#f7e6a5');ellipse(0,0,5,8,'#a8793e');line(0,-6,4,-12,'#639980',2);ellipse(6,-13,5,2.5,'#639980');});
  }
}

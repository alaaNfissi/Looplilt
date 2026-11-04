// The Missing Beat — a four-shot musical comedy at the Small Hours club.
function drawFrame({ctx:c,w,h,t,portrait}) {
  const W=portrait?540:w===h?720:960, H=h/w*W, u=w/W, tau=Math.PI*2;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},at=(a,d)=>ease((t-a)/d),mix=(a,b,p)=>a+(b-a)*p;
  const floor=H*.74, mid=W/2, qt=Math.floor(t*16)/16, rest=t>=12&&t<18, groove=t>=18&&t<32;
  const ink='#252839',gold='#e9bf72',ivory='#f8e6bf';
  c.save();c.scale(u,u);
  function path(points,fill){c.fillStyle=fill;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();}
  function ellipse(x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,tau);c.fill();}
  function line(x,y,xx,yy,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
  function label(text,x,y,size,color=ivory,font='Georgia, serif'){c.fillStyle=color;c.textAlign='center';c.font='600 '+size+'px '+font;c.fillText(text,x,y);}
  let z=1.02+at(0,6)*.05, focusX=mid, focusY=floor-95;
  if(t>=6&&t<14){z=portrait?1.35:1.55;focusX=mid;focusY=floor-95;}
  if(t>=14&&t<18){z=portrait?2.7:3.2;focusX=mid+8;focusY=floor-2;}
  if(t>=18&&t<32){z=mix(1,1.12,at(25,7));focusY=floor-95;}
  if(t>=32){z=1;focusY=floor-95;}
  const anchorY=t>=14&&t<18?H*.56:floor-95;
  c.save();c.translate(mid,anchorY);c.scale(z,z);c.translate(-focusX,-focusY);
  const wall=c.createLinearGradient(0,0,0,floor);wall.addColorStop(0,'#191e32');wall.addColorStop(1,'#50404b');
  c.fillStyle=wall;c.fillRect(-W,-H,W*3,H*3);
  // Paneled back wall, brass inlay, and a glowing club sign establish the room.
  for(let x=-W;x<W*2;x+=54){c.fillStyle='#ffffff03';c.fillRect(x,0,27,floor);line(x,0,x,floor,'#97816e20');}
  for(const x of [W*.18,W*.82]){
    c.save();c.globalAlpha=.1+at(18,1)*.05;
    path([[x,40],[x-145,floor+70],[x+145,floor+70]],x<mid?'#8bc9c3':'#ffe4a0');c.restore();
    ellipse(x,45,27,10,'#0f1729');ellipse(x,49,21,6,gold);
  }
  c.save();c.shadowColor='#f4c17c';c.shadowBlur=14;
  c.strokeStyle=gold;c.lineWidth=2;c.beginPath();c.roundRect(mid-125,H*.23-45,250,92,36);c.stroke();
  label('THE SMALL HOURS',mid,H*.23+3,portrait?23:25,gold);
  c.restore();label('LIVE  /  EVERY LITTLE BEAT',mid,H*.23+27,9,'#c0a79a','Arial');
  // A lit back bar gives the room a middle distance between wall and band.
  const barY=floor-(portrait?230:173), barHeight=portrait?140:56;
  c.fillStyle='#241f31';c.fillRect(W*.15,barY-barHeight,W*.7,barHeight+27);
  for(let shelf=0;shelf<2;shelf++){
    const sy=barY-shelf*(barHeight*.55);
    c.save();c.shadowColor='#d8a36e';c.shadowBlur=10;
    line(W*.15,sy+3,W*.85,sy+3,'#b8875c',3);c.restore();
    for(let i=0;i<15;i++){
      const x=W*.18+i*(W*.64/14), bh=12+(i*7)%17;
      c.fillStyle=['#718e84','#a37559','#806d85'][i%3];
      c.fillRect(x-3,sy-bh,6,bh);c.fillRect(x-1.5,sy-bh-5,3,5);
      c.fillStyle='#e6c49988';c.fillRect(x-1,sy-bh+4,1,bh*.5);
    }
  }
  c.fillStyle='#6b4c44';c.fillRect(W*.14,barY+8,W*.72,19);
  line(W*.14,barY+8,W*.86,barY+8,'#d6ad78',3);

  // Perspective floorboards and reflected light carry depth into the acting space.
  const wood=c.createLinearGradient(0,floor-15,0,H);wood.addColorStop(0,'#a36f4d');wood.addColorStop(1,'#4d3940');
  c.fillStyle=wood;c.fillRect(-W,floor-12,W*3,H*2);
  for(let i=-12;i<25;i++)line(mid+(i-6)*30,floor-12,mid+(i-6)*100,H*1.5,'#2d283b55',2);
  for(let row=0;row<8;row++){const y=floor-12+row*row*5;line(-W,y,W*2,y,'#edb67726',1);}
  for(let i=0;i<180;i++){
    const x=(i*73.9)%(W*2)-W*.5,y=floor+(i*31.7)%(H*.4);
    line(x,y,x+4+i%11,y,'#241f3325',.7);
  }
  // Velvet wings, scalloped valance, folds, and footlights.
  for(const side of [0,1]){
    const x=side?W-66:-30;
    for(let i=0;i<12;i++){const shade=i%3===0?'#9e4c53':i%3===1?'#6d3347':'#78394a';c.fillStyle=shade;c.fillRect(x+i*7,-30,8,floor+45);}
    line(side?W-65:52,40,side?W-65:52,floor+12,gold,3);
  }
  c.fillStyle='#72364a';c.fillRect(-50,-H, W+100,H+44);
  for(let x=-30;x<W+50;x+=66)ellipse(x,36,45,24,'#873f4b');
  for(let x=35;x<W;x+=45){ellipse(x,floor+33,9,5,'#573c42');ellipse(x,floor+30,5,3,'#ffe3a0');}
  const blueX=W*.23, drumX=W*.77, redX=mix(-110,mid,at(2.5,4.5));
  function hop(offset,scale=1){if(rest||t>=32)return 0;const p=((qt*2-offset)%2+2)%2;return p<.65?Math.sin(p/.65*Math.PI)*11*scale:0;}
  function limb(x,y,x2,y2,width,color){line(x,y,x2,y2,color,width);}
  function actor(x,kind,color,phase,index){
    const bounce=index===1?(t<7?Math.sin(qt*9)*3:hop(groove?.5:.23,1.2)):hop(phase);
    const base=floor+bounce, body=base-105, sorrow=index===1&&t>=12&&t<18, bow=at(32,1.5)*.22;
    ellipse(x,floor+4,52,9,'#251e3444');
    // Shoes are part of the close-up: the newcomer discovers the offbeat with a toe.
    const tap=index===1&&t>=14&&t<18?Math.max(0,Math.sin((t-14)*tau*2))*9:0;
    limb(x-20,body+35,x-22,base-9,9,ink);limb(x+20,body+35,x+22,base-9-tap,9,ink);
    ellipse(x-16,base-6,18,7,'#172033');ellipse(x+29,base-6-tap,18,7,'#172033');
    line(x-29,base-1,x-2,base-1,'#cea376',2);line(x+15,base-1-tap,x+42,base-1-tap,'#cea376',2);
    if(tap>2){c.save();c.globalAlpha=tap/20;c.strokeStyle=gold;c.lineWidth=1.5;c.beginPath();c.ellipse(x+32,floor+5,13+tap*2,3+tap*.3,0,0,tau);c.stroke();c.restore();}
    c.save();c.translate(x,body);c.rotate(bow+(sorrow?-.1:Math.sin(qt*3+index)*.025));
    c.shadowColor='#1a1c2e77';c.shadowBlur=5;c.shadowOffsetY=5;
    const paint=c.createLinearGradient(-50,-55,45,50);paint.addColorStop(0,color);paint.addColorStop(1,index===0?'#436b99':index===1?'#af4e55':'#c89954');
    c.fillStyle=paint;c.strokeStyle='#f7e0ba77';c.lineWidth=1.5;c.beginPath();
    if(kind==='square')c.roundRect(-48,-48,96,96,12);
    else if(kind==='circle')c.ellipse(0,0,52,sorrow?46:52,0,0,tau);
    else {c.moveTo(0,-62);c.lineTo(58,45);c.lineTo(-58,45);c.closePath();}
    c.fill();c.stroke();c.shadowBlur=0;c.shadowOffsetY=0;
    // Lapels, shirt, bow tie, and a very small pocket give each silhouette character.
    path([[-14,20],[0,46],[14,20]],ivory);
    path([[-16,28],[0,33],[-16,39]],ink);path([[16,28],[0,33],[16,39]],ink);
    c.fillStyle='#ffffff22';c.fillRect(25,24,12,9);
    const look=rest?(index===0?5:index===2?-5:-2):index===1&&t<12?-4:0;
    const blink=Math.sin(t*2.1+index*3)>.993;
    for(const dx of [-15,15]){
      ellipse(dx,-8,10,12,ivory);ellipse(dx+look,-7,4,blink?1:6,ink);
      if(sorrow)line(dx-8,-23,dx+7,-20,ink,3);
    }
    c.strokeStyle=ink;c.lineWidth=2.5;c.beginPath();
    if(sorrow)c.arc(0,15,8,Math.PI,0);else c.arc(0,9,12,0,Math.PI);c.stroke();
    if(index!==1){ellipse(0,-53,42,9,'#253349');c.fillStyle='#253349';c.fillRect(-25,-72,50,19);c.fillStyle=gold;c.fillRect(-25,-57,50,5);}
    c.restore();
    const handY=body+10;
    if(index===0){
      const beat=rest?0:Math.sin(t*tau*2)*8;
      limb(x-38,handY,x-56,floor-56+beat,8,ink);limb(x+38,handY,x+54,floor-56-beat,8,ink);
      ellipse(x-56,floor-56+beat,8,6,ivory);ellipse(x+54,floor-56-beat,8,6,ivory);
    }else if(index===2){
      const hit=rest?0:Math.sin(t*tau*2)*20;
      limb(x-43,handY,x-55,body-15+hit,8,ink);limb(x+43,handY,x+56,body-15-hit,8,ink);
      line(x-55,body-15+hit,x-25,floor-46,gold,3);line(x+56,body-15-hit,x+24,floor-46,gold,3);
    }else{
      const playing=groove?Math.sin(t*tau*2+Math.PI/2):t>=7&&t<12?Math.sin(t*tau*2+.7):0;
      limb(x-41,handY,x-61,body+29,8,ink);limb(x+41,handY,x+64,body+29-playing*14,8,ink);
      // An open metal triangle and beater carry the joke without an explanatory card.
      c.save();c.shadowColor='#f9dab1';c.shadowBlur=2;
      line(x-64,body+12,x-83,body+58,'#f0cf94',3);line(x-83,body+58,x-39,body+58,'#f0cf94',3);line(x-39,body+58,x-60,body+16,'#f0cf94',3);
      line(x+62,body+29-playing*14,x-30,body+51+playing*8,ivory,2);c.restore();
      if(t>=7&&t<12&&Math.sin(t*tau*2+.7)>.8){line(x-89,body+37,x-99,body+30,gold);line(x-89,body+43,x-104,body+43,gold);}
    }
  }
  actor(blueX,'square','#81a7c4',0,0);
  // A compact electric piano, its keys and legs, in front of the pianist.
  for(const dx of [-60,60])line(blueX+dx,floor-44,blueX+dx*.8,floor+5,'#293244',5);
  path([[blueX-80,floor-68],[blueX+80,floor-68],[blueX+88,floor-39],[blueX-88,floor-39]],'#26344a');
  c.fillStyle='#eee2c4';c.fillRect(blueX-75,floor-65,150,17);
  for(let i=1;i<22;i++)line(blueX-75+i*150/22,floor-65,blueX-75+i*150/22,floor-48,'#4b4b55',1);
  for(let i=0;i<21;i++)if(![2,6].includes(i%7)){c.fillStyle='#222d42';c.fillRect(blueX-72+i*7,floor-65,4,10);}
  label('SMALL HOURS',blueX,floor-28,7,'#bda581','Arial');
  actor(drumX,'triangle','#e7c588',1,2);
  // Snare, bass drum, lugs, and a gently rocking cymbal form a readable kit.
  ellipse(drumX,floor-30,40,31,'#422e3c');ellipse(drumX,floor-33,34,26,'#d6c09f');ellipse(drumX,floor-33,29,21,'#b49d83');
  for(let i=0;i<8;i++){const a=i*tau/8;ellipse(drumX+Math.cos(a)*35,floor-33+Math.sin(a)*27,2,2,gold);}
  c.fillStyle='#925b57';c.fillRect(drumX-32,floor-68,64,22);ellipse(drumX,floor-68,33,9,ivory);
  line(drumX+58,floor-98,drumX+58,floor+3,'#c7b18e',3);line(drumX+43,floor+3,drumX+73,floor+3,'#c7b18e',3);
  c.save();c.translate(drumX+58,floor-98);c.rotate(rest?0:Math.sin(t*tau*2)*.055);ellipse(0,0,30,5,gold);ellipse(0,-2,5,3,'#a6784e');c.restore();
  actor(redX,'circle','#e99784',.5,1);
  if(groove)for(let i=0;i<30;i++){
    const age=(t-18+i*.21)%3,x=mid+Math.sin(i*11)*W*.39,y=floor-150-age*50;
    c.save();c.globalAlpha=(1-age/3)*.5;c.translate(x,y);c.rotate(i+age);c.fillStyle=[gold,'#88bdb9','#e79a89'][i%3];c.fillRect(-2,-4,4,8);c.restore();
  }
  // Near silhouettes move a little: the band has an audience to win over.
  if(!(t>=14&&t<18))for(let i=-1;i<12;i++){
    const x=i*W/10+W*.05,y=H+25-Math.sin(qt*2+i)*3;
    ellipse(x,y,43,52,'#151c2c');ellipse(x,y-53,22,24,'#1a2232');
    if(t>31)line(x-30,y-35,x-34,y-87-Math.sin(qt*6+i)*8,'#1a2232',12);
  }
  c.restore();
  // Screen titles have breathing room, and never carry the middle of the story.
  if(t<3.5){c.save();c.globalAlpha=1-at(2.5,1);label('THE MISSING BEAT',mid,H*.115,portrait?31:46,ivory,'Arial');c.restore();}
  if(t>33){c.save();c.globalAlpha=at(33,.8);label('Every beat belongs.',mid,H*.14,portrait?29:39,ivory);c.restore();}
  // Brief exposure dips make the two decisive cuts intentional.
  for(const cut of [6,14,18]){const d=Math.abs(t-cut);if(d<.12){c.fillStyle='#161e2b';c.globalAlpha=(1-d/.12)*.55;c.fillRect(0,0,W,H);c.globalAlpha=1;}}
  c.restore();
}

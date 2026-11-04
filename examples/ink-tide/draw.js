// Ink tide: a curious koi discovers that a red leaf is a sleeping friend.
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720, tau = Math.PI * 2, cx = w / 2, cy = h * .56;
  const clamp = x => Math.max(0, Math.min(1, x)), ease = x => { x = clamp(x); return x*x*(3-2*x); };
  const at = (s, d) => ease((t-s)/d), mix = (a,b,p) => a+(b-a)*p;
  const ink = '#233632', vermilion = '#b94e3e', paper = '#f0ead9', awake = at(9, 2), dance = at(11, 2);
  c.fillStyle = paper; c.fillRect(0, 0, w, h);
  // Fixed grain and layered, irregular strokes stay deterministic when seeking.
  for(let i=0;i<1300;i++) {
    c.fillStyle = i%3 ? '#817b6510' : '#ffffff55';
    c.fillRect((i*83.317)%w, (i*137.239)%h, (i%3+1)*u, u);
  }
  const radius = (portrait ? 240 : 228)*u;
  const wash=c.createRadialGradient(cx-80*u,cy-60*u,10*u,cx,cy,270*u);
  wash.addColorStop(0,'#d4dfcc77');wash.addColorStop(.65,'#c0cec033');wash.addColorStop(1,'#c0cec000');
  c.fillStyle=wash;c.fillRect(cx-300*u,cy-240*u,600*u,480*u);
  for(let pass=0;pass<5;pass++) {
    c.strokeStyle = '#34483f'; c.globalAlpha = .035 + pass*.008; c.lineWidth = (12-pass)*u;
    c.beginPath();
    for(let i=0;i<=100;i++) {
      const a = -.2 + i/100*tau*.94, r=radius+(Math.sin(a*9+pass)*2+pass*3)*u;
      const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r*.78;
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.stroke();
  }
  c.globalAlpha=1;
  // Depth revision: move closer for the nudge, with botanical foreground layers.
  const camera=1+.28*(at(4,1)-at(11,1.5));
  c.save();c.translate(cx,cy);c.scale(camera,camera);c.translate(-cx,-cy);
  for(let i=0;i<7;i++){
    const x=cx+Math.cos(i*.8+1)*210*u,y=cy+Math.sin(i*.8+1)*153*u;
    c.save();c.translate(x,y);c.rotate(i*.8);
    c.fillStyle=i%2?'#a7b49977':'#839a8566';c.beginPath();c.moveTo(0,0);c.ellipse(0,0,(19+i%3*5)*u,13*u,0,.3,tau-.3);c.closePath();c.fill();
    c.strokeStyle='#738b7177';c.lineWidth=u;c.beginPath();c.moveTo(0,0);c.lineTo(17*u,0);c.stroke();
    if(i===3)for(let petal=0;petal<6;petal++){c.save();c.rotate(petal*tau/6);c.fillStyle='#c38b7966';c.beginPath();c.ellipse(0,-9*u,5*u,11*u,0,0,tau);c.fill();c.restore();}
    c.restore();
  }
  for(let i=0;i<4;i++) {
    const pulse=(t*.1+i*.25)%1;
    c.strokeStyle='#46645c';c.globalAlpha=(1-pulse)*.12;c.lineWidth=u;
    c.beginPath();c.ellipse(cx+65*u,cy, (20+pulse*215)*u, (8+pulse*90)*u, -.2,0,tau);c.stroke();
  }
  c.globalAlpha=1;
  // Reeds bend with the water, away from the action and the title.
  c.save();c.translate(cx-240*u,cy+156*u);
  for(let i=0;i<5;i++){
    c.strokeStyle='#53604b';c.globalAlpha=.45;c.lineWidth=(1+i%2)*u;
    c.beginPath();c.moveTo(i*7*u,32*u);c.quadraticCurveTo((i*8-24)*u,-40*u,(i*14-35+Math.sin(t*.7+i)*3)*u,-(66+i*10)*u);c.stroke();
    c.fillStyle='#69735d';c.beginPath();c.ellipse((i*12-28)*u,-(43+i*8)*u,4*u,22*u,-.55,0,tau);c.fill();
  }
  c.restore();
  function fish(x,y,angle,color,life) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(u,u);
    const flutter = Math.sin(t*6)*life;
    c.fillStyle=color;
    c.globalAlpha=life; c.beginPath();c.moveTo(-36,0);c.quadraticCurveTo(-55,-21+flutter*6,-67,-22);c.quadraticCurveTo(-57,0,-68,22);c.quadraticCurveTo(-49,16+flutter*6,-36,0);c.fill();
    c.globalAlpha=1; c.beginPath();c.moveTo(-46,0);c.bezierCurveTo(-22,-29,30,-25,48,0);c.bezierCurveTo(24,23,-22,28,-46,0);c.fill();
    // A vein reads as a leaf until fins and an eye unfold.
    c.strokeStyle='#f0ead9';c.globalAlpha=.65;c.lineWidth=1.4;
    c.beginPath();c.moveTo(-35,0);c.quadraticCurveTo(2,-6,36,0);c.stroke();
    for(let i=-20;i<22;i+=14){c.beginPath();c.moveTo(i,-2);c.lineTo(i-7,-12);c.stroke();}
    c.globalAlpha=life;c.fillStyle=color;
    for(const side of [-1,1]){
      c.beginPath();c.moveTo(9,side*12);c.quadraticCurveTo(-2,side*(32+flutter*3),-19,side*21);c.lineTo(-6,side*9);c.fill();
    }
    c.fillStyle=paper;c.beginPath();c.arc(32,-6,3,0,tau);c.fill();
    c.fillStyle=ink;c.beginPath();c.arc(33,-6,1.5,0,tau);c.fill();
    c.restore();
  }
  const poke = t<9 ? Math.sin(Math.max(0,t-6)*Math.PI)*3*u*at(6,.5) : 0;
  const a=(t-11)*.65, rx=145*u, ry=102*u;
  let bx=mix(cx-184*u,cx+2*u,at(1,5))+poke, by=cy;
  const blackAngle=Math.atan2(-Math.cos(a)*ry,Math.sin(a)*rx);
  bx=mix(bx,cx-Math.cos(a)*rx,dance);by=mix(by,cy-Math.sin(a)*ry,dance);
  const redX=mix(cx+100*u,cx+Math.cos(a)*rx,dance);
  const redY=mix(cy,cy+Math.sin(a)*ry,dance);
  const redAngle=Math.atan2(Math.cos(a)*ry,-Math.sin(a)*rx);
  fish(redX,redY,redAngle*dance,vermilion,awake);
  fish(bx,by,blackAngle*dance,ink,1);
  if(t>6&&t<10){
    const p=(t-6)%1;c.strokeStyle=vermilion;c.globalAlpha=(1-p)*.3;c.lineWidth=u;
    c.beginPath();c.arc(cx+46*u,cy,(9+p*25)*u,0,tau);c.stroke();c.globalAlpha=1;
  }
  c.restore();
  function label(s,y,size,color,font='Georgia, serif'){
    c.fillStyle=color;c.font=size*u+'px '+font;c.textAlign='center';c.fillText(s,cx,y,w-80*u);
  }
  label('I N K   T I D E',h*.1,14,vermilion,'Arial, sans-serif');
  label(t<6?'Just a leaf.':t<10?'One little nudge.':t<14?'Oh. Hello.':'Better with company.',h*.205,portrait?43:53,ink);
  label('A quiet pond. An unexpected friendship.',h*.87,portrait?18:21,'#53604b');
  c.strokeStyle=vermilion;c.lineWidth=2*u;c.strokeRect(cx-14*u,h*.925-12*u,28*u,28*u);
  label('L',h*.925+10*u,20,vermilion);
}

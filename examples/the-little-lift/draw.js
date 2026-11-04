// The Little Lift: a counterweight brings two toy friends together.
function drawFrame({ctx:c,w,h,t,portrait}) {
  const u=Math.min(w,h)/720, tau=Math.PI*2, cx=w/2, cy=h*(portrait?.64:.65), s=u*.88;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const at=(a,d)=>ease((t-a)/d), mix=(a,b,p)=>a+(b-a)*p;
  const lift=at(8,8), walk=at(16,4), drop=at(4,3);
  const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#f5ead7');bg.addColorStop(1,'#e4d6e5');c.fillStyle=bg;c.fillRect(0,0,w,h);
  const iso=(x,y,z)=>[cx+(x-y)*.86*s,cy+(x+y)*.4*s-z*s];
  function poly(points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>{const [x,y]=iso(...p);if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();c.fill();}
  function edge(a,b,color,width=2){const p=iso(...a),q=iso(...b);c.strokeStyle=color;c.lineWidth=width*s;c.beginPath();c.moveTo(...p);c.lineTo(...q);c.stroke();}
  function block(x,y,z,dx,dy,dz,top,left,right){
    poly([[x,y+dy,z],[x+dx,y+dy,z],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]],left);
    poly([[x+dx,y,z],[x+dx,y+dy,z],[x+dx,y+dy,z+dz],[x+dx,y,z+dz]],right);
    poly([[x,y,z+dz],[x+dx,y,z+dz],[x+dx,y+dy,z+dz],[x,y+dy,z+dz]],top);
  }
  function ball(x,y,z,r,color){
    const p=iso(x,y,z);c.fillStyle=color;c.beginPath();c.arc(p[0],p[1],r*s,0,tau);c.fill();
    c.fillStyle='#ffffff66';c.beginPath();c.arc(p[0]-r*.3*s,p[1]-r*.35*s,r*.28*s,0,tau);c.fill();
  }
  // Depth revision: the camera follows the mechanism, then returns for the reunion.
  const camera=1+.18*(at(4,3)-at(17,3));
  c.save();c.translate(cx,cy-100*u);c.scale(camera,camera);c.translate(-cx,-cy+100*u);
  // Broad soft shadows and three faces give depth without an external 3D engine.
  c.save();c.translate(cx,cy+90*s);c.scale(1,.35);const shade=c.createRadialGradient(0,0,0,0,0,310*s);shade.addColorStop(0,'#7f647e44');shade.addColorStop(1,'#7f647e00');c.fillStyle=shade;c.beginPath();c.arc(0,0,310*s,0,tau);c.fill();c.restore();
  block(-240,-95,-30,465,205,30,'#b5c0b9','#8e9fa0','#819298');
  for(let i=0;i<6;i++)edge([-220+i*76,-90,1],[-220+i*76,105,1],'#d4d7c6',1);
  // Planters and paving establish the scale of the little roof garden.
  for(const [x,y] of [[172,-65],[-210,64]]){
    block(x,y,0,34,34,25,'#e9cdb1','#c29b86','#b18d83');
    ball(x+17,y+17,43,23,'#759e92');ball(x+8,y+15,59,17,'#94b5a0');
  }
  // Support, landing, and an inaccessible high bridge.
  block(70,-28,0,100,82,180,'#ffe7bd','#d9987e','#c07d79');
  block(-90,-23,168,160,70,12,'#ffe7bd','#ca9b84','#b4827d');
  block(-151,-40,0,16,16,300,'#758b93','#536f7c','#405d70');
  block(-211,-40,298,166,16,14,'#8ea3a5','#617e89','#486777');
  const p=iso(-128,-30,296);c.strokeStyle='#e6b876';c.lineWidth=8*s;c.beginPath();c.arc(p[0],p[1],22*s,0,tau);c.stroke();
  for(let i=0;i<8;i++){const a=i*tau/8+lift*tau*2;c.strokeStyle='#8c795c';c.lineWidth=2*s;c.beginPath();c.moveTo(p[0]+Math.cos(a)*7*s,p[1]+Math.sin(a)*7*s);c.lineTo(p[0]+Math.cos(a)*19*s,p[1]+Math.sin(a)*19*s);c.stroke();}
  edge([-190,18,284],[-190,18,242-168*lift],'#596b78',2.5);
  edge([-90,18,284],[-90,18,20+168*lift],'#596b78',2.5);
  edge([-190,18,284],[-128,-30,296],'#596b78',2.5);
  edge([-128,-30,296],[-90,18,284],'#596b78',2.5);
  const basket=222-168*lift;
  block(-213,-5,basket,46,46,10,'#d9b568','#bd8e51','#9b7245');
  for(const x of [-211,-170])edge([x,-2,basket+10],[x,-2,basket+43],'#987047',2);
  edge([-211,-2,basket+43],[-170,-2,basket+43],'#987047',2);
  // The golden helper drops into the basket and stays with it throughout the lift.
  const ballZ=t<7?mix(310,252,drop):252-168*lift;
  ball(-190,18,ballZ,19,'#eab355');
  const bp=iso(-190,18,ballZ);c.fillStyle='#6b4e46';
  for(const dx of [-5,5]){c.beginPath();c.arc(bp[0]+dx*s,bp[1]-2*s,1.6*s,0,tau);c.fill();}
  const floor=12+168*lift;
  block(-128,-23,floor-12,76,70,12,'#80c7bc','#509c9a','#387f87');
  function friend(x,y,z,color,side){
    const bounce=t>20?Math.abs(Math.sin((t-20)*4))*8:0;
    block(x-19,y-19,z+bounce,38,38,38,color,side,'#597d87');
    const f=iso(x,y+20,z+23+bounce);
    c.fillStyle='#263f50';
    for(const dx of [-6,6]){c.beginPath();c.ellipse(f[0]+dx*s,f[1],2*s,3*s,0,0,tau);c.fill();}
    const hand=iso(x-24,y+7,z+27+bounce);
    c.strokeStyle=side;c.lineWidth=5*s;c.lineCap='round';c.beginPath();c.moveTo(hand[0],hand[1]);c.lineTo(hand[0]-9*s,hand[1]-(9+Math.sin(t*5)*5)*s);c.stroke();
  }
  friend(113,11,180,'#efb2b0','#cc8e9e');
  friend(mix(-90,62,walk),11,floor,'#96ded2','#539ea4');
  // Small paper flags celebrate the mechanical reunion.
  if(t>20)for(let i=0;i<18;i++){
    const age=(t-20+i*.037)%2, x=cx+Math.sin(i*7.1)*170*s, y=cy-240*s+age*45*s;
    c.save();c.translate(x,y);c.rotate(i+age);c.globalAlpha=(1-age/2)*at(20,.5);c.fillStyle=['#db9ea9','#57a6a7','#d8aa62'][i%3];c.fillRect(-3*s,-5*s,6*s,10*s);c.restore();
  }
  c.restore();
  c.fillStyle='#354a5e';c.textAlign='center';c.font='600 '+(portrait?44:56)*u+'px Georgia, serif';if(t<3||t>21)c.fillText('The Little Lift',cx,h*.15,w-80*u);
  c.fillStyle='#6b6e7d';c.font=15*u+'px Arial';
}

// The Brass Observatory — original clockwork storybook artwork.
function drawFrame({ctx:c,w,h,t,shot:s,motion:m}) {
  const tau=Math.PI*2, u=Math.min(w,h)/720, tall=h>w, q=s.time, D=s.end-s.start;
  const P={ink:'#122f36',deep:'#0b1d2b',navy:'#203b52',haze:'#677985',cream:'#f6e6c1',
    gold:s.params.accent,copper:'#bd7851',edge:'#654c3c',sage:'#82a99a',rose:'#c98278'};
  const n=i=>{const a=Math.sin(i*127.17+311.7)*43758.5453;return a-Math.floor(a)};
  function fill(color){c.fillStyle=color}
  function line(points,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
  function ellipse(x,y,rx,ry,color){fill(color);c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,tau);c.fill()}
  function rect(x,y,ww,hh,color,r=0){fill(color);c.beginPath();c.roundRect(x,y,ww,hh,r);c.fill()}
  function label(text,x,y,size,color=P.cream,align='left',serif=false){
    fill(color);c.font=(serif?'italic ':'600 ')+size+'px '+(serif?'Georgia,serif':'system-ui,sans-serif');c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);
  }
  function star(x,y,r,color=P.gold,alpha=1){
    c.save();c.globalAlpha*=alpha;fill(color);c.beginPath();
    for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.23:r;i?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}
    c.closePath();c.fill();c.restore();
  }
  function glow(x,y,r,gain=1){
    const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba(248,214,139,'+Math.min(.45,.32*gain)+')');gradient.addColorStop(.45,'rgba(239,174,93,'+Math.min(.2,.08*gain)+')');gradient.addColorStop(1,'rgba(239,174,93,0)');fill(gradient);c.fillRect(x-r,y-r,2*r,2*r);
  }
  function sky(){
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,P.deep);g.addColorStop(.6,P.navy);g.addColorStop(1,'#6b7b7a');fill(g);c.fillRect(0,0,w,h);
    for(let i=0;i<140;i++){const x=n(i)*w,y=n(i+300)*h*.67,r=(.6+n(i+500)*1.5)*u;c.globalAlpha=.2+.65*n(i+800);ellipse(x,y,r,r,P.cream)}c.globalAlpha=1;
    for(let k=0;k<3;k++){
      fill(['#304958','#3b5c64','#526e70'][k]);c.beginPath();c.moveTo(0,h);
      for(let x=0;x<=w+40;x+=40)c.lineTo(x,h*(.61+k*.075)-Math.sin(x/w*6+k)*h*.035-n(x+k*21)*20*u);
      c.lineTo(w,h);c.closePath();c.fill();
    }
    for(let i=0;i<24;i++){
      const x=i*(w/22)-20*u,y=h*.73-(18+n(i+17)*45)*u,ww=(20+n(i+42)*24)*u;
      rect(x,y,ww,h*.2,'#29474c');c.beginPath();c.moveTo(x-4*u,y);c.lineTo(x+ww*.5,y-12*u);c.lineTo(x+ww+4*u,y);c.closePath();fill('#496468');c.fill();
      for(let j=0;j<3;j++)if(n(i*8+j)>.35)rect(x+(5+j*8)*u,y+12*u,3*u,5*u,n(i+j)>.5?'#dfb779':'#789790',.5*u);
    }
    const moonX=w*.18,moonY=h*.22;
    glow(moonX,moonY,80*u,.5);ellipse(moonX,moonY,29*u,29*u,'#ead7af');ellipse(moonX+11*u,moonY-8*u,27*u,27*u,P.deep);
  }
  function floor(y){
    const g=c.createLinearGradient(0,y,0,h);g.addColorStop(0,'#b18e68');g.addColorStop(1,'#5c6261');fill(g);c.fillRect(0,y,w,h-y);
    for(let row=0;row<7;row++){
      const yy=y+row*22*u;line([[0,yy],[w,yy]],'rgba(37,51,53,.28)',u);
      for(let x=-40;x<w+50;x+=80*u)line([[x+(row%2)*40*u,yy],[x+(row%2)*40*u,yy+22*u]],'rgba(37,51,53,.22)',u);
    }
  }
  function gear(x,y,r,teeth,angle,color=P.gold){
    m.transform(c,{x,y,rotation:angle},()=>{
      c.beginPath();for(let i=0;i<teeth*4;i++){const a=i*tau/(teeth*4),rr=r*(i%4<2?1:.84);i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(rr,0)}c.closePath();
      fill(color);c.fill();c.strokeStyle=P.edge;c.lineWidth=2*u;c.stroke();
      ellipse(0,0,r*.61,r*.61,'#6d6554');ellipse(0,0,r*.49,r*.49,'#243c43');
      for(let i=0;i<5;i++){const a=i*tau/5;line([[Math.cos(a)*r*.15,Math.sin(a)*r*.15],[Math.cos(a)*r*.54,Math.sin(a)*r*.54]],color,r*.09)}
      ellipse(0,0,r*.18,r*.18,color);ellipse(0,0,r*.065,r*.065,P.edge);
      line([[-r*.22,-r*.69],[r*.12,-r*.74]],'#f8dba1',2*u);
    });
  }
  function robot(x,y,scale=1,{walk=0,look=0,reach=0,joy=0,coat=P.rose}={}){
    m.transform(c,{x,y,scale:scale*u},()=>{
      ellipse(0,2,36,7,'rgba(3,20,26,.28)');
      const stride=Math.sin(walk)*10, lift=Math.abs(Math.cos(walk))*4*(walk?1:0);
      line([[-13,-25],[-16+stride,0-lift]],P.ink,9);line([[13,-25],[16-stride,0]],P.ink,9);
      rect(-27+stride,-2-lift,22,7,'#b09370',3);rect(6-stride,-2,22,7,'#b09370',3);
      c.save();c.rotate(Math.sin(walk)*.025+joy*.04);rect(-27,-74,54,51,coat,12);rect(-22,-68,44,39,'#985d54',9);
      rect(-16,-67,32,28,'#c4aa7e',4);line([[-10,-60],[10,-60]],P.edge,2);ellipse(0,-42,3,3,P.gold);
      const aL=[-31,-60],aR=[31,-60],handL=[-43-joy*10,-36-joy*56],handR=[44+reach*20,-37-reach*43-joy*46];
      line([aL,[-42,-51],handL],P.copper,9);line([aR,[40+reach*10,-50-reach*20],handR],P.copper,9);
      ellipse(...handL,7,7,P.gold);ellipse(...handR,7,7,P.gold);
      rect(-13,-88,26,14,'#8c7759',5);
      rect(-35,-137,70,55,'#d0b082',13);rect(-30,-132,60,43,'#ecce95',9);rect(-26,-123,52,27,P.ink,9);
      const blink=(t%5.3)>5.12;for(const ex of [-13,13])ellipse(ex+look*4,-110,4,blink?.9:5.5,'#c8e9d4');
      line([[-8,-94],[7,-94]],'#99714b',2);ellipse(-37,-112,5,10,P.copper);ellipse(37,-112,5,10,P.copper);
      line([[0,-138],[4,-150]],'#b1976a',3);ellipse(4,-151,5,5,P.gold);glow(4,-151,20,.7);
      line([[-25,-128],[3,-128]],'#fff0cd',3);c.restore();
    });
  }
  function telescope(x,y,scale=1,angle=-.35){
    m.transform(c,{x,y,scale:scale*u},()=>{
      line([[0,-35],[-70,100]],'#7a6954',13);line([[0,-35],[70,100]],'#7a6954',13);line([[0,-35],[0,114]],'#3b4d4d',11);
      for(const xx of [-70,0,70])rect(xx-14,96+(xx?0:14),28,7,P.edge,3);
      gear(0,-30,27,14,t*.12);
      m.transform(c,{x:0,y:-50,rotation:angle},()=>{
        const gradient=c.createLinearGradient(0,-40,0,40);gradient.addColorStop(0,'#f0cb89');gradient.addColorStop(.28,P.gold);gradient.addColorStop(.65,P.copper);gradient.addColorStop(1,P.edge);
        rect(-140,-34,290,68,gradient,12);
        for(const xx of [-116,-48,80,137]){rect(xx,-38,9,76,P.edge,2);line([[xx+2,-34],[xx+2,33]],'#edd093',2)}
        ellipse(151,0,14,39,P.edge);ellipse(155,0,9,31,'#7fc0ba');ellipse(158,-5,3,20,'#caeee0');
        rect(-163,-15,32,30,'#644b3d',5);ellipse(-166,0,5,13,'#c09c63');
        for(let i=0;i<7;i++)ellipse(-95+i*24,23,1.6,1.6,'#674a32');
        line([[-112,-22],[124,-22]],'rgba(255,236,190,.55)',3);
      });
      rect(-39,-4,78,18,'#a48259',5);line([[0,-2],[0,36]],P.edge,9);
    });
  }
  function dome(x,ground,scale=1,opened=0){
    m.transform(c,{x,y:ground,scale:scale*u},()=>{
      ellipse(0,8,178,21,'rgba(7,28,34,.35)');
      const body=c.createLinearGradient(-150,0,150,0);body.addColorStop(0,'#6f8179');body.addColorStop(.5,'#b7b89b');body.addColorStop(1,'#5d7671');
      rect(-138,-195,276,195,body,8);
      for(let row=0;row<9;row++){line([[-138,-186+row*21],[138,-186+row*21]],'rgba(39,63,62,.25)',2);for(let col=-3;col<4;col++)line([[col*44+(row%2)*22,-186+row*21],[col*44+(row%2)*22,-165+row*21]],'rgba(39,63,62,.2)',1)}
      c.beginPath();c.ellipse(0,-196,158,138,0,Math.PI,0);c.lineTo(158,-196);c.closePath();fill('#61847d');c.fill();
      for(const k of [-.7,-.36,0,.36,.7]){c.beginPath();c.ellipse(k*15,-197,Math.max(10,Math.abs(k)*145),135,0,Math.PI,0);c.strokeStyle='#b3b99a';c.lineWidth=3;c.stroke()}
      rect(-163,-202,326,18,'#d7bd89',4);rect(-150,-185,300,11,'#4c6c66',3);
      if(opened>0){
        c.save();c.globalAlpha=opened;fill(P.deep);c.beginPath();c.moveTo(-24,-322);c.lineTo(58,-310);c.lineTo(77,-204);c.lineTo(-20,-204);c.closePath();c.fill();c.restore();
        line([[-24,-322],[-20,-204]],P.gold,4);
      }
      rect(-37,-105,74,107,P.edge,28);rect(-30,-98,60,100,'#d2ac67',24);rect(-21,-80,42,69,'#405856',17);
      for(const xx of [-91,91]){rect(xx-21,-125,42,70,P.edge,20);rect(xx-16,-119,32,58,'#f0c47a',16);line([[xx,-118],[xx,-64]],'#8e7855',3);line([[xx-15,-90],[xx+15,-90]],'#8e7855',3);glow(xx,-90,50,.6)}
      for(let i=0;i<4;i++)rect(-50-i*12,-2+i*6,100+i*24,8,i%2?'#927b5e':'#baa17c',2);
      rect(-45,-162,90,22,'#d6bd8d',3);label('Nº 08',0,-150,12,P.edge,'center');
      ellipse(0,-337,10,10,P.gold);line([[0,-338],[0,-365]],P.gold,3);star(0,-371,10);
    });
  }
  function interior(){
    const g=c.createRadialGradient(w*.6,h*.4,0,w*.6,h*.4,w*.7);g.addColorStop(0,'#445d5d');g.addColorStop(1,'#152f38');fill(g);c.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){c.strokeStyle='rgba(191,158,103,.19)';c.lineWidth=4*u;c.beginPath();c.ellipse(w*.5,h*.76,w*(.18+i*.105),h*.72,0,Math.PI,0);c.stroke()}
    const wx=w*(tall?.53:.76),wy=h*.27,r=(tall?125:134)*u;
    ellipse(wx,wy,r+12*u,r+12*u,P.edge);ellipse(wx,wy,r,r,P.deep);
    for(let i=0;i<30;i++){const a=n(i+42)*tau,rr=Math.sqrt(n(i+71))*r*.87;ellipse(wx+Math.cos(a)*rr,wy+Math.sin(a)*rr,u,u,P.cream)}
    for(let i=0;i<12;i++){const a=i*tau/12;line([[wx+Math.cos(a)*r*.87,wy+Math.sin(a)*r*.87],[wx+Math.cos(a)*r*.96,wy+Math.sin(a)*r*.96]],P.gold,3*u)}
    line([[wx-r,wy],[wx+r,wy]],'#987d55',3*u);line([[wx,wy-r],[wx,wy+r]],'#987d55',3*u);
    floor(h*.77);
    for(let i=0;i<5;i++){const x=w*.06+i*12*u;rect(x,h*.7-(60+i%2*13)*u,10*u,(60+i%2*13)*u,['#ad795a','#81a08b','#c9b180'][i%3],2*u)}
    line([[w*.045,h*.705],[w*.26,h*.705]],P.edge,12*u);
    for(let i=0;i<50;i++){const x=n(i+800)*w,y=(n(i+900)*h*.7+t*(2+n(i))*u)%(h*.7);ellipse(x,y,.9*u,.9*u,'rgba(235,215,173,.2)')}
  }
  if(s.id==='arrival'){
    sky();floor(h*.79);dome(w*(tall?.6:.69),h*.79,tall?.8:1);
    const a=m.tween(q,0,4.7,0,1,'smooth'),x=m.mix(w*.1,w*(tall?.56:.66),a);
    const visibility=1-m.tween(q,4.7,5.5,0,1);
    c.save();c.globalAlpha=visibility;robot(x,h*.79,(tall?1.05:.85),{walk:q<4.7?q*8:0,look:.6});c.restore();
    c.save();c.globalAlpha=m.tween(q,.1,.8,0,1)*(1-m.tween(q,3.5,4.4,0,1));
    label('The Brass',w*.5,h*.13,(tall?34:44)*u,P.cream,'center',true);
    label('Observatory',w*.5,h*.2,(tall?42:53)*u,P.cream,'center',true);c.restore();
    const sx=w*.68,sy=h*.23;for(let i=0;i<7;i++)ellipse(sx+(i%4)*14*u,sy+Math.sin(i)*18*u,2*u,2*u,'#748c93');
  }else if(s.id==='search'){
    interior();
    const floorY=h*.77,tx=w*(tall?.59:.59),ty=floorY-120*u;
    const angle=m.keyframes(q,[[0,-.17],[2,-.47],[3.5,-.23],[5.8,-.35]]);
    telescope(tx,ty,tall?.9:1.15,angle);
    robot(w*(tall?.21:.27),floorY,tall?1.15:1.3,{look:1,reach:m.tween(q,.7,1.5,0,1)*.6});
    rect(w*.1,h*.38,130*u,86*u,'#a38560',6*u);rect(w*.1+7*u,h*.38+7*u,116*u,72*u,'#e4d6ad',3*u);
    label('CHART / 08',w*.1+15*u,h*.38+20*u,10*u,P.edge);
    for(let i=0;i<5;i++)star(w*.1+(20+i*18)*u,h*.38+(40+Math.sin(i)*14)*u,3*u,P.ink);
    c.save();c.globalAlpha=.55+.35*Math.sin(q*5);ellipse(tx+30*u,ty+10*u,6*u,6*u,P.rose);c.restore();
  }else if(s.id==='repair'){
    interior();
    const cx=w*.53,cy=h*.43,sc=tall?1.22:1.45,fit=m.tween(q,1.6,3.5,0,1),turn=m.tween(q,3.3,5.8,0,1);
    m.transform(c,{x:cx,y:cy,scale:sc},()=>{
      rect(-223*u,-168*u,446*u,338*u,'#ba8e57',22*u);rect(-207*u,-152*u,414*u,306*u,'#203a3d',15*u);
      for(const xx of [-213,213])for(const yy of [-158,158]){ellipse(xx*u,yy*u,4*u,4*u,P.gold);line([[(xx-2)*u,(yy-2)*u],[(xx+2)*u,(yy+2)*u]],P.edge,u)}
      gear(-112*u,-42*u,76*u,22,turn*2.2);gear(70*u,25*u,77*u,22,turn*2.2,P.copper);
      gear(125*u,-87*u,48*u,14,-turn*3.46);gear(-128*u,74*u,42*u,12,-turn*4.03);
      ellipse(-8*u,-52*u,38*u,38*u,P.deep);line([[-8*u,-93*u],[-8*u,-14*u]],'#476263',u);
      const pos=m.bezier([[-205*u,179*u],[-175*u,9*u],[0,-132*u],[-8*u,-52*u]],fit);
      c.save();c.globalAlpha=q>.8?1:0;gear(pos[0],pos[1],34*u,12,turn*-5.4,P.sage);c.restore();
      label('A SMALL PART',0,127*u,11*u,P.cream,'center');label('makes the whole turn',0,145*u,13*u,P.gold,'center',true);
    });
    robot(w*.15,h*.81,tall?1.1:1.2,{look:1,reach:fit*.8,joy:turn*.3});
  }else if(s.id==='alignment'){
    interior();
    const angle=m.tween(q,.6,3.6,-.12,-.63),tx=w*(tall?.57:.57),ty=h*.69;
    telescope(tx,ty,tall?1:1.3,angle);
    robot(w*.2,h*.79,tall?1.1:1.3,{look:1,reach:.8*(1-m.tween(q,2.2,4,0,1)),joy:m.tween(q,4,5.6,0,.4)});
    const bx=tx+Math.cos(angle)*160*u,by=ty-50*u+Math.sin(angle)*160*u,alpha=m.tween(q,2.5,4.3,0,.5);
    c.save();c.globalAlpha=alpha;const g=c.createLinearGradient(bx,by,w*.6,h*.12);g.addColorStop(0,'#ffe7a3');g.addColorStop(1,'rgba(185,225,219,0)');fill(g);c.beginPath();c.moveTo(bx,by-13*u);c.lineTo(w*.9,0);c.lineTo(w*.45,0);c.lineTo(bx,by+13*u);c.closePath();c.fill();c.restore();
    glow(bx,by,100*u,alpha*2);
    for(let i=0;i<5;i++)gear(w*.27+i*40*u,h*.84,14*u,10,(i%2?1:-1)*q*1.8,i%2?P.copper:P.gold);
  }else{
    sky();floor(h*.79);
    const open=m.tween(q,0,2,0,1),glowAmount=m.clamp(s.params.glow,0,2);
    dome(w*.62,h*.79,tall?.72:.95,open);
    const stars=[[-160,20],[-106,-28],[-57,-4],[0,15],[48,-36],[103,-67],[153,-28],[67,48],[10,67],[-35,34]];
    const sx=w*.46,sy=h*.26,scale=(tall?.78:1.14)*u,trace=m.tween(q,1.2,5.3,0,stars.length-1);
    for(let i=0;i<stars.length-1;i++){
      if(trace<=i)break;
      const a=stars[i],b=stars[i+1],k=m.clamp(trace-i);line([[sx+a[0]*scale,sy+a[1]*scale],[sx+m.mix(a[0],b[0],k)*scale,sy+m.mix(a[1],b[1],k)*scale]],'rgba(195,226,219,.75)',2*u);
    }
    for(let i=0;i<stars.length;i++){const a=m.tween(q,1.1+i*.4,1.7+i*.4,0,1);glow(sx+stars[i][0]*scale,sy+stars[i][1]*scale,45*u,a*glowAmount);star(sx+stars[i][0]*scale,sy+stars[i][1]*scale,(4+i%3)*u,P.cream,a)}
    robot(w*.31,h*.79,tall?1:.85,{look:1,joy:m.tween(q,2.9,4.2,0,1),coat:P.rose});
    const p=m.bezier([[w*.61,h*.53],[w*.7,h*.34],[w*.5,h*.37],[sx,sy]],m.tween(q,.7,2.7,0,1));
    if(q<3)star(p[0],p[1],8*u,P.gold,m.tween(q,.3,.8,0,1)*(1-m.tween(q,2.5,3,0,1)));
    c.save();c.globalAlpha=m.tween(q,5.4,6.4,0,1);label('Small hands. A wider sky.',w*.5,h*(tall?.47:.12),(tall?20:25)*u,P.cream,'center',true);c.restore();
  }
  // Quiet print grain and lens falloff unify the changing shot sizes.
  for(let i=0;i<150;i++){c.globalAlpha=.025+n(i+31)*.025;fill(i%2?P.cream:P.deep);c.fillRect(n(i+17)*w,n(i+731)*h,u,u)}c.globalAlpha=1;
  const vignette=c.createRadialGradient(w*.5,h*.43,Math.min(w,h)*.25,w*.5,h*.43,Math.max(w,h)*.75);
  vignette.addColorStop(0,'rgba(8,22,31,0)');vignette.addColorStop(1,'rgba(8,22,31,.36)');fill(vignette);c.fillRect(0,0,w,h);
  if(q<.25){c.globalAlpha=.18*(1-m.tween(q,0,.25,0,1));fill(P.deep);c.fillRect(0,0,w,h);c.globalAlpha=1}
}

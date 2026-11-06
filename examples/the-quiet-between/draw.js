// Original mathematical film. Illustrative linear waves, not a fluid simulation.
function drawFrame({ctx:c,w,h,t,shot:s,motion:m}) {
  const U=Math.min(w,h)/720,tall=h>w,q=s.time,pi=Math.PI,tau=2*pi;
  const P={paper:'#f3f0e6',ink:'#183b48',muted:'#607a7e',grid:'#d8dfd8',a:'#007f8b',b:'#c45c41',sum:s.params.accent};
  function fill(v){c.fillStyle=v}
  function box(x,y,ww,hh,col,r=0){fill(col);c.beginPath();c.roundRect(x,y,ww,hh,r);c.fill()}
  function line(p,col,l=2){c.strokeStyle=col;c.lineWidth=l;c.lineCap='round';c.lineJoin='round';c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
  function circle(x,y,r,col){fill(col);c.beginPath();c.arc(x,y,Math.max(.01,r),0,tau);c.fill()}
  function text(v,x,y,size,col=P.ink,align='left',serif=false){fill(col);c.font=(serif?'italic ':'600 ')+size+'px '+(serif?'Georgia,serif':'system-ui,sans-serif');c.textAlign=align;c.textBaseline='middle';c.fillText(v,x,y)}
  function background(){
    fill(P.paper);c.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=30*U)for(let y=0;y<h;y+=30*U)circle(x,y,.65*U,'#cbd4cb');
    line([[32*U,54*U],[w-32*U,54*U]],P.ink,U);
    text('FIELD NOTES / 02',32*U,34*U,11*U);
    text('THE SCIENCE OF MEETING',w-32*U,34*U,10*U,P.muted,'right');
    box(32*U,h-27*U,w-64*U,2*U,P.grid);box(32*U,h-27*U,t/32*(w-64*U),2*U,P.a);
    text(String(s.id==='meeting'?1:s.id==='agree'?2:s.id==='shift'?3:s.id==='field'?4:5).padStart(2,'0')+' / 05',w-32*U,h-43*U,10*U,P.muted,'right');
  }
  function heading(a,b){
    const yy=tall?h*.13:h*.16;
    text(a,w*.07,yy,(tall?35:43)*U,P.ink,'left',true);
    text(b,w*.07,yy+42*U,(tall?15:16)*U,P.muted);
  }
  function graph(x,y,ww,amp,fn,color,{grid=true,area=false,mark=true}={}){
    if(grid){
      for(let k=0;k<=8;k++)line([[x+k*ww/8,y-amp*2.3],[x+k*ww/8,y+amp*2.3]],P.grid,.7*U);
      for(let k=-2;k<=2;k++)line([[x,y+k*amp],[x+ww,y+k*amp]],k===0?'#8fa7a3':P.grid,k===0?1.4*U:.7*U);
    }
    const points=Array.from({length:241},(_,i)=>[x+ww*i/240,y-fn(i/240)*amp]);
    if(area){fill(color+'18');c.beginPath();c.moveTo(x,y);points.forEach(p=>c.lineTo(...p));c.lineTo(x+ww,y);c.closePath();c.fill()}
    line(points,color,3*U);
    if(mark){const z=.64;circle(x+z*ww,y-fn(z)*amp,5*U,color)}
  }
  function dial(x,y,r,phase){
    circle(x,y,r+8*U,'#e0dfd1');circle(x,y,r,P.paper);
    for(let i=0;i<24;i++){const a=i*tau/24-pi/2;line([[x+Math.cos(a)*(r-5*U),y+Math.sin(a)*(r-5*U)],[x+Math.cos(a)*(r-(i%3?10:16)*U),y+Math.sin(a)*(r-(i%3?10:16)*U)]],P.muted,U)}
    const angle=phase-pi/2;
    line([[x,y],[x+Math.cos(angle)*r*.65,y+Math.sin(angle)*r*.65]],P.b,3*U);circle(x,y,5*U,P.ink);
    text(Math.round(phase/pi*180)+'°',x,y+r+28*U,18*U,P.ink,'center');
  }
  function ribbons(x,y,ww,hh,phase,opacity=1){
    c.save();c.globalAlpha=opacity;
    for(let row=0;row<20;row++){
      const yy=y+row/19*hh,col=row<10?P.a:P.b,pts=[];
      for(let i=0;i<=160;i++){const z=i/160,a=Math.sin(z*tau*2.3-t*1.4+(row<10?0:phase));pts.push([x+ww*z,yy+a*hh*.17*Math.sin(z*pi)])}
      line(pts,col,1.1*U);
    }c.restore();
  }
  function field(x,y,ww,hh,phase){
    const nx=tall?44:64,ny=34;
    const values=(a,b)=>{
      const r1=Math.hypot(a+.95,b),r2=Math.hypot(a-.95,b);
      return Math.sin(r1*6.2-t*2.8)/Math.sqrt(1+r1)+Math.sin(r2*6.2-t*2.8+phase)/Math.sqrt(1+r2);
    };
    const point=(a,b,z)=>[x+ww*.5+a*ww*.125+b*ww*.045,y+hh*.42+b*hh*.14-z*hh*.075];
    for(let iy=0;iy<ny;iy++){
      const b=-2.8+iy*5.6/(ny-1),pts=[];
      for(let ix=0;ix<nx;ix++){const a=-2.8+ix*5.6/(nx-1);pts.push(point(a,b,values(a,b)))}
      line(pts,iy%3===0?P.a:'#77aba6',(iy%3===0?1.7:.8)*U);
    }
    for(let ix=0;ix<nx;ix+=3){
      const a=-2.8+ix*5.6/(nx-1),pts=[];
      for(let iy=0;iy<ny;iy++){const b=-2.8+iy*5.6/(ny-1);pts.push(point(a,b,values(a,b)))}
      line(pts,'#a0beb2',.7*U);
    }
    for(const [a,col,label] of [[-.95,P.a,'A'],[.95,P.b,'B']]){
      const p=point(a,0,values(a,0));circle(p[0],p[1],9*U,P.paper);circle(p[0],p[1],5*U,col);
      line([[p[0],p[1]-15*U],[p[0],p[1]-55*U]],col,U);text(label,p[0],p[1]-69*U,15*U,col,'center');
    }
    text('Equal-frequency sources · perspective view',x+ww*.5,y+hh*.94,11*U,P.muted,'center');
  }
  background();
  if(s.id==='meeting'){
    heading('The quiet between','What happens when two waves meet?');
    const yy=h*(tall?.45:.53),xx=w*.09,ww=w*.82,amp=(tall?74:60)*U;
    const meet=m.tween(q,.4,3.8,0,1),a=m.mix(.08,.82,meet),b=1-a;
    const packet=(x,p)=>Math.sin((x-p)*tau*4.5)*Math.exp(-Math.pow((x-p)/.17,2));
    graph(xx,yy,ww,amp,z=>packet(z,a),P.a,{mark:false});
    graph(xx,yy,ww,amp,z=>packet(z,b),P.b,{grid:false,mark:false});
    for(const [p,col,lab] of [[a,P.a,'A'],[b,P.b,'B']]){circle(xx+p*ww,yy-amp*1.4,17*U,col);text(lab,xx+p*ww,yy-amp*1.4,13*U,P.paper,'center')}
    text('Their displacements add.',w*.5,h*(tall?.68:.79),23*U,P.ink,'center',true);
    text('A + B',w*.5,h*(tall?.75:.87),15*U,P.muted,'center');
  }else if(s.id==='agree'||s.id==='shift'){
    const shift=s.id==='shift',phase=shift?m.tween(q,.6,4.6,0,pi):0;
    heading(shift?'Now shift one wave.':'When peaks agree.',shift?'Half a cycle changes the sum.':'Same frequency. Same amplitude. Same phase.');
    const xx=w*.14,ww=w*(tall?.72:.58),a=(tall?40:28)*U,ys=tall?[h*.36,h*.51,h*.72]:[h*.39,h*.57,h*.79];
    const fn=z=>Math.sin(z*tau*2.4-t*1.6);
    graph(xx,ys[0],ww,a,fn,P.a);graph(xx,ys[1],ww,a,z=>Math.sin(z*tau*2.4-t*1.6+phase),P.b);
    graph(xx,ys[2],ww,a,z=>fn(z)+Math.sin(z*tau*2.4-t*1.6+phase),P.sum,{area:true});
    ['A','B','A+B'].forEach((v,i)=>text(v,xx-30*U,ys[i],14*U,[P.a,P.b,P.sum][i],'center'));
    const z=.64,x=xx+z*ww;line([[x,ys[0]-a*2],[x,ys[2]+a*2]],'#8fa7a3',U);
    if(tall){dial(w*.82,h*.23,28*U,phase);text(phase>3.1?'CANCEL':'ADD',w*.51,h*.85,13*U,P.sum,'center')}
    else {dial(w*.86,h*.46,49*U,phase);text(phase>3.1?'Zero sum':shift?'Changing phase':'Double amplitude',w*.86,h*.68,20*U,P.sum,'center',true);text('phase difference',w*.86,h*.31,11*U,P.muted,'center')}
  }else if(s.id==='field'){
    heading('A pattern of meetings.','Different distances. Different arrivals.');
    field(w*.02,h*(tall?.31:.28),w*.96,h*(tall?.47:.56),0);
    const yy=h*(tall?.81:.88);
    circle(w*.23,yy,5*U,P.a);text('source A',w*.23+14*U,yy,12*U,P.muted);
    circle(w*.61,yy,5*U,P.b);text('source B',w*.61+14*U,yy,12*U,P.muted);
  }else{
    heading('The quiet is a relationship.','Two contributions. One observable result.');
    ribbons(w*.07,h*(tall?.35:.34),w*.86,h*.23,m.tween(q,0,3,0,pi),.8);
    const y=h*(tall?.71:.75);
    text('y = y₁ + y₂',w*.5,y,(tall?47:58)*U,P.ink,'center',true);
    text('Superposition',w*.5,y+62*U,17*U,P.a,'center');
  }
}

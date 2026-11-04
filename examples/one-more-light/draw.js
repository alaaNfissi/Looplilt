// One More Light — a pixel-art coastal rescue in five shots.
function drawFrame({ctx:c,w,h,t}) {
  const P=4,W=w/P,H=h/P, tau=Math.PI*2;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},at=(a,d)=>ease((t-a)/d),mix=(a,b,p)=>a+(b-a)*p;
  const gy=Math.floor(H*.68),sea=Math.floor(H*.82),tower=550,th=Math.min(136,Math.floor(H*.48)),gap=340;
  const lit=t<1.4||t>=30,returning=at(30,8),storm=1-at(30,5),interior=t>=26&&t<30;
  const pal={sky:'#101c36',sky2:'#1b2e48',sky3:'#2a435b',sea:'#1d3c57',wave:'#47738b',foam:'#91bbb7',rock:'#334c63',stone:'#52687b',grass:'#6d9a90',cream:'#f2dfb1',gold:'#edbb61',red:'#b46a74',ink:'#14283e',warm:'#d9985a'};
  c.save();c.scale(P,P);c.imageSmoothingEnabled=false;
  function rect(x,y,ww,hh,color){if(ww<=0||hh<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(ww),Math.round(hh));}
  function disk(x,y,r,color){for(let j=-r;j<=r;j++){const half=Math.floor(Math.sqrt(r*r-j*j));rect(x-half,y+j,2*half+1,1,color);}}
  function steps(points,color){for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);for(let j=0;j<=n;j++)rect(mix(a[0],b[0],j/n),mix(a[1],b[1],j/n),1,1,color);}}
  function plank(x,y,ww,hh){rect(x,y,ww,hh,'#91664d');rect(x+1,y+1,ww-2,hh-2,'#bc8d5c');rect(x+2,y+2,ww-4,1,'#d4aa70');}
  let cam=520-at(0,5)*8,zoom=1;
  if(t>=5&&t<12)cam=mix(145,295,at(5,7));
  if(t>=12&&t<21){cam=331;zoom=2;}
  if(t>=21&&t<26)cam=mix(365,535,at(21,5));
  if(t>=30)cam=535+at(34,6)*9;
  // Three depths of sky, islands, clouds and village lights move at different speeds.
  rect(0,0,W,H,pal.sky);rect(0,H*.3,W,H*.3,pal.sky2);rect(0,H*.58,W,H*.3,pal.sky3);
  for(let i=0;i<90;i++){const x=((i*71.3-cam*.05)%(W+20)+W+20)%(W+20),y=(i*31.7)%(H*.58);rect(x,y,1,1,i%6===0?pal.cream:'#778f9d');}
  disk(W*.18,H*.26,12,pal.cream);disk(W*.18+5,H*.26-4,11,pal.sky);
  for(let layer=0;layer<3;layer++){
    const base=H*(.55+layer*.07),color=['#263b54','#324e63','#3f5d6d'][layer];
    for(let i=-1;i<9;i++){
      const x=i*60-(cam*(.1+layer*.05))%60,peak=14+(i*i*13+layer*7)%28;
      for(let row=0;row<peak;row++)rect(x+row*.8,base-peak+row,60-row*1.1,1,color);
    }
  }
  for(let i=0;i<11;i++){
    const x=((i*83+t*(1+i%2)-cam*.12)%(W+120)+W+120)%(W+120)-60,y=H*.28+(i%4)*9;
    rect(x,y,43,5,'#243b51');rect(x+9,y-4,26,5,'#243b51');rect(x+19,y-7,14,4,'#243b51');
  }
  // A distant fishing village, windows reflected in the water.
  for(let i=0;i<12;i++){
    const x=i*25-cam*.08,y=sea-32-(i%3)*6;
    rect(x,y,17,25,'#2b4057');for(let j=0;j<5;j++)rect(x+j*2,y-j,17-j*4,1,'#344a60');
    for(const dx of [4,11]){rect(x+dx,y+8,3,4,lit?'#c89860':'#72828a');c.globalAlpha=.3;rect(x+dx,sea+7,2,10,pal.warm);c.globalAlpha=1;}
  }
  rect(0,sea,W,H-sea,pal.sea);
  for(let row=0;row<9;row++)for(let i=0;i<15;i++){
    const x=((i*31+row*17+t*(row%2?2:-1.5))%(W+40)+W+40)%(W+40)-20;
    rect(x,sea+4+row*5,5+(i*7)%15,1,row%3?pal.wave:'#658d9e');
  }
  c.save();c.translate(Math.round(W/2-cam*zoom),Math.round((zoom===2?H*.61:gy)-gy*zoom));c.scale(zoom,zoom);
  function cottage(x){
    rect(x,gy-43,45,43,'#a78970');rect(x+2,gy-41,41,40,'#c1a181');
    for(let i=0;i<7;i++)rect(x-7+i*4,gy-45-i*3,59-i*8,3,i%2?'#755061':'#8d5967');
    rect(x+31,gy-67,8,22,'#796879');rect(x+29,gy-68,12,3,'#b18c82');
    for(let row=0;row<5;row++)for(let col=0;col<5;col++)rect(x+col*9+(row%2)*4,gy-38+row*7,6,1,'#8e786d');
    rect(x+7,gy-31,12,15,pal.ink);rect(x+9,gy-29,8,11,'#ddad70');rect(x+12,gy-29,1,11,'#8e6956');rect(x+9,gy-24,8,1,'#8e6956');
    rect(x+28,gy-28,13,28,pal.ink);rect(x+30,gy-26,9,26,t>=5&&t<10?'#26354c':'#795e5b');
    rect(x+36,gy-13,2,2,pal.gold);plank(x+24,gy-1,23,4);
    for(let i=0;i<5;i++){const age=(t*.4+i*.2)%1;c.globalAlpha=(1-age)*.3;disk(x+36-age*8,gy-72-age*25,3+Math.floor(age*4),'#8fa1a5');c.globalAlpha=1;}
  }
  // Coastal path, exposed rock, moss, and the missing bridge section.
  rect(-200,gy,540,H,pal.rock);rect(gap+26,gy,600,H,pal.rock);
  rect(-200,gy,540,4,pal.grass);rect(gap+26,gy,600,4,pal.grass);
  rect(gap-2,gy+26,30,4,'#243b53');
  for(let i=0;i<260;i++){
    const x=(i*71.37)%1000-150,y=gy+7+(i*17.19)%(H*.2+20);
    if(x<gap-3||x>gap+29){rect(x,y,5+i%5,2,i%4?'#486176':'#647c89');if(i%13===0)rect(x,y+2,2,6,'#587c79');}
  }
  // The sea remains visible below the shelf, with foam at the cliff foot.
  rect(-200,sea+8,1200,H,pal.sea);
  for(let i=0;i<55;i++){const x=(i*27+t*2)%1000-100,y=sea+10+(i%5)*5;rect(x,y,6+i%7,1,i%3?pal.wave:pal.foam);}
  cottage(88);
  // Fences, a mooring post, a sign and the abandoned wooden crate make a lived-in path.
  for(let x=157;x<298;x+=24){rect(x,gy-15,3,15,'#897365');rect(x,gy-12,24,2,'#b1987a');rect(x,gy-5,24,2,'#8c7c6c');}
  for(const x of [45,425]){rect(x,gy-10,7,10,'#546779');rect(x-2,gy-13,11,4,'#82939b');steps([[x-5,gy-8],[x+12,gy-3],[x+20,gy-11]],'#b5a58b');}
  rect(280,gy-33,3,33,'#7e6a62');plank(269,gy-35,25,12);steps([[280,gy-32],[287,gy-29],[280,gy-26]],pal.cream);
  const push=at(12,5.5),fall=at(17.5,1.5),boxX=314+push*26,boxY=gy-26+fall*26;
  plank(boxX,boxY,26,26);rect(boxX+3,boxY+3,20,20,'#ac7a51');
  for(let i=0;i<20;i++)rect(boxX+3+i,boxY+3+i,3,2,'#d4aa70');
  for(const dx of [2,22]){rect(boxX+dx,boxY+1,2,24,'#e2bc7d');rect(boxX+dx,boxY+3,1,1,pal.ink);rect(boxX+dx,boxY+21,1,1,pal.ink);}
  // Lighthouse: tapered stonework, red bands, iron balcony and a multi-ring lens.
  for(let row=0;row<th;row++){
    const inset=Math.floor((th-row)/24),y=gy-th+row;
    rect(tower+inset,y,28-inset*2,1,Math.floor(row/17)%2?'#b3757b':'#d0c2a5');
    if(row%7===0)rect(tower+inset,y,28-inset*2,1,'#7a7980');
    if(row%7<6)for(let brick=0;brick<3;brick++)rect(tower+inset+brick*9+(Math.floor(row/7)%2)*4,y,1,1,'#92918b');
  }
  rect(tower+2,gy-th-16,24,16,'#162b42');rect(tower+4,gy-th-13,20,11,lit?pal.gold:'#4f6577');
  for(const dx of [5,12,20])rect(tower+dx,gy-th-14,2,13,'#45576a');
  rect(tower-4,gy-th,36,3,'#152b43');rect(tower-5,gy-th-2,38,1,'#8c9b9d');
  for(let i=0;i<7;i++)rect(tower-4+i*6,gy-th-8,1,8,'#9aabab');
  rect(tower,gy-th-19,28,3,'#bd7c7f');rect(tower+4,gy-th-22,20,3,'#98616e');rect(tower+9,gy-th-25,10,3,'#98616e');
  rect(tower+12,gy-th-30,2,5,pal.gold);
  for(let i=0;i<3;i++){const wy=gy-40-i*(th-35)/3;rect(tower+10,wy,8,12,'#1c344d');rect(tower+12,wy+2,4,8,lit?'#d9ac6a':'#5e7a8a');}
  rect(tower+8,gy-27,13,27,'#132b43');rect(tower+10,gy-25,9,25,'#58626a');rect(tower+17,gy-12,1,2,pal.gold);plank(tower+4,gy-1,22,4);
  function keeper(x,y,pushing=false,wave=false){
    x=Math.round(x);y=Math.round(y);const step=Math.floor(t*7)%2,lean=pushing?2:0;
    rect(x-8+lean,y-25,16,5,pal.gold);rect(x-11+lean,y-21,23,3,'#e2b15b');
    rect(x-5+lean,y-18,12,8,pal.cream);rect(x+3+lean,y-16,2,2,pal.ink);rect(x+4+lean,y-12,2,1,'#b57d66');
    rect(x-8,y-10,16,7,'#b96673');rect(x-8,y-10,4,7,'#d48a83');rect(x+5,y-10,3,7,'#8a5369');
    rect(x-6-step,y-3,5,3,pal.ink);rect(x+3+step,y-3,6,3,pal.ink);rect(x-7-step,y-1,7,1,'#b2ac95');rect(x+3+step,y-1,8,1,'#b2ac95');
    rect(x-11,y-10,4,3,pal.cream);
    if(wave){rect(x+8,y-12,3,3,pal.cream);rect(x+11,y-17+(Math.floor(t*3)%2),3,7,pal.cream);}
    else {rect(x+7,y-10,4,3,pal.cream);if(pushing)rect(x+10,y-10,3,4,pal.cream);}
    if(t<26){rect(x-14,y-14,5,9,pal.gold);rect(x-13,y-15,3,1,pal.cream);rect(x-13,y-12,3,4,'#fff0bf');}
  }
  let hero=105;
  if(t>=5)hero=mix(105,302,at(5,7));
  if(t>=12)hero=mix(302,328,push);
  if(t>=19.5)hero=mix(328,535,at(19.5,5.5));
  if(t>=25)hero=mix(535,560,at(25,1));
  if(t>=30)hero=535;
  if(t>=5&&t<26||t>=30)keeper(hero,gy,t>=12&&t<17.5,t>=31);
  // A fishing boat rounds a now-visible reef. Its wake follows the curved route.
  const shipX=mix(465,620,returning),shipY=sea+11+Math.sin(returning*Math.PI)*6;
  rect(503,sea+8,18,8,'#2b425a');rect(510,sea+3,8,10,'#2b425a');rect(511,sea+3,5,1,'#7e9a9d');
  if(lit){
    const lx=tower+14,ly=gy-th-8,span=shipX-lx,n=Math.max(1,Math.abs(Math.round(span)));
    c.globalAlpha=t<1.4?.14:.22;
    for(let i=0;i<=n;i++){const p=i/n,yy=mix(ly,shipY,p),spread=1+p*9;rect(lx+span*p,yy-spread,1,spread*2,pal.cream);}
    c.globalAlpha=1;disk(lx,ly,3,pal.cream);
  }
  const by=shipY+Math.sin(t*2)*1;
  rect(shipX-18,by,37,4,'#ac6872');rect(shipX-14,by+4,29,4,'#884f64');rect(shipX-9,by-11,18,11,'#ddd0b3');
  for(const dx of [-6,2]){rect(shipX+dx,by-8,5,4,lit?'#d9b673':'#5e8292');rect(shipX+dx,by-8,1,4,'#344d64');}
  rect(shipX+3,by-17,3,6,'#3d4c61');rect(shipX+1,by-19,7,2,'#798b94');rect(shipX-15,by-2,31,1,pal.gold);
  steps([[shipX+11,by-11],[shipX+11,by-19],[shipX+17,by-15],[shipX+11,by-15]],'#d8ba88');
  for(let i=0;i<4;i++)rect(shipX-24-i*7,by+9+i%2,8,1,pal.foam);
  c.restore();
  if(interior){
    // The intimate insert is a real second scene, with a mechanical power-up.
    rect(0,0,W,H,'#202c42');rect(8,8,W-16,H-16,'#33485c');
    for(let x=12;x<W;x+=18)rect(x,10,1,H-20,'#506172');
    const mx=W*.6,my=H*.49,plug=at(26.5,2),power=at(28.5,1);
    rect(mx-52,my-54,94,108,'#172b40');rect(mx-49,my-51,88,102,'#687d87');rect(mx-44,my-46,78,92,'#344d64');
    for(const dx of [-46,36])for(const dy of [-48,48]){disk(mx+dx,my+dy,2,'#b5b8a5');rect(mx+dx-1,my+dy,3,1,'#536672');}
    function gear(x,y,r,phase){
      for(let i=0;i<12;i++){const a=i*tau/12+phase;rect(x+Math.cos(a)*r-2,y+Math.sin(a)*r-2,5,5,'#a0a89c');}
      disk(x,y,r-1,'#849391');disk(x,y,r-5,'#425b6b');disk(x,y,3,pal.gold);
    }
    gear(mx-14,my-18,15,t*.5*power);gear(mx+12,my+1,12,-t*.65*power);
    rect(mx-32,my+20,48,17,'#14293d');rect(mx-29,my+23,42,11,'#647786');
    const bx=mix(W*.15,mx-29,plug),by=my+22;
    rect(bx,by,33,13,'#d3a759');rect(bx+3,by+2,26,9,'#f1d18c');rect(bx+33,by+4,3,5,pal.cream);
    // Gloved hand, sleeve, and a cable lighting progressively toward the lens.
    rect(bx-14,by+3,16,9,pal.cream);rect(bx-50,by+3,36,13,'#b46a74');rect(bx-50,by+13,36,3,'#8d5469');
    const wire=[[mx+25,my+28],[mx+29,my+28],[mx+29,my-32],[mx-21,my-32]];
    steps(wire,'#a78661');for(let i=0;i<Math.floor(power*60);i++)rect(mx+29,my+28-i,2,2,pal.gold);
    disk(mx-24,my-31,4,power>.5?'#b5d39b':'#bd6c74');
    for(let i=0;i<8;i++)rect(mx-30+i*7,my-42,4,4,i<power*8?pal.gold:'#1b354c');
    for(let i=0;i<4;i++)rect(12+i*8,H-25,5,8,'#516d79');
  }else{
    // Foreground weather crosses the camera independently of the world.
    for(let i=0;i<110;i++){
      const x=((i*37+t*17)%(W+20))-10,y=(i*71+t*53)%(H+20)-10;
      c.globalAlpha=storm*.23;rect(x,y,1,4,'#99b6c0');rect(x+1,y+4,1,3,'#99b6c0');
    }
    c.globalAlpha=1;
    for(let i=0;i<5;i++){c.globalAlpha=.035*storm;rect(((t*2+i*91)%(W+100))-80,H*.55+i*8,100,5,'#c2c9c2');}c.globalAlpha=1;
  }
  const glyph={A:'01110 10001 10001 11111 10001 10001 10001',E:'11111 10000 10000 11110 10000 10000 11111',G:'01111 10000 10000 10111 10001 10001 01111',H:'10001 10001 10001 11111 10001 10001 10001',I:'01110 00100 00100 00100 00100 00100 01110',L:'10000 10000 10000 10000 10000 10000 11111',M:'10001 11011 10101 10101 10001 10001 10001',N:'10001 11001 10101 10011 10001 10001 10001',O:'01110 10001 10001 10001 10001 10001 01110',R:'11110 10001 10001 11110 10100 10010 10001',T:'11111 00100 00100 00100 00100 00100 00100'};
  function title(str,x,y,size){let xx=Math.round(x-(str.length*6-1)*size/2);for(const ch of str){if(glyph[ch])glyph[ch].split(' ').forEach((row,j)=>{for(let i=0;i<5;i++)if(row[i]==='1')rect(xx+i*size,y+j*size,size,size,pal.cream);});xx+=6*size;}}
  if(t<4){c.globalAlpha=1-at(3,1);title('ONE MORE LIGHT',W>=240?W*.28:W/2,12,2);c.globalAlpha=1;}
  if(t>38){c.globalAlpha=at(38,1);title('HOME',W*.23,H*.37,2);c.globalAlpha=1;}
  c.restore();
}

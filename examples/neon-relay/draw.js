// Neon relay: a little signal takes the long way to find a friend.
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720, tau = Math.PI * 2, cyan = '#64efff', pink = '#ff73c8', gold = '#ffe5a0';
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const at = (s, d) => ease((t - s) / d), mix = (a, b, p) => a + (b - a) * p;
  const cx = w / 2, y = h * .59, start = w * .2, gate = w * .48 - 32 * u, goal = w * .79, meet = at(17, 4);
  const bg = c.createRadialGradient(cx, y, 0, cx, y, Math.max(w, h) * .8);
  bg.addColorStop(0, '#172948'); bg.addColorStop(.55, '#091126'); bg.addColorStop(1, '#040812');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  function dot(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, tau); c.fill(); }
  function text(s, yy, size, color = '#f1f5ff') {
    c.font = '600 ' + size * u + 'px Arial, sans-serif'; c.textAlign = 'center'; c.fillStyle = color; c.fillText(s, cx, yy, w - 90 * u);
  }
  for (let i = 0; i < 90; i++) { c.globalAlpha = .12 + (1 + Math.sin(i + t * .5)) * .15; dot((i * 173.7 + 42) % w, (i * 91.13 + 57) % h, (i % 3 * .35 + .5) * u, '#b4c8fa'); }
  c.globalAlpha = 1; c.strokeStyle = '#2c3e60'; c.lineWidth = u; c.strokeRect(28 * u, 28 * u, w - 56 * u, h - 56 * u);
  text('NEON RELAY', h * .105, 14, cyan);
  if(t<2.5) text('Anyone out there?', h*.205, portrait?43:58);
  if(t>20) text('Found you.', h*.205, portrait?43:58);
  // Depth revision: a signal district, perspective lanes and two closer camera beats.
  const camera=1+.5*(at(2.5,.6)-at(6.6,.6))+.14*(at(7,.6)-at(16,.8));
  c.save();c.translate(cx,h*.55);c.scale(camera,camera);c.translate(-cx,-h*.55);
  c.save();c.globalAlpha=.5;
  for(let i=0;i<24;i++){
    const bw=w/25,x=i*w/24-8*u,bh=(38+((i*47)%83))*u,by=h*.79;
    c.fillStyle=i%2?'#132b43':'#19334b';c.fillRect(x,by-bh,bw,bh);
    c.strokeStyle='#345a72';c.lineWidth=u;c.strokeRect(x,by-bh,bw,bh);
    for(let row=0;row<5;row++)for(let col=0;col<3;col++){
      c.fillStyle=(i+row+col)%5===0?'#d3a878':'#497d8d';
      c.globalAlpha=((i+row+col)%4===0?.55:.18);c.fillRect(x+5*u+col*bw*.27,by-bh+9*u+row*13*u,3*u,5*u);
    }
    c.globalAlpha=.5;
  }
  c.strokeStyle='#39657d';c.lineWidth=u;c.globalAlpha=.3;
  for(let i=-5;i<8;i++){c.beginPath();c.moveTo(cx+i*15*u,h*.64);c.lineTo(cx+i*w*.18,h*.81);c.stroke();}
  for(let i=0;i<6;i++){const gy=h*.64+i*i*h*.006;c.beginPath();c.moveTo(25*u,gy);c.lineTo(w-25*u,gy);c.stroke();}
  c.restore();
  for(const px of [start,goal]){
    c.fillStyle='#10283e';c.fillRect(px-37*u,y+33*u,74*u,8*u);
    c.strokeStyle='#528b9e';c.lineWidth=2*u;c.beginPath();c.ellipse(px,y+33*u,37*u,8*u,0,0,tau);c.stroke();
  }
  // The closed gate is a visible obstacle; the new path goes around it.
  c.save(); c.globalAlpha = 1 - meet; c.strokeStyle = '#405376'; c.lineWidth = 2 * u;
  c.beginPath(); c.moveTo(start, y); c.lineTo(goal, y); c.stroke();
  c.fillStyle = '#13233c'; c.fillRect(w * .48, h * .43, w * .08, h * .29);
  c.strokeStyle = '#ad527c'; c.lineWidth = 3 * u;
  for (let i = 0; i < 8; i++) {
    const gy = h * .445 + i * h * .035;
    c.beginPath(); c.moveTo(w * .48, gy); c.lineTo(w * .56, gy + h * .02); c.stroke();
  }
  c.restore();
  function route(p) {
    const q = 1 - p;
    return [q ** 3 * gate + 3 * q * q * p * w * .22 + 3 * q * p * p * w * .79 + p ** 3 * goal,
      q ** 3 * y + 3 * q * q * p * h * .25 + 3 * q * p * p * h * .25 + p ** 3 * y];
  }
  const progress = at(7, 10);
  c.save(); c.globalAlpha = (1 - meet) * at(6, 1); c.strokeStyle = '#405673'; c.lineWidth = 1.5 * u; c.setLineDash([4 * u, 9 * u]); c.beginPath();
  for (let i = 0; i <= 120; i++) { const [x, yy] = route(i / 120); if (!i) c.moveTo(x, yy); else c.lineTo(x, yy); }
  c.stroke(); c.setLineDash([]);
  c.strokeStyle = cyan; c.shadowColor = cyan; c.shadowBlur = 16 * u; c.lineWidth = 3 * u; c.beginPath();
  for (let i = 0; i <= 120; i++) { const [x, yy] = route(progress * i / 120); if (!i) c.moveTo(x, yy); else c.lineTo(x, yy); }
  c.stroke(); c.shadowBlur = 0;
  for (const p of [.23, .52, .79]) { const [x, yy] = route(p); dot(x, yy, 7 * u, progress >= p ? gold : '#344c67'); }
  c.restore();
  let x = mix(start, gate, at(0, 3)), yy = y;
  if (t >= 3 && t < 7) x = gate - Math.abs(Math.sin((t - 3) * Math.PI)) * 22 * u;
  if (t >= 7) [x, yy] = route(progress);
  const center = mix(goal, cx, meet), radius = at(17, 1.5) * 50 * u, angle = (t - 17) * 1.25;
  if (t >= 17) { x = center - Math.cos(angle) * radius; yy = y - Math.sin(angle) * radius; }
  let friendX = t < 17 ? goal : center + Math.cos(angle) * radius;
  let friendY = t < 17 ? y : y + Math.sin(angle) * radius;
  function character(px, py, color, active, looking) {
    c.save(); c.shadowColor = color; c.shadowBlur = (active ? 24 : 12) * u;
    dot(px, py, 30 * u, color); c.shadowBlur = 0;
    const blink = Math.sin(t * 2.3 + looking) > .99 ? .25 : 1;
    c.fillStyle = '#132138';
    for (const dx of [-8, 8]) { c.beginPath(); c.ellipse(px + (dx + looking) * u, py - 2 * u, 3.1 * u, 4.7 * u * blink, 0, 0, tau); c.fill(); }
    c.strokeStyle = color; c.globalAlpha = .22 + .13 * Math.sin(t * 3); c.lineWidth = u;
    c.beginPath(); c.arc(px, py, (42 + 6 * Math.sin(t * 2)) * u, 0, tau); c.stroke(); c.restore();
  }
  if (t >= 17) {
    c.save(); c.strokeStyle = gold; c.lineWidth = 2 * u; c.globalAlpha = at(17, .6) * .65;
    c.beginPath(); c.moveTo(x, yy); c.lineTo(friendX, friendY); c.stroke();
    for (let i = 0; i < 3; i++) {
      const pulse = ((t - 17) * .35 + i / 3) % 1; c.globalAlpha = (1 - pulse) * .3;
      c.beginPath(); c.arc(center, y, (50 + pulse * 155) * u, 0, tau); c.stroke();
    }
    c.restore();
  } else if (t > 3 && t < 7) {
    c.save(); c.globalAlpha = Math.max(0, 1 - ((t - 3) % 1) * 2);
    c.strokeStyle = pink; c.lineWidth = 2 * u; c.beginPath(); c.arc(gate + 14 * u, y, (8 + ((t - 3) % 1) * 26) * u, 0, tau); c.stroke(); c.restore();
  }
  character(friendX, friendY, pink, t >= 17, -1); character(x, yy, cyan, true, 1);
  c.restore();
  text(t < 17 ? 'A small signal. A stubborn obstacle.' : 'Some connections are worth the detour.', h * .865, portrait ? 18 : 21, '#b6c7df');
  text('A LOOPLILT SHORT STORY', h * .935, 11, '#7f97b5');
}

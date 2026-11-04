// Moonrise Express: the last train reaches someone waiting with a lantern.
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720, tau = Math.PI * 2, cx = w / 2;
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const at = (s, d) => ease((t - s) / d), rail = h * (portrait ? .70 : .71);
  const gold = '#ebc58b', cream = '#fff0cd';
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#101d35'); sky.addColorStop(.65, '#284558'); sky.addColorStop(1, '#bc795b');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  function circle(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, tau); c.fill(); }
  function line(x1, y1, x2, y2, color, width = 1) { c.strokeStyle = color; c.lineWidth = width * u; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function text(value, y, size, color = cream, font = 'Georgia, serif', weight = 400) {
    c.fillStyle = color; c.textAlign = 'center'; c.font = weight + ' ' + size * u + 'px ' + font; c.fillText(value, cx, y, w - 90 * u);
  }
  for (let i = 0; i < 65; i++) {
    const x = (i * 167.39 + 65) % w, y = h * .29 + ((i * 53.71) % (h * .33));
    c.globalAlpha = .25 + .4 * (1 + Math.sin(t * .7 + i * 2)) / 2;
    if (i % 11 === 0) { line(x - 4 * u, y, x + 4 * u, y, gold); line(x, y - 4 * u, x, y + 4 * u, gold); }
    else circle(x, y, .9 * u, cream);
  }
  c.globalAlpha = 1;
  const moonX = w * .73, moonY = h * .365 - at(0, 18) * 26 * u;
  circle(moonX, moonY, 67 * u, gold);
  for (let i = 1; i < 7; i++) { const dy = (i * 16 - 64) * u, dx = Math.sqrt(Math.max(0, (67 * u) ** 2 - dy ** 2)); line(moonX - dx, moonY + dy, moonX + dx, moonY + dy, '#c79d72'); }
  // Depth revision: the distant moon holds while the camera moves toward the reunion.
  const arrival=at(15,5), camera=1+arrival*.38, focus=cx+arrival*(portrait?145:190)*u;
  c.save();c.translate(cx,rail-100*u);c.scale(camera,camera);c.translate(-focus,-rail+100*u);
  const slowing = Math.min(4, Math.max(0, t - 16));
  const travel = t < 16 ? t : 16 + slowing - slowing ** 2 / 8;
  function mountains(base, height, period, speed, fill) {
    const shift = travel * speed * u % (period * 2);
    c.fillStyle = fill; c.beginPath(); c.moveTo(-period, h);
    for (let i = -1; i < Math.ceil(w / period) + 2; i++) {
      const x = i * period - shift, peak = base - height * (i % 2 === 0 ? .85 : 1);
      c.lineTo(x, base); c.lineTo(x + period * .36, peak); c.lineTo(x + period * .58, peak + height * .34); c.lineTo(x + period, base);
    }
    c.lineTo(w + period, h); c.closePath(); c.fill();
  }
  mountains(rail - 15 * u, 183 * u, 330 * u, 5, '#426371');
  mountains(rail + 36 * u, 126 * u, 275 * u, 13, '#284955');
  mountains(rail + 75 * u, 100 * u, 230 * u, 25, '#173743');
  c.fillStyle = '#101f31'; c.fillRect(0, rail + 3 * u, w, h - rail);
  const bridgeShift = travel * 50 * u % (150 * u);
  for (let i = -1; i < Math.ceil(w / (150 * u)) + 2; i++) {
    const x = i * 150 * u - bridgeShift;
    c.fillStyle = '#294b56'; c.beginPath(); c.moveTo(x + 22 * u, h); c.lineTo(x + 22 * u, rail + 92 * u); c.arc(x + 75 * u, rail + 92 * u, 53 * u, Math.PI, 0); c.lineTo(x + 128 * u, h); c.fill();
    line(x + 12 * u, rail + 20 * u, x + 138 * u, rail + 20 * u, '#42616b');
  }
  c.save();c.globalAlpha=.22;
  for(let i=0;i<50;i++){const xx=(i*79.7+travel*9*u)%(w+50*u)-25*u,yy=rail+(105+i%5*14)*u;line(xx,yy,xx+(8+i%6*4)*u,yy,'#d9b586',1);}
  c.restore();
  line(0, rail, w, rail, gold, 4); line(0, rail + 9 * u, w, rail + 9 * u, '#a27d58', 2);
  // A station glides into view as the train slows. The lantern has stayed lit.
  const arrive = at(15, 5), station = cx + (portrait ? 260 : 260) * u + (1 - arrive) * w;
  c.save(); c.translate(station, rail);
  c.fillStyle = '#bb805c'; c.fillRect(-25 * u, -105 * u, 92 * u, 105 * u);
  c.fillStyle = '#ebc58b'; c.beginPath(); c.moveTo(-44 * u, -105 * u); c.lineTo(22 * u, -150 * u); c.lineTo(88 * u, -105 * u); c.fill();
  c.fillStyle = '#294655'; c.fillRect(5 * u, -81 * u, 30 * u, 56 * u);
  c.fillStyle = '#fff0cd'; c.fillRect(-16 * u, -120 * u, 78 * u, 19 * u);
  c.fillStyle = '#284558'; c.font = '600 ' + 10 * u + 'px Arial'; c.textAlign = 'center'; c.fillText('HOME', 23 * u, -106 * u);
  const personX = -64 * u, wave = at(19, 1) * Math.sin(t * 7) * 10 * u;
  circle(personX, -58 * u, 10 * u, cream);
  c.fillStyle = '#bb6751'; c.beginPath(); c.moveTo(personX, -48 * u); c.lineTo(personX - 13 * u, -16 * u); c.lineTo(personX + 13 * u, -16 * u); c.fill();
  line(personX - 6 * u, -17 * u, personX - 7 * u, -2 * u, gold, 4);
  line(personX + 6 * u, -17 * u, personX + 8 * u, -2 * u, gold, 4);
  line(personX, -42 * u, personX - 24 * u, -49 * u + wave, cream, 4);
  const glow = c.createRadialGradient(personX - 27 * u, -35 * u + wave, 0, personX - 27 * u, -35 * u + wave, 56 * u);
  glow.addColorStop(0, '#ffe9a866'); glow.addColorStop(1, '#ffe9a800');
  c.fillStyle = glow; c.fillRect(personX - 84 * u, -92 * u + wave, 114 * u, 114 * u);
  line(personX - 27 * u, -48 * u + wave, personX - 27 * u, -39 * u + wave, gold, 2);
  c.fillStyle = cream; c.fillRect(personX - 33 * u, -39 * u + wave, 12 * u, 15 * u);
  c.restore();
  const enter = at(0, 4.5), stop = at(16, 4);
  const trainX = -470 * u + (cx - 30 * u + 470 * u) * enter + stop * (portrait ? 116 : 80) * u;
  c.save(); c.translate(trainX, rail - 8 * u); c.scale(u * (portrait ? .84 : 1), u * (portrait ? .84 : 1)); c.translate(0, Math.sin(t * 13) * .8 * (1 - stop));
  function wheel(x) {
    circle(x, -3, 17, '#0c1928'); circle(x, -3, 10, '#967f65'); const a = travel * 5;
    line(x - Math.cos(a) * 10, -3 - Math.sin(a) * 10, x + Math.cos(a) * 10, -3 + Math.sin(a) * 10, cream, 1.5);
  }
  for (const x of [-305, -230, -164, -89, -18, 54]) wheel(x);
  c.fillStyle = '#b75d48'; c.beginPath(); c.roundRect(-335, -80, 250, 64, 7); c.fill();
  c.fillStyle = '#d39a68'; c.fillRect(-335, -83, 250, 9); c.fillStyle = gold;
  for (let i = 0; i < 7; i++) {
    c.fillRect(-320 + i * 33, -68, 23, 31);
    if (i % 2 === 0) { c.fillStyle = '#755246'; circle(-309 + i * 33, -50, 4, '#755246'); c.fillRect(-314 + i * 33, -46, 10, 9); c.fillStyle = gold; }
  }
  c.fillStyle = '#d6a870'; c.beginPath(); c.roundRect(-77, -72, 152, 55, [3, 29, 4, 3]); c.fill();
  c.fillStyle = '#bd7151'; c.fillRect(-76, -107, 53, 45); c.fillStyle = gold; c.fillRect(-84, -113, 69, 8);
  c.fillStyle = '#ffdf9c'; c.fillRect(-66, -97, 29, 25);
  // The driver notices the lantern and waves back.
  circle(-51, -87, 6, '#755246');
  c.fillStyle = '#755246'; c.fillRect(-57, -81, 13, 11);
  if (t > 19) line(-42, -78, -26, -91 + Math.sin(t * 7) * 7, cream, 3);
  c.fillStyle = '#243849'; c.fillRect(29, -92, 17, 24); c.fillRect(23, -97, 29, 7);
  line(-70, -29, 66, -29, cream, 2); circle(70, -51, 8, cream);
  c.save(); c.globalAlpha = .16; c.fillStyle = cream; c.beginPath(); c.moveTo(80, -51); c.lineTo(230, -83); c.lineTo(230, -9); c.fill(); c.restore();
  for (let i = 0; i < 8; i++) { const age = (t * .8 + i / 8) % 1; c.globalAlpha = .33 * (1 - age) * enter; circle(36 - age * 135, -108 - age * 125, 9 + age * 24, '#d9d7ba'); }
  c.globalAlpha = 1; c.restore();
  const shift = travel * 92 * u % (182 * u);
  for (let i = -1; i < Math.ceil(w / (182 * u)) + 1; i++) {
    const x = i * 182 * u - shift;
    c.strokeStyle = '#0b1729'; c.lineWidth = 4 * u; c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + 16 * u, h - 80 * u, x + 47 * u, h - 113 * u); c.stroke();
  }
  c.restore();
  c.strokeStyle = gold; c.lineWidth = 1.2 * u; c.strokeRect(25 * u, 25 * u, w - 50 * u, h - 50 * u); c.strokeRect(31 * u, 31 * u, w - 62 * u, h - 62 * u);
  text('MOONRISE', h * .145, portrait ? 67 : 69, cream, 'Georgia, serif', 600);
  text('E X P R E S S', h * .23, portrait ? 35 : 32, gold, 'Arial, sans-serif');
  line(w * .18, h * .267, w * .82, h * .267, gold);
  text(t < 5 ? 'SOMEONE LEFT A LIGHT ON' : t < 19 ? 'THE LAST TRAIN IS ON ITS WAY' : 'HOME IS WHO IS WAITING', h * .865, portrait ? 15 : 17, cream, 'Arial, sans-serif', 500);
  text('A LOOPLILT SHORT STORY', h * .925, 12, gold, 'ui-monospace, monospace');
}

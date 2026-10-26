// Pocket greenhouse: a small paper world drawn entirely with Canvas paths.
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720;
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const at = (start, duration) => ease((t - start) / duration);
  const ink = '#263e32', paper = '#f5efde', coral = '#e78561', leaf = '#688b54';
  const circle = (x, y, r, fill) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  function label(text, x, y, size, color = ink, weight = 500) {
    c.fillStyle = color; c.font = `${weight} ${size * u}px Georgia, serif`; c.textAlign = 'center'; c.fillText(text, x, y);
  }
  function oval(x, y, rx, ry, color, angle = 0) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = paper; c.fillRect(0, 0, w, h);
  // Fixed flecks give the paper a tactile surface without time-dependent randomness.
  c.fillStyle = '#b8aa8a';
  for (let i = 0; i < 620; i++) {
    c.globalAlpha = 0.12 + (i % 3) * 0.03;
    c.fillRect((i * 139.13) % w, (i * 61.71) % h, u * 1.2, u * 1.2);
  }
  c.globalAlpha = 1;
  c.strokeStyle = '#d7ceaf'; c.lineWidth = 1.5 * u;
  c.strokeRect(28 * u, 28 * u, w - 56 * u, h - 56 * u);
  label('A SMALL EXPERIMENT IN POSSIBILITY', w / 2, h * 0.105, 13, '#6c7961', 600);
  label('Pocket greenhouse', w / 2, h * 0.19, portrait ? 43 : 54, ink, 600);
  const stageX = w / 2, stageY = portrait ? h * 0.60 : h * 0.65;
  c.save(); c.translate(stageX, stageY); c.scale(u, u);
  // Paper landscape and folded stage.
  c.fillStyle = '#e6ddc4'; c.beginPath(); c.moveTo(-335, 65); c.quadraticCurveTo(-120, -4, 0, 70); c.quadraticCurveTo(185, 6, 335, 70); c.lineTo(335, 130); c.lineTo(-335, 130); c.closePath(); c.fill();
  c.fillStyle = '#cdd6b9'; c.beginPath(); c.moveTo(-335, 102); c.quadraticCurveTo(-130, 28, 30, 108); c.quadraticCurveTo(165, 51, 335, 110); c.lineTo(335, 160); c.lineTo(-335, 160); c.closePath(); c.fill();
  oval(5, 123, 142, 17, '#b5bc9c');
  // The sun rises as the seed opens.
  const sun = at(3.5, 4);
  c.save(); c.translate(235, -75 - sun * 115); c.rotate(t * 0.06);
  for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = '#e3b355'; c.fillRect(-2, -55, 4, 13); }
  circle(0, 0, 34, '#f1c76d'); circle(-9, -4, 2.5, ink); circle(9, -4, 2.5, ink);
  c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 12, 0.3, Math.PI - 0.3); c.stroke(); c.restore();
  // A terracotta pot assembled from four distinct pieces of paper.
  c.fillStyle = coral; c.beginPath(); c.moveTo(-86, 10); c.lineTo(86, 10); c.lineTo(65, 115); c.lineTo(-64, 115); c.closePath(); c.fill();
  c.fillStyle = '#c96c4e'; c.beginPath(); c.moveTo(47, 10); c.lineTo(86, 10); c.lineTo(65, 115); c.lineTo(25, 115); c.closePath(); c.fill();
  c.fillStyle = '#eea17b'; c.fillRect(-96, -8, 192, 29);
  oval(0, -8, 96, 18, '#87583a'); oval(0, -11, 87, 12, '#4c4730');
  for (let i = 0; i < 18; i++) circle(-78 + i * 9, -9 + Math.sin(i * 7) * 6, 1.7, '#aa8b57');
  // Seed falls, then disappears into the soil.
  const fall = at(0.6, 1.2);
  if (t < 2.15) {
    c.save(); c.translate(-30 + fall * 30, -195 + fall * 182); c.rotate(0.5 + fall * 1.5); c.globalAlpha = 1 - at(1.8, 0.35);
    oval(0, 0, 10, 16, '#ad754a'); c.strokeStyle = '#e4bb83'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.quadraticCurveTo(-5, 0, 0, 11); c.stroke(); c.restore();
  }
  // The raincloud moves through, with staggered falling drops.
  const cloudAlpha = at(1.8, 0.6) * (1 - at(5, 0.8));
  if (cloudAlpha > 0) {
    c.save(); c.globalAlpha = cloudAlpha; const x = -185 + at(2, 2) * 70, y = -240;
    circle(x - 38, y, 26, '#c9d5d3'); circle(x, y - 16, 34, '#dae3df'); circle(x + 34, y, 24, '#c9d5d3');
    c.fillStyle = '#c9d5d3'; c.fillRect(x - 40, y, 76, 22);
    for (let i = 0; i < 13; i++) {
      const drop = ((t * 0.85 + i * 0.163) % 1);
      c.strokeStyle = '#6298a0'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
      c.moveTo(x - 22 + (i % 5) * 14 + drop * 70, y + 35 + drop * 170); c.lineTo(x - 18 + (i % 5) * 14 + drop * 70, y + 44 + drop * 170); c.stroke();
    }
    c.restore();
  }
  const grow = at(4, 4.3), top = -14 - grow * 213, sway = Math.sin(t * 1.7) * grow * 5;
  c.strokeStyle = '#4c7544'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -13); c.bezierCurveTo(-10, -65, 10 + sway, top + 55, sway, top); c.stroke();
  function foliage(x, y, angle, amount) {
    c.save(); c.translate(x, y); c.rotate(angle); c.scale(amount, amount);
    c.fillStyle = leaf; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(15, -55, 69, -39, 78, -62); c.bezierCurveTo(88, -3, 31, 18, 0, 0); c.fill();
    c.strokeStyle = '#b5c58a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(3, -2); c.quadraticCurveTo(38, -17, 70, -50); c.stroke(); c.restore();
  }
  foliage(0, -52, -0.1 + sway * 0.01, at(4.8, 1.8));
  foliage(-1, -93, Math.PI + 0.42 - sway * 0.01, at(5.7, 1.7));
  foliage(2, -147, 0.1, at(6.4, 1.6) * 0.75);
  const bloom = at(8.1, 2.2);
  c.save(); c.translate(sway, top); c.scale(bloom, bloom); c.rotate(Math.sin(t) * 0.025);
  for (let i = 0; i < 9; i++) { c.rotate(Math.PI * 2 / 9); oval(0, -32, 17, 35, i % 2 ? '#f4ba88' : '#e99b6e'); }
  circle(0, 0, 24, '#d8a343'); circle(0, 0, 18, '#594d32');
  for (let i = 0; i < 18; i++) circle(Math.cos(i * 2.4) * Math.sqrt(i) * 3.5, Math.sin(i * 2.4) * Math.sqrt(i) * 3.5, 1.4, '#edcf75');
  c.restore();
  // One tiny visitor makes a looping flight past the bloom.
  if (t > 10) {
    const arrival = at(10, 2), x = 350 * (1 - arrival) + 95 + Math.sin(t * 1.7) * 35, y = -210 + Math.sin(t * 2.2) * 22;
    oval(x - 4, y - 12, 7, 13, '#fffaf0', -0.5 + Math.sin(t * 30) * 0.4); oval(x + 8, y - 13, 7, 12, '#fffaf0', 0.5);
    oval(x, y, 16, 10, '#e1b23e'); c.fillStyle = ink; c.fillRect(x - 4, y - 8, 5, 16); circle(x + 12, y - 1, 3, ink);
    c.strokeStyle = '#9a9b7d'; c.lineWidth = 1; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(x + 30, y + 4); c.bezierCurveTo(x + 90, y + 28, x + 45, y + 50, x + 102, y + 66); c.stroke(); c.setLineDash([]);
  }
  // A little plant label completes the physical scene.
  c.save(); c.translate(-177, 45); c.rotate(-0.12); c.fillStyle = '#aa8660'; c.fillRect(-3, -26, 6, 104); c.fillStyle = '#fff9e8'; c.fillRect(-49, -61, 98, 44); c.fillStyle = ink; c.font = '13px monospace'; c.textAlign = 'center'; c.fillText('DAY ' + String(Math.min(7, 1 + Math.floor(t / 2.1))).padStart(2, '0'), 0, -34); c.restore();
  c.restore();
  const phase = t < 3 ? '01 / PLANT A POSSIBILITY' : t < 8 ? '02 / GIVE IT A LITTLE CARE' : '03 / LET SOMETHING GOOD GROW';
  label(phase, w / 2, portrait ? h * 0.79 : h * 0.89, 12, '#53654c', 600);
  c.fillStyle = '#79916b'; c.fillRect(w * 0.3, h * 0.945, w * 0.4 * (t / 16), 2 * u);
}

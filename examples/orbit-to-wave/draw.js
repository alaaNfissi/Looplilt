// One circle, two views: the vertical coordinate of an orbit traces a sine wave.
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720, tau = Math.PI * 2;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ink = '#edf5e9', mint = '#b9d991', orange = '#ef9467';
  c.fillStyle = '#172824'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#284138'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 36 * u) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += 36 * u) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  function text(str, x, y, size, color = ink, align = 'center', weight = 500) { c.fillStyle = color; c.font = `${weight} ${size * u}px system-ui, sans-serif`; c.textAlign = align; c.fillText(str, x, y); }
  function line(x1, y1, x2, y2, color, width = 2) { c.strokeStyle = color; c.lineWidth = width * u; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function dot(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, tau); c.fill(); }
  text('THE GEOMETRY OF A GOOD LOOP', w / 2, h * 0.105, 12, '#9ab899', 'center', 600);
  text('One motion. Two views.', w / 2, h * 0.19, portrait ? 39 : 51, ink, 'center', 650);
  const cx = portrait ? w / 2 : w * 0.255, cy = portrait ? h * 0.39 : h * 0.49;
  const r = (portrait ? 138 : 137) * u;
  const start = portrait ? w * 0.14 : w * 0.48, end = w * 0.89, baseline = portrait ? h * 0.68 : cy;
  const span = end - start, amp = portrait ? 85 * u : r;
  const motionTime = Math.max(0, t - 0.8), angle = motionTime * tau / 5;
  const x = cx + r * Math.cos(angle), y = cy - r * Math.sin(angle);
  line(cx - r - 24 * u, cy, cx + r + 24 * u, cy, '#4e695a', 1);
  line(cx, cy - r - 24 * u, cx, cy + r + 24 * u, '#4e695a', 1);
  c.strokeStyle = '#729773'; c.lineWidth = 2 * u; c.beginPath(); c.arc(cx, cy, r, 0, tau); c.stroke();
  // A shaded sector makes the changing angle visible.
  c.fillStyle = '#b9d99118'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, 0, -angle, true); c.closePath(); c.fill();
  line(cx, cy, x, y, mint, 4); line(x, cy, x, y, orange, 5);
  dot(cx, cy, 5 * u, mint); dot(x, y, 11 * u, orange); dot(x, y, 4 * u, '#fff3d5');
  c.save(); c.setLineDash([5 * u, 7 * u]); line(x, y, cx, y, '#96ac88', 1.5); c.restore();
  // The displayed trace uses the same sine function as the orbit.
  const reveal = smooth((t - 2) / 1.2), cycles = 2;
  c.save(); c.globalAlpha = reveal;
  line(start, baseline, end + 12 * u, baseline, '#78917d', 1.5);
  line(start, baseline - amp - 18 * u, start, baseline + amp + 18 * u, '#78917d', 1.5);
  for (let i = 0; i <= 4; i++) {
    const gx = start + span * i / 4;
    line(gx, baseline - amp, gx, baseline + amp, '#365347', 1);
    text(['0', 'π', '2π', '3π', '4π'][i], gx, baseline + amp + 29 * u, 12, '#a8baa1');
  }
  c.strokeStyle = mint; c.lineWidth = 3.5 * u; c.lineJoin = 'round'; c.beginPath();
  for (let i = 0; i <= 360; i++) {
    const px = start + span * i / 360, py = baseline - Math.sin(angle - i / 360 * tau * cycles) * amp;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.stroke();
  const sampleY = baseline - Math.sin(angle) * amp;
  dot(start, sampleY, 9 * u, orange);
  c.setLineDash([5 * u, 8 * u]); c.strokeStyle = orange; c.lineWidth = 1.5 * u;
  c.beginPath(); c.moveTo(x, y);
  if (portrait) c.bezierCurveTo(w * 0.06, y, w * 0.06, sampleY, start, sampleY); else c.lineTo(start, sampleY);
  c.stroke(); c.restore();
  text('CIRCULAR MOTION', cx, cy + r + 55 * u, 11, '#a8baa1', 'center', 650);
  if (!portrait) text('THE HEIGHT, OVER TIME', start + span / 2, baseline + amp + 67 * u, 11, '#a8baa1', 'center', 650);
  const labelY = portrait ? h * 0.845 : h * 0.79;
  const chipW = 290 * u, chipH = 48 * u;
  c.fillStyle = '#263f34'; c.beginPath(); c.roundRect((w - chipW) / 2, labelY - 33 * u, chipW, chipH, 9 * u); c.fill();
  text(`y = sin(θ)  =  ${Math.sin(angle).toFixed(2)}`, w / 2, labelY - 2 * u, 19, mint);
  text(t < 5 ? 'Follow the orange point.' : t < 10 ? 'Keep its height. Let time move sideways.' : 'A wave is a circle, remembered.', w / 2, portrait ? h * 0.92 : h * 0.91, 16, '#d2dfc9');
  c.fillStyle = orange; c.fillRect(w * 0.1, h * 0.96, w * 0.8 * t / 16, 2 * u);
}

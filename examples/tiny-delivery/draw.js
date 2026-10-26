// A pixel courier, a tiny parcel, and a door with one surprisingly fussy rule.
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const at = (s, d) => smooth((t - s) / d);
  const navy = '#182a37', cream = '#f7e6bf', mint = '#9fc8ad', orange = '#ec936d';
  c.fillStyle = navy; c.fillRect(0, 0, w, h);
  function rect(x, y, bw, bh, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.ceil(bw), Math.ceil(bh)); }
  function text(str, x, y, size, color = cream, align = 'center') { c.fillStyle = color; c.font = `700 ${size * u}px ui-monospace, Consolas, monospace`; c.textAlign = align; c.fillText(str, x, y); }
  text('A VERY SMALL DELIVERY SERVICE', w / 2, h * 0.105, 12, mint);
  text('Tiny delivery.', w / 2, h * 0.185, portrait ? 45 : 60);
  const stageW = 580, scale = u * (portrait ? 1 : 1.4), left = w / 2 - stageW * scale / 2;
  const floorY = portrait ? h * 0.65 : h * 0.69;
  c.save(); c.translate(left, floorY); c.scale(scale, scale);
  // A miniature city built from an original arrangement of rectangles.
  for (let i = 0; i < 9; i++) {
    const x = i * 70 - 10, top = -130 - (i * 37 % 80);
    rect(x, top, 50, -top, i % 2 ? '#284352' : '#223b49');
    for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) rect(x + 8 + col * 13, top + 15 + row * 24, 5, 8, (i + row + col) % 4 === 0 ? '#b8a36a' : '#395664');
  }
  for (let i = 0; i < 21; i++) rect((i * 73) % 570, -240 - (i * 31) % 78, 2, 2, '#b5c8c4');
  rect(-15, 0, 610, 12, '#668078'); rect(-15, 12, 610, 8, '#314b48');
  for (let i = 0; i < 23; i++) rect(-10 + i * 27, 35, 14, 3, '#405a55');
  // Destination: a warm doorway and an electronic parcel scanner.
  rect(437, -157, 116, 157, '#6f8e81'); rect(448, -146, 94, 146, '#a9c6a7');
  const open = at(10.8, 0.55);
  rect(458, -135, 74, 135, '#162d31'); rect(458 + open * 64, -135, 74 * (1 - open), 135, '#e8c58c');
  if (open < 0.95) rect(516 + open * 4, -66, 5, 7, '#855d43');
  rect(418, -93, 17, 25, '#c5cfab'); rect(422, -87, 9, 7, t > 10.5 ? '#a0e2ae' : '#e9916a');
  // Courier walk, stop, inspect, turn the box, and deliver.
  const approach = at(0.4, 3), leave = at(11.5, 1.8), x = 45 + approach * 297 + leave * 105;
  const walking = t < 3.4 || t > 11.5 && t < 13.3;
  const step = walking ? Math.sin(t * 16) : 0;
  const bob = walking ? Math.abs(step) * 3 : Math.sin(t * 2) * 0.4;
  const vanish = 1 - at(12.7, 0.7);
  c.save(); c.globalAlpha = vanish; c.translate(x, -bob);
  rect(-5, -7, 60, 7, '#10232b');
  const palette = { a: '#a9d2b0', b: '#6c9e92', c: '#e8efce', d: '#203944', e: '#eaa16c' };
  const sprite = [
    '....ee....', '.....e....', '..aaaaaa..', '.abbbbbba.', '.abccbcba.', '.abddbdba.', '.abbbbbba.', '..aaaaaa..',
    '...bbbb...', '..bbbbbb..', '.abbbbbb a'.replaceAll(' ', ''), '.abbeebba.', '..bbbbbb..', '...b..b...', '...b..b...'
  ];
  for (let row = 0; row < sprite.length; row++) for (let col = 0; col < sprite[row].length; col++) {
    const color = palette[sprite[row][col]];
    if (color) rect(col * 4, -72 + row * 4, 4, 4, color);
  }
  rect(8 + step * 4, -12, 12, 8, mint); rect(25 - step * 4, -12, 12, 8, mint);
  // The box starts sideways. The arrow rotates upward at the punchline.
  c.save(); c.translate(49, -37); c.rotate(-Math.PI / 2 * (1 - at(8.2, 1)));
  rect(-14, -14, 28, 28, orange); rect(-14, -14, 28, 4, '#f4bd8c'); rect(-2, -14, 4, 28, '#c77a55');
  rect(-7, -7, 14, 14, cream); rect(-1, -4, 2, 10, navy); rect(-4, -1, 8, 2, navy); rect(-2, -3, 4, 2, navy);
  c.restore(); c.restore();
  // Speech bubbles are brief supporting beats; the physical box turn carries the joke.
  const bubble = t < 3.6 ? '' : t < 6.4 ? 'ACCESS DENIED' : t < 8.4 ? 'THIS WAY UP?' : t < 10.6 ? '...oh.' : t < 12.5 ? 'WELCOME!' : '';
  if (bubble) {
    const bx = 323, by = -129;
    rect(bx - 65, by - 28, 130, 36, cream); rect(bx + 32, by + 8, 9, 8, cream);
    c.fillStyle = navy; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillText(bubble, bx, by - 6);
  }
  if (t >= 13) {
    c.globalAlpha = at(13, 0.5);
    for (let i = 0; i < 28; i++) { const p = (t - 13) / 3; rect(470 + Math.sin(i * 2.7) * p * 110, -85 - Math.cos(i * 1.8) * p * 95 + p * p * 30, 4, 5, [mint, cream, orange][i % 3]); }
    c.globalAlpha = 1;
  }
  c.restore();
  text(t < 3.5 ? 'One robot. One parcel. Easy, right?' : t < 8.2 ? 'Some doors have standards.' : t < 13 ? 'A fresh perspective changes everything.' : 'DELIVERED. DIGNITY: PENDING.', w / 2, portrait ? h * 0.78 : h * 0.85, portrait ? 15 : 18, cream);
  const barW = 170 * u, y = portrait ? h * 0.86 : h * 0.92;
  rect(w / 2 - barW / 2, y, barW, 6 * u, '#37544f'); rect(w / 2 - barW / 2, y, barW * t / 16, 6 * u, orange);
  text('LOOPLILT / FIELD NOTES 003', w / 2, h * 0.97, 10, '#779b94');
}

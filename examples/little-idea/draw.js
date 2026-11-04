// A little idea: original artwork, timing, and score for Looplilt.
const colors = { ink: '#102d29', paper: '#f5f0e6', spring: '#d5ed74', apricot: '#ff956f', lilac: '#b9aedb' };
const orbitPeriod = 3;
function drawFrame({ ctx: c, w, h, t, portrait }) {
  const u = Math.min(w, h) / 720, tau = Math.PI * 2, cx = w / 2, ground = h * (portrait ? .66 : .73);
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const at = (s, d) => ease((t - s) / d);
  function dot(x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, tau); c.fill(); }
  function oval(x, y, rx, ry, fill, rotation = 0) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, tau); c.fill(); }
  function line(x1, y1, x2, y2, color, width = 1) { c.strokeStyle = color; c.lineWidth = width * u; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function text(str, x, y, size, color = colors.ink, font = 'Georgia, serif', weight = 400) {
    c.fillStyle = color; c.textAlign = 'center'; c.font = weight + ' ' + size * u + 'px ' + font; c.fillText(str, x, y, w - 96 * u);
  }
  function paper(fill = colors.paper, dark = false) {
    c.fillStyle = fill; c.fillRect(0, 0, w, h);
    c.save(); c.globalAlpha *= .16; c.fillStyle = dark ? '#b5c7ac' : '#b2aa8c';
    for (let i = 0; i < 500; i++) c.fillRect((i * 137.41) % w, (i * 83.17) % h, u, u);
    c.restore(); c.strokeStyle = dark ? '#38524a' : '#d4d4bd'; c.lineWidth = u; c.strokeRect(24 * u, 24 * u, w - 48 * u, h - 48 * u);
  }
  function heading(kicker, title, dark = false) {
    text(kicker, cx, h * .115, 12, dark ? colors.spring : '#53675b', 'Arial, sans-serif', 600);
    text(title, cx, h * .205, portrait ? 49 : 59, dark ? colors.paper : colors.ink, 'Georgia, serif', 600);
  }
  function chip(value, dark = false) {
    const bw = Math.min(w - 96 * u, 350 * u), y = h * .88;
    c.fillStyle = dark ? '#24473e' : '#e5e8d5'; c.beginPath(); c.roundRect(cx - bw / 2, y - 28 * u, bw, 42 * u, 8 * u); c.fill();
    text(value, cx, y, 16, dark ? colors.spring : colors.ink, 'ui-monospace, Consolas, monospace', 500);
  }
  function face(x, y, r, color = colors.ink, tilt = 0) {
    c.save(); c.translate(x, y); c.rotate(tilt); dot(0, 0, r, color);
    const blink = Math.sin(t * 2.7) > .995 ? .14 : 1;
    oval(-r * .29, -r * .1, r * .115, r * .18 * blink, colors.paper);
    oval(r * .29, -r * .1, r * .115, r * .18 * blink, colors.paper); c.restore();
  }
  function intro() {
    paper(); heading('A LOOPLILT LITTLE FILM', 'One small idea.');
    const p = ease(t / 2.3), x = w * .18 + (cx - w * .18) * p;
    const hop = Math.abs(Math.sin(Math.min(t, 2.3) * Math.PI / .77)) * (1 - p) * 118 * u;
    line(w * .12, ground + 2 * u, w * .88, ground + 2 * u, '#bcc4ae', 2);
    c.save(); c.strokeStyle = '#98ac92'; c.lineWidth = 2 * u; c.setLineDash([4 * u, 8 * u]);
    c.beginPath(); c.arc(cx, ground - 34 * u, 47 * u, 0, tau); c.stroke(); c.restore();
    oval(x, ground + 6 * u, (34 - hop / u * .1) * u, 6 * u, '#102d2920');
    face(x, ground - 35 * u - hop, 35 * u, colors.ink, (1 - p) * Math.sin(t * 6) * .18);
    c.save(); c.globalAlpha *= .45 * (1 - p); c.strokeStyle = '#7f9677'; c.lineWidth = 1.5 * u; c.setLineDash([2 * u, 7 * u]);
    c.beginPath(); c.moveTo(w * .17, ground - 50 * u); c.quadraticCurveTo(w * .29, ground - 260 * u, cx, ground - 50 * u); c.stroke(); c.restore();
    for (let i = 0; i < 11; i++) line(w * .18 + i * w * .064, ground + 20 * u, w * .18 + i * w * .064, ground + (i % 5 === 0 ? 32 : 26) * u, '#a6b49b');
    text('It had other plans.', cx, h * .87, 20, '#53675b');
  }
  function flower() {
    paper(); heading('01 / A DRAWING YOU CAN CHANGE', 'A different feeling.');
    const grow = at(3.3, 2.7), breeze = Math.sin(t * 1.6) * 9 * u * grow, top = ground - 35 * u - grow * 205 * u;
    const petal = t < 7.3 ? colors.apricot : colors.lilac;
    c.fillStyle = '#e1e4cf'; c.beginPath(); c.moveTo(w * .1, ground + 65 * u); c.quadraticCurveTo(w * .27, ground - 20 * u, cx, ground + 40 * u); c.quadraticCurveTo(w * .75, ground - 15 * u, w * .9, ground + 58 * u); c.lineTo(w * .9, ground + 86 * u); c.lineTo(w * .1, ground + 86 * u); c.fill();
    oval(cx, ground + 6 * u, 92 * u, 10 * u, '#c8d0b6');
    c.strokeStyle = '#52745e'; c.lineWidth = 8 * u; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, ground); c.bezierCurveTo(cx - 16 * u, ground - 75 * u, cx + 15 * u + breeze, top + 45 * u, cx + breeze, top); c.stroke();
    for (let i = 0; i < 3; i++) {
      const leaf = ease((t - 4 - i * .45) / 1.2), side = i % 2 ? -1 : 1;
      c.save(); c.translate(cx, ground - (55 + i * 48) * u); c.scale(leaf * u * side, leaf * u); c.rotate(-.18 + Math.sin(t + i) * .05);
      c.fillStyle = i === 1 ? '#78966c' : '#a4b987'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(30, -59, 83, -50, 98, -56); c.bezierCurveTo(91, -6, 28, 20, 0, 0); c.fill();
      c.strokeStyle = '#edf0d8'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(3, -1); c.quadraticCurveTo(49, -20, 85, -47); c.stroke(); c.restore();
    }
    c.save(); c.translate(cx + breeze, top); c.rotate(Math.sin(t) * .03);
    for (let i = 0; i < 10; i++) {
      const unfold = ease((t - 4.2 - i * .06) / 1.6);
      c.save(); c.rotate(i * tau / 10); c.scale(unfold, unfold);
      oval(3 * u, -54 * u, 22 * u, 52 * u, '#102d290e', .06); oval(0, -58 * u, 22 * u, 50 * u, i % 2 ? petal : colors.paper);
      c.strokeStyle = petal; c.lineWidth = 2.5 * u; c.beginPath(); c.ellipse(0, -58 * u, 22 * u, 50 * u, 0, 0, tau); c.stroke();
      line(0, -45 * u, 0, -85 * u, '#ffffff66', 1.2); c.restore();
    }
    face(0, 0, 35 * u, colors.ink, Math.sin(t) * .06); c.restore();
    chip('petal = "' + petal + '"'); dot(cx + 195 * u, h * .88 - 7 * u, 12 * u, petal);
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4 + t * .18, r = (136 + i * 9) * u;
      c.save(); c.globalAlpha *= at(4.2, 2.1) * .6; dot(cx + breeze + Math.cos(a) * r, top + Math.sin(a) * r * .8, (2 + i % 2) * u, '#94a67d'); c.restore();
    }
  }
  function orbit() {
    paper(colors.ink, true); heading('02 / TIME YOU CAN REASON ABOUT', 'Give it a rhythm.', true);
    c.save(); c.globalAlpha *= .5;
    for (let x = 60 * u; x < w; x += 40 * u) line(x, h * .28, x, h * .8, '#254b40');
    for (let y = h * .28; y < h * .8; y += 40 * u) line(60 * u, y, w - 60 * u, y, '#254b40'); c.restore();
    const ox = portrait ? cx : w * .28, oy = portrait ? h * .405 : h * .51, r = 128 * u, a = (t - 9.7) * tau / orbitPeriod;
    c.strokeStyle = '#789883'; c.lineWidth = 2 * u; c.beginPath(); c.arc(ox, oy, r, 0, tau); c.stroke();
    for (let i = 0; i < 36; i++) {
      const angle = i * tau / 36;
      line(ox + Math.cos(angle) * (r + 10 * u), oy + Math.sin(angle) * (r + 10 * u), ox + Math.cos(angle) * (r + (i % 3 ? 15 : 21) * u), oy + Math.sin(angle) * (r + (i % 3 ? 15 : 21) * u), '#6b8c78');
    }
    const x = ox + Math.cos(a) * r, y = oy - Math.sin(a) * r;
    line(ox, oy, x, y, colors.spring, 2); dot(ox, oy, 5 * u, colors.spring); face(x, y, 23 * u, colors.apricot, a * .05);
    const start = portrait ? w * .17 : w * .51, end = w * .86, baseline = portrait ? h * .69 : oy, amp = portrait ? 60 * u : 104 * u;
    line(start, baseline, end, baseline, '#537664'); c.strokeStyle = colors.spring; c.lineWidth = 3 * u; c.beginPath();
    for (let i = 0; i <= 220; i++) {
      const px = start + (end - start) * i / 220, py = baseline - Math.sin(a - i / 220 * tau * 1.5) * amp;
      if (!i) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke(); const sy = baseline - Math.sin(a) * amp;
    c.save(); c.setLineDash([4 * u, 7 * u]); c.strokeStyle = colors.apricot; c.lineWidth = 1.5 * u; c.beginPath(); c.moveTo(x, y);
    if (portrait) c.bezierCurveTo(w * .08, y, w * .08, sy, start, sy); else c.lineTo(start, sy);
    c.stroke(); c.restore(); dot(start, sy, 7 * u, colors.apricot); chip('orbitPeriod = ' + orbitPeriod + ' seconds', true);
  }
  function kite() {
    paper('#e5e8d5'); heading('03 / A WORLD YOU CAN KEEP', 'Let it go somewhere.');
    const fly = at(15.3, 2.1), x = cx + Math.sin(t * .9) * 48 * u, y = (ground - 120 * u) * (1 - fly) + h * .44 * fly + Math.sin(t * 1.9) * 12 * u;
    for (let i = 0; i < 5; i++) {
      const cloudX = ((i * 239 + t * (10 + i * 2)) % (w / u + 180) - 90) * u, cloudY = h * (.34 + i * .09);
      c.save(); c.globalAlpha *= .45; oval(cloudX, cloudY, (52 + i * 5) * u, 12 * u, colors.paper); oval(cloudX - 15 * u, cloudY - 10 * u, 25 * u, 18 * u, colors.paper); c.restore();
    }
    c.strokeStyle = '#739184'; c.lineWidth = 2 * u; c.beginPath(); c.moveTo(x, y + 87 * u); c.bezierCurveTo(x + 120 * u, y + 180 * u, cx - 160 * u, ground + 26 * u, cx + 20 * u, ground + 45 * u); c.stroke();
    for (let i = 0; i < 3; i++) {
      c.save(); c.translate(x + Math.sin(t * 2 + i) * 25 * u, y + (115 + i * 37) * u); c.rotate(Math.sin(t + i) * .2); c.fillStyle = [colors.apricot, colors.lilac, '#87a68b'][i]; c.beginPath(); c.moveTo(-17 * u, -8 * u); c.lineTo(17 * u, 8 * u); c.lineTo(17 * u, -8 * u); c.lineTo(-17 * u, 8 * u); c.fill(); c.restore();
    }
    c.save(); c.translate(x, y); c.rotate(-.1 + Math.sin(t * 1.3) * .1);
    const points = [[0, -115], [87, -20], [0, 110], [-87, -20]], fills = [colors.lilac, colors.paper, colors.apricot, colors.spring];
    for (let i = 0; i < 4; i++) {
      c.fillStyle = fills[i]; c.beginPath(); c.moveTo(0, -20 * u); c.lineTo(points[i][0] * u, points[i][1] * u); c.lineTo(points[(i + 1) % 4][0] * u, points[(i + 1) % 4][1] * u); c.closePath(); c.fill();
    }
    line(0, -115 * u, 0, 110 * u, '#526e5c', 1.5); line(-87 * u, -20 * u, 87 * u, -20 * u, '#526e5c', 1.5); face(0, -20 * u, 23 * u); c.restore(); chip('drawFrame({ ctx, t })');
  }
  function ending() {
    paper(); const scale = (1.7 + (1 - at(20.2, .8)) * .25) * u, markY = h * (portrait ? .34 : .30);
    c.save(); c.translate(cx - 48 * scale, markY - 48 * scale); c.scale(scale, scale); c.strokeStyle = colors.ink; c.lineWidth = 13; c.lineCap = 'round';
    c.stroke(new Path2D('M27 20v36c0 13 10 23 23 23s23-10 23-23-10-23-23-23-23 10-23 23')); dot(74, 18, 7, colors.apricot); c.restore();
    text('Looplilt', cx, h * (portrait ? .505 : .52), portrait ? 76 : 83, colors.ink, 'Georgia, serif', 600);
    text('Small stories. Real motion.', cx, h * (portrait ? .58 : .63), portrait ? 24 : 27);
    c.save(); c.globalAlpha *= at(21.4, .6); text('Remix a film. Keep the source.', cx, h * .77, 20, '#53675b', 'Arial, sans-serif');
    text('looplilt.com', cx, h * .845, portrait ? 17 : 19, colors.ink, 'ui-monospace, Consolas, monospace', 500); c.restore();
    for (let i = 0; i < 3; i++) {
      c.save(); c.translate(cx + (i - 1) * 50 * u, h * .925); c.rotate((i - 1) * .14); c.fillStyle = [colors.apricot, colors.spring, colors.lilac][i]; c.fillRect(-10 * u, -10 * u, 20 * u, 20 * u); c.restore();
    }
  }
  const scenes = [intro, flower, orbit, kite, ending], starts = [0, 3.2, 9.7, 15.2, 20.2];
  const index = Math.max(0, starts.findLastIndex(start => t >= start));
  if (index && t < starts[index] + .6) { scenes[index - 1](); c.save(); c.globalAlpha = ease((t - starts[index]) / .6); scenes[index](); c.restore(); }
  else scenes[index]();
}

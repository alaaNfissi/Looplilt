/** Exact v1 draw/subtitle contract, shared by standalone films and Studio workers. */
export function renderLegacyFrame(canvas, data, draw, time, { motion, sceneAt, cueTime }) {
  const lastTime = (Math.round(data.duration * data.fps) - 1) / data.fps;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  function subtitle(t) {
    const cue = data.captions.find(item => t >= item.start && t < item.end);
    if (!cue) return;
    const size = Math.round(Math.min(canvas.width, canvas.height) * 0.031);
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const maxWidth = canvas.width * 0.82, words = cue.text.split(/\s+/), lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    const lineHeight = size * 1.4, block = lineHeight * lines.length + size;
    const width = Math.min(canvas.width * 0.94, Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 2.1);
    const y = canvas.height * 0.92 - block;
    ctx.fillStyle = 'rgba(17,28,26,.92)';
    ctx.beginPath(); ctx.roundRect((canvas.width - width) / 2, y, width, block, size * 0.5); ctx.fill();
    ctx.fillStyle = '#fffdf3';
    lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, y + size / 2 + lineHeight * (i + 0.5), maxWidth));
  }
  function render(time) {
    const t = Math.max(0, Math.min(lastTime, Number(time) || 0));
    canvas.width = canvas.width;
    ctx.fillStyle = '#172824'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    try {
      draw({ ctx, w: canvas.width, h: canvas.height, t, progress: t / data.duration,
        frame: Math.floor(t * data.fps + 1e-7), portrait: canvas.height > canvas.width,
        project: data, shot: sceneAt(data.scenes, t), motion, cue: id => cueTime(data.cues, id) });
    } finally { ctx.restore(); }
    subtitle(t); return t;
  }
  return render(time);
}

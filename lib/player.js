// The browser half of Looplilt. A frame depends only on its requested time.
(() => {
  const canvas = document.querySelector('canvas');
  const play = document.querySelector('#play');
  const timeline = document.querySelector('#timeline');
  const clock = document.querySelector('#clock');
  const audio = document.querySelector('audio');
  const sound = document.querySelector('#sound');
  let playing = false, position = 0, origin = 0, request = 0;
  const data = window.loopliltProject;
  const draw = window.loopliltDrawing;
  const lastTime = (Math.round(data.duration * data.fps) - 1) / data.fps;
  const ctx = canvas.getContext('2d', { alpha: false });

  function subtitle(t) {
    const cue = data.captions.find(item => t >= item.start && t < item.end);
    if (!cue) return;
    const size = Math.round(Math.min(canvas.width, canvas.height) * 0.031);
    ctx.font = `600 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const maxWidth = canvas.width * 0.82;
    const words = cue.text.split(/\s+/), lines = [];
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
    draw({ ctx, w: canvas.width, h: canvas.height, t, progress: t / data.duration, frame: Math.floor(t * data.fps), portrait: canvas.height > canvas.width });
    ctx.restore();
    subtitle(t);
    return t;
  }

  function display(time) {
    render(time);
    timeline.value = time;
    clock.textContent = `${time.toFixed(1)} / ${data.duration.toFixed(1)}s`;
  }
  function pause() {
    if (playing) position = Math.min(data.duration, (performance.now() - origin) / 1000);
    playing = false; cancelAnimationFrame(request); audio.pause(); play.textContent = 'Play';
  }
  function tick() {
    if (!playing) return;
    position = Math.min(data.duration, (performance.now() - origin) / 1000);
    display(position);
    if (position >= data.duration) { pause(); return; }
    request = requestAnimationFrame(tick);
  }
  function start() {
    if (position >= data.duration) position = 0;
    playing = true; origin = performance.now() - position * 1000; play.textContent = 'Pause';
    if (audio.src) { audio.currentTime = position; audio.play().catch(() => {}); }
    tick();
  }
  play.addEventListener('click', () => playing ? pause() : start());
  timeline.addEventListener('input', () => { pause(); position = Number(timeline.value); display(position); });
  sound.addEventListener('click', () => { audio.muted = !audio.muted; sound.textContent = audio.muted ? 'Sound off' : 'Sound on'; sound.setAttribute('aria-pressed', String(!audio.muted)); });
  document.querySelector('#restart').addEventListener('click', () => { pause(); position = 0; display(0); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.Looplilt = Object.freeze({ render, data, pause });
  display(0);
})();

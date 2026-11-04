// Trusted built-in drawing only: no code editor, remote imports, eval, or project uploads.
import { drawFrame } from './scene.mjs';
import { project, drawing, license } from './source.mjs';
import { REMIX_DEFAULTS, remixSettings, remixProject, remixFiles } from './model.mjs';
import { storeZip } from './store-zip.mjs';

const $ = selector => document.querySelector(selector);
const canvas = $('#remix-canvas'), ctx = canvas.getContext('2d', { alpha: false }), form = $('#settings');
const seek = $('#seek'), play = $('#play'), download = $('#download'), status = $('#download-status');
const sizes = { landscape: [1280, 720], portrait: [720, 1280], square: [960, 960] };
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let settings = remixSettings(), data = remixProject(project, settings), format = 'landscape';
let time = 11, playing = false, last = 0, request = 0, firstPlay = true;
function render() {
  canvas.width = sizes[format][0]; canvas.height = sizes[format][1];
  const t = Math.min(time, (Math.round(data.duration * data.fps) - 1) / data.fps);
  drawFrame({ ctx, w: canvas.width, h: canvas.height, t, progress: t / data.duration, frame: Math.floor(t * data.fps), portrait: canvas.height > canvas.width, settings });
  seek.max = data.duration; seek.value = time;
  seek.setAttribute('aria-valuetext', `${time.toFixed(1)} of ${data.duration.toFixed(1)} seconds`);
  $('#time').textContent = `${time.toFixed(1)} / ${data.duration.toFixed(1)} s`;
}
function pause() {
  playing = false; cancelAnimationFrame(request); play.textContent = firstPlay ? 'Play from start' : 'Play';
}
function tick(now) {
  if (!playing) return;
  time = Math.min(data.duration, time + Math.max(0, now - last) / 1000); last = now;
  if (time >= data.duration) pause();
  render();
  if (playing) request = requestAnimationFrame(tick);
}
function readControls() {
  return remixSettings({ title: $('#title').value, petal: $('#petal').value, leaf: $('#leaf').value, pace: Number($('#pace').value) });
}
function change() {
  status.textContent = '';
  try {
    const next = readControls(), previousPace = settings.pace;
    settings = next; data = remixProject(project, settings);
    time = Math.min(data.duration, time * previousPace / settings.pace);
    format = $('#format').value;
    if (!Object.hasOwn(sizes, format)) throw new Error('Choose a supported frame');
    $('.canvas-desk').className = `canvas-desk ${format === 'portrait' ? 'tall' : format === 'square' ? 'square' : ''}`;
    $('#preview-heading').textContent = settings.title;
    $('#form-error').textContent = ''; download.disabled = false;
    render();
  } catch (error) { pause(); $('#form-error').textContent = error.message; download.disabled = true; }
}
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', change);
form.addEventListener('change', change);
play.addEventListener('click', () => {
  if (playing) { pause(); return; }
  if (firstPlay || time >= data.duration) time = 0;
  firstPlay = false; playing = true; play.textContent = 'Pause'; last = performance.now(); request = requestAnimationFrame(tick);
});
seek.addEventListener('input', () => { pause(); firstPlay = false; play.textContent = 'Play'; time = Number(seek.value); render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
motion.addEventListener('change', () => { if (motion.matches) pause(); });
$('#reset-settings').addEventListener('click', () => {
  pause(); form.reset(); settings = remixSettings(); data = remixProject(project, settings); time = 11; firstPlay = true;
  play.textContent = 'Play from start'; change(); status.textContent = 'Original greenhouse restored.';
});
document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => {
  const palettes = { original: [REMIX_DEFAULTS.petal, REMIX_DEFAULTS.leaf], lilac: ['#b9aedb', '#4b7870'], rose: ['#d87f87', '#68864c'] };
  [$('#petal').value, $('#leaf').value] = palettes[button.dataset.palette]; change();
}));
download.addEventListener('click', () => {
  try {
    const values = readControls();
    const bytes = storeZip(remixFiles({ base: project, drawing, license }, values, format));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    const link = document.createElement('a'); link.href = url; link.download = 'my-greenhouse.zip';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = 'Your source download is ready. Extract it, then follow the README inside.';
  } catch (error) { status.textContent = `Download failed: ${error.message}`; }
});
render(); play.disabled = false; seek.disabled = false; download.disabled = false; $('#boot-status').textContent = '';

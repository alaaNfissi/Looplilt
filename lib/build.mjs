import fs from 'node:fs/promises';
import { readProject, dimensions, writeNew } from './project.mjs';
import { makeSound } from './sound.mjs';
import { scoreFor } from './music.mjs';

const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const scriptSafe = text => text.replace(/<\/script/gi, '<\\/script');
const literal = value => JSON.stringify(value).replaceAll('<', '\\u003c');
async function coreSource(file) {
  return (await fs.readFile(new URL(file, import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
}
export async function audioWorkerSource() {
  const parts = await Promise.all(['./pcm.mjs', './studio-sound.mjs', './synth.mjs'].map(coreSource));
  return parts.join('\n') + '\nself.onmessage=({data})=>{try{const bytes=makePcmSound(data);self.postMessage({bytes:bytes.buffer},[bytes.buffer]);}catch(error){self.postMessage({error:error.message});}};\n';
}
export async function makeHtml(project, format = 'landscape', { sound = true, audio = 'synth' } = {}) {
  if (!['synth', 'pcm'].includes(audio)) throw new Error('HTML audio must be synth or pcm');
  const [width, height] = dimensions(format);
  const [runtime, license, helpers] = await Promise.all([
    fs.readFile(new URL('./player.js', import.meta.url), 'utf8'),
    fs.readFile(new URL('../LICENSE', import.meta.url), 'utf8'), coreSource('./motion.mjs')
  ]);
  const title = escapeHtml(project.data.title), audible = sound && scoreFor(project.data).length > 0;
  const pcm = audible && audio === 'pcm' ? 'data:audio/wav;base64,' + makeSound(project.data).toString('base64') : '';
  const worker = audible && audio === 'synth' ? await audioWorkerSource() : '';
  const transcript = [...(project.data.scenes ?? []).filter(s => s.description).map(s => '<li><strong>' + escapeHtml(s.label) + '</strong> · ' + s.start + '–' + s.end + ' s<br>' + escapeHtml(s.description) + '</li>'),
    ...project.data.captions.map(c => '<li>' + c.start + '–' + c.end + ' s · ' + escapeHtml(c.text) + '</li>')].join('');
  return `<!doctype html>
<!-- Looplilt runtime license:\n${license} -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>${title} · Looplilt</title>
<style>*{box-sizing:border-box}body{margin:0;background:#102d29;color:#f5f2e8;font:15px system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}main{width:min(1200px,100%);padding:clamp(12px,3vw,28px)}header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:16px}h1{font-size:18px;font-weight:500;margin:0}.brand{color:#c9e88d;letter-spacing:.14em;font-size:11px}canvas{display:block;width:100%;max-height:72vh;object-fit:contain;background:#172824;border-radius:6px}nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 0}button{min-height:44px;border:1px solid #657d70;border-radius:9px;background:#223d33;color:inherit;padding:10px 14px;cursor:pointer;font:inherit}button:hover{background:#345643}button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #ea815e;outline-offset:3px}button:disabled{opacity:.5;cursor:default}input{flex:1;min-width:90px;min-height:44px;accent-color:#c9e88d}output{font-variant-numeric:tabular-nums;font-size:12px;color:#d3e1d7}p{color:#b2c8bd;font-size:13px;line-height:1.6}a{color:#d3e4b7}#shots{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}#shots button{font-size:12px;background:transparent}#shots button[aria-current=true]{background:#c9e88d;border-color:#c9e88d;color:#102d29}#shot-note{min-height:1.5em}details{border-top:1px solid #526e60;padding:16px 0;margin-top:16px}summary{cursor:pointer;min-height:32px}li{margin:12px 0;line-height:1.6}#player-status{color:#f3bc9b}footer{border-top:1px solid #526e60;margin-top:24px;padding-top:8px}@media(max-width:500px){header{align-items:center}.brand{font-size:9px}nav{gap:6px}output{order:3;width:100%}#sound{margin-left:auto}canvas{max-height:65vh}}</style></head>
<body><main><header><h1>${title}</h1><span class="brand">LOOPLILT / THE PLAYER</span></header>
<canvas width="${width}" height="${height}" role="img" aria-label="${title}. Use the playback controls and story description below."></canvas>
<nav aria-label="Playback"><button id="play" type="button">Play</button><button id="restart" type="button">Restart</button><input id="timeline" type="range" min="0" max="${project.data.duration}" step="${1 / project.data.fps}" value="0" aria-label="Playback position"><output id="clock"></output><button id="sound" type="button" aria-pressed="false" ${audible ? '' : 'disabled'}>Sound off</button></nav>
<div id="shots" role="group" aria-label="Jump to a scene"></div><p id="shot-note"></p>
<p id="player-status" role="status" aria-live="polite"></p>
<audio muted ${pcm ? 'src="' + pcm + '"' : ''}></audio>
${transcript ? '<details><summary>Read the story & captions</summary><ol>' + transcript + '</ol></details>' : ''}
<footer><p><a href="https://looplilt.com/" target="_blank" rel="noopener noreferrer">Made with Looplilt<span aria-hidden="true"> ↗</span></a> · ${width} × ${height} · ${project.data.fps} fps<br>Player runtime © 2026 Alaa Nfissi · MIT licensed. Film content belongs to its creator.</p></footer>
</main><script>window.loopliltProject=${literal(project.data)};window.loopliltMotion=(()=>{${scriptSafe(helpers)};return {motion,sceneAt,cueTime};})();window.loopliltAudioWorker=${literal(worker)};window.loopliltSoundScore=${project.data.music && audible ? literal(scoreFor(project.data)) : 'null'};window.loopliltDrawing=(()=>{${scriptSafe(project.drawing)}\n;return drawFrame;})();</script>
<script>${scriptSafe(runtime)}</script></body></html>\n`;
}
export async function buildProject(directory, file, format, options) {
  const project = await readProject(directory);
  return writeNew(file, await makeHtml(project, format, options));
}

import fs from 'node:fs/promises';
import { readProject, dimensions, writeNew } from './project.mjs';
import { makeSound } from './sound.mjs';

const escapeHtml = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const scriptSafe = text => text.replace(/<\/script/gi, '<\\/script');

export async function makeHtml(project, format = 'landscape', { sound = true } = {}) {
  const [width, height] = dimensions(format);
  const runtime = await fs.readFile(new URL('./player.js', import.meta.url), 'utf8');
  const license = await fs.readFile(new URL('../LICENSE', import.meta.url), 'utf8');
  const title = escapeHtml(project.data.title);
  const audio = sound && project.data.score.length ? `data:audio/wav;base64,${makeSound(project.data).toString('base64')}` : '';
  return `<!doctype html>
<!-- Looplilt runtime license:\n${license} -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>${title} · Looplilt</title>
<style>*{box-sizing:border-box}body{margin:0;background:#111d1a;color:#f5f2e8;font:15px system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}main{width:min(1200px,100%);padding:20px}header{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:16px}h1{font-size:18px;font-weight:500;margin:0}.brand{color:#bdd6a3;letter-spacing:.12em;font-size:12px}canvas{display:block;width:100%;max-height:78vh;object-fit:contain;background:#172824}nav{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 0}button{border:1px solid #657d70;border-radius:8px;background:#223d33;color:inherit;padding:9px 15px;cursor:pointer;font:inherit}button:hover{background:#345643}button:focus-visible,input:focus-visible{outline:3px solid #ea815e;outline-offset:3px}input{flex:1;min-width:90px;accent-color:#ea815e}output{font-variant-numeric:tabular-nums;font-size:12px;color:#c5d1c5}p{color:#a3b9ab;font-size:12px}a{color:#d3e4b7}</style></head>
<body><main><header><h1>${title}</h1><span class="brand">LOOPLILT</span></header>
<canvas width="${width}" height="${height}" role="img" aria-label="${title}. Use the playback controls below."></canvas>
<nav aria-label="Playback"><button id="play" type="button">Play</button><button id="restart" type="button">Restart</button><input id="timeline" type="range" min="0" max="${project.data.duration}" step="${1 / project.data.fps}" value="0" aria-label="Playback position"><output id="clock"></output><button id="sound" type="button" aria-pressed="false" ${audio ? '' : 'disabled'}>Sound off</button></nav>
<audio muted ${audio ? `src="${audio}"` : ''}></audio><p>Made with Looplilt · ${width} × ${height} · ${project.data.fps} fps · Copyright (c) 2026 Alaa Nfissi. Runtime licensed under MIT.</p>
</main><script>window.loopliltProject=${JSON.stringify(project.data).replaceAll('<', '\\u003c')};window.loopliltDrawing=(()=>{${scriptSafe(project.drawing)}\n;return drawFrame;})();</script>
<script>${scriptSafe(runtime)}</script></body></html>\n`;
}

export async function buildProject(directory, file, format) {
  const project = await readProject(directory);
  return writeNew(file, await makeHtml(project, format));
}

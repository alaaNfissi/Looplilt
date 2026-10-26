#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProject, writeNew } from '../lib/project.mjs';
import { buildProject } from '../lib/build.mjs';
import { captionsVtt, makeSound } from '../lib/sound.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const HELP = `Looplilt — small stories, real motion

  node bin/looplilt.mjs init <folder> [--example paper-garden|orbit-to-wave|tiny-delivery]
  node bin/looplilt.mjs build <project> --out <film.html> [--format landscape|portrait|square]
  node bin/looplilt.mjs render <project> --out <film.mp4> [--format portrait] [--workers 2] [--narration voice.wav]
  node bin/looplilt.mjs storyboard <project> --out <sheet.png> [--format portrait]
  node bin/looplilt.mjs captions <project> --out <captions.vtt>
  node bin/looplilt.mjs sound <project> --out <score.wav>
  node bin/looplilt.mjs check <film.mp4>
  node bin/looplilt.mjs doctor

Outputs are never overwritten. Drawing scripts run in the browser: use projects you trust.
Browser export needs npm ci, npm run setup, and FFmpeg/FFprobe on PATH.
`;

export function argumentsFor(args) {
  const values = [], options = {};
  const allowed = new Set(['out', 'format', 'workers', 'narration', 'example']);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) { values.push(args[i]); continue; }
    const name = args[i].slice(2);
    if (!allowed.has(name) || Object.hasOwn(options, name)) throw new Error(`Unknown or repeated option --${name}`);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`--${name} requires a value`);
    options[name] = args[++i];
  }
  return { values, options };
}

async function main(args) {
  const command = args.shift();
  if (!command || ['help', '--help', '-h'].includes(command)) { console.log(HELP); return; }
  if (command === '--version') { console.log('0.1.0'); return; }
  const { values, options } = argumentsFor(args);
  const project = values[0];
  if (command !== 'doctor' && (!project || values.length !== 1)) throw new Error('Provide exactly one project folder or input file');
  if (['build', 'render', 'storyboard', 'captions', 'sound'].includes(command) && !options.out) throw new Error('--out is required');
  if (command === 'init') {
    const example = options.example || 'paper-garden';
    if (!['paper-garden', 'orbit-to-wave', 'tiny-delivery'].includes(example)) throw new Error('Unknown example');
    await fs.mkdir(project, { recursive: false });
    const source = path.join(root, 'examples', example);
    for (const name of await fs.readdir(source)) {
      await fs.cp(path.join(source, name), path.join(project, name), { recursive: true, force: false, errorOnExist: true });
    }
    console.log(path.resolve(project));
  } else if (command === 'build') {
    console.log(await buildProject(project, options.out, options.format));
  } else if (command === 'captions' || command === 'sound') {
    const { data } = await readProject(project);
    console.log(await writeNew(options.out, command === 'captions' ? captionsVtt(data) : makeSound(data)));
  } else if (['render', 'storyboard', 'check', 'doctor'].includes(command)) {
    const media = await import('../lib/render.mjs');
    if (command === 'render') console.log(JSON.stringify(await media.renderProject(project, options.out, { format: options.format, workers: Number(options.workers ?? 2), narration: options.narration, onProgress: ({ finished, frames }) => console.error(`${finished}/${frames} frames`) }), null, 2));
    if (command === 'storyboard') console.log(await media.storyboard(project, options.out, options.format));
    if (command === 'check') console.log(JSON.stringify(await media.checkVideo(project), null, 2));
    if (command === 'doctor') {
      const { run } = await import('../lib/process.mjs');
      const { withBrowser } = await import('../lib/browser.mjs');
      console.log(`Node ${process.version}`);
      for (const binary of [media.ffmpeg(), media.ffprobe()]) console.log((await run(binary, ['-version'])).stdout.split('\n')[0]);
      await withBrowser(async browser => console.log(`Chromium ${browser.version()} — sandbox enabled`));
    }
  } else throw new Error(`Unknown command: ${command}\n${HELP}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(`Looplilt: ${error.message}`); process.exitCode = 1; });
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { renderProject, storyboard, ffmpeg } from '../lib/render.mjs';
import { buildProject } from '../lib/build.mjs';
import { run } from '../lib/process.mjs';

const folder = path.resolve(process.argv[2] || 'output/launch');
await fs.mkdir(path.dirname(folder), { recursive: true });
await fs.mkdir(folder, { recursive: false });
const results = [];
for (const format of ['landscape', 'portrait']) {
  const file = path.join(folder, 'little-idea-' + format + '.mp4');
  console.log('Rendering ' + format);
  const report = await renderProject('examples/little-idea', file, { format, workers: 2, onProgress: ({ finished, frames }) => console.log(format + ' ' + finished + '/' + frames) });
  await storyboard('examples/little-idea', path.join(folder, 'little-idea-' + format + '.png'), format);
  await buildProject('examples/little-idea', path.join(folder, 'little-idea-' + format + '.html'), format);
  const loudness = await run(ffmpeg(), ['-hide_banner', '-i', file, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
  const measurement = JSON.parse(loudness.stderr.slice(loudness.stderr.lastIndexOf('{')));
  results.push({ ...report, file: path.basename(file), loudness: measurement });
  await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(results, null, 2) + '\n');
}
console.log(folder);

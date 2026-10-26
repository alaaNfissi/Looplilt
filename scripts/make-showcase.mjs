import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProject, dimensions } from '../lib/project.mjs';
import { makeHtml } from '../lib/build.mjs';
import { withBrowser, filmPage, framePng } from '../lib/browser.mjs';
import { renderProject, ffmpeg } from '../lib/render.mjs';
import { run } from '../lib/process.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
if (process.argv.length !== 4 || process.argv[2] !== '--out') throw new Error('Usage: node scripts/make-showcase.mjs --out <new-folder>');
const folder = path.resolve(process.argv[3]);
await fs.mkdir(folder, { recursive: false });
for (const name of ['media', 'play', 'assets']) await fs.mkdir(path.join(folder, name));
const reports = [];
for (const slug of ['paper-garden', 'orbit-to-wave', 'tiny-delivery']) {
  const dir = path.join(root, 'examples', slug), project = await readProject(dir);
  await fs.writeFile(path.join(folder, 'play', `${slug}.html`), await makeHtml(project));
  for (const format of ['landscape', 'portrait']) {
    const stem = `${slug}-${format}`;
    const report = await renderProject(dir, path.join(folder, 'media', `${stem}.mp4`), { format, workers: 2, onProgress: ({ finished, frames }) => console.log(`${stem}: ${finished}/${frames}`) });
    await withBrowser(async browser => {
      const [width, height] = dimensions(format);
      const page = await filmPage(browser, await makeHtml(project, format, { sound: false }), width, height);
      await fs.writeFile(path.join(folder, 'media', `${stem}.png`), await framePng(page, slug === 'paper-garden' ? 13.5 : slug === 'tiny-delivery' ? 7.3 : 8.5));
    });
    const audio = await run(ffmpeg(), ['-hide_banner', '-i', report.file, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
    const match = audio.stderr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
    if (!match) throw new Error('Could not measure delivered audio');
    const level = JSON.parse(match[0]);
    if (!Number.isFinite(Number(level.input_i)) || Number(level.input_tp) > -0.8) throw new Error('Delivered audio is silent or exceeds peak headroom');
    reports.push({ example: slug, format, ...report, integratedLufs: Number(level.input_i), truePeakDb: Number(level.input_tp) });
    await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(reports, null, 2));
    console.log(`Finished ${stem}: ${report.frames} frames, ${level.input_i} LUFS, ${level.input_tp} dBTP`);
  }
}
await withBrowser(async browser => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  await page.setContent(await fs.readFile(path.join(root, 'site/assets/banner.svg'), 'utf8'));
  await page.addStyleTag({ content: 'body{margin:0}' });
  await page.screenshot({ path: path.join(folder, 'assets/social-card.png') });
});
console.log(`Showcase ready for review: ${folder}`);

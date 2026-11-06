// Reproducible real-media benchmark. Run before and after a change on the same host.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';


const root = fileURLToPath(new URL('../', import.meta.url));
const engine = path.resolve(process.env.LOOPLILT_BENCH_ENGINE ?? root);
const fromEngine = file => import(pathToFileURL(path.join(engine, 'lib', file)));
const [{ readProject }, { makeHtml }, { withBrowser, filmPage, framePng }, { renderProject }] = await Promise.all(['project.mjs', 'build.mjs', 'browser.mjs', 'render.mjs'].map(fromEngine));
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node scripts/benchmark.mjs <new-report-folder> [example ...]');
const out = path.resolve(destination);
await fs.mkdir(out, { recursive: false });
const scratch = path.join(out, 'scratch');
await fs.mkdir(scratch);
// Only this process and its children use this fresh temporary directory.
const old = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR };
process.env.TEMP = scratch; process.env.TMP = scratch; process.env.TMPDIR = scratch;
const examples = process.argv.slice(3);
if (!examples.length) examples.push('tiny-delivery', 'one-more-light');
const report = { version: JSON.parse(await fs.readFile(path.join(engine, 'package.json'), 'utf8')).version,
  platform: process.platform, arch: process.arch, node: process.version, cpus: os.cpus().length,
  memoryMetric: 'Sampled Node process RSS; excludes Chromium and FFmpeg. Not total system memory.',
  storageMetric: 'Sampled bytes in this run’s private scratch directory; 100 ms interval.',
  workers: 2, chromiumGpuDisabled: process.env.LOOPLILT_DISABLE_GPU === '1', samples: [] };
async function size(dir) {
  let bytes = 0, files = 0;
  for (const item of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) { const s = await size(p); bytes += s.bytes; files += s.files; }
    else if (item.isFile()) { bytes += (await fs.stat(p).catch(() => ({ size: 0 }))).size; files++; }
  }
  return { bytes, files };
}
try {
  for (const slug of examples) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Choose an example slug');
    const directory = path.join(engine, 'examples', slug), project = await readProject(directory);
    const sample = { slug, seconds: project.data.duration, frames: Math.round(project.data.duration * project.data.fps) };
    let start = performance.now();
    const html = await makeHtml(project);
    sample.htmlBuildMs = performance.now() - start; sample.htmlBytes = Buffer.byteLength(html);
    await fs.writeFile(path.join(out, slug + '.html'), html, { flag: 'wx' });
    await withBrowser(async browser => {
      report.chromium = browser.version(); start = performance.now();
      const page = await filmPage(browser, html, 1280, 900);
      sample.previewLoadMs = performance.now() - start;
      sample.draw = await page.evaluate(() => {
        const values = [];
        for (let i = 0; i < 120; i++) {
          const t = i / 120 * window.Looplilt.data.duration, start = performance.now();
          window.Looplilt.render(t); values.push(performance.now() - start);
        }
        values.sort((a, b) => a - b);
        return { frames: values.length, medianMs: values[60], p95Ms: values[114], maxMs: values.at(-1) };
      });
      sample.framesAt = [];
      for (const fraction of [0, .2, .4, .6, .8, .99]) {
        const time = Math.floor(project.data.duration * project.data.fps * fraction) / project.data.fps;
        const png = await framePng(page, time);
        await fs.writeFile(path.join(out, `${slug}-${time}.png`), png, { flag: 'wx' });
        sample.framesAt.push({ time, sha256: createHash('sha256').update(png).digest('hex') });
      }
    });
    let pending = Promise.resolve(), peakBytes = 0, peakFiles = 0, peakRss = process.memoryUsage().rss;
    let sampling = false;
    const timer = setInterval(() => {
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
      if (sampling) return;
      sampling = true;
      pending = size(scratch).then(s => { peakBytes = Math.max(peakBytes, s.bytes); peakFiles = Math.max(peakFiles, s.files); }).finally(() => { sampling = false; });
    }, 100);
    start = performance.now();
    try {
      sample.media = await renderProject(directory, path.join(out, slug + '.mp4'), { workers: 2,
        onProgress: ({ finished, frames }) => { if (finished === frames || finished % 300 === 0) console.log(`${slug}: ${finished}/${frames}`); } });
      sample.renderMs = performance.now() - start;
    } finally { clearInterval(timer); await pending; }
    sample.peakScratchBytes = peakBytes; sample.peakScratchFiles = peakFiles; sample.sampledNodePeakRss = peakRss;
    sample.outputBytes = (await fs.stat(path.join(out, slug + '.mp4'))).size;
    sample.scratchAfter = await size(scratch);
    report.samples.push(sample);
    await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(sample));
  }
} finally {
  for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
}
console.log(path.join(out, 'report.json'));

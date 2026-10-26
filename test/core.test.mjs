import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProject, dimensions, readProject, writeNew } from '../lib/project.mjs';
import { makeHtml } from '../lib/build.mjs';
import { makeSound, captionsVtt } from '../lib/sound.mjs';
import { argumentsFor } from '../bin/looplilt.mjs';
import { run } from '../lib/process.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const valid = () => ({ version: 1, title: 'A test film', duration: 2, fps: 24, captions: [], score: [] });

test('rejects impossible frame counts, durations and unsupported versions', () => {
  for (const change of [{ duration: Infinity }, { fps: 24.5 }, { duration: 2.01 }, { version: 2 }, { title: '' }]) {
    assert.throws(() => validateProject({ ...valid(), ...change }));
  }
});
test('caption cues must be ordered, non-overlapping and inside the film', () => {
  assert.throws(() => validateProject({ ...valid(), captions: [{ start: 0, end: 1.5, text: 'A' }, { start: 1, end: 2, text: 'B' }] }));
  assert.throws(() => validateProject({ ...valid(), captions: [{ start: 0, end: 3, text: 'Long' }] }));
  assert.equal(validateProject({ ...valid(), captions: [{ start: 0, end: 1, text: 'A' }, { start: 1, end: 2, text: 'B' }] }).captions.length, 2);
});
test('invalid audio notes fail before synthesis', () => {
  for (const note of [{ at: 0, length: 3, pitch: 60 }, { at: 0, length: 1, pitch: NaN }, { at: 0, length: 1, pitch: 60, voice: 'missing' }]) {
    assert.throws(() => validateProject({ ...valid(), score: [note] }));
  }
});
test('formats are explicit and cannot resolve inherited object keys', () => {
  assert.deepEqual(dimensions('portrait'), [720, 1280]);
  assert.deepEqual(dimensions('square'), [960, 960]);
  assert.throws(() => dimensions('__proto__'));
});
test('sound is repeatable PCM with the exact requested sample count and headroom', () => {
  const data = validateProject({ ...valid(), score: Array.from({ length: 12 }, () => ({ at: 0, length: 1.8, pitch: 60, voice: 'bell', gain: 1 })) });
  const wav = makeSound(data);
  assert.deepEqual(wav, makeSound(data)); assert.equal(wav.length, 44 + 2 * 48000 * 2);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.readUInt32LE(24), 48000);
  let peak = 0; for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
  assert.ok(peak > 1000 && peak <= 27853);
});
test('caption export preserves timing and escapes markup', () => {
  const vtt = captionsVtt({ captions: [{ start: 1.234, end: 61.007, text: '<hello> & world' }] });
  assert.ok(vtt.includes('00:00:01.234 --> 00:01:01.007'));
  assert.ok(vtt.includes('&lt;hello> &amp; world'));
});
test('output creation never replaces existing user files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'looplilt-test-'));
  try {
    const out = path.join(dir, 'film.html'); await writeNew(out, 'keep');
    await assert.rejects(writeNew(out, 'replace'), { code: 'EEXIST' }); assert.equal(await fs.readFile(out, 'utf8'), 'keep');
  } finally { await fs.rm(dir, { recursive: true }); }
});
test('all original examples validate and build a standalone document', async () => {
  for (const slug of ['paper-garden', 'orbit-to-wave', 'tiny-delivery']) {
    const project = await readProject(path.join(root, 'examples', slug));
    const html = await makeHtml(project, 'portrait');
    assert.ok(html.includes('width="720" height="1280"'));
    assert.ok(html.includes('data:audio/wav;base64,'));
    assert.ok(!/<script[^>]+src=/.test(html));
    assert.ok(html.includes("connect-src 'none'"));
  }
});
test('HTML metadata cannot break out into markup or script', async () => {
  const project = { data: { ...valid(), title: '</script><img src=x onerror=alert(1)>' }, drawing: 'function drawFrame() { const label = "</script>"; }' };
  const html = await makeHtml(project);
  assert.ok(!html.includes('<img src=x'));
  assert.equal((html.match(/<\/script>/g) || []).length, 2);
});
test('CLI rejects unknown or incomplete flags', () => {
  assert.throws(() => argumentsFor(['--out'])); assert.throws(() => argumentsFor(['--oops', 'value']));
  assert.throws(() => argumentsFor(['--out', 'a', '--out', 'b']));
  assert.deepEqual(argumentsFor(['project with spaces', '--out', 'film one.mp4']).options, { out: 'film one.mp4' });
});
test('init rejects an existing directory without touching its contents', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'looplilt-init-'));
  try {
    await fs.writeFile(path.join(dir, 'keep.txt'), 'keep');
    await assert.rejects(run(process.execPath, [path.join(root, 'bin/looplilt.mjs'), 'init', dir]));
    assert.deepEqual(await fs.readdir(dir), ['keep.txt']);
  } finally { await fs.rm(dir, { recursive: true }); }
});
test('init creates a usable project in a new directory', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'looplilt-new-'));
  try {
    const project = path.join(dir, 'my film');
    const cli = path.join(root, 'bin/looplilt.mjs');
    await run(process.execPath, [cli, 'init', project, '--example', 'tiny-delivery']);
    const loaded = await readProject(project);
    assert.equal(loaded.data.title, 'Tiny delivery');
    const output = path.join(dir, 'first film.html');
    await run(process.execPath, [cli, 'build', project, '--out', output]);
    assert.ok((await fs.stat(output)).size > 1000);
  } finally { await fs.rm(dir, { recursive: true }); }
});
test('external processes have bounded runtime', async () => {
  await assert.rejects(run(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 100 }), /exceeded/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { REMIX_DEFAULTS, REMIX_PACES, remixSettings, remixProject, remixDrawing, remixFiles } from '../lib/remix.mjs';
import { validateProject } from '../lib/project.mjs';
import { storeZip } from '../lib/store-zip.mjs';

const base = JSON.parse(await fs.readFile(new URL('../examples/paper-garden/project.json', import.meta.url), 'utf8'));
const drawing = await fs.readFile(new URL('../examples/paper-garden/draw.js', import.meta.url), 'utf8');
const license = await fs.readFile(new URL('../LICENSE', import.meta.url), 'utf8');
test('remix controls reject code-shaped colors, unsupported paces and oversized text', () => {
  for (const input of [{ petal: 'url(https://example.com)' }, { leaf: '#123' }, { pace: Infinity }, { pace: 1.1 }, { title: 'x'.repeat(33) }, { title: ' ' }, { title: 'bad\u0000title' }, { title: 'bad\u202etitle' }, { drawing: 'alert(1)' }, null, []]) assert.throws(() => remixSettings(input));
  assert.equal(remixSettings({ title: '<img onerror=alert(1)>' }).title, '<img onerror=alert(1)>'); // Plain drawn text is safe.
});
test('every supported pace retimes the full film and score into a valid project', () => {
  for (const pace of REMIX_PACES) {
    const data = remixProject(base, { pace });
    validateProject(data);
    assert.equal(data.duration * data.fps, Math.round(data.duration * data.fps));
    assert.equal(data.score.length, base.score.length);
    assert.ok(data.score.every(note => note.at + note.length <= data.duration + 1e-6));
  }
  assert.deepEqual(remixProject(base, {}), base);
});
test('exported drawings keep user text as data and use the built-in drawing', () => {
  const text = '</script><img src=x>';
  const result = remixDrawing(drawing, { title: text });
  assert.ok(!result.includes('</script>'));
  assert.ok(result.includes('function drawGreenhouse('));
  new vm.Script(result + ';drawFrame;');
  const context = vm.createContext({});
  vm.runInContext(result + ';globalThis.value=greenhouse.title;', context);
  assert.equal(context.value, text);
  assert.deepEqual(remixSettings(), REMIX_DEFAULTS);
});
test('source ZIP has exact UTF-8 project bytes and safe paths', () => {
  const entries = remixFiles({ base, drawing, license }, { title: 'A little élan' }, 'portrait');
  const bytes = Buffer.from(storeZip(entries)), end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  assert.equal(bytes.readUInt16LE(end + 10), 4);
  let offset = 0;
  for (const entry of entries) {
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50);
    assert.equal(bytes.readUInt16LE(offset + 8), 0);
    const size = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26);
    assert.equal(bytes.toString('utf8', offset + 30, offset + 30 + nameLength), entry.name);
    assert.equal(bytes.toString('utf8', offset + 30 + nameLength, offset + 30 + nameLength + size), entry.data);
    offset += 30 + nameLength + size;
  }
  assert.equal(offset, bytes.readUInt32LE(end + 16));
  for (const name of ['../x', '/x', 'C:/x', 'a\\b', 'a//b']) assert.throws(() => storeZip([{ name, data: 'x' }]));
  assert.throws(() => storeZip([{ name: 'x', data: 'x' }, { name: 'x', data: 'y' }]));
  assert.throws(() => storeZip([{ name: 'x', data: 'x'.repeat(2 * 1024 * 1024 + 1) }]));
});

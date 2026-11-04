import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { withBrowser, filmPage, framePng } from '../lib/browser.mjs';
import { readProject } from '../lib/project.mjs';
import { makeHtml } from '../lib/build.mjs';
import { serveSite } from './site-server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await fs.mkdir(path.join(root, '.validation'), { recursive: true });
const folder = await fs.mkdtemp(path.join(root, '.validation/remix-'));
const server = await serveSite(path.join(root, '.site'));
const errors = [], external = [];
try {
  await withBrowser(async browser => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', acceptDownloads: true });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!request.url().startsWith(server.origin) && !request.url().startsWith('blob:')) external.push(request.url()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`${server.origin}/remix/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#boot-status').textContent === '');
    assert.equal(await page.locator('#play').textContent(), 'Play from start');
    const initial = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
    await page.waitForTimeout(300);
    assert.ok(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()) === initial, 'Starts paused');
    await page.locator('[data-palette="lilac"]').click();
    assert.ok(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()) !== initial, 'A palette changes the actual drawing');
    await page.locator('#title').fill('<svg onload=alert(1)>');
    assert.equal(await page.locator('#preview-heading').textContent(), '<svg onload=alert(1)>');
    assert.equal(await page.locator('#preview-heading svg').count(), 0, 'Title is text, never markup');
    await page.locator('#title').fill('');
    assert.equal(await page.locator('#download').isDisabled(), true);
    await page.locator('#title').fill('A little élan');
    await page.locator('#pace').selectOption('1.25');
    assert.equal(await page.locator('#seek').getAttribute('max'), '12.8');
    const pending = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await pending, zipPath = path.join(folder, 'my-greenhouse.zip');
    await download.saveAs(zipPath);
    // Read only the four fixed entries from our stored ZIP. This is a test fixture, not a public extractor.
    const zip = await fs.readFile(zipPath), allowed = new Set(['project.json', 'draw.js', 'LICENSE', 'README.md']);
    const projectPath = path.join(folder, 'my-greenhouse'); await fs.mkdir(projectPath);
    let offset = 0;
    while (zip.readUInt32LE(offset) === 0x04034b50) {
      const size = zip.readUInt32LE(offset + 18), length = zip.readUInt16LE(offset + 26);
      const name = zip.toString('utf8', offset + 30, offset + 30 + length);
      assert.ok(name.startsWith('my-greenhouse/'));
      const leaf = name.slice('my-greenhouse/'.length); assert.ok(allowed.delete(leaf));
      assert.equal(zip.readUInt16LE(offset + 8), 0);
      await fs.writeFile(path.join(projectPath, leaf), zip.subarray(offset + 30 + length, offset + 30 + length + size));
      offset += 30 + length + size;
    }
    assert.equal(allowed.size, 0);
    const project = await readProject(projectPath);
    assert.equal(project.data.title, 'A little élan'); assert.equal(project.data.duration, 12.8);
    for (const format of ['landscape', 'portrait', 'square']) {
      await page.locator('#format').selectOption(format);
      const film = await filmPage(browser, await makeHtml(project, format, { sound: false }), 1280, 1400);
      for (const t of [0, 2.4, 6.8, 10.8, 12.8]) {
        await page.locator('#seek').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, t);
        const actualTime = Number(await page.locator('#seek').inputValue());
        const actual = await page.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
        const preview = Buffer.from(actual, 'base64'), exported = await framePng(film, actualTime);
        if (!preview.equals(exported)) {
          await fs.writeFile(path.join(folder, `mismatch-${format}-${actualTime}-preview.png`), preview);
          await fs.writeFile(path.join(folder, `mismatch-${format}-${actualTime}-export.png`), exported);
        }
        assert.ok(preview.equals(exported), `${format} export equals the preview at ${actualTime}s`);
      }
      await film.close();
      console.log(`${format}: five export/preview comparisons passed`);
    }
    await page.locator('#format').selectOption('landscape');
    await page.locator('#seek').evaluate(input => { input.value = 0; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#play').click();
    await page.waitForFunction(() => Number(document.querySelector('#seek').value) > 0.1);
    await page.locator('#play').click();
    assert.equal(await page.locator('#play').textContent(), 'Play');
    await page.locator('#reset-settings').click();
    assert.ok(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()) === initial, 'Reset returns exact original frame');
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Layout at ${width}px`);
      await page.screenshot({ path: path.join(folder, `remix-${width}.png`), fullPage: true });
    }
    await page.locator('#seek').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    assert.ok(Number(await page.locator('#seek').inputValue()) > 0, 'Keyboard seeking works');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    await page.close();
  });
  console.log('Remixer: controls, invalid input, safe text, source download, 15 pixel parity checks, playback, reset, keyboard, four widths, and no external requests passed');
  console.log(`Render this downloaded project for the full media check: ${path.join(folder, 'my-greenhouse')}`);
} finally { await server.close(); }
console.log(folder);

if (process.env.LOOPLILT_TEST_MEDIA === '1') {
  const { renderProject } = await import('../lib/render.mjs');
  const report = await renderProject(path.join(folder, 'my-greenhouse'), path.join(folder, 'remix.mp4'));
  assert.equal(report.frames, 384); assert.equal(report.duration, 12.8);
  await fs.writeFile(path.join(folder, 'media.json'), JSON.stringify(report, null, 2));
  console.log('Downloaded project: complete MP4 render and decode passed');
}

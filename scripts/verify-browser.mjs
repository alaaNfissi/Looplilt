import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readProject } from '../lib/project.mjs';
import { makeHtml } from '../lib/build.mjs';
import { withBrowser, filmPage, framePng } from '../lib/browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await fs.mkdir(path.join(root, '.validation'), { recursive: true });
const folder = await fs.mkdtemp(path.join(root, '.validation/browser-'));
const hash = image => createHash('sha256').update(image).digest('hex');
const results = [];
await withBrowser(async browser => {
  for (const slug of ['paper-garden', 'orbit-to-wave', 'tiny-delivery']) {
    const project = await readProject(path.join(root, 'examples', slug));
    for (const format of ['landscape', 'portrait', 'square']) {
      const html = await makeHtml(project, format);
      const page = await filmPage(browser, html, 1440, 1000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const samples = [];
      for (const t of [0, 3.5, 8.5, 13.5]) {
        const png = await framePng(page, t);
        await fs.writeFile(path.join(folder, `${slug}-${format}-${t}.png`), png);
        samples.push(hash(png));
      }
      assert.equal(new Set(samples).size, samples.length, `${slug} must visibly change across beats`);
      for (let i = 3; i >= 0; i--) assert.equal(hash(await framePng(page, [0, 3.5, 8.5, 13.5][i])), samples[i], `${slug} frames must be independent of seek order`);
      await page.locator('#restart').click();
      await page.locator('#play').click();
      await page.waitForFunction(() => Number(document.querySelector('#timeline').value) > 0.1);
      await page.locator('#play').click();
      assert.equal(await page.locator('#play').textContent(), 'Play');
      await page.locator('#sound').click();
      assert.equal(await page.locator('audio').evaluate(audio => audio.muted), false);
      assert.equal(errors.length, 0);
      results.push({ slug, format, deterministic: true, playback: true, frames: samples });
      await page.close();
      console.log(`${slug} / ${format}: deterministic frames and playback passed`);
    }
  }
});
await fs.writeFile(path.join(folder, 'report.json'), JSON.stringify(results, null, 2));
console.log(folder);

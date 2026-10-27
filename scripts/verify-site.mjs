import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { withBrowser } from '../lib/browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)), site = path.join(root, '.site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const file = path.resolve(site, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(site + path.sep)) { response.writeHead(403).end(); return; }
    const data = await fs.readFile(file);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    if (request.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
      const start = match ? Number(match[1]) : -1;
      const end = match?.[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start < 0 || start > end) { response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end(); return; }
      response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${data.length}` }).end(data.subarray(start, end + 1));
    } else response.writeHead(200, { ...headers, 'Content-Length': data.length }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
await fs.mkdir(path.join(root, '.validation'), { recursive: true });
const folder = await fs.mkdtemp(path.join(root, '.validation/site-'));
try {
  await withBrowser(async browser => {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
      const failures = [];
      page.on('pageerror', error => failures.push(error.message));
      page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
      await page.goto(origin, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
      const local = await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => !/^(https?:|#)/.test(href)));
      for (const href of local) {
        const response = await page.request.get(new URL(href, origin).href); assert.ok(response.ok(), href);
      }
      await page.screenshot({ path: path.join(folder, `site-${width}.png`), fullPage: true });
      const hero = page.locator('#hero-video');
      await page.locator('[data-preview="tiny-delivery"]').click();
      await page.waitForFunction(() => document.querySelector('#hero-video').currentTime > 0.1);
      assert.equal(await page.locator('#hero-name').textContent(), 'Tiny delivery');
      await page.locator('#hero-toggle').click();
      assert.equal(await hero.evaluate(video => video.paused), true);
      await page.locator('#hero-seek').focus();
      await page.keyboard.press('Home');
      for (let step = 0; step < 5; step++) await page.keyboard.press('PageUp');
      await page.waitForFunction(() => !document.querySelector('#hero-video').seeking);
      assert.ok(await hero.evaluate(video => video.currentTime) > 1, 'Keyboard seeking updates the preview');
      await page.locator('[data-preview="orbit-to-wave"]').click();
      assert.equal(await hero.evaluate(video => video.paused), true, 'Changing films preserves manual pause');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-preview="paper-garden"]').click();
      assert.equal(await hero.evaluate(video => video.paused), true, 'Reduced motion disables preview autoplay');
      for (const article of await page.locator('.film').all()) {
        const video = article.locator('video');
        await video.evaluate(async element => { element.muted = true; await element.play(); });
        await page.waitForFunction(slug => document.querySelector(`[data-slug="${slug}"] video`).currentTime > 0.1, await article.getAttribute('data-slug'));
        assert.equal(await video.evaluate(element => element.videoWidth), 1280);
        await article.locator('[data-format="portrait"]').click();
        assert.equal(await video.evaluate(element => element.paused), true);
        await video.evaluate(async element => { element.muted = true; await element.play(); });
        await page.waitForFunction(slug => document.querySelector(`[data-slug="${slug}"] video`).videoWidth === 720, await article.getAttribute('data-slug'));
        await video.evaluate(element => element.pause());
      }
      assert.deepEqual(failures, []);
      console.log(`${width}px: layout, links, six films, preview selection, pause, seeking, and reduced motion passed`);
      await page.close();
    }
    for (const width of [320, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.goto(origin, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
      assert.equal(await page.locator('#hero-video').evaluate(video => video.paused), true);
      await page.screenshot({ path: path.join(folder, `site-${width}.png`), fullPage: true });
      await page.close();
      console.log(`${width}px: layout and reduced-motion startup passed`);
    }
  });
} finally { await new Promise(resolve => server.close(resolve)); }
console.log(folder);

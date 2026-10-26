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
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length }).end(data);
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
      console.log(`${width}px: layout, local links, six video sources, format controls passed`);
      await page.close();
    }
  });
} finally { await new Promise(resolve => server.close(resolve)); }
console.log(folder);

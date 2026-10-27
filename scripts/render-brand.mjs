import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowser } from '../lib/browser.mjs';

if (process.argv.length !== 4 || process.argv[2] !== '--out') throw new Error('Usage: node scripts/render-brand.mjs --out <new-folder>');
const folder = path.resolve(process.argv[3]);
const assets = fileURLToPath(new URL('../site/assets/', import.meta.url));
await fs.mkdir(folder, { recursive: false });
await withBrowser(async browser => {
  for (const [source, name, width, height] of [
    ['banner.svg', 'social-card.png', 1280, 640],
    ['icon.svg', 'favicon.png', 32, 32],
    ['icon.svg', 'apple-touch-icon.png', 180, 180]
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(await fs.readFile(path.join(assets, source), 'utf8'));
    await page.addStyleTag({ content: 'body{margin:0}svg{display:block;width:100vw;height:100vh}' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(folder, name), omitBackground: true });
    await page.close();
  }
});
console.log(folder);

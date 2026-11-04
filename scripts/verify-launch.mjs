import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { withBrowser } from '../lib/browser.mjs';
import { serveSite } from './site-server.mjs';

const folder = path.resolve(process.argv[2] || 'output/launch');
const slug = process.argv[3] || 'little-idea';
if (!['little-idea', 'neon-relay', 'moonrise-express', 'ink-tide', 'the-little-lift', 'the-missing-beat', 'one-more-light'].includes(slug)) throw new Error('Unknown review film');
const project = JSON.parse(await fs.readFile('examples/' + slug + '/project.json', 'utf8'));
const server = await serveSite(folder), results = [];
try {
  await withBrowser(async browser => {
    for (const format of ['landscape', 'portrait']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.setContent('<video id="film" muted playsinline controls></video>');
      const video = page.locator('#film');
      await video.evaluate((element, url) => { element.src = url; }, server.origin + '/' + slug + '-' + format + '.mp4');
      await video.evaluate(element => element.play());
      await page.waitForFunction(() => document.querySelector('video').ended, null, { timeout: Math.max(45000, project.duration * 1000 + 15000) });
      const result = await video.evaluate(element => ({
        width: element.videoWidth, height: element.videoHeight, duration: element.duration,
        ended: element.ended, decoded: element.getVideoPlaybackQuality().totalVideoFrames,
        dropped: element.getVideoPlaybackQuality().droppedVideoFrames, error: element.error?.message ?? null
      }));
      assert.equal(result.ended, true); assert.equal(result.error, null);
      assert.equal(result.duration, project.duration); assert.ok(result.decoded >= project.duration * project.fps - 1);
      results.push({ format, ...result });
      await page.close();
      console.log(slug + ' / ' + format + ': complete real-time MP4 playback passed');
    }
  });
} finally { await server.close(); }
await fs.mkdir('.validation', { recursive: true });
await fs.writeFile(path.join('.validation', slug + '-playback.json'), JSON.stringify(results, null, 2) + '\n');

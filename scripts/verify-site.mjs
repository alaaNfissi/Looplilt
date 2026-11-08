import fs from 'node:fs/promises';
const stories=JSON.parse(await fs.readFile(new URL('../studio/stories.json',import.meta.url),'utf8'));
import { SHOWCASE } from '../lib/catalog.mjs';
import path from 'node:path';
import { serveSite } from './site-server.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { withBrowser } from '../lib/browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url)), site = path.join(root, '.site');
const server = await serveSite(site);
const origin = server.origin;
await fs.mkdir(path.join(root, '.validation'), { recursive: true });
const folder = await fs.mkdtemp(path.join(root, '.validation/site-'));
try {
  await withBrowser(async browser => {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
      page.setDefaultTimeout(60000);
      const failures = [];
      page.on('pageerror', error => failures.push(error.message));
      page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
      await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.locator('#copy-prompt').waitFor({state:'visible',timeout:60000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
      const local = await page.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => !/^(https?:|#)/.test(href)));
      for (const href of local) {
        const response = await page.request.get(new URL(href, origin).href); assert.ok(response.ok(), href);
      }
      await page.screenshot({ path: path.join(folder, `site-${width}.png`), fullPage: true });
      const prompt = (await fs.readFile(path.join(root, 'docs/installation-prompt.txt'), 'utf8')).replaceAll('\r\n', '\n').trim();
      assert.equal((await page.locator('#installation-prompt').inputValue()).trim(), prompt);
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('#copy-prompt').click();
      assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n').trim(), prompt);
      const hero = page.locator('#hero-video');
      await page.locator('#hero-sound').click();
      assert.equal(await hero.evaluate(video => video.muted), false, 'Sound turns on only after a gesture');
      assert.equal(await page.locator('#hero-sound').getAttribute('aria-pressed'), 'true');
      await page.locator('#hero-sound').click();
      assert.equal(await hero.evaluate(video => video.muted), true);
      await page.locator('[data-preview="the-missing-beat"]').click();
      await page.waitForFunction(() => document.querySelector('#hero-video').currentTime > 0.1);
      assert.equal(await page.locator('#hero-name').textContent(), 'The Missing Beat');
      await page.locator('#hero-toggle').click();
      assert.equal(await hero.evaluate(video => video.paused), true);
      await page.locator('#hero-seek').focus();
      await page.keyboard.press('Home');
      for (let step = 0; step < 5; step++) await page.keyboard.press('PageUp');
      await page.waitForFunction(() => !document.querySelector('#hero-video').seeking);
      assert.ok(await hero.evaluate(video => video.currentTime) > 1, 'Keyboard seeking updates the preview');
      await page.locator('[data-preview="one-more-light"]').click();
      assert.equal(await hero.evaluate(video => video.paused), true, 'Changing films preserves manual pause');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-preview="paper-garden"]').click();
      assert.equal(await hero.evaluate(video => video.paused), true, 'Reduced motion disables preview autoplay');
      assert.equal(await page.locator('.film').count(), SHOWCASE.length);
      assert.equal(await page.locator('.studio-film').count(),stories.length);
      for(const story of stories){
        const card=page.locator('#studio-film-'+story.slug),video=card.locator('video');
        assert.equal(await card.locator('.studio-film-style').textContent(),story.style);
        assert.ok((await card.locator('.studio-film-score').textContent()).includes(story.audio));
        assert.equal(await card.getByRole('link',{name:/Open editable film/}).getAttribute('href'),'studio/?story='+story.slug);
        assert.equal(await card.getByRole('link',{name:/Take the project home/}).getAttribute('download'),'');
        assert.equal(await video.getAttribute('autoplay'),null);
        await video.evaluate(async item=>{item.muted=true;await item.play();});
        await page.waitForFunction(slug=>document.querySelector('#studio-film-'+slug+' video').currentTime>.1,story.slug);
        assert.equal(await hero.evaluate(item=>item.paused),true);
        assert.equal(await page.locator('video').evaluateAll(items=>items.filter(item=>!item.paused).length),1,'Only one film plays at a time');
        assert.equal(await video.evaluate(item=>item.videoWidth),1280);
        assert.ok(Math.abs((await video.evaluate(item=>item.duration))-story.seconds)<.1);
        await video.evaluate(item=>item.pause());
      }
      const styleCount = await page.locator('[data-filter]:not([data-filter="all"])').count();
      const allSummary = `${SHOWCASE.length} original films · ${styleCount} visual styles · sound on, when you press play`;
      assert.equal(await page.locator('#film-count').textContent(), allSummary, 'Initial summary matches the available styles');
      for (const button of await page.locator('[data-filter]').all()) {
        await button.focus(); await page.keyboard.press('Enter');
        const key = await button.getAttribute('data-filter');
        if (key === 'all') assert.equal(await page.locator('#film-count').textContent(), allSummary, 'All-films summary retains the current style count');
        const expected = key === 'all' ? SHOWCASE.length : Number(await button.locator('span').textContent());
        assert.equal(await page.locator('.film:visible').count(), expected, key + ' filter');
        if (key !== 'all') assert.equal(await page.locator(`.film:visible:not([data-style="${key}"])`).count(), 0);
      }
      await page.locator('[data-filter="all"]').click();
      assert.equal(await page.locator('#film-count').textContent(), allSummary, 'Returning from a style filter restores the full summary');
      const firstFilm = page.locator('.film').first().locator('video');
      await firstFilm.evaluate(async video => { video.muted = true; await video.play(); });
      await page.locator('[data-filter="ink"]').click();
      assert.equal(await firstFilm.evaluate(video => video.paused), true, 'Filtering pauses hidden films');
      await page.locator('#hero-name').click();
      await page.waitForFunction(() => !document.querySelector('#film-paper-garden').hidden);
      assert.equal(await page.locator('.film:visible').count(), SHOWCASE.length, 'A film link reveals its card after filtering');
      await page.locator('[data-filter="ink"]').click();
      await page.locator('#hero-name').click();
      await page.waitForFunction(() => !document.querySelector('#film-paper-garden').hidden);
      assert.equal(await page.locator('.film:visible').count(), SHOWCASE.length, 'The same hash link also reveals a filtered card');
      for (const control of await page.locator('[data-filter], [data-format], #copy, #copy-prompt, #hero-toggle, #hero-sound').all()) {
        assert.ok((await control.boundingBox()).height >= 44, 'Important touch controls are at least 44px high');
      }
      await firstFilm.evaluate(async video => { video.muted = true; await video.play(); });
      await page.locator('#hero-toggle').click();
      await page.waitForFunction(() => !document.querySelector('#hero-video').paused);
      assert.equal(await firstFilm.evaluate(video => video.paused), true, 'Choosing the hero pauses a playing gallery film');
      await page.locator('#hero-toggle').click();
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
      console.log(`${width}px: layout, links, ${SHOWCASE.length * 2} film variants, sound, style filters, touch targets, preview selection, pause, seeking, and reduced motion passed`);
      await page.close();
    }
    const fallback = await browser.newPage({ reducedMotion: 'reduce' });
    await fallback.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard unavailable'); } } });
    });
    await fallback.goto(origin);
    await fallback.locator('#copy-prompt').click();
    assert.equal(await fallback.locator('.prompt-details').getAttribute('open'), '');
    assert.equal(await fallback.locator('#installation-prompt').evaluate(input => input.selectionEnd - input.selectionStart), (await fallback.locator('#installation-prompt').inputValue()).length);
    await fallback.locator('#copy').click();
    assert.equal(await fallback.evaluate(() => getSelection().toString()), await fallback.locator('#commands').textContent());
    await fallback.close();
    const plain = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await plain.goto(origin);
    assert.equal(await plain.locator('#hero-video').getAttribute('controls'), '');
    assert.equal(await plain.locator('.film:visible').count(), SHOWCASE.length);
    assert.equal(await plain.locator('.studio-film:visible').count(),stories.length);
    assert.equal(await plain.locator('.studio-film video[controls]').count(),stories.length);
    assert.equal(await plain.locator('.film-filters').isVisible(), false);
    await plain.locator('.prompt-details summary').click();
    assert.ok((await plain.locator('#installation-prompt').inputValue()).startsWith('Set up Looplilt'));
    await plain.close();
    console.log('Unavailable clipboard and no-JavaScript fallbacks passed');
    for (const width of [320, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
      assert.equal(await page.locator('#hero-video').evaluate(video => video.paused), true);
      await page.screenshot({ path: path.join(folder, `site-${width}.png`), fullPage: true });
      await page.close();
      console.log(`${width}px: layout and reduced-motion startup passed`);
    }
  });
} finally { await server.close(); }
console.log(folder);

const mounted = await serveSite(site, { basePath: '/Looplilt' });
try {
  await withBrowser(async browser => {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.goto(mounted.origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://looplilt.com/');
    await page.locator('.remix-invitation .invitation-art[href="remix/"]').click();
    await page.waitForFunction(() => document.querySelector('#boot-status').textContent === '');
    assert.equal(await page.locator('#download').isDisabled(), false);
    assert.deepEqual(failures, []);
    await page.close();
  });
} finally { await mounted.close(); }
console.log('Repository-subpath navigation, relative assets, remixer boot, and canonical metadata passed');

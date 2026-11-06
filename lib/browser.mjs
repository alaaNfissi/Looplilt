import { chromium } from 'playwright';

export async function withBrowser(action, { signal, timeout = 900000 } = {}) {
  signal?.throwIfAborted();
  const server = await chromium.launchServer({
    headless: true, chromiumSandbox: true, timeout: 45000,
    ...(process.env.LOOPLILT_DISABLE_GPU === '1' ? { args: ['--disable-gpu'] } : {}),
    ...(process.env.LOOPLILT_BROWSER ? { executablePath: process.env.LOOPLILT_BROWSER } : {})
  });
  let timer, abort;
  try {
    const browser = await chromium.connect(server.wsEndpoint(), { timeout: 15000 });
    const cancelled = new Promise((_, reject) => {
      abort = () => { reject(signal?.reason ?? new Error('Browser operation cancelled')); };
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => reject(new Error('Browser operation exceeded ' + timeout / 1000 + 's')), timeout);
      if (signal?.aborted) abort();
    });
    return await Promise.race([action(browser), cancelled]);
  } finally {
    clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort);
    let cleanupTimer;
    const done = await Promise.race([
      server.close().then(() => true).catch(() => false),
      new Promise(resolve => { cleanupTimer = setTimeout(() => resolve(false), 3000); })
    ]);
    clearTimeout(cleanupTimer);
    if (!done) await server.kill();
  }
}

export async function filmPage(browser, html, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1,
    acceptDownloads: false, offline: true, serviceWorkers: 'block' });
  page.setDefaultTimeout(30000);
  await page.context().route('**/*', route => route.abort());
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
  page.on('popup', popup => popup.close().catch(() => {}));
  let failure;
  page.on('pageerror', error => { failure = error; });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => typeof window.Looplilt?.render === 'function');
  if (failure) throw failure;
  return page;
}
export async function framePng(page, time) {
  const data = await page.evaluate(t => {
    window.Looplilt.render(t);
    return document.querySelector('canvas').toDataURL('image/png').split(',')[1];
  }, time);
  return Buffer.from(data, 'base64');
}
export async function framePoster(page, time, type = 'png') {
  if (!['png', 'jpg'].includes(type)) throw new Error('Unknown poster type');
  if (type === 'png') return framePng(page, time);
  const data = await page.evaluate(t => {
    window.Looplilt.render(t);
    return document.querySelector('canvas').toDataURL('image/jpeg', 0.9).split(',')[1];
  }, time);
  return Buffer.from(data, 'base64');
}

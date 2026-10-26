import { chromium } from 'playwright';

export async function withBrowser(action) {
  const server = await chromium.launchServer({
    headless: true, chromiumSandbox: true, timeout: 45000,
    ...(process.env.LOOPLILT_BROWSER ? { executablePath: process.env.LOOPLILT_BROWSER } : {})
  });
  let browser;
  try {
    browser = await chromium.connect(server.wsEndpoint(), { timeout: 15000 });
    return await action(browser);
  } finally {
    // Limit cleanup time. Only the browser process created by this call is owned here.
    let timer;
    const done = await Promise.race([
      server.close().then(() => true).catch(() => false),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), 5000); })
    ]);
    clearTimeout(timer);
    if (!done) server.process().kill();
  }
}

export async function filmPage(browser, html, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: false });
  page.setDefaultTimeout(30000);
  await page.route('**/*', route => route.abort());
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

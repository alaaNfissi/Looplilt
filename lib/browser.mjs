import {awaitBounded} from './graph/async.mjs';
import { chromium } from 'playwright';

export async function withBrowser(action, { signal, timeout = 900000, graphics = process.env.LOOPLILT_DISABLE_GPU === '1' ? 'software' : 'auto', onLifecycle = () => {}, onCancel } = {}) {
  signal?.throwIfAborted();
  if (!['auto','software'].includes(graphics)) throw new Error('Choose automatic or software browser graphics');
  onLifecycle('launching');
  const server = await chromium.launchServer({
    headless: true, chromiumSandbox: true, timeout: 45000,
    ...(graphics === 'software' ? { args: ['--disable-gpu'] } : {}),
    ...(process.env.LOOPLILT_BROWSER ? { executablePath: process.env.LOOPLILT_BROWSER } : {})
  });
  onLifecycle('launched');
  let timer, abort, browser, actionPromise, cancellationReason;
  try {
    browser = await chromium.connect(server.wsEndpoint(), { timeout: 15000 });
    onLifecycle('connected');
    signal?.throwIfAborted();
    const cancelled = new Promise((_, reject) => {
      abort = () => { cancellationReason=signal?.reason??new Error('Browser operation cancelled');reject(cancellationReason); };
      signal?.addEventListener('abort', abort, { once: true });
      timer=setTimeout(()=>{cancellationReason=new Error('Browser operation exceeded '+timeout/1000+'s');reject(cancellationReason);},timeout);
      if (signal?.aborted) abort();
    });
    actionPromise=Promise.resolve().then(()=>action(browser));
    return await Promise.race([actionPromise,cancelled]);
  } finally {
    onLifecycle('closing');
    clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort);
    if(cancellationReason&&browser){
      onLifecycle('cancelling');
      if(onCancel)await awaitBounded(Promise.resolve().then(()=>onCancel(browser)),{timeout:1000,label:'Browser cooperative cancellation'}).catch(()=>{});
      if(actionPromise)await awaitBounded(actionPromise,{timeout:1000,label:'Browser action cleanup'}).catch(()=>{});
    }
    // Disconnect the owned client before stopping its browser server.
    // A stale remote connection must not hold shutdown open.
    if(browser)await awaitBounded(browser.close(),{timeout:1000,label:'Browser disconnect'}).catch(()=>{});
    let cleanupTimer;
    const done = await Promise.race([
      server.close().then(() => true).catch(() => false),
      new Promise(resolve => { cleanupTimer = setTimeout(() => resolve(false), 3000); })
    ]);
    clearTimeout(cleanupTimer);
    if (!done) { onLifecycle('terminating'); await server.kill(); }
    onLifecycle('closed');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOWCASE } from '../lib/catalog.mjs';
import { verifyDomain } from '../scripts/verify-domain.mjs';

function servedResponse(url, options = {}) {
  const target = url.replace(/^http:/, 'https:').replace('www.looplilt.com', 'looplilt.com')
    .replace('alaanfissi.github.io/Looplilt', 'looplilt.com');
  const types = { png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', js: 'text/javascript',
    mjs: 'text/javascript', css: 'text/css', txt: 'text/plain', xml: 'application/xml', mp4: 'video/mp4', looplilt:'application/octet-stream' };
  const extension = new URL(target).pathname.split('.').at(-1);
  const status = options.status ?? 200;
  return { status, ok: status >= 200 && status < 300, url: options.url ?? target,
    headers: new Headers({ 'content-type': options.type ?? types[extension] ?? 'text/html; charset=utf-8' }),
    text: async () => '<title>Looplilt</title><script src="/studio/_next/runtime.js"></script><link href="/studio/_next/style.css" rel="stylesheet">' };
}

test('domain verifier checks canonical routes and every showcase asset without downloading films', async () => {
  const calls = [];
  const result = await verifyDomain({ log: () => {}, fetcher: async (url, options) => {
    calls.push({ url, method: options.method ?? 'GET' });
    return servedResponse(url);
  } });
  assert.deepEqual(result, { routes: 10, assets: 22 + SHOWCASE.length * 5, films: SHOWCASE.length, studioFilms:3, runtimeAssets:2 });
  assert.equal(calls.filter(call => call.method === 'GET').length, 10);
  assert.equal(calls.filter(call => call.url.endsWith('.mp4')).length, SHOWCASE.length * 2 + 3);
  assert.ok(calls.some(call => call.url.endsWith('/media/one-more-light-portrait.mp4') && call.method === 'HEAD'));
  assert.ok(calls.some(call => call.url.endsWith('/media/neon-relay-landscape.jpg') && call.method === 'HEAD'));
  assert.ok(calls.some(call => call.url.endsWith('/play/the-missing-beat.html') && call.method === 'HEAD'));
  assert.ok(calls.some(call=>call.url.endsWith('/studio/stories/a-signal-for-the-garden.looplilt')&&call.method==='HEAD'));
  assert.ok(calls.some(call=>call.url.endsWith('/studio/_next/runtime.js')&&call.method==='HEAD'));
  assert.ok(calls.filter(call => call.url.endsWith('.mp4')).every(call => call.method === 'HEAD'));
});

test('domain verifier rejects a working page that fails to redirect to canonical HTTPS', async () => {
  await assert.rejects(verifyDomain({ log: () => {}, fetcher: async url =>
    servedResponse(url, url==='http://looplilt.com/'?{url}:{}) }), /http:\/\/looplilt\.com/);
});

test('domain verifier rejects a missing film', async () => {
  await assert.rejects(verifyDomain({ log: () => {}, fetcher: async url =>
    servedResponse(url, url.endsWith('/one-more-light-landscape.mp4') ? { status: 404 } : {}) }),
  /one-more-light-landscape\.mp4/);
});

test('domain verifier rejects an HTML fallback served instead of video', async () => {
  await assert.rejects(verifyDomain({ log: () => {}, fetcher: async url =>
    servedResponse(url, url.endsWith('/the-little-lift-portrait.mp4') ? { type: 'text/html' } : {}) }),
  /the-little-lift-portrait\.mp4/);
});

test('domain verifier rejects a broken editable-project download',async()=>{
 await assert.rejects(verifyDomain({log:()=>{},fetcher:async url=>servedResponse(url,url.endsWith('/the-last-light.looplilt')?{type:'text/html'}:{})}),/the-last-light\.looplilt/);
});

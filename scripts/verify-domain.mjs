import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { SHOWCASE } from '../lib/catalog.mjs';

const origin = 'https://looplilt.com/';
const stories=JSON.parse(await fs.readFile(new URL('../studio/stories.json',import.meta.url),'utf8'));
const routes = [
  [origin, origin],
  [origin + 'studio/', origin + 'studio/'],
  ['https://www.looplilt.com/studio/', origin + 'studio/'],
  ['https://alaanfissi.github.io/Looplilt/studio/', origin + 'studio/'],
  ['http://looplilt.com/', origin],
  ['https://www.looplilt.com/', origin],
  ['http://www.looplilt.com/', origin],
  ['https://alaanfissi.github.io/Looplilt/', origin],
  ['https://alaanfissi.github.io/Looplilt/remix/', origin + 'remix/'],
  ['https://alaanfissi.github.io/Looplilt/play/paper-garden.html', origin + 'play/paper-garden.html']
];
const scriptType = /^(?:application|text)\/(?:javascript|ecmascript)(?:;|$)/i;
const assets = [
  ...stories.flatMap(({slug})=>[
    ['media/'+slug+'-studio.mp4',/^video\/mp4(?:;|$)/i],
    ['media/'+slug+'-studio.png',/^image\/png(?:;|$)/i],
    ['studio/stories/'+slug+'.looplilt',/^application\/(?:octet-stream|x-looplilt-project)(?:;|$)/i]
  ]),
  ['assets/social-card.png', /^image\/png(?:;|$)/i],
  ['assets/icon.svg', /^image\/svg\+xml(?:;|$)/i],
  ['app.js', scriptType],
  ['style.css', /^text\/css(?:;|$)/i],
  ['remix/app.mjs', scriptType],
  ['remix/scene.mjs', scriptType],
  ['remix/audio-worker.js', scriptType],
  ['play/agent-trial-creation.html', /^text\/html(?:;|$)/i],
  ['play/agent-trial-revision.html', /^text\/html(?:;|$)/i],
  ['robots.txt', /^text\/plain(?:;|$)/i],
  ['sitemap.xml', /^(?:application|text)\/xml(?:;|$)/i],
  ...SHOWCASE.flatMap(({ slug, posterType }) => [
    [`play/${slug}.html`, /^text\/html(?:;|$)/i],
    ...['landscape', 'portrait'].flatMap(format => [
      [`media/${slug}-${format}.mp4`, /^video\/mp4(?:;|$)/i],
      [`media/${slug}-${format}.${posterType}`, posterType === 'jpg' ? /^image\/jpeg(?:;|$)/i : /^image\/png(?:;|$)/i]
    ])
  ])
];

// Fetch is injectable so redirect and missing-asset failures can be tested before cutover.
export async function verifyDomain({ fetcher = fetch, log = console.log } = {}) {
  const runtimeAssets=new Map();
  for (const [url, target] of routes) {
    const response = await fetcher(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, url);
    assert.equal(response.url, target, url);
    const html = await response.text();
    assert.ok(html.includes('Looplilt'), url);
    if(target===origin+'studio/') {
      const links=[...html.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css))(?:\?[^"<>]*)?"/g)].map(match=>new URL(match[1],target));
      assert.ok(links.length>0,'Studio must include its compiled runtime');
      for(const link of links){assert.equal(link.origin,new URL(origin).origin,'Studio runtime must stay on the canonical origin');assert.ok(link.pathname.startsWith('/studio/'),'Unexpected Studio runtime path');runtimeAssets.set(link.pathname.slice(1),link.pathname.endsWith('.css')?/^text\/css(?:;|$)/i:scriptType);}
    }
    log(url + ' → ' + response.url);
  }
  for (const [route, type] of [...assets,...runtimeAssets]) {
    const url = origin + route;
    // Availability and MIME checks avoid downloading every large film/player again.
    const response = await fetcher(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, route);
    assert.ok(response.ok, route);
    assert.equal(response.url, url, route);
    assert.match(response.headers.get('content-type') ?? '', type, route);
  }
  const result = { routes: routes.length, assets: assets.length + runtimeAssets.size, films: SHOWCASE.length, studioFilms:stories.length, runtimeAssets:runtimeAssets.size };
  log(`Domain HTTPS/redirect checks passed: ${result.routes} routes and ${result.assets} assets across ${result.films} films`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await verifyDomain();

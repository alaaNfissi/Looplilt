import assert from 'node:assert/strict';

const routes = [
  ['https://looplilt.com/', 'https://looplilt.com/'],
  ['http://looplilt.com/', 'https://looplilt.com/'],
  ['https://www.looplilt.com/', 'https://looplilt.com/'],
  ['http://www.looplilt.com/', 'https://looplilt.com/'],
  ['https://alaanfissi.github.io/Looplilt/', 'https://looplilt.com/'],
  ['https://alaanfissi.github.io/Looplilt/remix/', 'https://looplilt.com/remix/'],
  ['https://alaanfissi.github.io/Looplilt/play/paper-garden.html', 'https://looplilt.com/play/paper-garden.html']
];
for (const [url, target] of routes) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, url);
  assert.equal(response.url, target, url);
  const html = await response.text();
  assert.ok(html.includes('Looplilt'), url);
  console.log(url + ' → ' + response.url);
}
for (const route of ['assets/social-card.png', 'assets/icon.svg', 'remix/app.mjs', 'remix/scene.mjs', 'robots.txt', 'sitemap.xml']) {
  const response = await fetch('https://looplilt.com/' + route, { signal: AbortSignal.timeout(20000) });
  assert.ok(response.ok(), route);
  await response.arrayBuffer();
}
console.log('Domain routes, HTTPS requests, redirects, and key assets passed');

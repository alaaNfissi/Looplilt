import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
test('README contains the exact maintained setup prompt', async () => {
  const prompt = (await fs.readFile(path.join(root, 'docs/installation-prompt.txt'), 'utf8')).replaceAll('\r\n', '\n').trim();
  const readme = (await fs.readFile(path.join(root, 'README.md'), 'utf8')).replaceAll('\r\n', '\n');
  const block = readme.split('<!-- SETUP_PROMPT_START -->')[1].split('<!-- SETUP_PROMPT_END -->')[0];
  assert.equal(block.trim(), '```text\n' + prompt + '\n```');
});
test('website canonical metadata uses the official domain without a repository prefix', async () => {
  for (const [file, url] of [['site/index.html', 'https://looplilt.com/'], ['site/remix/index.html', 'https://looplilt.com/remix/']]) {
    const html = await fs.readFile(path.join(root, file), 'utf8');
    assert.ok(html.includes('rel="canonical" href="' + url + '"'));
    assert.ok(!html.includes('alaanfissi.github.io/Looplilt'));
  }
  assert.equal((await fs.readFile(path.join(root, 'site/CNAME'), 'utf8')).replaceAll('\r\n', '\n').trim(), 'looplilt.com');
});

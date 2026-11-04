import fs from 'node:fs/promises';
import { SHOWCASE } from '../lib/catalog.mjs';
import { galleryMarkup } from './gallery.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProject } from '../lib/project.mjs';
import { makeHtml } from '../lib/build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, '.site');
const source = path.join(root, 'site');
// Only the fixed generated directory owned by this script can be replaced.
try {
  const stat = await fs.lstat(target);
  const actual = await fs.realpath(target);
  if (stat.isSymbolicLink() || path.dirname(actual) !== await fs.realpath(root) || path.basename(actual) !== '.site') throw new Error('Refusing to replace unexpected site target');
  await fs.rm(target, { recursive: true });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
async function inspect(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Site assets must not be symlinks');
    if (entry.isDirectory()) await inspect(path.join(dir, entry.name));
  }
}
await inspect(source);
for (const { slug, posterType } of SHOWCASE) {
  for (const format of ['landscape', 'portrait']) for (const ext of ['mp4', posterType]) await fs.access(path.join(source, 'media', `${slug}-${format}.${ext}`));
}
await fs.cp(source, target, { recursive: true });
await fs.mkdir(path.join(target, 'play'), { recursive: true });
const greenhouse = await readProject(path.join(root, 'examples', 'paper-garden'));
const license = await fs.readFile(path.join(root, 'LICENSE'), 'utf8');
const moduleLiteral = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
await fs.writeFile(path.join(target, 'remix', 'scene.mjs'), greenhouse.drawing + '\nexport { drawFrame };\n');
await fs.writeFile(path.join(target, 'remix', 'source.mjs'), `export const project=${moduleLiteral(greenhouse.data)};\nexport const drawing=${moduleLiteral(greenhouse.drawing)};\nexport const license=${moduleLiteral(license)};\n`);
await fs.copyFile(path.join(root, 'lib', 'remix.mjs'), path.join(target, 'remix', 'model.mjs'));
await fs.copyFile(path.join(root, 'lib', 'store-zip.mjs'), path.join(target, 'remix', 'store-zip.mjs'));
const prompt = await fs.readFile(path.join(root, 'docs', 'installation-prompt.txt'), 'utf8');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const gallery = await galleryMarkup(root);
const index = await fs.readFile(path.join(target, 'index.html'), 'utf8');
await fs.writeFile(path.join(target, 'index.html'), index.replace('<!-- INSTALLATION_PROMPT -->', escape(prompt.trim())).replace('<!-- FILM_INDEX -->', gallery.index).replace('<!-- FILMS -->', gallery.cards));
for (const { slug, posterType } of SHOWCASE) {
  await fs.writeFile(path.join(target, 'play', `${slug}.html`), await makeHtml(await readProject(path.join(root, 'examples', slug))));
}
await fs.writeFile(path.join(target, '.nojekyll'), '');
console.log(target);

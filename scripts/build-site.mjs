import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
for (const slug of ['paper-garden', 'orbit-to-wave', 'tiny-delivery']) {
  for (const format of ['landscape', 'portrait']) for (const ext of ['mp4', 'png']) await fs.access(path.join(source, 'media', `${slug}-${format}.${ext}`));
  await fs.access(path.join(source, 'play', `${slug}.html`));
}
await fs.cp(source, target, { recursive: true });
await fs.writeFile(path.join(target, '.nojekyll'), '');
console.log(target);

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip, releaseEntries, portableSkillEntries, inventory, sha256 } from '../lib/archive.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await fs.mkdir(dist, { recursive: true });
if ((await fs.lstat(dist)).isSymbolicLink() || path.dirname(await fs.realpath(dist)) !== await fs.realpath(root)) throw new Error('Unexpected output folder');
const source = await releaseEntries(root);
const skill = portableSkillEntries(source);
const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?$/.test(version)) throw new Error('Invalid archive version');
const results = [];
for (const [name, entries] of [[`looplilt-source-${version}.zip`, source], [`looplilt-skill-${version}.zip`, skill]]) {
  const content = zip([...entries, { name: 'INVENTORY.json', data: inventory(entries) }]);
  const file = path.join(dist, name);
  try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('Archive target cannot be a symlink'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.writeFile(file, content);
  results.push({ name, bytes: content.length, files: entries.length + 1, sha256: sha256(content) });
}
await fs.writeFile(path.join(dist, `checksums-${version}.json`), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));

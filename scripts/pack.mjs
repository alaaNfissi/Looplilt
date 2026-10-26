import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip, releaseEntries, inventory, sha256 } from '../lib/archive.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await fs.mkdir(dist, { recursive: true });
if ((await fs.lstat(dist)).isSymbolicLink() || path.dirname(await fs.realpath(dist)) !== await fs.realpath(root)) throw new Error('Unexpected output folder');
const source = await releaseEntries(root);
const skill = source.filter(file => /^(bin|lib|examples|docs)\//.test(file.name) || ['LICENSE', 'package.json', 'package-lock.json'].includes(file.name)).map(file => ({ name: `runtime/${file.name}`, data: file.data }));
for (const file of source.filter(file => file.name.startsWith('skills/looplilt/'))) skill.push({ name: file.name.slice('skills/looplilt/'.length), data: file.data });
const results = [];
for (const [name, entries] of [['looplilt-source-0.1.0.zip', source], ['looplilt-skill-0.1.0.zip', skill]]) {
  const content = zip([...entries, { name: 'INVENTORY.json', data: inventory(entries) }]);
  const file = path.join(dist, name);
  try { if ((await fs.lstat(file)).isSymbolicLink()) throw new Error('Archive target cannot be a symlink'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.writeFile(file, content);
  results.push({ name, bytes: content.length, files: entries.length + 1, sha256: sha256(content) });
}
await fs.writeFile(path.join(dist, 'checksums.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));

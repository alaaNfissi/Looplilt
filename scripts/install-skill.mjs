import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseEntries, portableSkillEntries, inventory } from '../lib/archive.mjs';
import { writeNew } from '../lib/project.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function installSkill(destination) {
  if (typeof destination !== 'string' || !destination.trim()) throw new Error('Choose a new project skill folder');
  const target = path.resolve(destination);
  // Inspect and load the source before creating the destination; existing installs are never touched.
  const entries = portableSkillEntries(await releaseEntries(root));
  for (let parent = path.dirname(target); ; parent = path.dirname(parent)) {
    try { if ((await fs.lstat(parent)).isSymbolicLink()) throw new Error('Skill destination must not traverse a symlink'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (parent === path.dirname(parent)) break;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.mkdir(target); // EEXIST is intentional, including an existing empty folder or symlink.
  for (const entry of [...entries, { name: 'INVENTORY.json', data: inventory(entries) }]) {
    const file = path.resolve(target, entry.name);
    if (!file.startsWith(target + path.sep)) throw new Error('Unexpected portable entry path');
    await writeNew(file, entry.data);
  }
  return { skill: path.join(target, 'SKILL.md'), cli: path.join(target, 'runtime', 'bin', 'looplilt.mjs'), files: entries.length + 1 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) { console.error('Usage: node scripts/install-skill.mjs <new-skill-folder>'); process.exitCode = 1; }
  else installSkill(process.argv[2]).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(`Looplilt: ${error.message}`); process.exitCode = 1; });
}

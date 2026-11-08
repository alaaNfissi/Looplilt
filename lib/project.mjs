import fs from 'node:fs/promises';
import path from 'node:path';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
import { validateProject } from './project-schema.mjs';
export { FORMATS, validateParams, validateProject, dimensions } from './project-schema.mjs';
const fail = message => { throw new Error(message); };

export async function readProject(directory) {
  const root = await fs.realpath(directory);
  async function ownFile(name) {
    const file = path.join(root, name), stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(name + ' must be a regular file in the project folder');
    if (stat.size > 2 * 1024 * 1024) fail(name + ' exceeds 2 MiB');
    return fs.readFile(file, 'utf8');
  }
  const source = await ownFile('project.json'), original = JSON.parse(source), data = validateProject(original);
  const drawing = await ownFile('draw.js');
  new Script('(() => { ' + drawing + '\n; return drawFrame; })()', { filename: 'draw.js' });
  if (!/\bfunction\s+drawFrame\s*\(/.test(drawing)) fail('draw.js must declare function drawFrame(scene)');
  const hash = createHash('sha256').update(source).update('\0').update(drawing).digest('hex');
  return { root, data, drawing, source, original, hash };
}
export async function writeNew(file, content) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await fs.writeFile(file, content, { flag: 'wx' });
  return path.resolve(file);
}

import {studioSourceEntries,studioRuntimeEntries} from './studio/distribution.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const table = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// A deterministic ZIP32 writer for small release bundles. No filesystem extraction.
export function zip(entries) {
  const local = [], central = [], names = new Set();
  let offset = 0, centralSize = 0;
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.name || entry.name.includes('\\') || entry.name.startsWith('/') || entry.name.split('/').some(part => ['.', '..', ''].includes(part)) || /^[A-Za-z]:/.test(entry.name) || names.has(entry.name)) throw new Error(`Unsafe or duplicate ZIP entry: ${entry.name}`);
    names.add(entry.name);
    const name = Buffer.from(entry.name), data = Buffer.from(entry.data), packed = deflateRawSync(data, { level: 9 }), crc = crc32(data);
    if (name.length > 65535 || data.length > 0xffffffff || packed.length > 0xffffffff || offset > 0xffffffff) throw new Error('Bundle exceeds ZIP32 limits');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14); header.writeUInt32LE(packed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, packed);
    const item = Buffer.alloc(46);
    item.writeUInt32LE(0x02014b50, 0); item.writeUInt16LE(20, 4); item.writeUInt16LE(20, 6); item.writeUInt16LE(0x800, 8); item.writeUInt16LE(8, 10);
    item.writeUInt16LE(33, 14); item.writeUInt32LE(crc, 16); item.writeUInt32LE(packed.length, 20); item.writeUInt32LE(data.length, 24); item.writeUInt16LE(name.length, 28); item.writeUInt32LE(offset, 42);
    central.push(item, name); centralSize += item.length + name.length; offset += header.length + name.length + packed.length;
  }
  if (entries.length > 65535 || centralSize + offset > 0xffffffff) throw new Error('Bundle exceeds ZIP32 limits');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

const rootFiles = ['LICENSE', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'package.json', 'package-lock.json', '.gitignore', '.gitattributes'];
const rootFolders = ['bin', 'lib', 'examples', 'docs', 'scripts', 'skills', 'site', 'test', '.github'];
export async function releaseEntries(root,{requireStudio=false}={}) {
  const entries = [];
  async function visit(relative) {
    // The site build regenerates standalone players from the examples.
    if (relative === 'site/play') return;
    const absolute = path.join(root, relative), info = await fs.lstat(absolute);
    if (info.isSymbolicLink()) throw new Error(`Release cannot contain a symlink: ${relative}`);
    if (info.isDirectory()) {
      for (const child of (await fs.readdir(absolute)).sort()) {
        if (child === 'node_modules' || child.startsWith('.') || /\.(?:log|pem|key|p12)$/i.test(child)) throw new Error(`Unexpected release content: ${relative}/${child}`);
        await visit(`${relative}/${child}`);
      }
    } else {
      if (!info.isFile()) throw new Error(`Not a regular release file: ${relative}`);
      entries.push({ name: relative, data: await fs.readFile(absolute) });
    }
  }
  for (const item of [...rootFiles, ...rootFolders]) await visit(item);
  entries.push(...await studioSourceEntries(root),...await studioRuntimeEntries(root,{required:requireStudio}));
  return entries;
}

export function inventory(entries) {
  return Buffer.from(JSON.stringify(entries.map(({ name, data }) => ({ path: name, bytes: data.length, sha256: sha256(data) })).sort((a, b) => a.path.localeCompare(b.path, 'en')), null, 2) + '\n');
}

// The portable skill contains execution essentials, not website or launch media.
export function portableSkillEntries(source) {
  const skill = source.filter(file => /^(bin|lib|examples)\//.test(file.name) || file.name.startsWith('studio/apps/web/out/') || /^docs\/.*\.(md|txt)$/.test(file.name) || /^docs\/next-generation\/[^/]+\.json$/.test(file.name) || ['LICENSE', 'package.json', 'package-lock.json'].includes(file.name)).map(file => ({ name: `runtime/${file.name}`, data: file.data }));
  for (const file of source.filter(file => file.name.startsWith('skills/looplilt/'))) skill.push({ name: file.name.slice('skills/looplilt/'.length), data: file.data });
  return skill;
}

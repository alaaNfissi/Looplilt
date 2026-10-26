import fs from 'node:fs/promises';
import path from 'node:path';
import { Script } from 'node:vm';

export const FORMATS = Object.freeze({ landscape: [1280, 720], portrait: [720, 1280], square: [960, 960] });
const fail = message => { throw new Error(message); };
function number(value, label, low, high) {
  if (!Number.isFinite(value) || value < low || value > high) fail(`${label} must be between ${low} and ${high}`);
}
function sentence(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label} must be text of 1–${max} characters`);
}

export function validateProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('project.json must contain an object');
  if (input.version !== 1) fail('project.json version must be 1');
  sentence(input.title, 'title', 100);
  number(input.duration, 'duration', 0.5, 600);
  number(input.fps, 'fps', 1, 60);
  if (!Number.isInteger(input.fps)) fail('fps must be an integer');
  if (Math.abs(input.duration * input.fps - Math.round(input.duration * input.fps)) > 1e-7) fail('duration × fps must be a whole number of frames');
  const captions = input.captions ?? [];
  if (!Array.isArray(captions) || captions.length > 1000) fail('captions must be an array of at most 1000 cues');
  let end = 0;
  for (const [i, cue] of captions.entries()) {
    number(cue.start, `caption ${i} start`, end, input.duration);
    number(cue.end, `caption ${i} end`, cue.start + 0.01, input.duration);
    sentence(cue.text, `caption ${i} text`, 180);
    end = cue.end;
  }
  const score = input.score ?? [];
  if (!Array.isArray(score) || score.length > 10000) fail('score must be an array of at most 10000 notes');
  for (const [i, note] of score.entries()) {
    number(note.at, `note ${i} at`, 0, input.duration);
    number(note.length, `note ${i} length`, 0.02, Math.max(0.02, input.duration - note.at));
    if (note.at + note.length > input.duration + 1e-7) fail(`note ${i} extends past the film`);
    number(note.pitch, `note ${i} MIDI pitch`, 24, 108);
    number(note.gain ?? 0.2, `note ${i} gain`, 0, 1);
    if (!['bell', 'soft', 'pluck', 'tick'].includes(note.voice ?? 'soft')) fail(`note ${i} has an unknown voice`);
  }
  return { version: 1, title: input.title, duration: input.duration, fps: input.fps, captions, score };
}

export async function readProject(directory) {
  const root = await fs.realpath(directory);
  async function ownFile(name) {
    const file = path.join(root, name);
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${name} must be a regular file in the project folder`);
    if (stat.size > 2 * 1024 * 1024) fail(`${name} exceeds 2 MiB`);
    return fs.readFile(file, 'utf8');
  }
  const data = validateProject(JSON.parse(await ownFile('project.json')));
  const drawing = await ownFile('draw.js');
  new Script(`(() => { ${drawing}\n; return drawFrame; })()`, { filename: 'draw.js' });
  if (!/\bfunction\s+drawFrame\s*\(/.test(drawing)) fail('draw.js must declare function drawFrame(scene)');
  return { root, data, drawing };
}

export function dimensions(format = 'landscape') {
  if (!Object.hasOwn(FORMATS, format)) fail('format must be landscape, portrait, or square');
  return FORMATS[format];
}

export async function writeNew(file, content) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await fs.writeFile(file, content, { flag: 'wx' });
  return path.resolve(file);
}

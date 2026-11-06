import { STUDIO_VOICES } from './studio-sound.mjs';
import { scoreFor } from './music.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';

export const FORMATS = Object.freeze({ landscape: [1280, 720], portrait: [720, 1280], square: [960, 960] });
const fail = message => { throw new Error(message); };
function number(value, label, low, high) {
  if (!Number.isFinite(value) || value < low || value > high) fail(label + ' must be between ' + low + ' and ' + high);
}
function sentence(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(label + ' must be text of 1–' + max + ' characters');
}
function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' must be an object');
  if (keys) for (const key of Object.keys(value)) if (!keys.includes(key)) fail(label + ': unknown field ' + key);
}
const identifier = (value, label) => { if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(value)) fail(label + ' must be a lowercase stable identifier'); };
export function validateParams(value = {}) {
  object(value, 'scene.params');
  if (Object.keys(value).length > 32) fail('A scene supports at most 32 parameters');
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-z][a-zA-Z0-9_]{0,47}$/.test(key) || ['constructor', 'prototype'].includes(key)) fail('Unsafe scene parameter: ' + key);
    if (typeof item === 'number') number(item, 'parameter ' + key, -1000000, 1000000);
    else if (typeof item === 'string') { if (item.length > 200) fail('Parameter text exceeds 200 characters'); }
    else if (typeof item !== 'boolean') fail('Scene parameters must be numbers, text, or booleans');
  }
  return { ...value };
}
function timeline(input) {
  const scenes = input.scenes, cues = input.cues;
  const aligned = (value, label) => { if (Math.abs(value * input.fps - Math.round(value * input.fps)) > 1e-7) fail(label + ' must fall on a frame boundary'); };
  if (scenes !== undefined) {
    if (!Array.isArray(scenes) || scenes.length < 1 || scenes.length > 128) fail('scenes must contain 1–128 shots');
    const ids = new Set(); let previous = 0;
    for (const scene of scenes) {
      object(scene, 'scene', ['id', 'label', 'start', 'end', 'description', 'params']);
      identifier(scene.id, 'scene.id');
      if (ids.has(scene.id)) fail('Duplicate scene: ' + scene.id);
      ids.add(scene.id); sentence(scene.label, 'scene.label', 80);
      if (scene.description !== undefined) sentence(scene.description, 'scene.description', 500);
      number(scene.start, 'scene.start', 0, input.duration); number(scene.end, 'scene.end', scene.start + 1 / input.fps - 1e-8, input.duration);
      aligned(scene.start, 'scene.start'); aligned(scene.end, 'scene.end');
      if (Math.abs(scene.start - previous) > 1e-7) fail('Scenes must cover the film in order without gaps or overlap');
      previous = scene.end; validateParams(scene.params);
    }
    if (Math.abs(previous - input.duration) > 1e-7) fail('The last scene must end at the film duration');
  }
  if (cues !== undefined) {
    if (!Array.isArray(cues) || cues.length > 512) fail('cues must be an array of at most 512 items');
    const ids = new Set();
    for (const cue of cues) {
      object(cue, 'cue', ['id', 'at', 'label']); identifier(cue.id, 'cue.id');
      if (ids.has(cue.id)) fail('Duplicate cue: ' + cue.id);
      ids.add(cue.id); number(cue.at, 'cue.at', 0, input.duration); aligned(cue.at, 'cue.at');
      if (cue.label !== undefined) sentence(cue.label, 'cue.label', 100);
    }
  }
}
export function validateProject(input) {
  object(input, 'project.json');
  if (input.version !== 1) fail('project.json version must be 1');
  sentence(input.title, 'title', 100);
  number(input.duration, 'duration', 0.5, 600);
  number(input.fps, 'fps', 1, 60);
  if (!Number.isInteger(input.fps)) fail('fps must be an integer');
  if (Math.abs(input.duration * input.fps - Math.round(input.duration * input.fps)) > 1e-7) fail('duration × fps must be a whole number of frames');
  timeline(input);
  const audio = input.audio;
  if (audio !== undefined) {
    object(audio, 'audio', ['mode', 'room', 'delay', 'echoSeconds']);
    if (audio.mode !== 'studio') fail('audio.mode must be studio');
    number(audio.room ?? .2, 'audio room', 0, 1);
    number(audio.delay ?? 0, 'audio delay', 0, 1);
    number(audio.echoSeconds ?? .375, 'audio echoSeconds', .05, 1.5);
  }
  if (input.music && !audio) fail('Music tracks require audio.mode studio');
  const captions = input.captions ?? [];
  if (!Array.isArray(captions) || captions.length > 1000) fail('captions must be an array of at most 1000 cues');
  let end = 0;
  for (const [i, cue] of captions.entries()) {
    object(cue, 'caption ' + i);
    number(cue.start, 'caption ' + i + ' start', end, input.duration);
    number(cue.end, 'caption ' + i + ' end', cue.start + 0.01, input.duration);
    sentence(cue.text, 'caption ' + i + ' text', 180);
    end = cue.end;
  }
  const score = input.score ?? [];
  if (!Array.isArray(score) || score.length > 10000) fail('score must be an array of at most 10000 notes');
  const allNotes = scoreFor({ ...input, score });
  for (const track of input.music?.tracks ?? []) {
    if (!['soft', 'bell', 'pluck', 'tick', 'chip', ...STUDIO_VOICES].includes(track.voice ?? 'soft')) fail('Unknown music track voice: ' + track.voice);
  }
  if (allNotes.length > 10000) fail('Combined score and music exceed 10000 notes');
  let work = 0;
  for (const [i, note] of allNotes.entries()) {
    object(note, 'note ' + i);
    number(note.at, 'note ' + i + ' at', 0, input.duration);
    number(note.length, 'note ' + i + ' length', 0.02, Math.max(0.02, input.duration - note.at));
    if (note.at + note.length > input.duration + 1e-7) fail('note ' + i + ' extends past the film');
    number(note.pitch, 'note ' + i + ' MIDI pitch', 24, 108);
    number(note.gain ?? 0.2, 'note ' + i + ' gain', 0, 1);
    number(note.pan ?? 0, 'note pan', -1, 1);
    number(note.send ?? .22, 'note send', 0, 1);
    if (!audio && (STUDIO_VOICES.includes(note.voice) || note.pan !== undefined || note.send !== undefined)) fail('Studio voices, music tracks, pan, and sends require audio.mode studio');
    if (!['bell', 'soft', 'pluck', 'tick', 'chip', ...STUDIO_VOICES].includes(note.voice ?? 'soft')) fail('note ' + i + ' has an unknown voice');
    work += note.length;
  }
  if (work > 12000) fail('Score exceeds 12000 combined note-seconds; simplify sustained layers before synthesis');
  return { version: 1, title: input.title, duration: input.duration, fps: input.fps, captions, score,
    ...(audio ? { audio } : {}), ...(input.scenes ? { scenes: input.scenes } : {}),
    ...(input.cues ? { cues: input.cues } : {}), ...(input.music ? { music: input.music } : {}) };
}

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
export function dimensions(format = 'landscape') {
  if (!Object.hasOwn(FORMATS, format)) fail('format must be landscape, portrait, or square');
  return FORMATS[format];
}
export async function writeNew(file, content) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await fs.writeFile(file, content, { flag: 'wx' });
  return path.resolve(file);
}

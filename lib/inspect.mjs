import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readProject, validateProject, validateParams, FORMATS, writeNew } from './project.mjs';
import { scoreFor } from './music.mjs';

export async function inspectProject(directory) {
  const project = await readProject(directory), data = project.data, notes = scoreFor(data);
  const warnings = [];
  if (!data.scenes) warnings.push({ code: 'UNNAMED_SCENES', kind: 'authoring', message: 'This legacy project has no named scenes. It still builds and renders; add scenes to enable shot navigation and parameter revisions.' });
  if (!notes.some(n => (n.gain ?? .2) > 0)) warnings.push({ code: 'SILENT_SCORE', kind: 'information', message: 'The procedural score is silent. A supplied narration recording can still be mixed during export.' });
  for (const [index, cue] of data.captions.entries()) {
    const cps = [...cue.text].length / (cue.end - cue.start);
    if (cps > 22) warnings.push({ code: 'FAST_CAPTION', kind: 'reading-heuristic', caption: index, charactersPerSecond: Number(cps.toFixed(1)), message: 'Consider more reading time. This is a heuristic, not a readability verdict.' });
  }
  return {
    reportVersion: 1, title: data.title, sourceHash: project.hash,
    duration: data.duration, fps: data.fps, frames: Math.round(data.duration * data.fps), formats: FORMATS,
    scenes: (data.scenes ?? []).map(s => ({ ...s, params: s.params ?? {}, startFrame: Math.round(s.start * data.fps), endFrameExclusive: Math.round(s.end * data.fps) })),
    cues: data.cues ?? [], captions: data.captions,
    audio: { mode: data.audio?.mode ?? 'mono', events: notes.length, explicitEvents: data.score.length,
      voices: [...new Set(notes.map(n => n.voice ?? 'soft'))], tracks: data.music?.tracks.map(t => ({ id: t.id, voice: t.voice ?? 'soft', clips: t.clips.length })) ?? [],
      bpm: data.music?.bpm ?? null, patterns: data.music?.patterns.map(p => ({ id: p.id, beats: p.beats, notes: p.notes.length })) ?? [],
      pcmBytesAt48k: 44 + Math.round(data.duration * 48000) * (data.audio ? 4 : 2) },
    assets: { model: 'Self-contained Canvas source and procedural sound; no external assets loaded by the engine.' },
    validation: { valid: true, drawingExecuted: false, warnings },
    requirements: { html: ['Node.js 22+', 'Browser with Canvas and Web Workers; PCM fallback available'],
      frameAndVideo: ['Pinned Playwright Chromium with sandbox enabled'], video: ['FFmpeg', 'FFprobe'] }
  };
}

export async function reviseProject(directory, patch, output) {
  const project = await readProject(directory);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Revision patch must be an object');
  for (const key of Object.keys(patch)) if (!['version', 'expectedSourceHash', 'changes'].includes(key)) throw new Error('Unknown patch field: ' + key);
  if (patch.version !== 1) throw new Error('Revision patch version must be 1');
  if (patch.expectedSourceHash !== project.hash) throw new Error('Source changed or wrong project: inspect again and review the patch before retrying');
  if (!Array.isArray(patch.changes) || !patch.changes.length || patch.changes.length > 128) throw new Error('Use 1–128 scene parameter changes');
  const original = structuredClone(project.original), changed = [], seen = new Set();
  for (const change of patch.changes) {
    if (!change || typeof change !== 'object' || Array.isArray(change) || Object.keys(change).some(k => !['scene', 'params'].includes(k))) throw new Error('A change contains scene and params only');
    if (seen.has(change.scene)) throw new Error('Combine changes to the same scene');
    seen.add(change.scene);
    const scene = original.scenes?.find(s => s.id === change.scene);
    if (!scene) throw new Error('Unknown scene: ' + change.scene);
    const params = validateParams(change.params);
    if (!Object.keys(params).length) throw new Error('Specify at least one parameter');
    for (const [key, value] of Object.entries(params)) {
      if (!Object.hasOwn(scene.params ?? {}, key)) throw new Error('Unknown parameter ' + key + ' in ' + scene.id);
      if (typeof value !== typeof scene.params[key]) throw new Error('Keep the existing parameter type for ' + key);
      changed.push({ scene: scene.id, parameter: key, before: scene.params[key], after: value });
      scene.params[key] = value;
    }
  }
  validateProject(original);
  // Read optional notices before creating anything; never follow project symlinks.
  const extras = [];
  for (const name of ['LICENSE', 'README.md']) {
    try {
      const stat = await fs.lstat(path.join(project.root, name));
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error(name + ' must be a regular file under 2 MiB');
      extras.push([name, await fs.readFile(path.join(project.root, name))]);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const target = path.resolve(output);
  await fs.mkdir(path.dirname(target), { recursive: true }); await fs.mkdir(target);
  await writeNew(path.join(target, 'project.json'), JSON.stringify(original, null, 2) + '\n');
  await writeNew(path.join(target, 'draw.js'), project.drawing);
  for (const [name, bytes] of extras) await writeNew(path.join(target, name), bytes);
  const next = await readProject(target);
  const report = { reportVersion: 1, sourceHashBefore: project.hash, sourceHashAfter: next.hash,
    drawingUnchanged: true, changed, note: 'Only these source parameters changed. Inspect frames to confirm the drawing uses them as intended.' };
  await writeNew(path.join(target, 'REVISION.json'), JSON.stringify(report, null, 2) + '\n');
  return { directory: target, ...report };
}

export async function exportFrame(directory, output, { at = 0, scene, format = 'landscape', signal } = {}) {
  if (path.extname(output).toLowerCase() !== '.png') throw new Error('Frame output must end in .png');
  const project = await readProject(directory);
  if (scene) {
    const shot = project.data.scenes?.find(s => s.id === scene);
    if (!shot) throw new Error('Unknown scene: ' + scene);
    at = shot.start + at;
    if (at >= shot.end) throw new Error('Frame time falls outside the selected scene');
  }
  if (!Number.isFinite(at) || at < 0 || at >= project.data.duration) throw new Error('Frame time must be inside the film');
  const frame = Math.floor(at * project.data.fps + 1e-7), time = frame / project.data.fps;
  const { dimensions } = await import('./project.mjs');
  const { withBrowser, filmPage, framePng } = await import('./browser.mjs');
  const { makeHtml } = await import('./build.mjs');
  const [width, height] = dimensions(format);
  try { await fs.lstat(output); throw new Error('Output already exists: ' + output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return withBrowser(async browser => {
    const page = await filmPage(browser, await makeHtml(project, format, { sound: false }), width, height);
    const start = performance.now(), png = await framePng(page, time);
    const elapsedMs = performance.now() - start;
    await framePng(page, 0);
    if (!png.equals(await framePng(page, time))) throw new Error('Frame depends on seek history');
    const file = await writeNew(output, png);
    return { file, sourceHash: project.hash, format, width, height, requestedTime: at, time, frame,
      scene: project.data.scenes?.find(s => time >= s.start && time < s.end)?.id ?? null,
      sha256: createHash('sha256').update(png).digest('hex'), captureMs: Math.round(elapsedMs), deterministic: true };
  }, { signal, timeout: 60000 });
}

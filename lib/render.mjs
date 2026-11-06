import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readProject, dimensions, writeNew } from './project.mjs';
import { makeHtml } from './build.mjs';
import { makeSound } from './sound.mjs';
import { withBrowser, filmPage, framePng } from './browser.mjs';
import { run } from './process.mjs';

export const ffmpeg = () => process.env.LOOPLILT_FFMPEG || 'ffmpeg';
export const ffprobe = () => process.env.LOOPLILT_FFPROBE || 'ffprobe';
async function absent(file) {
  try { await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Output already exists: ${file}. Choose a new filename.`);
}

export function renderRange(data, { scene, from, to } = {}) {
  if (scene && (from !== undefined || to !== undefined)) throw new Error('Choose a scene or a time range, not both');
  let start = from ?? 0, end = to ?? data.duration;
  if (scene) {
    const shot = data.scenes?.find(item => item.id === scene);
    if (!shot) throw new Error('Unknown scene: ' + scene);
    start = shot.start; end = shot.end;
  }
  for (const value of [start, end]) {
    if (!Number.isFinite(value) || value < 0 || value > data.duration) throw new Error('Range must stay within the film');
    if (Math.abs(value * data.fps - Math.round(value * data.fps)) > 1e-7) throw new Error('Range endpoints must fall on frame boundaries');
  }
  if (end <= start) throw new Error('Range end must be after start');
  const firstFrame = Math.round(start * data.fps), lastFrame = Math.round(end * data.fps);
  return { start, end, firstFrame, frames: lastFrame - firstFrame, duration: (lastFrame - firstFrame) / data.fps, ...(scene ? { scene } : {}) };
}

export async function renderProject(directory, output, { format = 'landscape', workers = 2, narration, scene, from, to,
  signal, timeout = 1800000, onProgress = () => {} } = {}) {
  signal?.throwIfAborted();
  if (!Number.isInteger(workers) || workers < 1 || workers > 8) throw new Error('workers must be an integer from 1 to 8');
  if (!Number.isFinite(timeout) || timeout < 100 || timeout > 3600000) throw new Error('Render timeout must be 100–3600000 ms');
  if (path.extname(output).toLowerCase() !== '.mp4') throw new Error('Video output must end in .mp4');
  const target = path.resolve(output);
  await absent(target);
  const project = await readProject(directory), range = renderRange(project.data, { scene, from, to });
  const [width, height] = dimensions(format);
  const deadline = AbortSignal.timeout(timeout), cancellation = signal ? AbortSignal.any([signal, deadline]) : deadline;
  await run(ffmpeg(), ['-version'], { signal: cancellation });
  await run(ffprobe(), ['-version'], { signal: cancellation });
  if (narration) {
    narration = await fs.realpath(narration);
    const info = await probe(narration, { signal: cancellation });
    if (!info.streams.some(stream => stream.codec_type === 'audio')) throw new Error('Narration file has no audio track');
    if (Number(info.format.duration) > project.data.duration + 0.1) throw new Error('Narration is longer than the film. Adjust the project timing first.');
  }
  const html = await makeHtml(project, format, { sound: false });
  const parent = await fs.realpath(os.tmpdir()), temp = await fs.mkdtemp(path.join(parent, 'looplilt-'));
  const started = performance.now(), frames = range.frames;
  let peakBufferedBytes = 0, encodedPngBytes = 0;
  try {
    await fs.writeFile(path.join(temp, 'score.wav'), makeSound(project.data));
    cancellation.throwIfAborted();
    const staging = path.join(temp, 'film.mp4');
    await withBrowser(async browser => {
      const pages = await Promise.all(Array.from({ length: Math.min(workers, frames) }, () => filmPage(browser, html, width, height)));
      const hash = png => createHash('sha256').update(png).digest('hex');
      for (const anchor of new Set([Math.min(1.75, project.data.duration / 2), (range.start + range.end) / 2])) {
        const first = await framePng(pages[0], anchor);
        await framePng(pages[0], 0);
        if (hash(first) !== hash(await framePng(pages[0], anchor)) || hash(first) !== hash(await framePng(pages.at(-1), anchor))) throw new Error('Drawing depends on frame history or page state. Derive animation from t before rendering.');
      }
      async function* orderedFrames() {
        let finished = 0;
        for (let base = 0; base < frames; base += pages.length) {
          cancellation.throwIfAborted();
          const batch = await Promise.all(pages.slice(0, Math.min(pages.length, frames - base)).map((page, index) =>
            framePng(page, (range.firstFrame + base + index) / project.data.fps)));
          peakBufferedBytes = Math.max(peakBufferedBytes, batch.reduce((sum, png) => sum + png.length, 0));
          for (const png of batch) {
            encodedPngBytes += png.length; yield png; finished++;
            if (finished % 60 === 0 || finished === frames) onProgress({ finished, frames, phase: 'encode' });
          }
        }
      }
      const inputs = ['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file,pipe',
        '-f', 'image2pipe', '-framerate', String(project.data.fps), '-vcodec', 'png', '-i', 'pipe:0',
        '-protocol_whitelist', 'file,pipe', '-i', path.join(temp, 'score.wav')];
      if (narration) inputs.push('-protocol_whitelist', 'file,pipe', '-i', narration);
      const trim = 'atrim=start=' + range.start + ':end=' + range.end + ',asetpts=PTS-STARTPTS';
      const audioFilter = narration
        ? '[1:a]' + trim + ',volume=0.3[bed];[2:a]apad,' + trim + '[voice];[bed][voice]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]'
        : '[1:a]' + trim + ',loudnorm=I=-16:TP=-1.5:LRA=11[a]';
      await run(ffmpeg(), [...inputs, '-filter_complex', audioFilter, '-map', '0:v', '-map', '[a]',
        '-vf', 'scale=iw:ih:in_range=full:out_range=tv:out_color_matrix=bt709',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(range.duration), '-movflags', '+faststart', staging],
        { timeout, signal: cancellation, input: orderedFrames() });
    }, { signal: cancellation, timeout });
    const report = await checkVideo(staging, { width, height, frames, fps: project.data.fps, duration: range.duration }, { signal: cancellation });
    cancellation.throwIfAborted();
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(staging, target, constants.COPYFILE_EXCL);
    return { file: target, ...report, range, pipeline: 'ordered-png-stream',
      metrics: { elapsedMs: Math.round(performance.now() - started), peakBufferedPngBytes: peakBufferedBytes, encodedPngBytes, temporaryPngFiles: 0 } };
  } finally {
    const resolved = await fs.realpath(temp);
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('looplilt-') && !(await fs.lstat(temp)).isSymbolicLink()) {
      await fs.rm(temp, { recursive: true, force: true });
    }
  }
}

export async function probe(file, options = {}) {
  const { stdout } = await run(ffprobe(), ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_streams', '-show_format', '-of', 'json', path.resolve(file)], options);
  return JSON.parse(stdout);
}

export async function checkVideo(file, expected = {}, options = {}) {
  const info = await probe(file, options);
  const video = info.streams.find(stream => stream.codec_type === 'video');
  const audio = info.streams.find(stream => stream.codec_type === 'audio');
  if (!video || !audio) throw new Error('The MP4 must contain both video and audio');
  if (video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p') throw new Error('Expected H.264 yuv420p video');
  if (audio.codec_name !== 'aac') throw new Error('Expected AAC audio');
  const [num, den] = video.avg_frame_rate.split('/').map(Number);
  const fps = num / den;
  const actual = { width: video.width, height: video.height, fps, frames: Number(video.nb_frames), duration: Number(info.format.duration), video: video.codec_name, audio: audio.codec_name, colorSpace: video.color_space ?? 'unspecified' };
  for (const key of ['width', 'height', 'fps', 'frames']) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) throw new Error(`Expected ${key}=${expected[key]}, got ${actual[key]}`);
  }
  if (expected.duration !== undefined && Math.abs(actual.duration - expected.duration) > 0.08) throw new Error('Encoded duration does not match the project');
  await run(ffmpeg(), ['-v', 'error', '-i', path.resolve(file), '-f', 'null', '-'], { timeout: 600000, ...options });
  return actual;
}

export async function storyboard(directory, output, format = 'landscape', { scene, signal } = {}) {
  if (path.extname(output).toLowerCase() !== '.png') throw new Error('Storyboard output must end in .png');
  await absent(output);
  const project = await readProject(directory);
  const [width, height] = dimensions(format);
  const range = renderRange(project.data, { scene });
  return withBrowser(async browser => {
    const page = await filmPage(browser, await makeHtml(project, format, { sound: false }), width, height);
    const data = await page.evaluate(range => {
      const canvas = document.querySelector('canvas'), project = window.Looplilt.data;
      const sheet = document.createElement('canvas');
      const tw = 360, th = Math.round(tw * canvas.height / canvas.width), gap = 18;
      sheet.width = tw * 3 + gap * 4; sheet.height = (th + 32) * 2 + gap * 3;
      const ctx = sheet.getContext('2d'); ctx.fillStyle = '#172824'; ctx.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < 6; i++) {
        const t = Math.min(range.end - 1 / project.fps, range.start + range.duration * i / 5);
        window.Looplilt.render(t);
        const x = gap + (i % 3) * (tw + gap), y = gap + Math.floor(i / 3) * (th + 32 + gap);
        ctx.drawImage(canvas, x, y, tw, th); ctx.fillStyle = '#f5f2e8'; ctx.font = '14px sans-serif'; ctx.fillText(`${t.toFixed(1)} s`, x, y + th + 23);
      }
      return sheet.toDataURL('image/png').split(',')[1];
    }, range);
    return writeNew(output, Buffer.from(data, 'base64'));
  }, { signal, timeout: 60000 });
}

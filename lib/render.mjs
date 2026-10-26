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

export async function renderProject(directory, output, { format = 'landscape', workers = 2, narration, onProgress = () => {} } = {}) {
  if (!Number.isInteger(workers) || workers < 1 || workers > 8) throw new Error('workers must be an integer from 1 to 8');
  if (path.extname(output).toLowerCase() !== '.mp4') throw new Error('Video output must end in .mp4');
  const target = path.resolve(output);
  await absent(target);
  const project = await readProject(directory);
  const [width, height] = dimensions(format);
  await run(ffmpeg(), ['-version']);
  await run(ffprobe(), ['-version']);
  if (narration) {
    narration = await fs.realpath(narration);
    const info = await probe(narration);
    if (!info.streams.some(stream => stream.codec_type === 'audio')) throw new Error('Narration file has no audio track');
    if (Number(info.format.duration) > project.data.duration + 0.1) throw new Error('Narration is longer than the film. Adjust the project timing first.');
  }
  const html = await makeHtml(project, format, { sound: false });
  const parent = await fs.realpath(os.tmpdir());
  const temp = await fs.mkdtemp(path.join(parent, 'looplilt-'));
  const frames = Math.round(project.data.duration * project.data.fps);
  try {
    let next = 0, finished = 0;
    await withBrowser(async browser => {
      const pages = await Promise.all(Array.from({ length: workers }, () => filmPage(browser, html, width, height)));
      const hash = png => createHash('sha256').update(png).digest('hex');
      const anchor = Math.min(1.75, project.data.duration / 2);
      const first = await framePng(pages[0], anchor);
      await framePng(pages[0], 0);
      const again = await framePng(pages[0], anchor);
      const other = await framePng(pages.at(-1), anchor);
      if (hash(first) !== hash(again) || hash(first) !== hash(other)) throw new Error('Drawing depends on frame history or page state. Derive animation from t before rendering.');
      await Promise.all(pages.map(async page => {
        while (next < frames) {
          const frame = next++;
          const png = await framePng(page, frame / project.data.fps);
          await fs.writeFile(path.join(temp, `${String(frame).padStart(6, '0')}.png`), png);
          finished++;
          if (finished % 60 === 0 || finished === frames) onProgress({ finished, frames });
        }
      }));
    });
    await fs.writeFile(path.join(temp, 'score.wav'), makeSound(project.data));
    const inputs = ['-hide_banner', '-loglevel', 'error', '-framerate', String(project.data.fps), '-i', path.join(temp, '%06d.png'), '-i', path.join(temp, 'score.wav')];
    if (narration) inputs.push('-i', narration);
    const audioFilter = narration
      ? '[1:a]volume=0.3[bed];[2:a]apad[voice];[bed][voice]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]'
      : '[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]';
    const staging = path.join(temp, 'film.mp4');
    await run(ffmpeg(), [...inputs, '-filter_complex', audioFilter, '-map', '0:v', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(project.data.duration), '-movflags', '+faststart', staging], { timeout: 600000 });
    const report = await checkVideo(staging, { width, height, frames, fps: project.data.fps, duration: project.data.duration });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(staging, target, constants.COPYFILE_EXCL);
    return { file: target, ...report };
  } finally {
    const resolved = await fs.realpath(temp);
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('looplilt-') && !(await fs.lstat(temp)).isSymbolicLink()) {
      await fs.rm(temp, { recursive: true, force: true });
    }
  }
}

export async function probe(file) {
  const { stdout } = await run(ffprobe(), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.resolve(file)]);
  return JSON.parse(stdout);
}

export async function checkVideo(file, expected = {}) {
  const info = await probe(file);
  const video = info.streams.find(stream => stream.codec_type === 'video');
  const audio = info.streams.find(stream => stream.codec_type === 'audio');
  if (!video || !audio) throw new Error('The MP4 must contain both video and audio');
  if (video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p') throw new Error('Expected H.264 yuv420p video');
  if (audio.codec_name !== 'aac') throw new Error('Expected AAC audio');
  const [num, den] = video.avg_frame_rate.split('/').map(Number);
  const fps = num / den;
  const actual = { width: video.width, height: video.height, fps, frames: Number(video.nb_frames), duration: Number(info.format.duration), video: video.codec_name, audio: audio.codec_name };
  for (const key of ['width', 'height', 'fps', 'frames']) {
    if (expected[key] !== undefined && actual[key] !== expected[key]) throw new Error(`Expected ${key}=${expected[key]}, got ${actual[key]}`);
  }
  if (expected.duration !== undefined && Math.abs(actual.duration - expected.duration) > 0.08) throw new Error('Encoded duration does not match the project');
  await run(ffmpeg(), ['-v', 'error', '-i', path.resolve(file), '-f', 'null', '-'], { timeout: 600000 });
  return actual;
}

export async function storyboard(directory, output, format = 'landscape') {
  if (path.extname(output).toLowerCase() !== '.png') throw new Error('Storyboard output must end in .png');
  await absent(output);
  const project = await readProject(directory);
  const [width, height] = dimensions(format);
  return withBrowser(async browser => {
    const page = await filmPage(browser, await makeHtml(project, format, { sound: false }), width, height);
    const data = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), project = window.Looplilt.data;
      const sheet = document.createElement('canvas');
      const tw = 360, th = Math.round(tw * canvas.height / canvas.width), gap = 18;
      sheet.width = tw * 3 + gap * 4; sheet.height = (th + 32) * 2 + gap * 3;
      const ctx = sheet.getContext('2d'); ctx.fillStyle = '#172824'; ctx.fillRect(0, 0, sheet.width, sheet.height);
      for (let i = 0; i < 6; i++) {
        const t = Math.min(project.duration - 1 / project.fps, project.duration * i / 5);
        window.Looplilt.render(t);
        const x = gap + (i % 3) * (tw + gap), y = gap + Math.floor(i / 3) * (th + 32 + gap);
        ctx.drawImage(canvas, x, y, tw, th); ctx.fillStyle = '#f5f2e8'; ctx.font = '14px sans-serif'; ctx.fillText(`${t.toFixed(1)} s`, x, y + th + 23);
      }
      return sheet.toDataURL('image/png').split(',')[1];
    });
    return writeNew(output, Buffer.from(data, 'base64'));
  });
}

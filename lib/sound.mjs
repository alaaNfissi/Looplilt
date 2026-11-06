import { makePcmSound } from './synth.mjs';
import { scoreFor } from './music.mjs';

export function makeSound(project, sampleRate = 48000) {
  return Buffer.from(makePcmSound({ ...project, score: scoreFor(project) }, sampleRate));
}

export function captionsVtt(project) {
  const stamp = seconds => {
    const ms = Math.round(seconds * 1000);
    return [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60]
      .map(n => String(n).padStart(2, '0')).join(':') + '.' + String(ms % 1000).padStart(3, '0');
  };
  return 'WEBVTT\n\n' + project.captions.map(c => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}\n`).join('\n');
}

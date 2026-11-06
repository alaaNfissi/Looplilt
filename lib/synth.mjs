import { encodePcm } from './pcm.mjs';
import { makeStudioSound } from './studio-sound.mjs';
// A small, deterministic mono synthesizer. The score is data; no sound files are needed.
export function makePcmSound(project, sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 1000 || sampleRate > 96000 || project.duration * sampleRate > 57600000) throw new Error('Use a sample rate of 1000–96000 Hz within the 600-second limit');
  if (project.audio?.mode === 'studio') return makeStudioSound(project, sampleRate);
  const count = Math.round(project.duration * sampleRate);
  const samples = new Float32Array(count);
  for (const note of project.score) {
    const start = Math.round(note.at * sampleRate);
    const length = Math.round(note.length * sampleRate);
    const frequency = 440 * 2 ** ((note.pitch - 69) / 12);
    const voice = note.voice ?? 'soft';
    const chipHarmonics = [1, 3, 5, 7, 9].filter(n => n * frequency < sampleRate / 2);
    const chipWeight = chipHarmonics.reduce((sum, n) => sum + 1 / n, 0) || 1;
    for (let i = 0; i < length && start + i < count; i++) {
      const seconds = i / sampleRate;
      const phase = 2 * Math.PI * frequency * seconds;
      const attack = Math.min(1, seconds / 0.012);
      const release = Math.min(1, (length - 1 - i) / (sampleRate * 0.08));
      let tone = Math.sin(phase), decay = 1;
      if (voice === 'bell') {
        tone = (Math.sin(phase) + 0.25 * Math.sin(phase * 2.01) + 0.1 * Math.sin(phase * 3.97)) / 1.35;
        decay = Math.exp(-seconds * 3.5);
      } else if (voice === 'pluck') {
        tone = (Math.sin(phase) + 0.35 * Math.sin(phase * 2) + 0.15 * Math.sin(phase * 3)) / 1.5;
        decay = Math.exp(-seconds * 5);
      } else if (voice === 'chip') {
        // Odd harmonics give a rounded square tone; exclude those above Nyquist.
        tone = chipHarmonics.reduce((sum, n) => sum + Math.sin(phase * n) / n, 0) / chipWeight;
      } else if (voice === 'tick') {
        tone = Math.sin(phase * (1 + 1.8 * Math.exp(-seconds * 50)));
        decay = Math.exp(-seconds * 24);
      }
      samples[start + i] += tone * attack * release * decay * (note.gain ?? 0.2);
    }
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > 0.85 ? 0.85 / peak : 1;
  return encodePcm([samples], sampleRate, scale);
}

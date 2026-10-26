// A small, deterministic mono synthesizer. The score is data; no sound files are needed.
export function makeSound(project, sampleRate = 48000) {
  const count = Math.round(project.duration * sampleRate);
  const samples = new Float32Array(count);
  for (const note of project.score) {
    const start = Math.round(note.at * sampleRate);
    const length = Math.round(note.length * sampleRate);
    const frequency = 440 * 2 ** ((note.pitch - 69) / 12);
    const voice = note.voice ?? 'soft';
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
  const wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) wav.writeInt16LE(Math.round(samples[i] * scale * 32767), 44 + i * 2);
  return wav;
}

export function captionsVtt(project) {
  const stamp = seconds => {
    const ms = Math.round(seconds * 1000);
    return [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60]
      .map(n => String(n).padStart(2, '0')).join(':') + '.' + String(ms % 1000).padStart(3, '0');
  };
  return 'WEBVTT\n\n' + project.captions.map(c => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}\n`).join('\n');
}

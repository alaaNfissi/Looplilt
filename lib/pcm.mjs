// Shared PCM encoder; identical bytes in Node and a browser worker.
export function encodePcm(channels, rate, scale = 1) {
  const count = channels[0].length, block = channels.length * 2;
  const bytes = new Uint8Array(44 + count * block), view = new DataView(bytes.buffer);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels.length, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * block, true);
  view.setUint16(32, block, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, count * block, true);
  for (let i = 0; i < count; i++) for (let channel = 0; channel < channels.length; channel++) {
    view.setInt16(44 + i * block + channel * 2, Math.round(channels[channel][i] * scale * 32767), true);
  }
  return bytes;
}

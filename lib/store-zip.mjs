// Small, uncompressed ZIPs for browser source downloads. No extraction or dependencies.
const table = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
export function storeZip(entries) {
  if (!Array.isArray(entries) || entries.length > 20) throw new Error('Expected a small source bundle');
  const encoder = new TextEncoder(), local = [], central = [], names = new Set();
  let offset = 0, centralSize = 0;
  for (const entry of entries) {
    if (typeof entry.name !== 'string' || !/^[a-zA-Z0-9_./-]+$/.test(entry.name) || entry.name.startsWith('/') || entry.name.split('/').some(part => ['', '.', '..'].includes(part)) || names.has(entry.name)) throw new Error('Unsafe or duplicate ZIP path');
    if (typeof entry.data !== 'string') throw new Error('Expected UTF-8 source text');
    names.add(entry.name);
    const name = encoder.encode(entry.name), data = encoder.encode(entry.data), crc = crc32(data);
    if (name.length > 256 || data.length + offset > 2 * 1024 * 1024) throw new Error('Source bundle is too large');
    const header = new Uint8Array(30), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 33, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    local.push(header, name, data);
    const item = new Uint8Array(46), c = new DataView(item.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(item, name); centralSize += item.length + name.length; offset += header.length + name.length + data.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const bytes of [...local, ...central, end]) { output.set(bytes, cursor); cursor += bytes.length; }
  return output;
}

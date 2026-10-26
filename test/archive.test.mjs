import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { zip, inventory, sha256 } from '../lib/archive.mjs';

test('release ZIP round-trips bytes and has consistent directory offsets', () => {
  const entries = [{ name: 'a/b.txt', data: Buffer.from('A small story.\n') }, { name: 'LICENSE', data: Buffer.from('Copyright Alaa Nfissi') }];
  const result = zip(entries), end = result.length - 22, start = result.readUInt32LE(end + 16);
  assert.equal(result.readUInt32LE(end), 0x06054b50); assert.equal(result.readUInt16LE(end + 10), 2);
  let cursor = start;
  for (let i = 0; i < 2; i++) {
    assert.equal(result.readUInt32LE(cursor), 0x02014b50);
    const size = result.readUInt32LE(cursor + 20), nameLength = result.readUInt16LE(cursor + 28), offset = result.readUInt32LE(cursor + 42);
    const name = result.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    assert.equal(result.readUInt32LE(offset), 0x04034b50);
    assert.deepEqual(inflateRawSync(result.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size)), entries.find(entry => entry.name === name).data);
    cursor += 46 + nameLength;
  }
  assert.equal(cursor, end); assert.deepEqual(result, zip(entries.reverse()));
});
test('archive rejects path traversal, duplicate names and drive paths', () => {
  for (const name of ['../x', '/x', 'x/../y', 'C:/x', 'x\\y', 'x//y']) assert.throws(() => zip([{ name, data: '' }]));
  assert.throws(() => zip([{ name: 'x', data: '' }, { name: 'x', data: '' }]));
});
test('inventory hashes match the actual bytes', () => {
  const entries = [{ name: 'LICENSE', data: Buffer.from('one') }];
  assert.deepEqual(JSON.parse(inventory(entries)), [{ path: 'LICENSE', bytes: 3, sha256: sha256(Buffer.from('one')) }]);
});

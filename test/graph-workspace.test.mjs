import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GraphWorkspace, scopedPath } from '../lib/graph/workspace.mjs';
import { createGraph } from '../lib/graph/schema.mjs';
import { serializeGraph } from '../lib/graph/transactions.mjs';

async function removeTestDirectory(directory) {
  const temp = await fs.realpath(os.tmpdir()), resolved = await fs.realpath(directory);
  assert.equal(path.dirname(resolved), temp);
  assert.match(path.basename(resolved), /^looplilt-(?:workspace|outside)-test-/);
  await fs.rm(resolved, { recursive: true, force: true });
}

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'looplilt-workspace-test-'));
  t.after(() => removeTestDirectory(root));
  return { root, store: await GraphWorkspace.open(root) };
}
const rename = (fingerprint, title) => ({ expectedFingerprint: fingerprint, label: 'Rename film', operations: [{ op: 'project.patch', changes: { title } }] });

test('workspace creates, reopens, checkpoints and restores an ordinary graph file', async t => {
  const { root, store } = await workspace(t), document = createGraph({ id: 'first-film' });
  assert.deepEqual(await store.list(), []);
  const initial = await store.create(document);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'projects/first-film/project.looplilt.json'), 'utf8')), document);
  await assert.rejects(store.create(document), { code: 'EEXIST' });
  await store.checkpoint(document.id, initial.fingerprint);
  const changed = await store.transact(document.id, rename(initial.fingerprint, 'The night train'));
  const reopened = await GraphWorkspace.open(root);
  assert.equal((await reopened.read(document.id)).document.title, 'The night train');
  assert.equal((await reopened.list())[0].fingerprint, changed.fingerprint);
  const restored = await reopened.restore(document.id, initial.fingerprint, changed.fingerprint);
  assert.equal(restored.document.title, document.title);
  assert.equal(restored.document.revision, 2);
  assert.notEqual(restored.fingerprint, initial.fingerprint);
  assert.ok((await reopened.history(document.id)).recovery.includes(changed.fingerprint));
});

test('two independent workspace clients cannot overwrite the same inspected revision', async t => {
  const { root, store } = await workspace(t), state = await store.create(createGraph({ id: 'shared' }));
  const other = await GraphWorkspace.open(root);
  const results = await Promise.allSettled([
    store.transact('shared', rename(state.fingerprint, 'Human edit')),
    other.transact('shared', rename(state.fingerprint, 'Agent edit')),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejectedIndex=results.findIndex(result=>result.status==='rejected'),error=results[rejectedIndex].reason;
  // A bounded lock wait can expire on a slow disk. Neither response may overwrite
  // the winner; retrying the same inspected revision must then conflict.
  assert.ok(['REVISION_CONFLICT','PROJECT_BUSY'].includes(error.code));
  await assert.rejects((rejectedIndex===0?store:other).transact('shared',rename(state.fingerprint,'Stale retry')),{code:'REVISION_CONFLICT'});
  assert.equal((await store.read('shared')).document.revision, 1);
  await assert.rejects(fs.access(path.join(root, 'projects/shared/edit.lock')), { code: 'ENOENT' });
});

test('undo/redo persists across clients and retains optimistic concurrency', async t => {
  const { root, store } = await workspace(t), initial = await store.create(createGraph({ id: 'history-film' }));
  const changed = await store.transact('history-film', rename(initial.fingerprint, 'Changed'));
  await assert.rejects(store.transact('history-film', rename(initial.fingerprint, 'Stale')), { code: 'REVISION_CONFLICT' });
  assert.equal((await store.history('history-film')).undo.length, 1);
  const undone = await store.undoRedo('history-film', 'undo', changed.fingerprint);
  assert.equal(undone.document.title, initial.document.title);
  const redone = await store.undoRedo('history-film', 'redo', undone.fingerprint);
  assert.equal(redone.document.title, 'Changed');
  assert.equal(redone.document.revision, 3);
  const other = await GraphWorkspace.open(root);
  const external = await other.transact('history-film', rename(redone.fingerprint, 'Newer edit'));
  await assert.rejects(store.undoRedo('history-film', 'undo', redone.fingerprint), { code: 'REVISION_CONFLICT' });
  const fresh = await GraphWorkspace.open(root);
  assert.equal((await fresh.history('history-film')).undo.length, 2);
  const sharedUndo = await fresh.undoRedo('history-film', 'undo', external.fingerprint);
  assert.equal(sharedUndo.document.title, 'Changed');
  assert.equal(sharedUndo.document.revision, 5);
  const sharedRedo = await store.undoRedo('history-film', 'redo', sharedUndo.fingerprint);
  assert.equal(sharedRedo.document.title, 'Newer edit');
  assert.equal(sharedRedo.document.revision, 6);
});

test('malformed edits and cancelled saves preserve the canonical file', async t => {
  const { root, store } = await workspace(t), initial = await store.create(createGraph({ id: 'protected' }));
  const file = path.join(root, 'projects/protected/project.looplilt.json'), bytes = await fs.readFile(file);
  await assert.rejects(store.transact('protected', { ...rename(initial.fingerprint, 'Invalid'), operations: [{ op: 'node.remove', id: 'root' }] }));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(store.transact('protected', rename(initial.fingerprint, 'Cancelled'), { signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(await fs.readFile(file), bytes);
  await fs.writeFile(path.join(root, 'projects/protected/pending-interrupted.json'), '{broken');
  assert.equal((await store.read('protected')).fingerprint, initial.fingerprint);
});

test('a held or abandoned lock is not removed by a waiting client', async t => {
  const { root, store } = await workspace(t), state = await store.create(createGraph({ id: 'locked' }));
  const file = path.join(root, 'projects/locked/edit.lock');
  await fs.writeFile(file, 'held by another process');
  await assert.rejects(store.transact('locked', rename(state.fingerprint, 'No'), { signal: AbortSignal.timeout(60) }), error => ['AbortError', 'TimeoutError'].includes(error.name));
  assert.equal(await fs.readFile(file, 'utf8'), 'held by another process');
  assert.equal((await store.read('locked')).fingerprint, state.fingerprint);
});

test('recovery rejects tampered copies without changing the current project', async t => {
  const { root, store } = await workspace(t), state = await store.create(createGraph({ id: 'checked' }));
  await store.checkpoint('checked', state.fingerprint);
  const tampered = { ...state.document, title: 'Tampered' };
  await fs.writeFile(path.join(root, `projects/checked/history/${state.fingerprint}.json`), serializeGraph(tampered));
  await assert.rejects(store.restore('checked', state.fingerprint, state.fingerprint), /does not match/);
  assert.equal((await store.read('checked')).fingerprint, state.fingerprint);
});

test('workspace paths reject traversal, devices, alternate streams and symlink descendants', async t => {
  const { root, store } = await workspace(t);
  for (const relative of ['../outside', '/absolute', 'C:/outside', 'safe/../../outside', 'CON', 'file.txt:secret', 'a\\b', 'a//b']) {
    await assert.rejects(scopedPath(root, relative, { missingLeaf: true }));
  }
  await assert.rejects(store.create(createGraph({ id: 'MixedCase' })), /lowercase/);
  const external = await fs.mkdtemp(path.join(os.tmpdir(), 'looplilt-outside-test-'));
  t.after(() => removeTestDirectory(external));
  try { await fs.symlink(external, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (error.code === 'EPERM') { t.diagnostic('OS did not permit the symlink fixture'); return; } throw error; }
  await assert.rejects(scopedPath(root, 'linked/asset.png', { missingLeaf: true }), /Symbolic links/);
});

test('oversized project files fail before JSON allocation', async t => {
  const { root, store } = await workspace(t);
  await store.create(createGraph({ id: 'oversized' }));
  const handle = await fs.open(path.join(root, 'projects/oversized/project.looplilt.json'), 'r+');
  await handle.truncate(9 * 1024 * 1024); await handle.close();
  await assert.rejects(store.read('oversized'), /at most 8 MiB/);
});

 test('an interrupted prepared revision cannot replace the active history; tampered journals cannot mutate it', async t => {
  const {root,store}=await workspace(t),state=await store.create(createGraph({id:'journal-film'}));
  const changed=await store.transact('journal-film',rename(state.fingerprint,'Saved film'));
  const history=path.join(root,'projects/journal-film/history');
  await fs.writeFile(path.join(history,'0'.repeat(64)+'.journal.json'),'{interrupted');
  const reopened=await GraphWorkspace.open(root);
  assert.equal((await reopened.read('journal-film')).fingerprint,changed.fingerprint);
  assert.equal((await reopened.history('journal-film')).undo.length,1);
  const active=path.join(history,changed.fingerprint+'.journal.json'),journal=JSON.parse(await fs.readFile(active,'utf8'));
  journal.undo[0].label='Changed without checksum';await fs.writeFile(active,JSON.stringify(journal));
  const primary=path.join(root,'projects/journal-film/project.looplilt.json'),original=await fs.readFile(primary);
  await assert.rejects(reopened.undoRedo('journal-film','undo',changed.fingerprint),/integrity/);
  assert.deepEqual(await fs.readFile(primary),original);
 });

test('revision comparison reports only changed fields, paginates history and rejects corrupted snapshots',async t=>{
 const {store,root}=await workspace(t),initial=await store.create(createGraph({id:'compare-film'}));
 const changed=await store.transact('compare-film',rename(initial.fingerprint,'An original story'));
 const report=await store.compare('compare-film',{fromFingerprint:initial.fingerprint});
 assert.equal(report.fromFingerprint,initial.fingerprint);assert.equal(report.toFingerprint,changed.fingerprint);
 assert.deepEqual(report.counts,{nodes:{added:0,removed:0,changed:0},assets:{added:0,removed:0,changed:0}});
 assert.deepEqual(report.items[0].fields,['revision','title']);
 await store.checkpoint('compare-film',changed.fingerprint);
 const first=await store.history('compare-film',{limit:1}),second=await store.history('compare-film',{offset:first.nextOffset,limit:1});
 assert.equal(first.total,2);assert.equal(second.nextOffset,null);assert.notEqual(first.recovery[0],second.recovery[0]);
 const saved=path.join(root,'projects/compare-film/history/'+initial.fingerprint+'.json');
 const broken=JSON.parse(await fs.readFile(saved,'utf8'));broken.title='Corrupt recovery';await fs.writeFile(saved,serializeGraph(broken));
 await assert.rejects(store.compare('compare-film',{fromFingerprint:initial.fingerprint}),/integrity/);
 assert.equal((await store.read('compare-film')).fingerprint,changed.fingerprint);
});

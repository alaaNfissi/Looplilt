import test from 'node:test';
import assert from 'node:assert/strict';
import { createGraph, createNode, validateGraph } from '../lib/graph/schema.mjs';
import { graphFingerprint, applyTransaction, ProjectSession, RevisionConflict } from '../lib/graph/transactions.mjs';

function film() {
  const project = createGraph({ id: 'transaction-film' });
  for (const id of ['subject', 'unchanged']) {
    project.nodes[id] = createNode({ id, type: 'rectangle', parentId: 'root' });
    project.nodes.root.children.push(id);
  }
  return project;
}
const patch = (id, x) => ({ op: 'node.patch', id, changes: { transform: { x } } });
const request = (fingerprint, operations, label = 'Move the subject') => ({ expectedFingerprint: fingerprint, operations, label });

test('a failed atomic edit preserves all original nodes and metadata', async () => {
  const project = film(), before = JSON.stringify(project), fingerprint = await graphFingerprint(project);
  await assert.rejects(applyTransaction(project, request(fingerprint, [patch('subject', 120), patch('unknown', 20)])), /Unknown node/);
  assert.equal(JSON.stringify(project), before);
  const result = await applyTransaction(project, request(fingerprint, [patch('subject', 120)]));
  assert.equal(result.document.nodes.subject.transform.x, 120);
  assert.deepEqual(result.document.nodes.unchanged, project.nodes.unchanged);
  assert.deepEqual(result.changedNodes, ['subject']);
  assert.notEqual(result.fingerprint, fingerprint);
  assert.equal(JSON.stringify(project), before);
  await assert.rejects(applyTransaction(result.document, request(fingerprint, [patch('subject', 30)])), RevisionConflict);
});

test('simultaneous clients cannot overwrite one another and undo/redo advance revisions', async () => {
  const session = await ProjectSession.open(film());
  const base = session.getSnapshot().fingerprint;
  const results = await Promise.allSettled([
    session.transact(request(base, [patch('subject', 120)])),
    session.transact(request(base, [patch('unchanged', 300)], 'Stale edit')),
  ]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
  assert.ok(results[1].reason instanceof RevisionConflict);
  assert.equal(session.getSnapshot().document.nodes.unchanged.transform.x, 0);
  assert.ok(Object.isFrozen(session.getSnapshot().document.nodes.subject.transform));
  const undone = await session.undo(session.getSnapshot().fingerprint);
  assert.equal(undone.document.nodes.subject.transform.x, 0); assert.equal(undone.document.revision, 2);
  const redone = await session.redo(undone.fingerprint);
  assert.equal(redone.document.nodes.subject.transform.x, 120); assert.equal(redone.document.revision, 3);
  await assert.rejects(session.undo(undone.fingerprint), RevisionConflict);
  await session.undo(redone.fingerprint);
  await session.transact(request(session.getSnapshot().fingerprint, [patch('subject', 200)]));
  await assert.rejects(session.redo(session.getSnapshot().fingerprint), /Nothing to redo/);
});

test('fractional-speed split preserves exact source offsets across repeated cuts', async () => {
  const project = film();
  project.nodes.subject.time.duration = 9; project.nodes.subject.time.speed = { numerator: 1, denominator: 3 };
  const result = await applyTransaction(project, request(await graphFingerprint(project), [
    { op: 'clip.split', id: 'subject', at: 2, newId: 'middle' },
    { op: 'clip.split', id: 'middle', at: 4, newId: 'last' },
  ], 'Cut the slowed clip'));
  assert.deepEqual(result.document.nodes.middle.time.offset, { numerator: 2, denominator: 3 });
  assert.deepEqual(result.document.nodes.last.time.offset, { numerator: 4, denominator: 3 });
  assert.deepEqual(['subject', 'middle', 'last'].map(id => result.document.nodes[id].time.duration), [2, 2, 5]);
  assert.deepEqual(result.document.nodes.root.children, ['subject', 'middle', 'last', 'unchanged']);
  validateGraph(result.document);
});

test('locks and graph references require explicit edits rather than destructive repair', async () => {
  const project = film(); project.nodes.subject.locked = true;
  await assert.rejects(applyTransaction(project, request(await graphFingerprint(project), [patch('subject', 40)])), /locked/);
  const unlocked = await applyTransaction(project, request(await graphFingerprint(project), [
    { op: 'node.patch', id: 'subject', changes: { locked: false } }, patch('subject', 40),
  ]));
  unlocked.document.nodes.unchanged.mask = { nodeId: 'subject', mode: 'alpha' };
  const before = JSON.stringify(unlocked.document), base = await graphFingerprint(unlocked.document);
  await assert.rejects(applyTransaction(unlocked.document, request(base, [{ op: 'node.remove', id: 'subject' }])), /invalid mask/);
  assert.equal(JSON.stringify(unlocked.document), before);
});

test('missing plugin content survives a supported edit without interpretation or normalization', async () => {
  const project = film(); project.nodes.unchanged.type = 'demo:future';
  project.nodes.unchanged.props = { payload: ['retained', { amount: 42 }] };
  const original = JSON.stringify(project.nodes.unchanged);
  const result = await applyTransaction(project, request(await graphFingerprint(project), [patch('subject', 50)]));
  assert.equal(JSON.stringify(result.document.nodes.unchanged), original);
  assert.equal(result.unsupported.length, 1);
});

test('view errors do not roll back state, no-op edits retain history, and history is bounded', async () => {
  const session = await ProjectSession.open(film(), { historyBytes: 0 });
  session.subscribe(() => { throw new Error('View failed'); });
  const changed = await session.transact(request(session.getSnapshot().fingerprint, [patch('subject', 50)]));
  assert.equal(session.getSnapshot().document.nodes.subject.transform.x, 50);
  assert.equal(session.history().undo.length, 0);
  const unchanged = await session.transact(request(changed.fingerprint, [patch('subject', 50)]));
  assert.equal(unchanged.noop, true); assert.equal(unchanged.fingerprint, changed.fingerprint);
});


test('trims preserve source animation time and can restore earlier source with exact rational offsets',async()=>{
 const p=film();p.nodes.subject.time.speed={numerator:1,denominator:3};p.nodes.subject.animations['transform.x']=[{frame:0,value:0},{frame:90,value:900}];
 const before=JSON.stringify(p);let result=await applyTransaction(p,request(await graphFingerprint(p),[{op:'clip.trim',id:'subject',start:7,end:100}],'Trim source'));
 assert.deepEqual(result.document.nodes.subject.time.offset,{numerator:7,denominator:3});assert.equal(result.document.nodes.subject.time.duration,93);
 assert.deepEqual(result.document.nodes.subject.animations,p.nodes.subject.animations);assert.deepEqual(result.document.nodes.unchanged,p.nodes.unchanged);
 result=await applyTransaction(result.document,request(result.fingerprint,[{op:'clip.trim',id:'subject',start:1}],'Extend left'));
 assert.deepEqual(result.document.nodes.subject.time.offset,{numerator:1,denominator:3});
 result=await applyTransaction(result.document,request(result.fingerprint,[{op:'clip.trim',id:'subject',start:0,end:300}],'Restore full interval'));
 assert.deepEqual(result.document.nodes.subject,p.nodes.subject);assert.equal(JSON.stringify(p),before);
 const shifted=film();shifted.nodes.subject.time.start=20;
 await assert.rejects(applyTransaction(shifted,request(await graphFingerprint(shifted),[{op:'clip.trim',id:'subject',start:19}])) ,/beginning of the source/);
});

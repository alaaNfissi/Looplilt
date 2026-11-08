import test from 'node:test';
import assert from 'node:assert/strict';
import { createGraph, createNode, validateGraph, assetPath, assertJson } from '../lib/graph/schema.mjs';
import { NodeRegistry } from '../lib/graph/registry.mjs';

function scene() {
  const project = createGraph({ id: 'test-film', title: 'A small orbit', frameRate: { numerator: 30000, denominator: 1001 } });
  const group = createNode({ id: 'orbit', parentId: 'root' });
  const planet = createNode({ id: 'planet', type: 'ellipse', parentId: 'orbit' });
  project.nodes.root.children.push(group.id);
  group.children.push(planet.id);
  project.nodes.orbit = group; project.nodes.planet = planet;
  return project;
}

test('graph serialization preserves exact rate, nested hierarchy and opaque extension data', () => {
  const project = scene();
  project.extensions['test:editor'] = { selection: ['planet'], note: '<script>data only</script>' };
  project.nodes.planet.animations['transform.x'] = [{ frame: 0, value: 20 }, { frame: 300, value: 200, easing: 'ease-out' }];
  const before = JSON.stringify(project);
  assert.deepEqual(validateGraph(project).evaluationOrder, ['root', 'orbit', 'planet']);
  assert.equal(JSON.stringify(project), before);
  assert.deepEqual(JSON.parse(before), project);
  assert.equal(project.frameRate.numerator, 30000);
});

test('graph rejects orphaned nodes, inconsistent parents and dependency cycles', () => {
  const orphan = scene(); orphan.nodes.orbit.children = [];
  assert.throws(() => validateGraph(orphan), /orphaned/);
  const wrongParent = scene(); wrongParent.nodes.planet.parentId = 'root';
  assert.throws(() => validateGraph(wrongParent), /relationships disagree/);
  const cycle = scene(); cycle.nodes.orbit.constraints = [{ type: 'follow', target: 'planet', offsetX: 0, offsetY: 0 }];
  assert.throws(() => validateGraph(cycle), /dependency cycle/);
  const maskCycle = scene(); maskCycle.nodes.orbit.mask = { nodeId: 'planet', mode: 'alpha' };
  assert.throws(() => validateGraph(maskCycle), /dependency cycle/);
  const wrongId = scene(); wrongId.nodes.root.children = [1];
  assert.throws(() => validateGraph(wrongId), /stable ID/);
});

test('unknown node payload round trips but cannot pass export validation without its registered type', () => {
  const project = scene();
  project.nodes.planet.type = 'example:globe';
  project.nodes.planet.props = { latitude: 12.5 };
  const before = JSON.stringify(project);
  const report = validateGraph(project, { allowUnsupported: true });
  assert.equal(report.unsupported[0].type, 'example:globe');
  assert.equal(JSON.stringify(project), before);
  assert.throws(() => validateGraph(project), /unsupported types/);
  const registry = new NodeRegistry().registerNode({ type: 'example:globe', version: 1, label: 'Globe', visual: true,
    properties: { latitude: { kind: 'number', default: 0, min: -90, max: 90, animate: true } } });
  assert.equal(validateGraph(project, { registry }).unsupported.length, 0);
  project.nodes.planet.props.latitude = 91;
  assert.throws(() => validateGraph(project, { registry }), /-90..90/);
});

test('media references require the correct kind and paths stay relative and portable', () => {
  const project = scene();
  const video = createNode({ id: 'footage', type: 'video', parentId: 'root', props: { asset: 'source' } });
  project.nodes.footage = video; project.nodes.root.children.push('footage');
  assert.throws(() => validateGraph(project), /asset is missing/);
  project.assets.source = { id: 'source', kind: 'video', name: 'Original footage', path: 'assets/source.mp4', sha256: 'a'.repeat(64), bytes: 100, mime: 'video/mp4', metadata: {} };
  validateGraph(project);
  project.assets.source.kind = 'image';
  assert.throws(() => validateGraph(project), /wrong media kind/);
  for (const name of ['../secret', '/tmp/video.mp4', 'C:/video.mp4', 'assets/../secret', 'assets/con.mp4', 'assets/a%2fb.mp4', 'assets/folder.']) {
    assert.throws(() => assetPath(name), /safe project-relative/);
  }
});

test('invalid numeric animation, unsafe JSON and oversize structures fail predictably', () => {
  const project = scene();
  project.nodes.planet.animations.opacity = [{ frame: 0, value: 2 }];
  assert.throws(() => validateGraph(project), /0..1/);
  assert.throws(() => assertJson(JSON.parse('{"__proto__":{"polluted":true}}')), /unsafe JSON/);
  assert.throws(() => assertJson({ value: Infinity }), /non-finite/);
  let executed = false;
  const getter = Object.defineProperty({}, 'data', { enumerable: true, get() { executed = true; return 'bad'; } });
  assert.throws(() => assertJson(getter), /unsafe JSON/);
  assert.equal(executed, false);
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => assertJson(cyclic), /cyclic JSON/);
  assert.throws(() => assertJson({ text: 'a'.repeat(65537) }), /65536/);
});

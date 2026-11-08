import { assertJson, createNode } from './schema.mjs';
import { standardRegistry } from './registry.mjs';

/** Shared node factory for visual controls, CLI and MCP; outputs normal transactions. */
export function createNodeOperations(document, specifications, { registry = standardRegistry } = {}) {
  assertJson(specifications);
  if (!Array.isArray(specifications) || !specifications.length || specifications.length > 128) throw new Error('Create 1-128 nodes at a time');
  const allowed = ['id', 'type', 'name', 'parentId', 'start', 'duration', 'props', 'transform', 'opacity', 'index'];
  return specifications.map(specification => {
    if (!specification || typeof specification !== 'object' || Array.isArray(specification) || Object.keys(specification).some(key => !allowed.includes(key))) throw new Error('Invalid node creation fields');
    const { id = crypto.randomUUID(), type = 'group', name = type, parentId = document.rootId, start = 0, duration = document.durationFrames, props = {}, transform, opacity = 1, index } = specification;
    const node = createNode({ id, type, name, parentId, duration, props }, registry);
    if (transform !== undefined) {
      if (!transform || typeof transform !== 'object' || Array.isArray(transform)) throw new Error('Transform must be an object');
      node.transform = { ...node.transform, ...transform };
    }
    node.time.start = start; node.opacity = opacity;
    return { op: 'node.add', node, parentId, ...(index === undefined ? {} : { index }) };
  });
}
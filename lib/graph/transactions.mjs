import { assertJson, stableId, validateGraph } from './schema.mjs';
import { advanceTime, shiftTime } from './time.mjs';
import { standardRegistry } from './registry.mjs';

export class RevisionConflict extends Error {
  constructor(expected, actual) {
    super('Project changed. Inspect the current revision and review the edit before retrying.');
    this.name = 'RevisionConflict'; this.code = 'REVISION_CONFLICT'; this.expected = expected; this.actual = actual;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function serializeGraph(document) { assertJson(document); return canonical(document) + '\n'; }
export async function graphFingerprint(document) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serializeGraph(document)));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}
function fields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new TypeError(`Invalid ${label}`);
}
function insert(array, value, index = array.length) {
  if (!Number.isInteger(index) || index < 0 || index > array.length) throw new RangeError('Insertion index is outside the child or effect list');
  array.splice(index, 0, value);
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}

/** Atomic, deterministic edits. Validation failure never changes the caller's document. */
export async function applyTransaction(document, request, { registry = standardRegistry } = {}) {
  validateGraph(document, { registry, allowUnsupported: true }); assertJson(request);
  fields(request, ['expectedFingerprint', 'operations', 'label'], 'transaction');
  if (typeof request.expectedFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(request.expectedFingerprint)) throw new TypeError('A transaction requires an inspected revision fingerprint');
  if (typeof request.label !== 'string' || !request.label.trim() || request.label.length > 200) throw new TypeError('A transaction needs a concise label');
  if (!Array.isArray(request.operations) || !request.operations.length || request.operations.length > 256) throw new TypeError('Use 1-256 operations per transaction');
  const before = await graphFingerprint(document);
  if (request.expectedFingerprint !== before) throw new RevisionConflict(request.expectedFingerprint, before);
  const next = structuredClone(document), changed = new Set(), changedAssets = new Set();
  const node = id => {
    stableId(id);
    if (!Object.hasOwn(next.nodes, id)) throw new Error(`Unknown node: ${id}`);
    return next.nodes[id];
  };
  function editable(id, { unlock = false } = {}) {
    let current = node(id); const visited = new Set();
    while (current) {
      if (visited.has(current.id)) throw new Error('An operation introduced a parent cycle');
      visited.add(current.id);
      if (current.locked && !(unlock && current.id === id)) throw new Error(`Node is locked: ${current.id}`);
      current = current.parentId === null ? null : node(current.parentId);
    }
    return node(id);
  }
  function parent(id) {
    const result = editable(id);
    if (!registry.node(result.type, result.version)?.container) throw new Error('Target parent cannot contain nodes');
    return result;
  }
  for (const operation of request.operations) {
    if (!operation || typeof operation.op !== 'string') throw new TypeError('Each operation needs an op name');
    switch (operation.op) {
      case 'node.add': {
        fields(operation, ['op', 'node', 'parentId', 'index'], 'node.add');
        const added = structuredClone(operation.node), target = parent(operation.parentId); stableId(added?.id);
        if (Object.hasOwn(next.nodes, added.id)) throw new Error(`Node already exists: ${added.id}`);
        if (!registry.node(added.type, added.version)) throw new Error('Register the node type before adding it');
        if (!Array.isArray(added.children) || added.children.length || added.parentId !== target.id) throw new Error('Add one node with a matching parent, then add its children');
        next.nodes[added.id] = added; insert(target.children, added.id, operation.index);
        changed.add(added.id); changed.add(target.id); break;
      }
      case 'node.patch': {
        fields(operation, ['op', 'id', 'changes'], 'node.patch');
        fields(operation.changes, ['name', 'time', 'transform', 'opacity', 'visible', 'locked', 'blend', 'props', 'extensions'], 'node changes');
        const unlock = Object.keys(operation.changes).length === 1 && operation.changes.locked === false;
        const target = editable(operation.id, { unlock });
        for (const [key, value] of Object.entries(operation.changes)) {
          if (['time', 'transform', 'props', 'extensions'].includes(key)) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`Expected an object for ${key}`);
            if (key === 'props' && !registry.node(target.type, target.version)) throw new Error('Cannot edit opaque properties without their registered type');
            target[key] = { ...target[key], ...structuredClone(value) };
          } else target[key] = value;
        }
        changed.add(target.id); break;
      }
      case 'node.remove': {
        fields(operation, ['op', 'id', 'cascade'], 'node.remove');
        const target = editable(operation.id);
        if (target.id === next.rootId) throw new Error('Cannot remove the root composition');
        if (target.children.length && operation.cascade !== true) throw new Error('Removing a group requires explicit cascade');
        const targetParent = editable(target.parentId), removed = [], stack = [target.id];
        while (stack.length) { const current = editable(stack.pop()); removed.push(current.id); stack.push(...current.children); }
        targetParent.children.splice(targetParent.children.indexOf(target.id), 1);
        for (const id of removed) { delete next.nodes[id]; changed.add(id); }
        changed.add(targetParent.id); break;
      }
      case 'node.move': {
        fields(operation, ['op', 'id', 'parentId', 'index'], 'node.move');
        const target = editable(operation.id), destination = parent(operation.parentId);
        if (target.id === next.rootId) throw new Error('Cannot reparent the root composition');
        let ancestor = destination;
        while (ancestor) { if (ancestor.id === target.id) throw new Error('Cannot move a node into its own subtree'); ancestor = ancestor.parentId === null ? null : node(ancestor.parentId); }
        const previous = editable(target.parentId);
        previous.children.splice(previous.children.indexOf(target.id), 1);
        target.parentId = destination.id; insert(destination.children, target.id, operation.index);
        changed.add(target.id); changed.add(previous.id); changed.add(destination.id); break;
      }
      case 'animation.set': {
        fields(operation, ['op', 'id', 'property', 'keyframes'], 'animation.set');
        const target = editable(operation.id);
        if (typeof operation.property !== 'string') throw new TypeError('Animation property must be text');
        if (operation.keyframes === null) delete target.animations[operation.property];
        else target.animations[operation.property] = structuredClone(operation.keyframes);
        changed.add(target.id); break;
      }
      case 'effect.add': {
        fields(operation, ['op', 'id', 'effect', 'index'], 'effect.add'); const target = editable(operation.id);
        if (!registry.effect(operation.effect?.type, operation.effect?.version)) throw new Error('Register the effect before adding it');
        insert(target.effects, structuredClone(operation.effect), operation.index); changed.add(target.id); break;
      }
      case 'effect.patch': {
        fields(operation, ['op', 'id', 'effectId', 'props', 'enabled'], 'effect.patch'); const target = editable(operation.id);
        const effect = target.effects.find(item => item.id === operation.effectId);
        if (!effect) throw new Error('Unknown effect');
        if (operation.props !== undefined) { fields(operation.props, Object.keys(registry.effect(effect.type, effect.version)?.properties ?? {}), 'effect properties'); effect.props = { ...effect.props, ...operation.props }; }
        if (operation.enabled !== undefined) effect.enabled = operation.enabled;
        changed.add(target.id); break;
      }
      case 'effect.remove': {
        fields(operation, ['op', 'id', 'effectId'], 'effect.remove'); const target = editable(operation.id);
        const index = target.effects.findIndex(item => item.id === operation.effectId);
        if (index < 0) throw new Error('Unknown effect'); target.effects.splice(index, 1);
        for(const property of Object.keys(target.animations))if(property.startsWith('effects.'+operation.effectId+'.'))delete target.animations[property];
        changed.add(target.id); break;
      }
      case 'behavior.add': {
        fields(operation,['op','id','behavior','index'],'behavior.add');const target=editable(operation.id);
        if(!registry.behavior(operation.behavior?.type,operation.behavior?.version))throw new Error('Register the motion behavior before adding it');
        target.behaviors??=[];insert(target.behaviors,structuredClone(operation.behavior),operation.index);changed.add(target.id);break;
      }
      case 'behavior.patch': {
        fields(operation,['op','id','behaviorId','props','enabled'],'behavior.patch');const target=editable(operation.id),behavior=(target.behaviors??[]).find(item=>item.id===operation.behaviorId);
        if(!behavior)throw new Error('Unknown behavior');
        if(operation.props!==undefined){fields(operation.props,Object.keys(registry.behavior(behavior.type,behavior.version)?.properties??{}),'behavior properties');behavior.props={...behavior.props,...operation.props};}
        if(operation.enabled!==undefined)behavior.enabled=operation.enabled;changed.add(target.id);break;
      }
      case 'behavior.remove': {
        fields(operation,['op','id','behaviorId'],'behavior.remove');const target=editable(operation.id),index=(target.behaviors??[]).findIndex(item=>item.id===operation.behaviorId);
        if(index<0)throw new Error('Unknown behavior');target.behaviors.splice(index,1);
        for(const property of Object.keys(target.animations))if(property.startsWith('behaviors.'+operation.behaviorId+'.'))delete target.animations[property];
        changed.add(target.id);break;
      }
      case 'mask.set':
      case 'constraints.set': {
        const field = operation.op === 'mask.set' ? 'mask' : 'constraints';
        fields(operation, ['op', 'id', field], operation.op); const target = editable(operation.id);
        target[field] = structuredClone(operation[field]); changed.add(target.id); break;
      }
      case 'transition.set': {
        fields(operation, ['op', 'id', 'side', 'transition'], 'transition.set'); const target = editable(operation.id);
        if (!['in', 'out'].includes(operation.side)) throw new TypeError('Transition side must be in or out');
        target.transition[operation.side] = structuredClone(operation.transition); changed.add(target.id); break;
      }
      case 'clip.trim': {
        fields(operation,['op','id','start','end'],'clip.trim');const target=editable(operation.id);
        if(target.id===next.rootId)throw new Error('Change project duration instead of trimming the root');
        const start=operation.start??target.time.start,end=operation.end??target.time.start+target.time.duration;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>1000000000)throw new RangeError('Trim requires a positive frame-aligned clip interval');
        const duration=end-start,offset=shiftTime(target.time.offset,start-target.time.start,target.time.speed);
        if([target.transition.in?.duration??0,target.transition.out?.duration??0,target.type==='audio'?target.props.fadeIn:0,target.type==='audio'?target.props.fadeOut:0].some(fade=>fade>duration))throw new Error('Shorten the fade before trimming inside it');
        target.time={...target.time,start,duration,offset};changed.add(target.id);break;
      }
      case 'clip.split': {
        fields(operation, ['op', 'id', 'at', 'newId'], 'clip.split'); const target = editable(operation.id); stableId(operation.newId);
        if (target.children.length || target.id === next.rootId) throw new Error('Split a leaf clip; nested compositions need explicit subtree duplication');
        if (Object.values(next.nodes).some(item => item.id !== target.id && (item.mask?.nodeId === target.id || item.constraints.some(constraint => constraint.target === target.id)))) throw new Error('Split references must be explicitly disconnected and retargeted in the same transaction');
        if (Object.hasOwn(next.nodes, operation.newId)) throw new Error('Split ID already exists');
        const left = operation.at - target.time.start, right = target.time.duration - left;
        if (!Number.isSafeInteger(operation.at) || left <= 0 || right <= 0) throw new RangeError('Split must be inside the clip on a frame boundary');
        const fadeIn = Math.max(target.transition.in?.duration ?? 0, target.type === 'audio' ? target.props.fadeIn : 0);
        const fadeOut = Math.max(target.transition.out?.duration ?? 0, target.type === 'audio' ? target.props.fadeOut : 0);
        if (left < fadeIn || right < fadeOut) throw new Error('Split outside an active fade to preserve its curve');
        const added = structuredClone(target); added.id = operation.newId; added.time.start = operation.at; added.time.duration = right;
        added.time.offset = advanceTime(target.time.offset, left, target.time.speed); added.transition.in = null;
        target.time.duration = left; target.transition.out = null;
        if (target.type === 'audio') { added.props.fadeIn = 0; target.props.fadeOut = 0; }
        const targetParent = editable(target.parentId);
        next.nodes[added.id] = added; insert(targetParent.children, added.id, targetParent.children.indexOf(target.id) + 1);
        changed.add(target.id); changed.add(added.id); changed.add(targetParent.id); break;
      }
      case 'asset.add': {
        fields(operation, ['op', 'asset'], 'asset.add'); stableId(operation.asset?.id);
        if (Object.hasOwn(next.assets, operation.asset.id)) throw new Error('Asset ID already exists');
        next.assets[operation.asset.id] = structuredClone(operation.asset); changedAssets.add(operation.asset.id); break;
      }
      case 'asset.remove': {
        fields(operation, ['op', 'id'], 'asset.remove'); stableId(operation.id);
        if (!Object.hasOwn(next.assets, operation.id)) throw new Error('Unknown asset'); delete next.assets[operation.id]; changedAssets.add(operation.id); break;
      }
      case 'project.patch': {
        fields(operation, ['op', 'changes'], 'project.patch'); fields(operation.changes, ['title', 'width', 'height', 'durationFrames', 'extensions'], 'project changes');
        const changes = structuredClone(operation.changes), extensions = changes.extensions;
        delete changes.extensions; Object.assign(next, changes);
        if (extensions !== undefined) {
          if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) throw new TypeError('Project extensions must be an object');
          next.extensions = { ...next.extensions, ...extensions };
        }
        const root = node(next.rootId); root.props.width = next.width; root.props.height = next.height; root.time.duration = next.durationFrames;
        changed.add(root.id); break;
      }
      default: throw new TypeError(`Unknown graph operation: ${operation.op}`);
    }
  }
  const validation = validateGraph(next, { registry, allowUnsupported: true });
  if (serializeGraph(next) === serializeGraph(document)) return { document, fingerprint: before, previousFingerprint: before, changedNodes: [], changedAssets: [], noop: true, unsupported: validation.unsupported };
  next.revision++;
  validateGraph(next, { registry, allowUnsupported: true });
  return { document: next, fingerprint: await graphFingerprint(next), previousFingerprint: before,
    changedNodes: [...changed].sort(), changedAssets: [...changedAssets].sort(), noop: false, unsupported: validation.unsupported };
}

/** Serializes concurrent callers; undo/redo also require the current revision. */
export class ProjectSession {
  #state; #registry; #past = []; #future = []; #listeners = new Set(); #queue = Promise.resolve(); #historyBytes;
  constructor(state, registry, historyBytes) { this.#state = freeze(state); this.#registry = registry; this.#historyBytes = historyBytes; }
  static async open(document, { registry = standardRegistry, historyBytes = 16 * 1024 * 1024 } = {}) {
    validateGraph(document, { registry, allowUnsupported: true });
    if (!Number.isSafeInteger(historyBytes) || historyBytes < 0 || historyBytes > 128 * 1024 * 1024) throw new RangeError('History memory budget must be 0-128 MiB');
    const copy = structuredClone(document);
    return new ProjectSession({ document: copy, fingerprint: await graphFingerprint(copy) }, registry, historyBytes);
  }
  getSnapshot() { return this.#state; }
  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  history() { return { undo: this.#past.map(entry => entry.label), redo: this.#future.map(entry => entry.label) }; }
  #enqueue(action) { const result = this.#queue.then(action); this.#queue = result.catch(() => {}); return result; }
  #remember(list, state, label) {
    list.push({ state, label, bytes: new TextEncoder().encode(serializeGraph(state.document)).byteLength });
    let total = [...this.#past, ...this.#future].reduce((sum, entry) => sum + entry.bytes, 0);
    while (total > this.#historyBytes || this.#past.length + this.#future.length > 100) {
      const furthest = this.#past.length >= this.#future.length ? this.#past : this.#future;
      total -= furthest.shift().bytes;
    }
  }
  #publish(state) {
    this.#state = freeze(state);
    for (const listener of this.#listeners) { try { listener(this.#state); } catch { /* A failed view cannot roll back a committed edit. */ } }
  }
  transact(request) {
    return this.#enqueue(async () => {
      const result = await applyTransaction(this.#state.document, request, { registry: this.#registry });
      if (!result.noop) {
        this.#future = []; this.#remember(this.#past, this.#state, request.label);
        this.#publish({ document: result.document, fingerprint: result.fingerprint });
      }
      return result;
    });
  }
  #restore(expectedFingerprint, direction) {
    return this.#enqueue(async () => {
      if (expectedFingerprint !== this.#state.fingerprint) throw new RevisionConflict(expectedFingerprint, this.#state.fingerprint);
      const source = direction === 'undo' ? this.#past : this.#future, destination = direction === 'undo' ? this.#future : this.#past;
      if (!source.length) throw new Error(`Nothing to ${direction}`);
      const entry = source.at(-1), document = structuredClone(entry.state.document);
      document.revision = this.#state.document.revision + 1;
      validateGraph(document, { registry: this.#registry, allowUnsupported: true });
      const state = { document, fingerprint: await graphFingerprint(document) };
      source.pop(); this.#remember(destination, this.#state, entry.label); this.#publish(state); return state;
    });
  }
  undo(expectedFingerprint) { return this.#restore(expectedFingerprint, 'undo'); }
  redo(expectedFingerprint) { return this.#restore(expectedFingerprint, 'redo'); }
}

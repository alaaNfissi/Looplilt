import {validateBuiltinBehavior} from './behaviors.mjs';
import { frameRate, frameIndex, frameSeconds, rationalTime } from './time.mjs';
import { validateKeyframes } from './animation.mjs';
import { standardRegistry, defaults, TRANSFORM_PROPERTIES, OPACITY_PROPERTY, BLEND_MODES, validateProperty } from './registry.mjs';

export const GRAPH_VERSION = 2;
export const GRAPH_LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, nodes: 10000, assets: 10000, depth: 64, durationSeconds: 3600 });
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const own = (value, key) => Object.hasOwn(value, key);
const fail = (location, message) => { throw new TypeError(`${location}: ${message}`); };

export function assertJson(value) {
  const active = new Set(); let entries = 0;
  function visit(item, depth) {
    if (++entries > 300000 || depth > 80) fail('document', 'JSON structure exceeds its resource bound');
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'number') { if (!Number.isFinite(item)) fail('document', 'non-finite number'); return; }
    if (typeof item === 'string') { if (item.length > 65536) fail('document', 'text exceeds 65536 characters'); return; }
    if (typeof item !== 'object') fail('document', 'only JSON values are allowed');
    if (active.has(item)) fail('document', 'cyclic JSON object');
    const prototype = Object.getPrototypeOf(item);
    if (prototype !== (Array.isArray(item) ? Array.prototype : Object.prototype) && prototype !== null) fail('document', 'expected plain JSON');
    if (Array.isArray(item) && (item.length > 300000 || Object.keys(item).length !== item.length)) fail('document', 'arrays must be dense and bounded');
    active.add(item);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
      if (Array.isArray(item) && key === 'length') continue;
      if (Array.isArray(item) && (!/^(?:0|[1-9][0-9]*)$/.test(key) || Number(key) >= item.length)) fail('document', 'array properties must be indices');
      if (unsafe.has(key) || descriptor.get || descriptor.set || !descriptor.enumerable) fail('document', 'unsafe JSON property');
      visit(descriptor.value, depth + 1);
    }
    if (Object.getOwnPropertySymbols(item).length) fail('document', 'symbol properties are not serializable');
    active.delete(item);
  }
  visit(value, 0);
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > GRAPH_LIMITS.bytes) fail('document', 'project exceeds 8 MiB');
  return value;
}

function object(value, location, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(location, 'expected an object');
  if (allowed) for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(location, `unknown field ${key}; use extensions for application metadata`);
}
export function stableId(value, location = 'ID') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value) || unsafe.has(value)) fail(location, 'expected a stable ID of 1-80 letters, digits, hyphens or underscores');
  return value;
}
function integer(value, location, low, high) {
  if (!Number.isSafeInteger(value) || value < low || value > high) fail(location, `expected an integer in ${low}..${high}`);
}
function boundedText(value, location, maximum, empty = true) {
  if (typeof value !== 'string' || value.length > maximum || !empty && !value.trim()) fail(location, `expected text of ${empty ? 0 : 1}-${maximum} characters`);
}
function props(value, definitions, location, assets) {
  object(value, location);
  for (const key of Object.keys(value)) if (!own(definitions, key)) fail(location, `unknown property ${key}`);
  for (const [key, definition] of Object.entries(definitions)) {
    if (!own(value, key)) fail(location, `missing property ${key}`);
    validateProperty(value[key], definition, `${location}.${key}`, assets);
  }
}

export function assetPath(value) {
  if (typeof value !== 'string' || value.length > 240 || !/^[a-zA-Z0-9_./-]+$/.test(value)
      || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..'
        || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) || part.endsWith('.'))) fail('asset.path', 'expected a safe project-relative path');
  return value;
}

export function propertyDefinition(node, property, registry = standardRegistry) {
  if (property === 'opacity') return OPACITY_PROPERTY;
  const parts = property.split('.');
  if (parts.length === 2 && parts[0] === 'transform') return TRANSFORM_PROPERTIES[parts[1]];
  if (parts.length === 2 && parts[0] === 'props') return registry.node(node.type, node.version)?.properties[parts[1]];
  if (parts.length === 3 && parts[0] === 'behaviors') {
    const behavior=(node.behaviors??[]).find(item=>item.id===parts[1]);
    return behavior&&registry.behavior(behavior.type,behavior.version)?.properties[parts[2]];
  }
  if (parts.length === 3 && parts[0] === 'effects') {
    const effect = node.effects.find(item => item.id === parts[1]);
    return effect && registry.effect(effect.type, effect.version)?.properties[parts[2]];
  }
}

/** Validate without normalizing, repairing, rounding, dropping or executing content. */
export function validateGraph(document, { registry = standardRegistry, allowUnsupported = false } = {}) {
  assertJson(document);
  object(document, 'project', ['format', 'version', 'id', 'title', 'revision', 'frameRate', 'width', 'height', 'durationFrames', 'rootId', 'nodes', 'assets', 'extensions']);
  if (document.format !== 'looplilt' || document.version !== GRAPH_VERSION) fail('project', 'expected a Looplilt version 2 graph document');
  stableId(document.id, 'project.id'); boundedText(document.title, 'project.title', 200, false);
  integer(document.revision, 'project.revision', 0, 1000000000);
  const rate = frameRate(document.frameRate);
  if (rate.numerator !== document.frameRate.numerator || rate.denominator !== document.frameRate.denominator) fail('project.frameRate', 'use a reduced rational rate');
  integer(document.width, 'project.width', 16, 16384); integer(document.height, 'project.height', 16, 16384);
  integer(document.durationFrames, 'project.durationFrames', 1, 1000000000);
  if (frameSeconds(document.durationFrames, rate) > GRAPH_LIMITS.durationSeconds) fail('project.durationFrames', 'project exceeds one hour');
  object(document.nodes, 'project.nodes'); object(document.assets, 'project.assets'); object(document.extensions, 'project.extensions');
  if (Object.keys(document.nodes).length > GRAPH_LIMITS.nodes || Object.keys(document.assets).length > GRAPH_LIMITS.assets) fail('project', 'too many nodes or assets');
  const unsupported = [];
  for (const [id, item] of Object.entries(document.assets)) {
    stableId(id, 'asset ID');
    object(item, `assets.${id}`, ['id', 'kind', 'name', 'path', 'sha256', 'bytes', 'mime', 'metadata']);
    if (item.id !== id) fail(`assets.${id}`, 'ID does not match its map key');
    if (!['image', 'video', 'audio', 'font', 'legacy-project', 'legacy-script', 'score'].includes(item.kind)) fail(`assets.${id}.kind`, 'unsupported asset kind');
    boundedText(item.name, `assets.${id}.name`, 200, false); assetPath(item.path);
    if (!/^[a-f0-9]{64}$/.test(item.sha256)) fail(`assets.${id}.sha256`, 'expected SHA-256');
    integer(item.bytes, `assets.${id}.bytes`, 0, 2 * 1024 * 1024 * 1024);
    boundedText(item.mime, `assets.${id}.mime`, 100, false); object(item.metadata, `assets.${id}.metadata`);
  }
  stableId(document.rootId, 'project.rootId');
  const root = document.nodes[document.rootId];
  if (!root || root.type !== 'composition' || root.parentId !== null) fail('project.rootId', 'root must be an unparented composition');
  const dependencies = new Map();
  for (const [id, node] of Object.entries(document.nodes)) {
    stableId(id, 'node ID');
    const location = `nodes.${id}`;
    object(node, location, ['id', 'type', 'version', 'name', 'parentId', 'children', 'time', 'transform', 'opacity', 'visible', 'locked', 'blend', 'props', 'animations', 'effects', 'behaviors', 'mask', 'constraints', 'transition', 'extensions']);
    if (node.id !== id) fail(location, 'ID does not match its map key');
    if (typeof node.type !== 'string' || !/^[a-z][a-z0-9:-]{0,79}$/.test(node.type)) fail(location, 'invalid node type');
    integer(node.version, `${location}.version`, 1, 10000); boundedText(node.name, `${location}.name`, 200);
    if (id !== document.rootId) {
      stableId(node.parentId, `${location}.parentId`);
      if (!own(document.nodes, node.parentId) || node.parentId === id) fail(location, 'invalid parent');
    }
    if (!Array.isArray(node.children) || node.children.length > GRAPH_LIMITS.nodes || new Set(node.children).size !== node.children.length) fail(location, 'invalid child list');
    for (const child of node.children) {
      stableId(child, `${location}.children`);
      if (!own(document.nodes, child) || document.nodes[child].parentId !== id) fail(location, 'child and parent relationships disagree');
    }
    object(node.time, `${location}.time`, ['start', 'duration', 'offset', 'speed']);
    frameIndex(node.time.start); integer(node.time.duration, `${location}.time.duration`, 1, 1000000000);
    const offset = rationalTime(node.time.offset);
    if (offset.numerator !== node.time.offset.numerator || offset.denominator !== node.time.offset.denominator) fail(location, 'source offset must be a reduced rational');
    if (node.time.start + node.time.duration > 1000000000) fail(location, 'clip end exceeds frame bound');
    object(node.time.speed, `${location}.time.speed`, ['numerator', 'denominator']);
    for (const part of ['numerator', 'denominator']) integer(node.time.speed[part], `${location}.time.speed.${part}`, 1, 10000);
    const speed = node.time.speed.numerator / node.time.speed.denominator;
    if (speed < .01 || speed > 100) fail(location, 'speed must be between .01 and 100');
    props(node.transform, TRANSFORM_PROPERTIES, `${location}.transform`); validateProperty(node.opacity, OPACITY_PROPERTY, `${location}.opacity`);
    if (typeof node.visible !== 'boolean' || typeof node.locked !== 'boolean' || !BLEND_MODES.includes(node.blend)) fail(location, 'invalid visibility, locking or blend mode');
    object(node.props, `${location}.props`); object(node.animations, `${location}.animations`); object(node.extensions, `${location}.extensions`);
    const definition = registry.node(node.type, node.version);
    if (!definition) unsupported.push({ kind: 'node', id, type: node.type, version: node.version });
    else {
      if (!definition.container && node.children.length) fail(location, 'this node type cannot contain children');
      props(node.props, definition.properties, `${location}.props`, document.assets);
    }
    if (!Array.isArray(node.effects) || node.effects.length > 32) fail(location, 'use at most 32 effects');
    const effectIds = new Set();
    for (const effect of node.effects) {
      object(effect, `${location}.effect`, ['id', 'type', 'version', 'enabled', 'props']); stableId(effect.id);
      if (effectIds.has(effect.id)) fail(location, 'duplicate effect ID'); effectIds.add(effect.id);
      if (typeof effect.type !== 'string' || !/^[a-z][a-z0-9:-]{0,79}$/.test(effect.type)) fail(location, 'invalid effect type');
      if (typeof effect.enabled !== 'boolean') fail(location, 'effect enabled must be a boolean');
      integer(effect.version, `${location}.effect.version`, 1, 10000); object(effect.props, `${location}.effect.props`);
      const effectType = registry.effect(effect.type, effect.version);
      if (!effectType) unsupported.push({ kind: 'effect', id, effect: effect.id, type: effect.type, version: effect.version });
      else props(effect.props, effectType.properties, `${location}.effects.${effect.id}`);
    }
    if(node.behaviors!==undefined&&(!Array.isArray(node.behaviors)||node.behaviors.length>16))fail(location,'use at most16 motion behaviors');
    const behaviorIds=new Set();
    for(const behavior of node.behaviors??[]){
      object(behavior,location+'.behavior',['id','type','version','enabled','props']);stableId(behavior.id);
      if(behaviorIds.has(behavior.id))fail(location,'duplicate behavior ID');behaviorIds.add(behavior.id);
      if(typeof behavior.type!=='string'||! /^[a-z][a-z0-9:-]{0,79}$/.test(behavior.type)||typeof behavior.enabled!=='boolean')fail(location,'invalid behavior type or enabled state');
      integer(behavior.version,location+'.behavior.version',1,10000);object(behavior.props,location+'.behavior.props');
      const behaviorType=registry.behavior(behavior.type,behavior.version);
      if(!behaviorType)unsupported.push({kind:'behavior',id,behavior:behavior.id,type:behavior.type,version:behavior.version});
      else{props(behavior.props,behaviorType.properties,location+'.behaviors.'+behavior.id);if(behavior.version===1)validateBuiltinBehavior(behavior,node,(node,property)=>propertyDefinition(node,property,registry));}
    }
    if (Object.keys(node.animations).length > 128) fail(location, 'too many animated properties');
    for (const [property, keys] of Object.entries(node.animations)) {
      validateKeyframes(keys);
      const metadata = propertyDefinition(node, property, registry);
      const parts=property.split('.'),effect=parts[0]==='effects'&&node.effects.find(item=>item.id===parts[1]),behavior=parts[0]==='behaviors'&&(node.behaviors??[]).find(item=>item.id===parts[1]);
      const opaqueTarget=effect&&!registry.effect(effect.type,effect.version)||behavior&&!registry.behavior(behavior.type,behavior.version);
      if (!metadata && definition&&!opaqueTarget) fail(location, `unknown animated property ${property}`);
      if (metadata) {
        if (!metadata.animate) fail(location, `property ${property} does not support animation`);
        for (const key of keys) validateProperty(key.value, metadata, `${location}.animations.${property}`, document.assets);
      }
    }
    const depends = new Set(id === document.rootId ? [] : [node.parentId]);
    if (node.mask !== null) {
      object(node.mask, `${location}.mask`, ['nodeId', 'mode']);
      stableId(node.mask.nodeId, `${location}.mask.nodeId`);
      if (!own(document.nodes, node.mask.nodeId) || !['alpha', 'inverse-alpha'].includes(node.mask.mode)) fail(location, 'invalid mask');
      depends.add(node.mask.nodeId);
    }
    if (!Array.isArray(node.constraints) || node.constraints.length > 8) fail(location, 'use at most eight constraints');
    for (const constraint of node.constraints) {
      object(constraint, `${location}.constraint`, ['type', 'target', 'offsetX', 'offsetY']);
      stableId(constraint.target, `${location}.constraint.target`);
      if (!['follow', 'look-at'].includes(constraint.type) || !own(document.nodes, constraint.target)) fail(location, 'invalid constraint');
      if (constraint.type === 'follow') for (const key of ['offsetX', 'offsetY']) validateProperty(constraint[key], TRANSFORM_PROPERTIES.x, `${location}.constraint.${key}`);
      depends.add(constraint.target);
    }
    object(node.transition, `${location}.transition`, ['in', 'out']);
    for (const side of ['in', 'out']) if (node.transition[side] !== null) {
      const transition = node.transition[side]; object(transition, `${location}.transition.${side}`, ['type', 'duration']);
      if (transition.type !== 'fade') fail(location, 'unsupported transition');
      integer(transition.duration, `${location}.transition.${side}.duration`, 1, node.time.duration);
    }
    dependencies.set(id, depends);
  }
  if (root.time.start !== 0 || root.time.offset.numerator !== 0 || root.time.duration !== document.durationFrames
      || root.time.speed.numerator !== root.time.speed.denominator || root.props.width !== document.width || root.props.height !== document.height) fail('root', 'root timing and dimensions must match the project');
  const reached = new Set(), pending = [[document.rootId, 0]];
  while (pending.length) {
    const [id, depth] = pending.pop();
    if (depth > GRAPH_LIMITS.depth || reached.has(id)) fail('project.nodes', 'hierarchy is cyclic or too deep');
    reached.add(id);
    for (const child of document.nodes[id].children) pending.push([child, depth + 1]);
  }
  if (reached.size !== Object.keys(document.nodes).length) fail('project.nodes', 'orphaned nodes are not allowed');
  const dependents = new Map(), queue = [], order = [];
  for (const [id, set] of dependencies) {
    if (!set.size) queue.push(id);
    for (const target of set) { if (!dependents.has(target)) dependents.set(target, []); dependents.get(target).push(id); }
  }
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]; order.push(id);
    for (const dependent of dependents.get(id) ?? []) { dependencies.get(dependent).delete(id); if (!dependencies.get(dependent).size) queue.push(dependent); }
  }
  if (order.length !== reached.size) fail('project.nodes', 'constraint, mask or parent dependency cycle');
  // Compositing dependencies differ from transform evaluation: a group draws
  // its children and a masked layer draws its mask. Check that graph too, so
  // ancestor masks and indirect group/mask loops cannot hide or recurse forever.
  const renderEdges=new Map(),renderDependents=new Map(),renderQueue=[];
  for(const [id,node]of Object.entries(document.nodes)){
    const edges=new Set([...node.children,...(node.mask?[node.mask.nodeId]:[])]);renderEdges.set(id,edges);
    if(!edges.size)renderQueue.push(id);
    for(const target of edges){if(!renderDependents.has(target))renderDependents.set(target,[]);renderDependents.get(target).push(id);}
  }
  for(let index=0;index<renderQueue.length;index++)for(const dependent of renderDependents.get(renderQueue[index])??[]){renderEdges.get(dependent).delete(renderQueue[index]);if(!renderEdges.get(dependent).size)renderQueue.push(dependent);}
  if(renderQueue.length!==Object.keys(document.nodes).length)fail('project.nodes','mask hierarchy creates a recursive compositing chain');
  if (unsupported.length && !allowUnsupported) fail('project', `unsupported types: ${unsupported.map(item => `${item.type}@${item.version}`).join(', ')}`);
  return { valid: true, unsupported, evaluationOrder: order };
}

export function createNode({ id, type = 'group', version = 1, name = type, parentId = null, duration = 300, props: values = {}, ...overrides }, registry = standardRegistry) {
  stableId(id);
  const definition = registry.node(type,version);
  if (!definition) throw new Error(`Register node type before creating it: ${type}`);
  return { id, type, version: definition.version, name, parentId, children: [],
    time: { start: 0, duration, offset: { numerator: 0, denominator: 1 }, speed: { numerator: 1, denominator: 1 } },
    transform: defaults(TRANSFORM_PROPERTIES), opacity: 1, visible: true, locked: false, blend: 'source-over',
    props: { ...defaults(definition.properties), ...values }, animations: {}, effects: [], mask: null,
    constraints: [], transition: { in: null, out: null }, extensions: {}, ...overrides };
}

export function createGraph({ id = crypto.randomUUID(), title = 'Untitled film', width = 1280, height = 720, durationFrames = 300, frameRate: rate } = {}) {
  const document = { format: 'looplilt', version: GRAPH_VERSION, id, title, revision: 0, frameRate: frameRate(rate), width, height,
    durationFrames, rootId: 'root', nodes: {}, assets: {}, extensions: {} };
  document.nodes.root = createNode({ id: 'root', type: 'composition', name: title, duration: durationFrames, props: { width, height } });
  validateGraph(document);
  return document;
}

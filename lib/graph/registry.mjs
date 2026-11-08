import {BUILTIN_BEHAVIORS,compileBuiltinBehavior} from './behaviors.mjs';
/** Declarative property contracts shared by validation, inspectors and tools. */
const number = (defaultValue, min, max, extra = {}) => ({ kind: 'number', default: defaultValue, min, max, animate: true, ...extra });
const text = (defaultValue, maxLength = 1000) => ({ kind: 'string', default: defaultValue, maxLength });
const flag = defaultValue => ({ kind: 'boolean', default: defaultValue });
const choice = (defaultValue, values) => ({ kind: 'enum', default: defaultValue, values });
const color = defaultValue => ({ kind: 'color', default: defaultValue });
const asset = kinds => ({ kind: 'asset', kinds, required: true });
const size = { width: number(320, 1, 16384), height: number(180, 1, 16384) };
const paint = { fill: color('#f4eedf'), stroke: color('#00000000'), strokeWidth: number(0, 0, 256) };
const typography = {
  text: text('Your story', 10000), fontFamily: text('sans-serif', 120), fontSize: number(64, 1, 1000),
  fontWeight: number(600, 100, 900, { integer: true }), align: choice('left', ['left', 'center', 'right']),
  fill: color('#f4eedf'), maxWidth: number(800, 1, 16384), lineHeight: number(1.2, .25, 4),
};

const BUILTINS = [
  { type: 'composition', label: 'Composition', container: true, properties: { ...size, clip: flag(true), background: color('#00000000') } },
  { type: 'group', label: 'Group', container: true, properties: {} },
  { type: 'track', label: 'Track', container: true, properties: { kind: choice('visual', ['visual', 'audio']), gain: number(1, 0, 4), muted: flag(false), solo: flag(false) } },
  { type: 'camera', label: 'Camera', container: true, properties: { zoom: number(1, .01, 100) } },
  { type: 'rectangle', label: 'Rectangle', visual: true, properties: { ...size, ...paint, radius: number(0, 0, 8192) } },
  { type: 'ellipse', label: 'Ellipse', visual: true, properties: { ...size, ...paint } },
  { type: 'path', label: 'Vector path', visual: true, properties: { d: text('M0 0L100 0L100 100Z', 30000), ...paint, fillRule: choice('nonzero', ['nonzero', 'evenodd']) } },
  { type: 'text', label: 'Text', visual: true, properties: typography },
  { type: 'caption', label: 'Caption', visual: true, properties: { ...typography, background: color('#142824e6'), padding: number(18, 0, 256) } },
  { type: 'image', label: 'Image', visual: true, properties: { ...size, asset: asset(['image']), fit: choice('contain', ['contain', 'cover', 'stretch']) } },
  { type: 'video', label: 'Video', visual: true, audio: true, properties: { ...size, asset: asset(['video']), fit: choice('contain', ['contain', 'cover', 'stretch']), gain: number(1, 0, 4), muted: flag(false) } },
  { type: 'audio', label: 'Audio', audio: true, properties: { asset: asset(['audio', 'video']), gain: number(1, 0, 4), pan: number(0, -1, 1), fadeIn: number(0, 0, 1000000000, { integer: true }), fadeOut: number(0, 0, 1000000000, { integer: true }) } },
  { type: 'canvas', label: 'Legacy Canvas film', visual: true, audio: true, properties: { ...size, projectAsset: asset(['legacy-project']), scriptAsset: asset(['legacy-script']), format: choice('landscape', ['landscape', 'portrait', 'square']), gain: number(1, 0, 4) } },
  { type: 'score', label: 'Procedural score', audio: true, properties: { asset: asset(['score', 'legacy-project']), gain: number(1, 0, 4) } },
];

const EFFECTS = [
  { type: 'blur', label: 'Blur', properties: { radius: number(0, 0, 100) } },
  { type: 'brightness', label: 'Brightness', properties: { amount: number(1, 0, 4) } },
  { type: 'contrast', label: 'Contrast', properties: { amount: number(1, 0, 4) } },
  { type: 'saturate', label: 'Saturation', properties: { amount: number(1, 0, 4) } },
  { type: 'hue', label: 'Hue rotation', properties: { degrees: number(0, -3600, 3600) } },
  { type: 'grayscale', label: 'Grayscale', properties: { amount: number(0, 0, 1) } },
  { type: 'shadow', label: 'Shadow', properties: { x: number(0, -1000, 1000), y: number(6, -1000, 1000), blur: number(16, 0, 100), color: color('#00000080') } },
];

export const TRANSFORM_PROPERTIES = Object.freeze({
  x: number(0, -1000000, 1000000), y: number(0, -1000000, 1000000),
  rotation: number(0, -1000000, 1000000), scaleX: number(1, -1000, 1000), scaleY: number(1, -1000, 1000),
  anchorX: number(0, -1000000, 1000000), anchorY: number(0, -1000000, 1000000),
});
export const OPACITY_PROPERTY = Object.freeze(number(1, 0, 1));
export const BLEND_MODES = Object.freeze(['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'exclusion', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'lighter']);

function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}

export class NodeRegistry {
  #nodes = new Map();
  #effects = new Map();
  #behaviors = new Map();
  #behaviorFactories = new Map();
  constructor({ builtins = true } = {}) {
    if (builtins) {
      for (const definition of BUILTINS) this.registerNode({ version: 1, ...definition });
      for (const definition of EFFECTS) this.registerEffect({ version: 1, ...definition });
      for (const definition of BUILTIN_BEHAVIORS) this.registerBehavior(definition,compileBuiltinBehavior);
    }
  }
  #register(map, definition) {
    if (!definition || !/^[a-z][a-z0-9:-]{0,79}$/.test(definition.type)
        || !Number.isSafeInteger(definition.version) || definition.version < 1 || definition.version > 10000
        || typeof definition.label !== 'string' || !definition.label || definition.label.length > 120
        || !definition.properties || typeof definition.properties !== 'object' || Array.isArray(definition.properties)) {
      throw new TypeError('A registered type needs a stable type, version, label and property metadata');
    }
    const key = `${definition.type}@${definition.version}`;
    if (map.has(key)) throw new Error(`Type already registered: ${key}`);
    for (const [name, property] of Object.entries(definition.properties)) {
      if (!/^[a-z][a-zA-Z0-9]{0,47}$/.test(name) || ['constructor', 'prototype'].includes(name)
          || !['number', 'string', 'boolean', 'enum', 'color', 'asset'].includes(property.kind)) throw new TypeError('Invalid property metadata');
      if (Object.hasOwn(property, 'default')) validateProperty(property.default, property, name);
    }
    // Registration is a trusted application operation. Documents contain data only.
    map.set(key, freeze(structuredClone(definition)));
    return this;
  }
  registerNode(definition) { return this.#register(this.#nodes, definition); }
  registerEffect(definition) { return this.#register(this.#effects, definition); }
  registerBehavior(definition, compile) {
    if(compile!==undefined&&(typeof compile!=='function'||/^(Async|Generator|AsyncGenerator)Function$/.test(compile.constructor?.name)))throw new TypeError('A behavior evaluator must be a trusted application function');
    this.#register(this.#behaviors,definition);if(compile)this.#behaviorFactories.set(definition.type+'@'+definition.version,compile);return this;
  }
  behavior(type,version=1){return this.#behaviors.get(type+'@'+version);}
  behaviorFactory(type,version=1){return this.#behaviorFactories.get(type+'@'+version);}
  node(type, version = 1) { return this.#nodes.get(`${type}@${version}`); }
  effect(type, version = 1) { return this.#effects.get(`${type}@${version}`); }
  catalog() { return { nodes: [...this.#nodes.values()], effects: [...this.#effects.values()], behaviors:[...this.#behaviors.values()] }; }
}

export function defaults(properties) {
  return Object.fromEntries(Object.entries(properties).filter(([, p]) => Object.hasOwn(p, 'default')).map(([name, p]) => [name, structuredClone(p.default)]));
}

export function validateProperty(value, definition, location, assets) {
  const fail = message => { throw new TypeError(`${location}: ${message}`); };
  switch (definition.kind) {
    case 'number':
      if (!Number.isFinite(value) || value < definition.min || value > definition.max || definition.integer && !Number.isSafeInteger(value)) fail(`expected ${definition.integer ? 'an integer' : 'a number'} in ${definition.min}..${definition.max}`);
      break;
    case 'string': if (typeof value !== 'string' || value.length > definition.maxLength) fail(`expected text of at most ${definition.maxLength} characters`); break;
    case 'boolean': if (typeof value !== 'boolean') fail('expected true or false'); break;
    case 'enum': if (!definition.values.includes(value)) fail('unsupported choice'); break;
    case 'color': if (typeof value !== 'string' || !/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) fail('expected a hexadecimal RGB or RGBA color'); break;
    case 'asset':
      if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) fail('expected an asset ID');
      if (assets && (!Object.hasOwn(assets, value) || !definition.kinds.includes(assets[value].kind))) fail('asset is missing or has the wrong media kind');
      break;
    default: fail('unregistered property kind');
  }
}

export const standardRegistry = new NodeRegistry();

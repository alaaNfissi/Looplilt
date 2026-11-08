import { frameIndex } from './time.mjs';

const clamp = value => Math.max(0, Math.min(1, value));
const EASINGS = Object.freeze({
  linear: [0, 0, 1, 1],
  ease: [.25, .1, .25, 1],
  'ease-in': [.42, 0, 1, 1],
  'ease-out': [0, 0, .58, 1],
  'ease-in-out': [.42, 0, .58, 1],
});

export function validateEasing(value = 'linear') {
  if (value === 'hold' || typeof value === 'string' && Object.hasOwn(EASINGS, value)) return value;
  if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite)
      || value[0] < 0 || value[0] > 1 || value[2] < 0 || value[2] > 1
      || Math.abs(value[1]) > 4 || Math.abs(value[3]) > 4) {
    throw new TypeError('Easing must be a named curve, hold, or [x1,y1,x2,y2] with x in 0..1 and y in -4..4');
  }
  return value;
}

export function ease(progress, easing = 'linear') {
  if (!Number.isFinite(progress)) throw new TypeError('Animation progress must be finite');
  validateEasing(easing);
  const x = clamp(progress);
  if (x === 0 || x === 1 || easing === 'linear') return x;
  if (easing === 'hold') return 0;
  const [x1, y1, x2, y2] = typeof easing === 'string' ? EASINGS[easing] : easing;
  const cubic = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  // Bisection remains stable at flat endpoint tangents and never depends on seek history.
  let low = 0, high = 1;
  for (let iteration = 0; iteration < 36; iteration++) {
    const middle = (low + high) / 2;
    if (cubic(middle, x1, x2) < x) low = middle; else high = middle;
  }
  return cubic((low + high) / 2, y1, y2);
}

function scalar(value) {
  return typeof value === 'number' ? Number.isFinite(value) : typeof value === 'boolean' || typeof value === 'string';
}

export function validateKeyframes(keys, { maxFrame = 1000000000, maxKeys = 4096 } = {}) {
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > maxKeys) throw new TypeError(`Use 1-${maxKeys} keyframes`);
  let previous = -1, type;
  for (const key of keys) {
    if (!key || typeof key !== 'object' || Array.isArray(key)
        || Object.keys(key).some(name => !['frame', 'value', 'easing'].includes(name))) throw new TypeError('Invalid keyframe');
    frameIndex(key.frame, 'Keyframe position');
    if (key.frame <= previous || key.frame > maxFrame) throw new RangeError('Keyframes must be strictly ordered within the node duration');
    if (!scalar(key.value) || typeof key.value === 'string' && key.value.length > 10000) throw new TypeError('Keyframe values must be bounded scalar values');
    if (type !== undefined && typeof key.value !== type) throw new TypeError('Keyframes must retain one value type');
    type = typeof key.value;
    validateEasing(key.easing);
    previous = key.frame;
  }
  return keys;
}

/** Keyframe easing belongs to the outgoing segment; strings and booleans hold. */
export function keyframeValue(keys, frame, fallback) {
  if (!keys?.length) return fallback;
  if (!Number.isFinite(frame)) throw new TypeError('Evaluation frame must be finite');
  if (frame <= keys[0].frame) return keys[0].value;
  if (frame >= keys.at(-1).frame) return keys.at(-1).value;
  let low = 0, high = keys.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (keys[middle].frame <= frame) low = middle; else high = middle;
  }
  const left = keys[low], right = keys[high];
  if (typeof left.value !== 'number' || left.easing === 'hold') return left.value;
  return left.value + (right.value - left.value) * ease((frame - left.frame) / (right.frame - left.frame), left.easing);
}

export function multiplyTransform(a, b) {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}

export function transformMatrix({ x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1, anchorX = 0, anchorY = 0 } = {}) {
  const radians = rotation * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
  return [c * scaleX, s * scaleX, -s * scaleY, c * scaleY,
    x - c * scaleX * anchorX + s * scaleY * anchorY,
    y - s * scaleX * anchorX - c * scaleY * anchorY];
}

export function transformPoint(matrix, x, y) {
  return { x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] };
}

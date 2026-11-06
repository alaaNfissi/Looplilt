// Pure absolute-time helpers. No clock, DOM, hidden state, or external dependencies.
export const easing = Object.freeze({
  linear: x => x,
  smooth: x => x * x * (3 - 2 * x),
  inCubic: x => x ** 3,
  outCubic: x => 1 - (1 - x) ** 3,
  inOutCubic: x => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2,
  sine: x => (1 - Math.cos(Math.PI * x)) / 2
});
export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export const mix = (from, to, progress) => from + (to - from) * progress;
function finite(value, label) {
  if (!Number.isFinite(value)) throw new Error(label + ' must be finite');
  return value;
}
export function tween(time, start, end, from = 0, to = 1, curve = 'smooth') {
  for (const value of [time, start, end, from, to]) finite(value, 'Tween value');
  if (end <= start) throw new Error('Tween end must be after start');
  if (!Object.hasOwn(easing, curve)) throw new Error('Unknown easing: ' + curve);
  return mix(from, to, easing[curve](clamp((time - start) / (end - start))));
}
export function keyframes(time, points) {
  finite(time, 'Time');
  if (!Array.isArray(points) || points.length < 2 || points.length > 1000) throw new Error('Use 2–1000 keyframes');
  let previous = -Infinity;
  for (const point of points) {
    if (!Array.isArray(point) || point.length < 2 || point.length > 3) throw new Error('A keyframe is [time, value, easing?]');
    finite(point[0], 'Keyframe time'); finite(point[1], 'Keyframe value');
    if (point[0] <= previous) throw new Error('Keyframe times must increase');
    if (point[2] !== undefined && !Object.hasOwn(easing, point[2])) throw new Error('Unknown keyframe easing');
    previous = point[0];
  }
  if (time <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (time <= points[i][0]) return tween(time, points[i - 1][0], points[i][0], points[i - 1][1], points[i][1], points[i][2] ?? 'smooth');
  }
  return points.at(-1)[1];
}
// Analytic damped step response; t is seconds since the movement begins.
export function spring(time, { frequency = 2, damping = .7 } = {}) {
  finite(time, 'Time'); finite(frequency, 'Frequency'); finite(damping, 'Damping');
  if (frequency <= 0 || frequency > 30 || damping < .05 || damping > 5) throw new Error('Spring frequency is (0,30], damping is [0.05,5]');
  if (time <= 0) return 0;
  const w = 2 * Math.PI * frequency;
  if (Math.abs(damping - 1) < 1e-8) return 1 - Math.exp(-w * time) * (1 + w * time);
  if (damping < 1) {
    const d = Math.sqrt(1 - damping * damping), q = w * d * time;
    return 1 - Math.exp(-damping * w * time) * (Math.cos(q) + damping / d * Math.sin(q));
  }
  const d = Math.sqrt(damping * damping - 1), a = -w * (damping - d), b = -w * (damping + d);
  return 1 + (b * Math.exp(a * time) - a * Math.exp(b * time)) / (a - b);
}
export function bezier(points, progress) {
  if (!Array.isArray(points) || points.length !== 4 || points.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)))) throw new Error('A cubic path needs four finite [x,y] points');
  const u = clamp(finite(progress, 'Path progress')), v = 1 - u;
  return [0, 1].map(axis => v ** 3 * points[0][axis] + 3 * v * v * u * points[1][axis] + 3 * v * u * u * points[2][axis] + u ** 3 * points[3][axis]);
}
export function transform(ctx, { x = 0, y = 0, scale = 1, rotation = 0, opacity = 1 } = {}, draw) {
  for (const value of [x, y, scale, rotation, opacity]) finite(value, 'Transform');
  if (typeof draw !== 'function') throw new Error('Transform needs a drawing function');
  ctx.save();
  try {
    ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(scale, scale);
    ctx.globalAlpha *= clamp(opacity);
    return draw();
  } finally { ctx.restore(); }
}
export function sceneAt(scenes = [], time) {
  const shot = scenes.find(s => time >= s.start && time < s.end);
  return shot ? { ...shot, time: time - shot.start, progress: (time - shot.start) / (shot.end - shot.start) } : null;
}
export function cueTime(cues = [], id) {
  const cue = cues.find(c => c.id === id);
  if (!cue) throw new Error('Unknown cue: ' + id);
  return cue.at;
}
export const motion = Object.freeze({ clamp, mix, tween, keyframes, spring, bezier, transform });

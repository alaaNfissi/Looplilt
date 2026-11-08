import test from 'node:test';
import assert from 'node:assert/strict';
import { frameRate, frameSeconds, frameMicroseconds, outputTiming, sampleFrame } from '../lib/graph/time.mjs';
import { ease, validateKeyframes, keyframeValue, multiplyTransform, transformMatrix, transformPoint } from '../lib/graph/animation.mjs';

test('fractional timestamps retain rational rate and do not accumulate microsecond drift', () => {
  const ntsc = { numerator: 30000, denominator: 1001 };
  assert.deepEqual(frameRate({ numerator: 60000, denominator: 2002 }), ntsc);
  assert.equal(frameSeconds(108000, ntsc), 3603.6);
  assert.equal(frameMicroseconds(108000, ntsc), 3603600000);
  assert.equal(frameMicroseconds(108000, ntsc) - frameMicroseconds(107999, ntsc), 33367);
  for (const rate of [{ numerator: Infinity, denominator: 1 }, { numerator: 30, denominator: 0 }, { numerator: 0, denominator: 1 }]) {
    assert.throws(() => frameRate(rate));
  }
});

test('changing export rate preserves duration and source-time sampling', () => {
  const fps30 = { numerator: 30, denominator: 1 }, fps24 = { numerator: 24, denominator: 1 };
  const plan = outputTiming(90, fps30, fps24);
  assert.equal(plan.frames, 72);
  assert.equal(plan.seconds, 3);
  assert.equal(sampleFrame(48, fps30, fps24), 60);
  const fractional = outputTiming(90, { numerator: 30000, denominator: 1001 }, fps24);
  assert.equal(fractional.frames, 73);
  assert.ok(fractional.tailSeconds >= 0 && fractional.tailSeconds < 1 / 24);
  assert.throws(() => outputTiming(0, fps30));
});

test('animation has exact endpoints, ordered keys, held values and seek independence', () => {
  const keys = [{ frame: 0, value: 5, easing: 'ease-in-out' }, { frame: 60, value: 25 }];
  validateKeyframes(keys);
  const before = keyframeValue(keys, 17);
  assert.equal(keyframeValue(keys, 60), 25);
  assert.equal(keyframeValue(keys, -10), 5);
  assert.equal(keyframeValue(keys, 17), before);
  assert.ok(Math.abs(keyframeValue(keys, 30) - 15) < 1e-8);
  assert.equal(keyframeValue([{ frame: 0, value: 'First' }, { frame: 10, value: 'Second' }], 9.99), 'First');
  assert.equal(keyframeValue([{ frame: 0, value: 1, easing: 'hold' }, { frame: 10, value: 2 }], 10), 2);
  assert.throws(() => validateKeyframes([{ frame: 2, value: 1 }, { frame: 2, value: 3 }]));
  assert.throws(() => ease(.5, [-1, 0, 1, 1]));
  assert.ok(Number.isFinite(ease(.00001, [0, 0, 0, 1])));
});

test('nested transforms preserve anchor and parent coordinate systems', () => {
  const parent = transformMatrix({ x: 100, y: 40, rotation: 90, scaleX: 2, scaleY: 2 });
  const child = transformMatrix({ x: 20, y: 10, anchorX: 5, anchorY: 5 });
  const point = transformPoint(multiplyTransform(parent, child), 5, 5);
  assert.ok(Math.abs(point.x - 80) < 1e-9);
  assert.ok(Math.abs(point.y - 80) < 1e-9);
});

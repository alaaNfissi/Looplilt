/** Frame boundaries are integers; rates are reduced rational numbers. */
function integer(value, label, low, high) {
  if (!Number.isSafeInteger(value) || value < low || value > high) {
    throw new RangeError(`${label} must be an integer from ${low} to ${high}`);
  }
  return value;
}

export function frameRate(value = { numerator: 30, denominator: 1 }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !['numerator', 'denominator'].includes(key))) {
    throw new TypeError('Frame rate requires numerator and denominator');
  }
  const numerator = integer(value.numerator, 'Frame-rate numerator', 1, 1000000);
  const denominator = integer(value.denominator, 'Frame-rate denominator', 1, 100000);
  const rate = numerator / denominator;
  if (rate < 1 || rate > 120) throw new RangeError('Frame rate must be between 1 and 120 fps');
  let a = numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  return { numerator: numerator / a, denominator: denominator / a };
}

export function frameIndex(value, label = 'Frame') {
  return integer(value, label, 0, 1000000000);
}

/** Exact source-frame offsets also survive trims at non-integer playback speeds. */
export function rationalTime(value = { numerator: 0, denominator: 1 }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !['numerator', 'denominator'].includes(key))) throw new TypeError('Time requires numerator and denominator');
  integer(value.numerator, 'Time numerator', 0, Number.MAX_SAFE_INTEGER);
  integer(value.denominator, 'Time denominator', 1, 1000000000);
  if (value.numerator / value.denominator > 1000000000) throw new RangeError('Source time exceeds its frame bound');
  let a = value.numerator, b = value.denominator;
  while (b) [a, b] = [b, a % b];
  return { numerator: value.numerator / a, denominator: value.denominator / a };
}

export function advanceTime(offset, frames, speed = { numerator: 1, denominator: 1 }) {
  const start = rationalTime(offset); frameIndex(frames);
  integer(speed.numerator, 'Speed numerator', 1, 10000); integer(speed.denominator, 'Speed denominator', 1, 10000);
  let numerator = BigInt(start.numerator) * BigInt(speed.denominator) + BigInt(frames) * BigInt(speed.numerator) * BigInt(start.denominator);
  let denominator = BigInt(start.denominator) * BigInt(speed.denominator);
  let a = numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  numerator /= a; denominator /= a;
  if (numerator > BigInt(Number.MAX_SAFE_INTEGER) || denominator > 1000000000n) throw new RangeError('Exact source time exceeds its rational precision bound');
  return rationalTime({ numerator: Number(numerator), denominator: Number(denominator) });
}

export function frameSeconds(frame, rate) {
  frameIndex(frame);
  const { numerator, denominator } = frameRate(rate);
  return frame * denominator / numerator;
}

/** Round the absolute rational timestamp once, never sum rounded frame periods. */
export function frameMicroseconds(frame, rate) {
  frameIndex(frame);
  const { numerator, denominator } = frameRate(rate);
  const divisor = BigInt(numerator);
  return Number((BigInt(frame) * BigInt(denominator) * 1000000n + divisor / 2n) / divisor);
}

export function secondsFrame(seconds, rate, rounding = 'floor') {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Time must be finite and nonnegative');
  if (!['floor', 'ceil', 'round'].includes(rounding)) throw new TypeError('Unknown frame rounding mode');
  const { numerator, denominator } = frameRate(rate);
  return frameIndex(Math[rounding](seconds * numerator / denominator));
}

/** Map an output sample to the source timeline without changing film speed. */
export function sampleFrame(outputFrame, sourceRate, outputRate) {
  frameIndex(outputFrame);
  const source = frameRate(sourceRate), output = frameRate(outputRate);
  return outputFrame * source.numerator * output.denominator / (source.denominator * output.numerator);
}

export function outputTiming(frameCount, sourceRate, outputRate = sourceRate) {
  integer(frameCount, 'Frame count', 1, 1000000000);
  const source = frameRate(sourceRate), output = frameRate(outputRate);
  const numerator = BigInt(frameCount) * BigInt(source.denominator) * BigInt(output.numerator);
  const denominator = BigInt(source.numerator) * BigInt(output.denominator);
  // Cover the source's half-open interval. At most one output-frame tail is added.
  const frames = Number((numerator + denominator - 1n) / denominator);
  frameIndex(frames, 'Output frame count');
  const sourceSeconds = frameSeconds(frameCount, source), seconds = frameSeconds(frames, output);
  return { frames, rate: output, sourceSeconds, seconds, tailSeconds: seconds - sourceSeconds };
}

/** Move a source offset in either direction without losing rational precision. */
export function shiftTime(offset,frames,speed={numerator:1,denominator:1}){
 integer(frames,'Source shift',-1000000000,1000000000);
 if(frames>=0)return advanceTime(offset,frames,speed);
 const start=rationalTime(offset);integer(speed.numerator,'Speed numerator',1,10000);integer(speed.denominator,'Speed denominator',1,10000);
 let numerator=BigInt(start.numerator)*BigInt(speed.denominator)+BigInt(frames)*BigInt(speed.numerator)*BigInt(start.denominator),denominator=BigInt(start.denominator)*BigInt(speed.denominator);
 if(numerator<0n)throw new RangeError('Trim cannot extend before the beginning of the source');
 let a=numerator,b=denominator;while(b)[a,b]=[b,a%b];numerator/=a;denominator/=a;
 if(numerator>BigInt(Number.MAX_SAFE_INTEGER)||denominator>1000000000n)throw new RangeError('Exact source time exceeds its rational precision bound');
 return rationalTime({numerator:Number(numerator),denominator:Number(denominator)});
}

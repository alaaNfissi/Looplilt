import { encodePcm } from './pcm.mjs';
// Optional stereo sound studio. Every instrument and effect is synthesized locally.
export const STUDIO_VOICES = Object.freeze([
  'piano', 'guitar', 'strings', 'pad', 'bass', 'brass', 'marimba',
  'kick', 'snare', 'hat', 'brush', 'wind', 'rain', 'surf', 'footstep'
]);

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
}
const tau = Math.PI * 2;

function instrument(note, rate, seed) {
  const voice = note.voice ?? 'soft', frequency = 440 * 2 ** ((note.pitch - 69) / 12);
  const noise = random(seed), partials = [];
  let low = 0, slow = 0, previous = 0, stringIndex = 0;
  const string = new Float64Array(Math.max(2, Math.round(rate / frequency)));
  for (let i = 0; i < string.length; i++) string[i] = noise() * .7;
  const filter = cutoff => 1 - Math.exp(-tau * Math.min(rate * .45, cutoff) / rate);
  const alpha = filter(['wind', 'surf'].includes(voice) ? 650 : voice === 'footstep' ? 230 : 6500);
  const bassAlpha = filter(170);
  for (let h = 1; h <= 10; h++) if (h * frequency < rate * .48) partials.push(h);
  const odd = partials.filter(h => h % 2);
  const weight = odd.reduce((sum, h) => sum + 1 / h, 0) || 1;
  return (seconds, remaining) => {
    const phase = tau * frequency * seconds, n = noise();
    low += alpha * (n - low); slow += bassAlpha * (n - slow);
    const high = n - low;
    let sound = 0, attack = .008, release = .09;
    switch (voice) {
      case 'piano':
        for (const h of partials) {
          const stretch = h * (1 + .0002 * h * h);
          if (stretch * frequency < rate * .48) sound += Math.sin(phase * stretch) * Math.exp(-seconds * (1.1 + h * .6)) / h ** 1.45;
        }
        sound = sound * .72 + high * .09 * Math.exp(-seconds * 95);
        attack = .003; release = .15; break;
      case 'guitar': {
        const next = (stringIndex + 1) % string.length;
        sound = string[stringIndex];
        string[stringIndex] = .498 * (string[stringIndex] + string[next]);
        stringIndex = next;
        sound += .14 * Math.sin(phase) * Math.exp(-seconds * 2);
        attack = .003; release = .12; break;
      }
      case 'strings':
        for (const h of partials.slice(0, 7)) {
          const vibrato = Math.sin(seconds * tau * 5.1) * .002;
          sound += (Math.sin(phase * h * (1.002 + vibrato)) + Math.sin(phase * h * (.998 + vibrato))) / (h ** 1.55 * 3.4);
        }
        attack = .32; release = .36; break;
      case 'pad':
        sound = (Math.sin(phase) + .45 * Math.sin(phase * 1.003) + .18 * Math.sin(phase * 2)) / 1.63;
        sound *= .85 + .15 * Math.sin(seconds * tau * .7);
        attack = .48; release = .6; break;
      case 'bass':
        sound = .73 * Math.sin(phase) + .18 * Math.sin(phase * 2) + .06 * Math.sin(phase * 3);
        sound *= Math.exp(-seconds * 1.8);
        attack = .012; release = .09; break;
      case 'brass':
        for (const h of partials.slice(0, 6)) sound += Math.sin(phase * h + Math.sin(seconds * tau * 5) * .015 * h) / (h ** 1.25 * 2);
        sound *= .75 + .25 * Math.exp(-seconds * 4);
        attack = .055; release = .12; break;
      case 'marimba':
        for (const [ratio, gain, decay] of [[1, .8, 3], [3.99, .27, 8], [10.65, .08, 15]]) {
          if (frequency * ratio < rate * .48) sound += Math.sin(phase * ratio) * gain * Math.exp(-seconds * decay);
        }
        attack = .002; release = .1; break;
      case 'kick':
        sound = Math.sin(tau * (48 * seconds + 90 * .025 * (1 - Math.exp(-seconds / .025)))) * Math.exp(-seconds * 14);
        sound += low * .08 * Math.exp(-seconds * 80);
        attack = .001; release = .04; break;
      case 'snare':
        sound = (high * .7 + Math.sin(tau * 183 * seconds) * .3) * Math.exp(-seconds * 20);
        attack = .001; release = .04; break;
      case 'hat':
        sound = high * Math.exp(-seconds * 30);
        attack = .001; release = .025; break;
      case 'brush':
        sound = (n - slow) * (.45 + .35 * Math.sin(seconds * tau * 7)) * Math.exp(-seconds * 5);
        attack = .02; release = .1; break;
      case 'wind':
        sound = low * (.5 + .22 * Math.sin(seconds * tau * .27) + .14 * Math.sin(seconds * tau * .73));
        attack = 1.1; release = 1.1; break;
      case 'rain':
        sound = (n - slow) * (.44 + .06 * Math.sin(seconds * tau * 1.3));
        attack = .8; release = .8; break;
      case 'surf':
        sound = low * (.2 + .8 * (.5 + .5 * Math.sin(seconds * tau / 4 - 1)) ** 2);
        attack = 1; release = 1; break;
      case 'footstep':
        sound = (slow * 1.8 + .22 * Math.sin(tau * 135 * seconds)) * Math.exp(-seconds * 35);
        attack = .002; release = .035; break;
      case 'bell':
        sound = (Math.sin(phase) + .25 * Math.sin(phase * 2.01) + .1 * Math.sin(phase * 3.97)) / 1.35 * Math.exp(-seconds * 3.5); break;
      case 'pluck':
        sound = (Math.sin(phase) + .35 * Math.sin(phase * 2) + .15 * Math.sin(phase * 3)) / 1.5 * Math.exp(-seconds * 5); break;
      case 'chip': {


        for (const h of odd) sound += Math.sin(phase * h) / h / weight;
        break;
      }
      case 'tick': sound = Math.sin(phase * (1 + 1.8 * Math.exp(-seconds * 50))) * Math.exp(-seconds * 24); break;
      default: sound = Math.sin(phase);
    }
    // Remove slow DC from noise/string sources without random state outside the note.
    const dc = sound - previous * .001;
    previous = previous * .999 + sound;
    const envelope = Math.min(1, seconds / attack) * Math.min(1, remaining / release);
    return dc * Math.max(0, envelope) * (note.gain ?? .2);
  };
}

function roomChannel(input, rate, offset) {
  const buffers = [.0297, .0371, .0411, .0437].map(delay => new Float32Array(Math.round(rate * (delay + offset))));
  const indices = [0, 0, 0, 0], damp = [0, 0, 0, 0];
  return index => {
    let sum = 0;
    for (let j = 0; j < buffers.length; j++) {
      const buffer = buffers[j], position = indices[j], value = buffer[position];
      damp[j] = damp[j] * .35 + value * .65;
      buffer[position] = input[index] + damp[j] * .73;
      indices[j] = (position + 1) % buffer.length;
      sum += value;
    }
    return sum * .25;
  };
}

export function makeStudioSound(project, rate = 48000) {
  const count = Math.round(project.duration * rate), left = new Float32Array(count), right = new Float32Array(count);
  const sendLeft = new Float32Array(count), sendRight = new Float32Array(count);
  for (const [index, note] of project.score.entries()) {
    const start = Math.round(note.at * rate), length = Math.round(note.length * rate);
    const pan = ((note.pan ?? 0) + 1) * Math.PI / 4, l = Math.cos(pan), r = Math.sin(pan);
    const synth = instrument(note, rate, (index + 1) * 7391 + Math.round(note.pitch * 101));
    const send = note.send ?? .22;
    for (let i = 0; i < length && start + i < count; i++) {
      const sample = synth(i / rate, (length - 1 - i) / rate), target = start + i;
      left[target] += sample * l; right[target] += sample * r;
      sendLeft[target] += sample * l * send; sendRight[target] += sample * r * send;
    }
  }
  const room = project.audio?.room ?? .2, delay = project.audio?.delay ?? 0;
  const wetL = roomChannel(sendLeft, rate, 0), wetR = roomChannel(sendRight, rate, .0017);
  const echoLength = Math.round(rate * (project.audio?.echoSeconds ?? .375));
  const echoL = new Float32Array(echoLength), echoR = new Float32Array(echoLength);
  let peak = 0;
  for (let i = 0; i < count; i++) {
    const p = i % echoLength, a = echoL[p], b = echoR[p];
    echoL[p] = sendLeft[i] + b * .38; echoR[p] = sendRight[i] + a * .38;
    const fade = Math.min(1, (count - 1 - i) / (rate * .09));
    left[i] = (left[i] + room * wetL(i) + delay * a) * fade;
    right[i] = (right[i] + room * wetR(i) + delay * b) * fade;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const scale = peak > .85 ? .85 / peak : 1;
  return encodePcm([left, right], rate, scale);
}

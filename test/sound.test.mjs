import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSound } from '../lib/sound.mjs';
import { validateProject } from '../lib/project.mjs';

test('arcade score validates, has deterministic PCM and reserves mixing headroom', () => {
  const project = validateProject({ version:1, title:'Arcade sound', duration:2, fps:30, captions:[],
    score: Array.from({length:12}, (_,i) => ({at:0, pitch:[48,60,67,72][i%4], length:1.8, voice:'chip', gain:1})) });
  const wav=makeSound(project);
  assert.ok(wav.equals(makeSound(project)));
  assert.equal(wav.length,44+2*48000*2);
  assert.equal(wav.readInt16LE(44),0);
  assert.equal(wav.readInt16LE(wav.length-2),0);
  let peak=0;
  for(let i=44;i<wav.length;i+=2) peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
  assert.ok(peak>20000 && peak<=27853);
  assert.ok(!wav.equals(makeSound({...project,score:project.score.map(n=>({...n,voice:'soft'}))})));
});

test('arcade harmonics above Nyquist do not fold into the audible spectrum', () => {
  // At 4 kHz, the fifth harmonic of A4 would alias to 1.8 kHz.
  const wav=makeSound({duration:1,score:[{at:0,pitch:69,length:1,voice:'chip',gain:.5}]},4000);
  const energy=frequency=>{
    let re=0,im=0;
    for(let i=400;i<3600;i++){
      const v=wav.readInt16LE(44+i*2),a=2*Math.PI*frequency*i/4000;
      re+=v*Math.cos(a);im+=v*Math.sin(a);
    }
    return Math.hypot(re,im);
  };
  assert.ok(energy(1320)>energy(440)*.25);
  assert.ok(energy(1800)<energy(440)*.001);
});

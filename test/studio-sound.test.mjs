import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../lib/project.mjs';
import { makeSound } from '../lib/sound.mjs';
import { STUDIO_VOICES } from '../lib/studio-sound.mjs';
const project = changes => validateProject({version:1,title:'Studio test',duration:2,fps:30,captions:[],audio:{mode:'studio',room:0,delay:0},score:[],...changes});
function channelEnergy(wav, side, start=0, end=2) {
  const rate=wav.readUInt32LE(24); let sum=0;
  for(let i=Math.floor(start*rate);i<Math.min((wav.length-44)/4,Math.floor(end*rate));i++){
    const v=wav.readInt16LE(44+i*4+side*2);sum+=v*v;
  }
  return sum;
}
test('studio rejects unsafe mix settings and requires explicit opt-in',()=>{
  for(const audio of [{mode:'studio',room:NaN},{mode:'studio',delay:2},{mode:'studio',echoSeconds:0},{mode:'other'},{mode:'studio',unknown:1}])assert.throws(()=>project({audio}));
  for(const change of [{pan:1.1},{send:-1}])assert.throws(()=>project({score:[{at:0,pitch:60,length:1,voice:'piano',...change}]}));
  assert.throws(()=>project({audio:undefined,score:[{at:0,pitch:60,length:1,voice:'piano'}]}));
});
test('every studio voice produces repeatable non-silent PCM with exact stereo duration',()=>{
  for(const voice of STUDIO_VOICES){
    const p=project({score:[{at:0,pitch:60,length:1.8,voice,gain:.5}]});
    const wav=makeSound(p,16000);
    assert.equal(wav.readUInt16LE(22),2);
    assert.equal(wav.length,44+2*16000*4);
    assert.ok(wav.equals(makeSound(p,16000)),voice+' is deterministic');
    assert.ok(channelEnergy(wav,0)>100000,voice+' is audible');
    assert.equal(wav.readInt16LE(wav.length-2),0);
  }
});
test('pan places a dry instrument in the requested channel; room produces a decaying tail',()=>{
  const note={at:0,pitch:60,length:.5,voice:'piano',gain:.5,pan:-1,send:1};
  const dry=makeSound(project({score:[note]}),16000);
  assert.ok(channelEnergy(dry,0)>100000);
  assert.equal(channelEnergy(dry,1),0);
  assert.equal(channelEnergy(dry,0,.6,1.5),0);
  const wet=makeSound(project({audio:{mode:'studio',room:1},score:[note]}),16000);
  assert.ok(channelEnergy(wet,0,.6,1.2)>1000);
  assert.ok(channelEnergy(wet,0,1.3,1.8)<channelEnergy(wet,0,.6,1.1));
});
test('dense stereo arrangements stay below clipping with finite samples',()=>{
  const score=Array.from({length:30},(_,i)=>({at:0,pitch:48+i%24,length:1.8,voice:STUDIO_VOICES[i%STUDIO_VOICES.length],gain:1,pan:i%2?-.6:.6,send:1}));
  const wav=makeSound(project({audio:{mode:'studio',room:1,delay:1},score}),16000);
  let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));
  assert.ok(peak>20000 && peak<=27853);
});

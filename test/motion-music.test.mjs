import test from 'node:test';
import assert from 'node:assert/strict';
import { motion, sceneAt, cueTime } from '../lib/motion.mjs';
import { expandMusic } from '../lib/music.mjs';
import { validateProject } from '../lib/project.mjs';
const project = changes => ({version:1,title:'A test',duration:8,fps:30,score:[],...changes});
test('pure keyframes preserve endpoints, ease segments, and reject ambiguous timing', () => {
  const keys=[[0,10],[2,30,'linear'],[4,20]];
  assert.equal(motion.keyframes(-1,keys),10);assert.equal(motion.keyframes(1,keys),20);
  assert.equal(motion.keyframes(9,keys),20);assert.equal(motion.keyframes(3,keys),25);
  for(const keys of [[[0,1],[0,2]],[[0,1],[1,2,'__proto__']],[[0,NaN],[1,2]]])assert.throws(()=>motion.keyframes(1,keys));
});
test('analytic springs support under, critical, and over damping without simulation history', () => {
  for(const damping of [.5,1,2]){
    assert.equal(motion.spring(-1,{damping}),0);assert.equal(motion.spring(0,{damping}),0);
    assert.ok(Math.abs(motion.spring(10,{damping})-1)<1e-6);
    const value=motion.spring(.2,{damping});motion.spring(8,{damping});assert.equal(value,motion.spring(.2,{damping}));
  }
  assert.ok(motion.spring(.3,{damping:.4})>1);
  assert.throws(()=>motion.spring(1,{damping:0}));
});
test('paths and transforms compose without leaking Canvas state on errors', () => {
  const points=[[0,0],[0,2],[2,2],[2,0]];
  assert.deepEqual(motion.bezier(points,.5),[1,1.5]);assert.deepEqual(motion.bezier(points,2),[2,0]);
  const calls=[],ctx={globalAlpha:.5,save(){calls.push('save')},restore(){calls.push('restore')},translate(){},rotate(){},scale(){}};
  assert.throws(()=>motion.transform(ctx,{opacity:.5},()=>{assert.equal(ctx.globalAlpha,.25);throw new Error('drawing')}),/drawing/);
  assert.deepEqual(calls,['save','restore']);
});
test('named scenes use half-open frame-aligned ranges and local time', () => {
  const scenes=[{id:'start',label:'Start',start:0,end:4},{id:'arrival',label:'Arrival',start:4,end:8,params:{accent:'#123456'}}];
  validateProject(project({scenes}));
  assert.equal(sceneAt(scenes,4).id,'arrival');assert.equal(sceneAt(scenes,5).time,1);assert.equal(sceneAt(scenes,5).progress,.25);
  assert.equal(sceneAt(scenes,8),null);
  assert.equal(cueTime([{id:'lift',at:3}], 'lift'),3);assert.throws(()=>cueTime([], 'missing'));
  for(const changes of [
    [{...scenes[0],end:3.5},scenes[1]], [{...scenes[0],start:.1},scenes[1]],
    [scenes[0],{...scenes[1],id:'start'}], [scenes[0],{...scenes[1],params:JSON.parse('{"__proto__":1}')}]])
    assert.throws(()=>validateProject(project({scenes:changes})));
});
const music=()=>({bpm:120,patterns:[{id:'motif',beats:2,notes:[{beat:0,length:.5,pitch:60},{beat:1,length:.5,pitch:64,gain:.5}]}],
 tracks:[{id:'keys',voice:'piano',gain:.3,pan:-.4,clips:[{pattern:'motif',at:{cue:'lift',offset:.5},repeat:2,transpose:7}]}]});
test('motifs share named visual cues and expand into deterministic timed tracks', () => {
  const notes=expandMusic(music(),[{id:'lift',at:1}],8);
  assert.deepEqual(notes.map(n=>n.at),[1.5,2,2.5,3]);
  assert.deepEqual(notes.map(n=>n.pitch),[67,71,67,71]);
  assert.equal(notes[1].gain,.15);assert.equal(notes[0].track,'keys');
  const input=project({cues:[{id:'lift',at:1}],music:music(),audio:{mode:'studio'}});
  assert.equal(validateProject(input).score.length,0,'Compilation does not pollute editable score data');
  assert.deepEqual(validateProject(validateProject(input)),validateProject(input),'Validation is idempotent');
});
test('invalid motifs, unknown cues, excess expansion and out-of-film clips are rejected', () => {
  assert.throws(()=>expandMusic(music(),[],8),/cue/);
  let m=music();m.tracks[0].clips[0].repeat=200;assert.throws(()=>expandMusic(m,[{id:'lift',at:1}],8),/past/);
  m=music();m.patterns[0].notes[0].length=3;assert.throws(()=>expandMusic(m,[],8),/past/);
  m=music();m.tracks[0].clips[0].transpose=48;assert.throws(()=>expandMusic(m,[{id:'lift',at:1}],8),/pitch/);
  m=music();m.patterns.push(m.patterns[0]);assert.throws(()=>expandMusic(m,[],8),/Duplicate/);
});

test('empty tracks still reject unsupported voices and preserve classic voices', () => {
  const m = music(); m.tracks[0].clips = []; m.tracks[0].voice = 'unknown';
  assert.throws(() => validateProject(project({ music:m, audio:{mode:'studio'} })), /voice/);
  for (const voice of ['tick','chip','bell']) { m.tracks[0].voice=voice; validateProject(project({ music:m, audio:{mode:'studio'} })); }
});

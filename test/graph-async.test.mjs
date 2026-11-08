import test from 'node:test';
import assert from 'node:assert/strict';
import {awaitBounded} from '../lib/graph/async.mjs';
test('stalled native operations time out, close owned resources once, and release a late frame',async()=>{
 let deliver,closed=0,released=0;const pending=new Promise(resolve=>{deliver=resolve;});
 await assert.rejects(awaitBounded(pending,{timeout:15,label:'Decoder',onCancel:()=>closed++,disposeLate:frame=>frame.close()}),/Decoder timed out/);
 deliver({close:()=>released++});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(closed,1);assert.equal(released,1);
});
test('abort preserves its reason and successful or failed work leaves no cancellation hook',async()=>{
 const controller=new AbortController();let closed=0;const task=awaitBounded(new Promise(()=>{}),{signal:controller.signal,onCancel:()=>{closed++;throw new Error('cleanup error');}});
 controller.abort(new Error('explicit cancel'));await assert.rejects(task,/explicit cancel/);assert.equal(closed,1);
 const other=new AbortController();assert.equal(await awaitBounded(Promise.resolve(4),{signal:other.signal,onCancel:()=>closed++}),4);other.abort();assert.equal(closed,1);
 await assert.rejects(awaitBounded(Promise.reject(new Error('decode failed'))),/decode failed/);
});

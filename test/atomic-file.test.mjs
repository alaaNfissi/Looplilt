import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {atomicRename} from '../lib/atomic-file.mjs';
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-rename-test-'));
 t.after(async()=>{const resolved=await fs.realpath(root);assert.equal(path.dirname(resolved),await fs.realpath(os.tmpdir()));assert.match(path.basename(resolved),/^looplilt-rename-test-/);await fs.rm(resolved,{recursive:true,force:true});});
 const old=path.join(root,'current.json'),next=path.join(root,'pending.json');await fs.writeFile(old,'old');await fs.writeFile(next,'new');return {old,next};
}
test('transient sharing violations preserve the old file until atomic replacement succeeds',async t=>{
 const {old,next}=await fixture(t),rename=fs.rename;let calls=0,checks=0;
 t.mock.method(fs,'rename',async(a,b)=>{calls++;assert.equal(await fs.readFile(old,'utf8'),'old');if(calls<3)throw Object.assign(new Error('File is temporarily shared'),{code:'EPERM'});return rename(a,b);});
 await atomicRename(next,old,{platform:'win32',beforeAttempt:()=>{checks++;}});
 assert.equal(calls,3);assert.equal(checks,3);assert.equal(await fs.readFile(old,'utf8'),'new');await assert.rejects(fs.access(next),{code:'ENOENT'});
});
test('cancellation and a changed revision abort a retry without deleting either file',async t=>{
 const {old,next}=await fixture(t),controller=new AbortController();
 t.mock.method(fs,'rename',async()=>{controller.abort(new Error('Stop saving'));throw Object.assign(new Error('Shared file'),{code:'EPERM'});});
 await assert.rejects(atomicRename(next,old,{platform:'win32',signal:controller.signal}),/abort|Stop saving/i);
 assert.equal(await fs.readFile(old,'utf8'),'old');assert.equal(await fs.readFile(next,'utf8'),'new');
 await assert.rejects(atomicRename(next,old,{platform:'win32',beforeAttempt:()=>{throw new Error('Revision conflict');}}),/Revision conflict/);
 assert.equal(await fs.readFile(old,'utf8'),'old');
});
test('non-sharing errors and expired retry budgets fail immediately',async t=>{
 const {old,next}=await fixture(t);let calls=0;
 t.mock.method(fs,'rename',async()=>{calls++;throw Object.assign(new Error('Permission remains denied'),{code:'EPERM'});});
 await assert.rejects(atomicRename(next,old,{platform:'win32',timeout:0}),/denied/);assert.equal(calls,1);assert.equal(await fs.readFile(old,'utf8'),'old');
});

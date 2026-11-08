import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createGraph} from '../lib/graph/schema.mjs';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';
import {legacyAsset} from '../lib/graph/legacy-source.mjs';
import {putWorkspaceAsset,readWorkspaceAsset} from '../lib/graph/assets.mjs';
import {createProjectBundle} from '../lib/graph/bundle.mjs';
import {importProjectBundle} from '../lib/graph/project-import.mjs';
import {AsyncSemaphore} from '../lib/graph/semaphore.mjs';
import {canvasFontFamily} from '../lib/graph/typography.mjs';

test('cancelled media waiters release their queue position without exceeding concurrency',async()=>{
 const slots=new AsyncSemaphore(2),one=await slots.acquire(),two=await slots.acquire(),cancel=new AbortController();
 const rejected=assert.rejects(slots.acquire({signal:cancel.signal}),/stop waiting/);cancel.abort(new Error('stop waiting'));await rejected;
 let acquired=false;const waiting=slots.acquire().then(release=>{acquired=true;return release;});await Promise.resolve();assert.equal(acquired,false);
 one();one();const third=await waiting;let nextAcquired=false;const next=slots.acquire().then(release=>{nextAcquired=true;return release;});await Promise.resolve();assert.equal(nextAcquired,false);
 two();const fourth=await next;third();fourth();
 let active=0,peak=0;await Promise.all(Array.from({length:12},()=>slots.run(async()=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;})));
 assert.equal(peak,2);assert.equal(active,0);
});

test('font fallback lists preserve family names and generic fallbacks as separate choices',()=>{
 assert.equal(canvasFontFamily('Georgia, serif'),'"Georgia", serif');
 assert.equal(canvasFontFamily('"An Original, Hand", system-ui'),'"An Original, Hand", system-ui');
 assert.equal(canvasFontFamily("'Paper Serif', 'Another Face', serif"),'"Paper Serif", "Another Face", serif');
 assert.equal(canvasFontFamily(''),'sans-serif');
 assert.equal(canvasFontFamily('url(example), sans-serif'),'"url(example)", sans-serif');
});

test('a failed portable import resumes one copy and preserves independently edited projects',{timeout:60000},async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-import-test-')),workspace=await GraphWorkspace.open(root);
 t.after(async()=>{const resolved=await fs.realpath(root),temporary=await fs.realpath(os.tmpdir());assert.equal(path.dirname(resolved),temporary);assert.match(path.basename(resolved),/^looplilt-import-test-/);await fs.rm(resolved,{recursive:true,force:true});});
 const existing=await workspace.create(createGraph({id:'shared-name',title:'Keep my current edits'})),original=createGraph({id:'shared-name',title:'Original portable story'});
 const source=new TextEncoder().encode('{"version":1,"title":"Own portable score","duration":1,"fps":30,"score":[],"captions":[]}'),asset=await legacyAsset('legacy-project',source);
 original.assets[asset.id]=asset;const blob=new Blob([source]),bundle=await createProjectBundle(original,{getAsset:async()=>blob});
 let fail=true;
 const repository={list:()=>workspace.list(),create:document=>workspace.create(document),putAsset:async(asset,data,options)=>{if(fail)throw new Error('Simulated interrupted upload');await putWorkspaceAsset(workspace,options.projectId,asset,data.stream(),options);}};
 let unfinished;try{await importProjectBundle(bundle,repository);assert.fail('Expected interruption');}catch(error){assert.equal(error.code,'INCOMPLETE_IMPORT');unfinished=error.projectId;assert.match(error.message,/same .looplilt file again/);}
 assert.equal((await workspace.list()).length,2);fail=false;
 const restored=await importProjectBundle(bundle,repository);assert.equal(restored.projectId,unfinished);assert.equal(restored.created,false);assert.equal((await workspace.list()).length,2);
 assert.deepEqual((await readWorkspaceAsset(workspace,unfinished,asset.id)).bytes,Buffer.from(source));
 assert.equal((await workspace.read(existing.document.id)).fingerprint,existing.fingerprint);
 const imported=await workspace.read(unfinished),edited=await workspace.transact(unfinished,{expectedFingerprint:imported.fingerprint,label:'Make this copy mine',operations:[{op:'project.patch',changes:{title:'Keep this new title too'}}]});
 const next=await importProjectBundle(bundle,repository);assert.notEqual(next.projectId,unfinished);assert.equal((await workspace.read(unfinished)).fingerprint,edited.fingerprint);assert.equal((await workspace.list()).length,3);
});

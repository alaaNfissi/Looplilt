import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {studioSourceEntries,createStudioManifest,verifyStudioRuntime,studioRuntimeEntries} from '../lib/studio/distribution.mjs';
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-distribution-test-'));
 t.after(async()=>{const resolved=await fs.realpath(root);assert.equal(path.dirname(resolved),await fs.realpath(os.tmpdir()));assert.match(path.basename(resolved),/^looplilt-distribution-test-/);await fs.rm(resolved,{recursive:true,force:true});});
 const write=async(file,bytes)=>{const target=path.join(root,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);};
 await write('package.json',JSON.stringify({version:'0.4.0'}));await write('lib/graph/schema.mjs','export const version=2;');await write('lib/project-schema.mjs','export const legacy=1;');
 await write('studio/apps/web/src/app.tsx','export default function Studio(){}');await write('studio/package.json','{}');
 await write('studio/node_modules/ignored/index.js','dependency bytes');await write('studio/apps/web/.next/cache/ignored','build cache');
 await write('studio/apps/web/out/index.html','<title>Looplilt Studio</title>');await write('studio/apps/web/out/render/index.html','<title>Shared renderer</title>');await write('studio/apps/web/out/_next/app.js','window.example=true;');
 return {root,write};
}
test('Studio distribution keeps source and verified runtime while excluding dependencies and caches',async t=>{
 const {root}=await fixture(t),source=await studioSourceEntries(root);assert.deepEqual(source.map(item=>item.name),['studio/apps/web/src/app.tsx','studio/package.json']);
 const manifest=await createStudioManifest(root);assert.equal(manifest.files.length,3);
 assert.equal((await verifyStudioRuntime(root)).sources.graph,manifest.sources.graph);
 const runtime=await studioRuntimeEntries(root,{required:true});assert.equal(runtime.length,4);assert.ok(runtime.every(item=>item.name.startsWith('studio/apps/web/out/')));
});
test('Studio packages refuse stale source, modified bundles and unexpected private files',async t=>{
 const {root,write}=await fixture(t);await createStudioManifest(root);
 await write('studio/apps/web/src/app.tsx','export default function Changed(){}');await assert.rejects(verifyStudioRuntime(root),/stale/);await assert.rejects(verifyStudioRuntime(root,{stories:false}),/stale/);
 await createStudioManifest(root);await write('studio/apps/web/out/_next/app.js','changed runtime');await assert.rejects(verifyStudioRuntime(root),/integrity/);
 await write('studio/.env','private value');await assert.rejects(studioSourceEntries(root),/Unexpected distribution/);
});

test('Studio runtime detects changed original story sources',async t=>{
 const {root,write}=await fixture(t);await write('examples/studio/a-film/project.looplilt.json','original story');await createStudioManifest(root);
 await write('examples/studio/a-film/project.looplilt.json','revised original story');await assert.rejects(verifyStudioRuntime(root),/stale/);
 // A graph snapshot renders against matching compiled code independently of
 // whether the bundled welcome examples have been refreshed.
 assert.ok(await verifyStudioRuntime(root,{stories:false}));
});

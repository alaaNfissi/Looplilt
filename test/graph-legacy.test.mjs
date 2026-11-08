import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GraphWorkspace } from '../lib/graph/workspace.mjs';
import { createGraph } from '../lib/graph/schema.mjs';
import { inspectLegacySource,legacyAsset } from '../lib/graph/legacy-source.mjs';
import { importLegacyProject } from '../lib/graph/legacy-import.mjs';
import { verifyWorkspaceAssets,putWorkspaceAsset } from '../lib/graph/assets.mjs';
import { generateLegacyRuntime } from '../scripts/build-legacy-runtime.mjs';
const encode=text=>new TextEncoder().encode(text);
const json='{"version":1,"title":"The retained original","duration":2,"fps":30,"score":[],"captions":[]}\n';
const source='throw new Error("source must never execute in Node");\nfunction drawFrame({ctx}) { ctx.fillRect(0,0,10,10); }\n';
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-legacy-test-'));
 t.after(async()=>{const real=await fs.realpath(root);assert.equal(path.dirname(real),await fs.realpath(os.tmpdir()));assert.match(path.basename(real),/^looplilt-legacy-test-/);await fs.rm(real,{recursive:true,force:true});});
 await fs.mkdir(path.join(root,'imports/film'),{recursive:true});await fs.writeFile(path.join(root,'imports/film/project.json'),json);await fs.writeFile(path.join(root,'imports/film/draw.js'),source);
 const workspace=await GraphWorkspace.open(root),state=await workspace.create(createGraph({id:'source-film',durationFrames:30}));
 return {root,workspace,state};
}
test('legacy import retains exact original bytes, extends the composition, and never runs source in Node',async t=>{
 const {root,workspace,state}=await fixture(t);
 const imported=await importLegacyProject(workspace,{projectId:'source-film',expectedFingerprint:state.fingerprint,source:'imports/film',start:15});
 assert.equal(imported.document.durationFrames,75);assert.equal(imported.document.nodes[imported.nodeId].type,'canvas');
 assert.equal(imported.document.nodes[imported.nodeId].time.start,15);assert.equal(imported.document.nodes[imported.nodeId].time.duration,60);
 for(const asset of imported.assets)assert.equal(await fs.readFile(path.join(root,'projects/source-film',asset.path),'utf8'),asset.kind==='legacy-project'?json:source);
 assert.equal((await verifyWorkspaceAssets(workspace,'source-film')).valid,true);
 await assert.rejects(importLegacyProject(workspace,{projectId:'source-film',expectedFingerprint:state.fingerprint,source:'imports/film'}),/revision|conflict/i);
 const undone=await workspace.undoRedo('source-film','undo',imported.fingerprint);assert.equal(Object.keys(undone.document.assets).length,0);
 const restored=await workspace.undoRedo('source-film','redo',undone.fingerprint);assert.equal(restored.document.nodes[imported.nodeId].type,'canvas');
 assert.equal(await fs.readFile(path.join(root,'imports/film/draw.js'),'utf8'),source);
});
test('source import rejects traversal, invalid syntax, unsupported JSON and forged manifests',async t=>{
 const {root,workspace,state}=await fixture(t),args={projectId:'source-film',expectedFingerprint:state.fingerprint};
 for(const directory of ['../outside','imports/../../outside','projects/source-film'])await assert.rejects(importLegacyProject(workspace,{...args,source:directory}));
 await fs.writeFile(path.join(root,'imports/film/draw.js'),'function drawFrame( {}');
 await assert.rejects(importLegacyProject(workspace,{...args,source:'imports/film'}),SyntaxError);
 assert.equal((await workspace.read('source-film')).fingerprint,state.fingerprint);
 assert.throws(()=>inspectLegacySource('legacy-project',encode(json.replace('"version":1','"version":2'))),/version/);
 assert.throws(()=>inspectLegacySource('legacy-project',encode('{"__proto__":{}}')),/unsafe/);
 assert.throws(()=>inspectLegacySource('legacy-script',new Uint8Array(2*1024*1024+1)),/2 MiB/);
 const asset=await legacyAsset('legacy-script',encode(source));asset.mime='image/png';
 await assert.rejects(putWorkspaceAsset(workspace,'source-film',asset,[encode(source)]),/manifest/);
 const aborted=new AbortController();aborted.abort();
 await assert.rejects(importLegacyProject(workspace,{...args,source:'imports/film'},{signal:aborted.signal}),{name:'AbortError'});
 assert.equal((await workspace.read('source-film')).fingerprint,state.fingerprint);
});
test('generated isolated runtimes match their maintained rendering and audio sources',()=>generateLegacyRuntime({check:true}));

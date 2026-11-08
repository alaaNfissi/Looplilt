import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { GraphWorkspace } from '../lib/graph/workspace.mjs';
import { createGraph } from '../lib/graph/schema.mjs';
import { importWorkspaceAsset, verifyWorkspaceAssets } from '../lib/graph/assets.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==','base64');
async function setup(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-assets-test-'));
 t.after(async()=>{const real=await fs.realpath(root);assert.equal(path.dirname(real),await fs.realpath(os.tmpdir()));assert.match(path.basename(real),/^looplilt-assets-test-/);await fs.rm(real,{recursive:true,force:true});});
 await fs.mkdir(path.join(root,'imports'));await fs.writeFile(path.join(root,'imports/original.png'),png);
 const workspace=await GraphWorkspace.open(root),state=await workspace.create(createGraph({id:'assets-film'}));
 return {root,workspace,state};
}
test('approved media is hashed, copied immutably and attached through a normal transaction',async t=>{
 const {root,workspace,state}=await setup(t);
 const imported=await importWorkspaceAsset(workspace,{projectId:'assets-film',source:'imports/original.png',expectedFingerprint:state.fingerprint});
 assert.equal(imported.asset.kind,'image');assert.equal(imported.asset.bytes,png.length);assert.equal(imported.asset.metadata.width,1);
 assert.deepEqual(await fs.readFile(path.join(root,'projects/assets-film',imported.asset.path)),png);
 assert.deepEqual(await fs.readFile(path.join(root,'imports/original.png')),png);
 assert.equal((await verifyWorkspaceAssets(workspace,'assets-film')).valid,true);
 const again=await importWorkspaceAsset(workspace,{projectId:'assets-film',source:'imports/original.png',expectedFingerprint:imported.fingerprint});
 assert.equal(again.noop,true);assert.equal(again.fingerprint,imported.fingerprint);
 await fs.writeFile(path.join(root,'projects/assets-film',imported.asset.path),Buffer.alloc(png.length));
 const changed=await verifyWorkspaceAssets(workspace,'assets-film');assert.equal(changed.valid,false);assert.equal(changed.assets[0].status,'changed');
 await assert.rejects(importWorkspaceAsset(workspace,{projectId:'assets-film',source:'imports/original.png',expectedFingerprint:imported.fingerprint}),/integrity check/);
});
test('scope, code, oversized input and cancellation cannot create asset references',async t=>{
 const {root,workspace,state}=await setup(t),args={projectId:'assets-film',expectedFingerprint:state.fingerprint};
 await fs.writeFile(path.join(root,'imports/draw.js'),'throw new Error("must not run")');
 await assert.rejects(importWorkspaceAsset(workspace,{...args,source:'imports/draw.js'}),/Unsupported media/);
 await assert.rejects(importWorkspaceAsset(workspace,{...args,source:'projects/assets-film/project.looplilt.json'}),/imports directory/);
 await assert.rejects(importWorkspaceAsset(workspace,{...args,source:'imports/../../outside'}));
 await assert.rejects(importWorkspaceAsset(workspace,{...args,source:'imports/original.png'},{maxBytes:16}),/size limit/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(importWorkspaceAsset(workspace,{...args,source:'imports/original.png'},{signal:controller.signal}),{name:'AbortError'});
 assert.equal((await workspace.read('assets-film')).fingerprint,state.fingerprint);
 assert.deepEqual(await fs.readdir(path.join(root,'projects/assets-film/assets')),[]);
});
test('missing media is reported without changing the valid project document',async t=>{
 const {root,workspace,state}=await setup(t);
 const imported=await importWorkspaceAsset(workspace,{projectId:'assets-film',source:'imports/original.png',expectedFingerprint:state.fingerprint});
 await fs.unlink(path.join(root,'projects/assets-film',imported.asset.path));
 const checked=await verifyWorkspaceAssets(workspace,'assets-film');assert.equal(checked.valid,false);assert.equal(checked.assets[0].status,'missing');
 assert.equal((await workspace.read('assets-film')).fingerprint,imported.fingerprint);
});

test('streaming imports preserve every chunk and invalid names cannot publish content',async t=>{
 const {root,workspace,state}=await setup(t),wave=Buffer.alloc(384044);
 wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(2,22);wave.writeUInt32LE(48000,24);wave.writeUInt32LE(192000,28);wave.writeUInt16LE(4,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(wave.length-44,40);
 for(let i=44;i<wave.length;i++)wave[i]=(i*31)%256;
 await fs.writeFile(path.join(root,'imports/original.wav'),wave);
 const args={projectId:'assets-film',source:'imports/original.wav',expectedFingerprint:state.fingerprint};
 await assert.rejects(importWorkspaceAsset(workspace,{...args,name:'x'.repeat(201)}),/name/);
 assert.equal((await workspace.read('assets-film')).fingerprint,state.fingerprint);
 const imported=await importWorkspaceAsset(workspace,args);
 assert.equal(imported.asset.bytes,wave.length);assert.equal(imported.asset.kind,'audio');
 assert.deepEqual(await fs.readFile(path.join(root,'projects/assets-film',imported.asset.path)),wave);
 assert.equal((await verifyWorkspaceAssets(workspace,'assets-film')).valid,true);
});

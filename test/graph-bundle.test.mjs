import test from 'node:test';
import assert from 'node:assert/strict';
import {createGraph} from '../lib/graph/schema.mjs';
import {legacyAsset} from '../lib/graph/legacy-source.mjs';
import {createProjectBundle,readProjectBundle,isProjectBundle,BUNDLE_LIMIT} from '../lib/graph/bundle.mjs';
const encode=value=>new TextEncoder().encode(value);
async function fixture(){
 const document=createGraph({id:'portable-story'}),data=encode('{"version":1,"title":"Original portable score","duration":1,"fps":30,"score":[],"captions":[]}'),asset=await legacyAsset('legacy-project',data);
 document.assets[asset.id]=asset;document.extensions['studio:test']={retained:{custom:'keep this'}};
 const bytes=new Blob([data]),repository={getAsset:async requested=>{assert.equal(requested.id,asset.id);return bytes;}};
 return {document,asset,bytes,repository};
}
test('portable projects round-trip graph extensions and exact source bytes without a second representation',async()=>{
 const {document,asset,bytes,repository}=await fixture(),bundle=await createProjectBundle(document,repository),reopened=await readProjectBundle(bundle);
 assert.equal(await isProjectBundle(bundle),true);assert.deepEqual(reopened.document,document);assert.deepEqual(await reopened.assets.get(asset.id).arrayBuffer(),await bytes.arrayBuffer());
 assert.deepEqual(await bundle.arrayBuffer(),await(await createProjectBundle(document,repository)).arrayBuffer());
});
test('portable projects reject changed bytes, truncated payloads, forged ranges and trailing data',async()=>{
 const {document,repository}=await fixture(),bundle=await createProjectBundle(document,repository),bytes=new Uint8Array(await bundle.arrayBuffer()),magicLength=encode('LOOPLILT-BUNDLE\n').length;
 const changed=bytes.slice();changed[changed.length-2]^=1;await assert.rejects(readProjectBundle(new Blob([changed])),/integrity/);
 await assert.rejects(readProjectBundle(bundle.slice(0,bundle.size-1)),/truncated/);
 await assert.rejects(readProjectBundle(new Blob([bundle,'unexpected'])),/trailing/);
 const length=new DataView(bytes.buffer).getUint32(magicLength,true),manifest=JSON.parse(new TextDecoder().decode(bytes.slice(magicLength+4,magicLength+4+length)));
 manifest.assets[0].offset=1;const json=encode(JSON.stringify(manifest)),header=bytes.slice(0,magicLength+4);new DataView(header.buffer).setUint32(magicLength,json.byteLength,true);
 await assert.rejects(readProjectBundle(new Blob([header,json,bytes.slice(magicLength+4+length)])),/range/);
 const hugeHeader=bytes.slice();new DataView(hugeHeader.buffer).setUint32(magicLength,0xffffffff,true);await assert.rejects(readProjectBundle(new Blob([hugeHeader])),/manifest length/);
});
test('bundling validates real content, aborts before reading, and enforces its total budget',async()=>{
 const {document,asset,repository}=await fixture();
 await assert.rejects(createProjectBundle(document,{getAsset:async()=>new Blob([new Uint8Array(asset.bytes)])}),/integrity/);
 const controller=new AbortController();controller.abort();await assert.rejects(readProjectBundle(new Blob(['not a project']),{signal:controller.signal}),{name:'AbortError'});
 const oversized=structuredClone(document);oversized.assets[asset.id].bytes=BUNDLE_LIMIT+1;await assert.rejects(createProjectBundle(oversized,repository),/256 MiB/);
 assert.equal(await isProjectBundle(new Blob(['{}'])),false);
});

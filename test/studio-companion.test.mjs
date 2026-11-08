import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {startStudio} from '../lib/studio/server.mjs';
import {RemoteGraphWorkspace} from '../lib/graph/remote-workspace.mjs';
import {createGraph} from '../lib/graph/schema.mjs';
const entry=fileURLToPath(new URL('../bin/looplilt-mcp.mjs',import.meta.url));
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'looplilt-companion-test-')),web=path.join(root,'static');await fs.mkdir(web);await fs.writeFile(path.join(web,'index.html'),'<!doctype html><title>Local Looplilt Studio</title>');
 const server=await startStudio(root,{staticDirectory:web}),token=new URL(server.url).hash.slice('#workspace='.length),repository=new RemoteGraphWorkspace(server.origin,token);
 t.after(async()=>{repository.close();await server.close();const real=await fs.realpath(root);assert.equal(path.dirname(real),await fs.realpath(os.tmpdir()));assert.match(path.basename(real),/^looplilt-companion-test-/);await fs.rm(real,{recursive:true,force:true});});return {root,server,token,repository};
}
const edit=(fingerprint,title)=>({expectedFingerprint:fingerprint,label:'Rename in Studio',operations:[{op:'project.patch',changes:{title}}]});

test('a real MCP process and the Studio HTTP repository edit and undo one canonical project',{timeout:180000},async t=>{
 const {root,repository}=await fixture(t);const client=new Client({name:'looplilt-companion-test',version:'1.0.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
 t.after(()=>client.close());await client.connect(new StdioClientTransport({command:process.execPath,args:[entry,'--workspace',root],stderr:'pipe'}));
 async function call(name,args){const result=await client.callTool({name,arguments:args},{timeout:60000});assert.equal(result.isError,undefined,JSON.stringify(result.content));return result.structuredContent.data;}
 const created=await call('looplilt_project_create',{id:'shared-film',title:'Created through MCP'});
 const visual=await repository.read('shared-film');assert.equal(visual.fingerprint,created.fingerprint);
 const changed=await repository.transact('shared-film',edit(visual.fingerprint,'Edited through Studio'));
 const observed=await call('looplilt_inspect',{projectId:'shared-film'});assert.equal(observed.title,'Edited through Studio');assert.equal(observed.fingerprint,changed.fingerprint);
 const nodes=await call('looplilt_nodes_create',{projectId:'shared-film',expectedFingerprint:observed.fingerprint,label:'Add a courier',nodes:[{id:'courier',type:'rectangle',transform:{x:120,y:350}}]});
 const seen=await repository.read('shared-film');assert.equal(seen.document.nodes.courier.transform.x,120);assert.equal(seen.fingerprint,nodes.fingerprint);
 await assert.rejects(repository.transact('shared-film',edit(visual.fingerprint,'Stale title')),{code:'REVISION_CONFLICT'});
 const undo=await repository.undoRedo('shared-film','undo',seen.fingerprint);assert.equal(undo.document.nodes.courier,undefined);assert.equal(undo.document.title,'Edited through Studio');
 const redone=await call('looplilt_history',{projectId:'shared-film',action:'redo',expectedFingerprint:undo.fingerprint});assert.ok((await repository.read('shared-film')).document.nodes.courier);assert.equal(redone.revision,4);
 const disk=JSON.parse(await fs.readFile(path.join(root,'projects/shared-film/project.looplilt.json'),'utf8'));assert.equal(disk.title,'Edited through Studio');assert.equal(disk.revision,4);
});

test('companion rejects unapproved origins, hosts, tokens, paths and payloads',{timeout:60000},async t=>{
 const {server,token,repository}=await fixture(t),headers={Authorization:'Bearer '+token};
 assert.equal((await fetch(server.origin+'/api/projects')).status,401);
 assert.equal((await fetch(server.origin+'/api/projects',{headers:{...headers,Origin:'https://untrusted.example'}})).status,403);
 const hostileHost=await new Promise((resolve,reject)=>{const request=http.get(server.origin+'/api/projects',{headers:{...headers,Host:'untrusted.example'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});
 assert.equal(hostileHost,403);
 assert.equal((await fetch(server.origin+'/api/projects',{headers:{...headers,'Sec-Fetch-Site':'cross-site'}})).status,403);
 assert.equal((await fetch(server.origin+'/api/projects',{headers:{Authorization:'Bearer '+'0'.repeat(64)}})).status,401);
 assert.equal((await fetch(server.origin+'/api/projects',{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await fetch(server.origin+'/studio/%2e%2e%2foutside.txt')).status,400);
 const html=await fetch(server.origin+'/studio/');assert.equal(html.status,200);assert.match(html.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.ok(!(await html.text()).includes(token));
 assert.deepEqual(await repository.list(),[]);
});

test('browser-selected media is scoped and hash checked before a graph can refer to its bytes',{timeout:90000},async t=>{
 const {root,repository}=await fixture(t),state=await repository.create(createGraph({id:'media-film'}));
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==','base64'),sha256=createHash('sha256').update(bytes).digest('hex');
 const asset={id:'asset_'+sha256,kind:'image',name:'Own image',path:'assets/'+sha256+'.png',sha256,bytes:bytes.length,mime:'image/png',metadata:{width:1,height:1}};
 await repository.putAsset(asset,new Blob([bytes]),{projectId:'media-film'});
 assert.deepEqual((await repository.read('media-film')).document.assets,{});
 const edited=await repository.transact('media-film',{expectedFingerprint:state.fingerprint,label:'Import own image',operations:[{op:'asset.add',asset}]});
 assert.deepEqual(Buffer.from(await(await repository.getAsset(asset,'media-film')).arrayBuffer()),bytes);
 const corrupt=Buffer.from(bytes);corrupt[corrupt.length-1]^=1;
 await assert.rejects(repository.putAsset(asset,new Blob([corrupt]),{projectId:'media-film'}),/integrity/);
 await assert.rejects(repository.putAsset({...asset,path:'../outside.png'},new Blob([bytes]),{projectId:'media-film'}),/safe|path/);
 assert.equal((await repository.read('media-film')).fingerprint,edited.fingerprint);
 assert.deepEqual(await fs.readFile(path.join(root,'projects/media-film',asset.path)),bytes);
});

test('unchanged revision polls do not reopen canonical JSON, and external edits still refresh',{timeout:90000},async t=>{
 const {server,repository}=await fixture(t);
 const first=await repository.create(createGraph({id:'polled-film',title:'Initial title'}));
 assert.ok(first.storageStamp);
 const originalFetch=globalThis.fetch,requests=[];
 globalThis.fetch=async(input,options)=>{requests.push(new URL(String(input)).pathname);return originalFetch(input,options);};
 t.after(()=>{globalThis.fetch=originalFetch;});
 const events=[],unsubscribe=repository.subscribe(event=>events.push(event));t.after(unsubscribe);
 const until=async predicate=>{const start=Date.now();while(!predicate()){if(Date.now()-start>15000)throw new Error('Timed out observing companion polling');await new Promise(resolve=>setTimeout(resolve,30));}};
 await until(()=>requests.filter(route=>route.endsWith('/revision')).length>=3);
 assert.equal(requests.filter(route=>route==='/api/projects/polled-film').length,0);
 assert.deepEqual(events,[]);
 // A held edit lock must not make a project unreadable.
 const lock=path.join(server.workspace.root,'projects/polled-film/edit.lock');await fs.writeFile(lock,'test');
 try{assert.equal((await repository.read('polled-film')).fingerprint,first.fingerprint);}finally{await fs.unlink(lock);}
 requests.length=0;
 const second=await server.workspace.transact('polled-film',edit(first.fingerprint,'External author edit'));
 await until(()=>events.some(event=>event.fingerprint===second.fingerprint));
 assert.equal(events.some(event=>event.error),false);
 assert.equal(requests.filter(route=>route==='/api/projects/polled-film').length,1);
 assert.equal((await repository.read('polled-film')).document.title,'External author edit');
 const reads=requests.filter(route=>route==='/api/projects/polled-film').length;
 const polls=requests.filter(route=>route.endsWith('/revision')).length;
 await until(()=>requests.filter(route=>route.endsWith('/revision')).length>=polls+2);
 assert.equal(requests.filter(route=>route==='/api/projects/polled-film').length,reads);
});

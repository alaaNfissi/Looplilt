import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const allowed=new Map();
for(const name of ['schema','registry','time','animation','evaluate','canvas-renderer','transactions','browser-workspace','behaviors','motion-path','typography','canvas-render-registry'])allowed.set(`/graph/${name}.mjs`,await fs.readFile(path.join(root,`lib/graph/${name}.mjs`)));
let origin;
const server=http.createServer((req,res)=>{
 if(req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: blob:");
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Looplilt compositor verification</title>');return;}
 const module=allowed.get(req.url);
 if(!module){res.writeHead(404).end();return;}
 res.setHeader('Content-Type','text/javascript');res.end(module);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const deadline=setTimeout(()=>{console.error('Compositor verification exceeded 180 seconds');browser?.close().finally(()=>process.exit(124));},180000);
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,timeout:45000,...(process.env.LOOPLILT_BROWSER?{executablePath:process.env.LOOPLILT_BROWSER}:{}),...(process.env.LOOPLILT_SOFTWARE_GRAPHICS==='1'?{args:['--disable-gpu']}:{} )});
 console.log('Browser launched:',browser.version());
 const page=await browser.newPage();
 page.on('requestfailed',r=>console.log('Request failed:',r.url(),r.failure()?.errorText));
 page.on('pageerror',e=>console.error(e.message));
 console.log('Fixture server:',(await fetch(origin)).status);
 await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000});
 console.log('Browser fixture loaded');
 const report=await page.evaluate(async()=>{
  const {createGraph,createNode}=await import('/graph/schema.mjs');
  const {CanvasGraphRenderer}=await import('/graph/canvas-renderer.mjs');
  const checks=[],started=performance.now();
  const equal=(actual,expected,label)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);};
  const ok=(value,label)=>{if(!value)throw new Error(label);};
  const graph=()=>createGraph({id:'pixel-trial',width:128,height:128,durationFrames:120});
  function add(p,id,type,parent=p.rootId,props={},transform={}){const n=createNode({id,type,parentId:parent,props});n.time.duration=p.durationFrames;Object.assign(n.transform,transform);p.nodes[id]=n;p.nodes[parent].children.push(id);return n;}
  function canvas(w=128,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  const pixel=(c,x,y)=>Array.from(c.getContext('2d').getImageData(x,y,1,1).data);
  const signature=c=>c.toDataURL();
  async function rejects(action,pattern){try{await action();}catch(error){if(pattern&&!pattern.test(error.message))throw error;return;}throw new Error('Expected failure: '+pattern);}
  async function check(name,fn){await fn();checks.push(name);}
  await check('isolated group opacity and front-to-back ordering',async()=>{
   const p=graph(),g=add(p,'group','group');g.opacity=.5;
   add(p,'red','rectangle',g.id,{width:80,height:80,fill:'#ff0000'});
   add(p,'blue','rectangle',g.id,{width:80,height:80,fill:'#0000ff'},{x:40});
   const c=canvas(),r=new CanvasGraphRenderer(c,p);await r.render(0);
   equal(pixel(c,20,20),[255,0,0,128],'single child opacity');equal(pixel(c,60,20),[0,0,255,128],'overlap opacity');r.dispose();
  });
  await check('nested transformed composition clipping',async()=>{
   const p=graph();add(p,'window','composition',p.rootId,{width:20,height:20},{x:20,y:10,scaleX:2,scaleY:2});
   add(p,'large','rectangle','window',{width:70,height:70,fill:'#ff0000'});
   const c=canvas(),r=new CanvasGraphRenderer(c,p);await r.render(0);
   equal(pixel(c,59,49),[255,0,0,255],'inside clip');equal(pixel(c,60,49),[0,0,0,0],'outside clip');r.dispose();
  });
  await check('independent alpha and inverse-alpha masks do not paint their sources',async()=>{
   const p=graph(),art=add(p,'art','rectangle',p.rootId,{width:100,height:100,fill:'#ff0000'});
   add(p,'matte','ellipse',p.rootId,{width:50,height:50,fill:'#00ff00'},{x:25,y:25});art.mask={nodeId:'matte',mode:'alpha'};
   const c=canvas(),r=new CanvasGraphRenderer(c,p);await r.render(0);
   equal(pixel(c,50,50),[255,0,0,255],'mask center');equal(pixel(c,5,5),[0,0,0,0],'mask corner');
   art.mask.mode='inverse-alpha';r.replace(p);await r.render(0);
   equal(pixel(c,50,50),[0,0,0,0],'inverse center');equal(pixel(c,5,5),[255,0,0,255],'inverse corner');r.dispose();
  });
  await check('real Canvas effects and resolution-independent blur',async()=>{
   const p=graph(),art=add(p,'art','rectangle',p.rootId,{width:40,height:40,fill:'#ff0000'},{x:40,y:40});
   art.effects=[{id:'gray',type:'grayscale',version:1,enabled:true,props:{amount:1}},{id:'soft',type:'blur',version:1,enabled:true,props:{radius:4}}];
   const c=canvas(),r=new CanvasGraphRenderer(c,p);await r.render(0);const a=pixel(c,60,60);
   equal(a[0],a[1],'gray red/green');equal(a[1],a[2],'gray green/blue');ok(pixel(c,37,60)[3]>0,'blur extends beyond the shape');
   const big=canvas(256,256),b=new CanvasGraphRenderer(big,p);await b.render(0);
   ok(Math.abs(pixel(c,37,60)[3]-pixel(big,75,121)[3])<20,'scaled blur has the same project-space radius');r.dispose();b.dispose();
  });
  await check('seeks are deterministic and preserve aspect ratio',async()=>{
   const p=graph(),n=add(p,'moving','rectangle',p.rootId,{width:20,height:20,fill:'#ff8000'});n.animations['transform.x']=[{frame:0,value:5},{frame:60,value:100}];
   const c=canvas(256,128),r=new CanvasGraphRenderer(c,p),samples=[];
   for(const f of [0,25,59]){await r.render(f);samples.push(signature(c));}
   ok(new Set(samples).size===3,'animation changes actual pixels');
   for(const i of [2,0,1]){await r.render([0,25,59][i]);equal(signature(c),samples[i],'seek order');}
   equal(pixel(c,10,10),[0,0,0,0],'transparent letterbox');r.dispose();
  });
  await check('motion paths and reusable behaviors change real pixels with deterministic reverse seek',async()=>{
   const {standardRegistry,defaults}=await import('/graph/registry.mjs');
   const p=graph(),n=add(p,'traveller','rectangle',p.rootId,{width:12,height:12,fill:'#f0b040'},{x:10,y:50});
   n.behaviors=[{id:'route',type:'motion-path',version:1,enabled:true,props:{...defaults(standardRegistry.behavior('motion-path').properties),path:'M0 0 C20 -40 60 40 80 0',duration:60}}];
   const c=canvas(),r=new CanvasGraphRenderer(c,p);await r.render(0);const start=signature(c);
   equal(pixel(c,15,55),[240,176,64,255],'path start');await r.render(30);equal(pixel(c,55,55),[240,176,64,255],'path middle');
   ok(signature(c)!==start,'motion changes pixels');await r.render(0);equal(signature(c),start,'reverse path seek');r.dispose();
  });
  await check('trusted versioned Canvas painters use the same masks, transforms and atomic errors',async()=>{
   const {NodeRegistry}=await import('/graph/registry.mjs'),{CanvasRenderRegistry}=await import('/graph/canvas-render-registry.mjs');
   const registry=new NodeRegistry(),renderers=new CanvasRenderRegistry();
   registry.registerNode({type:'own:badge',version:2,label:'Own badge',visual:true,properties:{size:{kind:'number',default:20,min:1,max:200,animate:true},fill:{kind:'color',default:'#00c080'}}});
   let fail=false;
   renderers.registerNode({type:'own:badge',version:2,draw(ctx,node){ctx.fillStyle=node.props.fill;ctx.fillRect(0,0,node.props.size,node.props.size);if(fail)throw new Error('painter failure');}});
   const p=graph(),badge=createNode({id:'badge',type:'own:badge',version:2,parentId:'root'},registry);badge.transform.x=20;badge.transform.y=10;
   p.nodes.badge=badge;p.nodes.root.children.push('badge');add(p,'matte','rectangle',p.rootId,{width:10,height:100},{x:20});badge.mask={nodeId:'matte',mode:'alpha'};
   const c=canvas(),r=new CanvasGraphRenderer(c,p,{registry,renderers});await r.render(0);equal(pixel(c,25,15),[0,192,128,255],'custom painter');equal(pixel(c,35,15),[0,0,0,0],'custom mask');
   const original=signature(c);fail=true;await rejects(()=>r.render(0),/painter failure/);equal(signature(c),original,'custom failure is atomic');
   fail=false;badge.props.fill='#f09030';r.replace(p);await r.render(0);equal(pixel(c,25,15),[240,144,48,255],'custom replace');r.dispose();
   await rejects(()=>Promise.resolve(new CanvasGraphRenderer(canvas(),p)),/unsupported/);
   await rejects(()=>Promise.resolve(renderers.registerNode({type:'own:async',version:1,draw:async()=>{}})),/synchronous/);
  });
  await check('decode errors, cleanup failures and cancellation preserve the last good frame',async()=>{
   const p=graph(),c=canvas();add(p,'back','rectangle',p.rootId,{width:128,height:128,fill:'#013344'});
   p.assets.image={id:'image',kind:'image',name:'Original test pixels',path:'assets/image.png',sha256:'a'.repeat(64),bytes:100,mime:'image/png',metadata:{}};
   const source=canvas(10,10);source.getContext('2d').fillRect(0,0,10,10);let mode='ok',released=0,controller;
   const provider={async frame(){if(mode==='decode')throw new Error('decoder rejected');if(mode==='cancel')controller.abort();return {image:source,width:10,height:10,release(){released++;if(mode==='cleanup')throw new Error('cleanup rejected');}};}};
   const r=new CanvasGraphRenderer(c,p,{mediaProvider:provider});await r.render(0);const before=signature(c);
   add(p,'image','image',p.rootId,{asset:'image',width:20,height:20});r.replace(p);
   mode='decode';await rejects(()=>r.render(0),/decoder rejected/);equal(signature(c),before,'failed decode');
   mode='cleanup';await rejects(()=>r.render(0),/cleanup failed/);equal(signature(c),before,'failed cleanup');
   mode='cancel';controller=new AbortController();await rejects(()=>r.render(0,{signal:controller.signal}),/abort/i);equal(signature(c),before,'cancelled frame');
   mode='ok';await r.render(0);ok(signature(c)!==before,'renderer recovers after failures');equal(released,3,'every acquired frame released');r.dispose();
  });
  await check('surface-budget errors are atomic and pooled contexts recover',async()=>{
   const p=graph(),c=canvas();add(p,'back','rectangle',p.rootId,{width:128,height:128,fill:'#123456'});
   const r=new CanvasGraphRenderer(c,p,{surfaceBudget:128*128*4});await r.render(0);const before=signature(c);
   const g=add(p,'group','group');g.opacity=.5;add(p,'inside','rectangle',g.id);r.replace(p);
   await rejects(()=>r.render(0),/memory budget/);equal(signature(c),before,'failed composite');
   g.opacity=1;r.replace(p);await r.render(0);ok(signature(c)!==before,'context recovers');r.dispose();
  });
  await check('late decoder frames are cleaned when another decoder fails',async()=>{
   const p=graph();p.assets.image={id:'image',kind:'image',name:'Pixels',path:'assets/image.png',sha256:'b'.repeat(64),bytes:100,mime:'image/png',metadata:{}};
   add(p,'first','image',p.rootId,{asset:'image'});add(p,'late','image',p.rootId,{asset:'image'});let released=0;
   const r=new CanvasGraphRenderer(canvas(),p,{mediaProvider:{async frame(node){if(node.id==='first')throw new Error('first failed');await new Promise(resolve=>setTimeout(resolve,20));return {image:canvas(),width:128,height:128,release(){released++;}};}}});
   await rejects(()=>r.render(0),/first failed/);equal(released,1,'late decoder cleanup');r.dispose();
  });

  await check('real IndexedDB commits detect competing tabs and preserve undo after reopening',async()=>{
   const {BrowserGraphWorkspace}=await import('/graph/browser-workspace.mjs');
   const name='looplilt-test-'+crypto.randomUUID();let a,b;
   try{
    a=await BrowserGraphWorkspace.open({name});b=await BrowserGraphWorkspace.open({name});
    const initial=await a.create(graph());
    const edit=title=>({label:'Rename',expectedFingerprint:initial.fingerprint,operations:[{op:'project.patch',changes:{title}}]});
    const results=await Promise.allSettled([a.transact(initial.document.id,edit('First tab')),b.transact(initial.document.id,edit('Second tab'))]);
    equal(results.filter(r=>r.status==='fulfilled').length,1,'one atomic winner');equal(results.find(r=>r.status==='rejected').reason.code,'REVISION_CONFLICT','stale tab conflict');
    const saved=await a.read(initial.document.id);a.close();b.close();a=await BrowserGraphWorkspace.open({name});b=null;
    const reopened=await a.read(initial.document.id);equal(reopened.fingerprint,saved.fingerprint,'durable canonical graph');
    const undone=await a.undoRedo(initial.document.id,'undo',reopened.fingerprint);equal(undone.document.title,initial.document.title,'durable undo');
    const redone=await a.undoRedo(initial.document.id,'redo',undone.fingerprint);equal(redone.document.title,saved.document.title,'durable redo');
    equal(redone.document.revision,3,'monotonic history');
    await rejects(()=>a.transact(initial.document.id,{...edit('Invalid'),expectedFingerprint:redone.fingerprint,operations:[{op:'node.remove',id:'root'}]}));
    equal((await a.read(initial.document.id)).fingerprint,redone.fingerprint,'invalid edit does not publish');
   }finally{a?.close();b?.close();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});}
  });
  await check('browser media bytes are content-verified and survive reopening',async()=>{
   const {BrowserGraphWorkspace}=await import('/graph/browser-workspace.mjs'),name='looplilt-test-'+crypto.randomUUID();let store;
   try{
    store=await BrowserGraphWorkspace.open({name});const blob=new Blob(['original own fixture']),digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
    const sha256=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    const asset={id:'asset',name:'Own media',kind:'image',path:'assets/pixels.png',mime:'image/png',metadata:{},bytes:blob.size,sha256};
    await store.putAsset(asset,blob);store.close();store=await BrowserGraphWorkspace.open({name});equal(await (await store.getAsset(asset)).text(),'original own fixture','persisted bytes');
    await rejects(()=>store.putAsset(asset,new Blob(['different own fixture'])),/integrity|manifest/);
    await rejects(()=>store.getAsset({...asset,sha256:'b'.repeat(64)}),/Missing local media/);
   }finally{store?.close();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);});}
  });
  return {checks,durationMs:performance.now()-started,userAgent:navigator.userAgent};
 });
 assert.equal(report.checks.length,12);
 await fs.mkdir(path.join(root,'.validation'),{recursive:true});
 await fs.writeFile(path.join(root,'.validation/graph-renderer-verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{clearTimeout(deadline);await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

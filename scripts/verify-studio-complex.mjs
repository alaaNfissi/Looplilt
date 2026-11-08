import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';import {graphFingerprint} from '../lib/graph/transactions.mjs';import {startStudio} from '../lib/studio/server.mjs';import {redactStudioError} from '../lib/studio/errors.mjs';
import {withBrowser} from '../lib/browser.mjs';import {run} from '../lib/process.mjs';import {ffmpeg,ffprobe} from '../lib/media-tools.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),source=path.join(root,'examples/studio/a-signal-for-the-garden'),out=path.join(root,'.validation','studio-complex-'+Date.now()),folder=path.join(out,'workspace');
await fs.mkdir(folder,{recursive:true});const workspace=await GraphWorkspace.open(folder),original=JSON.parse(await fs.readFile(path.join(source,'project.looplilt.json'),'utf8')),before=await workspace.create(original),projectId=original.id,report={events:[],errors:[]};
for(const asset of Object.values(original.assets)){const target=path.join(folder,'projects',projectId,asset.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(source,asset.path),target);}
const server=await startStudio(folder),client=new Client({name:'looplilt-complex-project-acceptance',version:'1.0.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
async function mark(name,data={}){report.events.push({name,...data});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(name,JSON.stringify(data));}
async function call(name,args){const result=await client.callTool({name,arguments:args},{timeout:90000});assert.equal(result.isError,undefined,JSON.stringify(result.content));return result.structuredContent.data;}
const target=Object.values(original.nodes).find(node=>node.name==='Story caption · 36'),video=Object.values(original.nodes).find(node=>node.type==='video'&&original.nodes[node.parentId].time.start===1110),packet=Object.values(original.nodes).find(node=>node.name.startsWith('The connection'));
assert.ok(target&&video&&packet);assert.ok(Object.values(original.nodes).filter(n=>n.type==='group').length>=6);assert.ok(Object.values(original.nodes).some(n=>n.mask));assert.ok(Object.values(original.nodes).some(n=>n.effects.length));assert.ok(Object.values(original.nodes).some(n=>Object.keys(n.animations).length));
let after,page;
try{
 await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'bin/looplilt-mcp.mjs'),'--workspace',folder],stderr:'pipe',env:process.env}));
 const cliBefore=JSON.parse((await run(process.execPath,[path.join(root,'bin/looplilt.mjs'),'graph','inspect',folder,'--project',projectId,'--view','frame','--at','1200'],{timeout:90000})).stdout);
 const mcpBefore=await call('looplilt_inspect',{projectId,view:'frame',frame:1200,nodeIds:[target.id,video.id,packet.id]});assert.equal(cliBefore.fingerprint,before.fingerprint);
 for(const item of mcpBefore.items)assert.deepEqual(cliBefore.nodes[item.id],item);
 await mark('cli-and-mcp-inspect-the-real-mixed-media-composition',{nodes:Object.keys(original.nodes).length,assets:Object.keys(original.assets).length,frame:1200,sourceFrame:cliBefore.nodes[video.id].time.sourceFrame});
 await withBrowser(async browser=>{
  const context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===server.origin||['blob:','data:'].includes(url.protocol)?route.continue():route.abort();});
  const button=name=>page.getByRole('button',{name,exact:true}).click();
  async function seek(frame){
   await page.locator('.studio-stage-heading').click();const current=Number(await page.locator('.graph-canvas-wrap canvas').getAttribute('data-frame')??0);
   let position=current;if(frame<Math.abs(frame-current)){await page.keyboard.press('Home');position=0;}else if(original.durationFrames-1-frame<Math.abs(frame-current)){await page.keyboard.press('End');position=original.durationFrames-1;}
   const direction=frame<position?'ArrowLeft':'ArrowRight',distance=Math.abs(frame-position);for(let i=0;i<Math.floor(distance/10);i++)await page.keyboard.press('Shift+'+direction);for(let i=0;i<distance%10;i++)await page.keyboard.press(direction);
   await page.locator('.graph-canvas-wrap canvas[data-frame="'+frame+'"][data-revision="1"]').waitFor({timeout:90000});
  }
  try{
   await page.goto(server.url,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.studio-footer').filter({hasText:'All changes saved'}).waitFor({timeout:90000});
   await button('Fit whole film');await page.getByRole('searchbox',{name:'Find a layer',exact:true}).fill('Story caption · 36');await button('Story caption · 36');
   const text=page.getByRole('textbox',{name:'Text',exact:true});await text.fill('A little care can restart a world.');await text.blur();await page.locator('.studio-footer').filter({hasText:'Revision 1'}).waitFor({timeout:90000});
   after=await workspace.read(projectId);const changed=Object.keys(before.document.nodes).filter(id=>JSON.stringify(before.document.nodes[id])!==JSON.stringify(after.document.nodes[id]));assert.deepEqual(changed,[target.id]);assert.deepEqual(after.document.assets,before.document.assets);
   const stale=await client.callTool({name:'looplilt_edit',arguments:{projectId,expectedFingerprint:before.fingerprint,label:'Stale caption must be rejected',operations:[{op:'node.patch',id:target.id,changes:{props:{text:'This stale edit must never appear'}}}]}},{timeout:90000});assert.equal(stale.isError,true);assert.equal((await workspace.read(projectId)).fingerprint,after.fingerprint);
   const compare=await call('looplilt_compare',{projectId,fromFingerprint:before.fingerprint});assert.equal(compare.counts.nodes.changed,1);assert.equal(compare.counts.assets.changed,0);
   const cliAfter=JSON.parse((await run(process.execPath,[path.join(root,'bin/looplilt.mjs'),'graph','inspect',folder,'--project',projectId,'--view','frame','--at','1200'],{timeout:90000})).stdout),mcpAfter=await call('looplilt_inspect',{projectId,view:'frame',frame:1200,nodeIds:[target.id,video.id,packet.id]});
   for(const item of mcpAfter.items)assert.deepEqual(cliAfter.nodes[item.id],item);assert.equal(cliAfter.nodes[target.id].props.text,'A little care can restart a world.');
   await mark('real-visual-edit-is-visible-to-cli-and-mcp',{changedNodes:changed,staleEditRejected:true,assetsPreserved:true,fingerprint:after.fingerprint});
   await page.getByRole('searchbox',{name:'Find a layer',exact:true}).fill('');
   for(const frame of [1140,1200,1260]){await seek(frame);const bytes=await page.locator('.graph-canvas-wrap canvas').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]);await fs.writeFile(path.join(out,'preview-'+frame+'.png'),Buffer.from(bytes,'base64'));}
   await page.screenshot({path:path.join(out,'complex-studio-desktop.png')});
   await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.locator('.studio-footer').filter({hasText:'Revision 1'}).waitFor({timeout:90000});assert.equal((await workspace.read(projectId)).fingerprint,after.fingerprint);
   await seek(1110);await page.keyboard.press('i');await seek(1290);await page.keyboard.press('o');const pending=page.waitForEvent('download',{timeout:240000});await button('Export film');await(await pending).saveAs(path.join(out,'complex-range.mp4'));
   assert.deepEqual(report.errors,[]);await mark('reopened-and-exported-through-studio',{frames:180,seconds:6});
  }catch(error){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});report.browserState=(await page.locator('body').innerText()).slice(-7000);throw redactStudioError(error);}finally{await context.close();}
 },{graphics:'software',timeout:720000});
 const file=path.join(out,'complex-range.mp4'),probe=JSON.parse((await run(ffprobe(),['-v','error','-count_frames','-show_streams','-of','json',file],{timeout:90000})).stdout);
 assert.equal(Number(probe.streams.find(s=>s.codec_type==='video').nb_read_frames),180);assert.equal(probe.streams.find(s=>s.codec_type==='audio').channels,2);await run(ffmpeg(),['-v','error','-i',file,'-f','null','-'],{timeout:90000});
 const matches=[];
 for(const frame of [1140,1200,1260]){
  const actual=path.join(out,'encoded-'+frame+'.rgba'),expected=path.join(out,'preview-'+frame+'.rgba');
  await run(ffmpeg(),['-v','error','-n','-i',file,'-vf','select=eq(n\\,'+(frame-1110)+')','-frames:v','1','-pix_fmt','rgba','-f','rawvideo',actual]);await run(ffmpeg(),['-v','error','-n','-i',path.join(out,'preview-'+frame+'.png'),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo',expected]);
  const a=await fs.readFile(actual),b=await fs.readFile(expected);assert.equal(a.length,b.length);let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);const mean=sum/a.length;assert.ok(mean<5,'UI preview/encoded frame disagreement: '+mean);matches.push({frame,meanChannelError:mean});
 }
 assert.equal(await graphFingerprint(JSON.parse(await fs.readFile(path.join(source,'project.looplilt.json'),'utf8'))),before.fingerprint);
 await mark('complex-mixed-media-full-decode-and-preview-agreement',{frames:180,matches,originalSourceUnchanged:true});report.passed=true;
}catch(error){report.error=redactStudioError(error).message;throw error;}finally{await client.close();await server.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(root,'.validation/latest-studio-complex.json'),JSON.stringify({out,report:path.join(out,'report.json')},null,2));console.log(JSON.stringify({out,passed:report.passed??false}));}

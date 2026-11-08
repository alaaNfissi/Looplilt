import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {startStudio} from '../lib/studio/server.mjs';
import {compileGraph} from '../lib/graph/evaluate.mjs';
import {run} from '../lib/process.mjs';
import {ffmpeg,ffprobe} from '../lib/media-tools.mjs';
import {readProject} from '../lib/project.mjs';
import {makeSound} from '../lib/sound.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.validation','studio-handoff-'+Date.now()),workspace=path.join(out,'workspace');
await fs.mkdir(workspace,{recursive:true});
const report={kind:'Automated real Studio UI and MCP acceptance; not a real person session',events:[],errors:[]};let server,browser,client,page,projectId;
report.renames=[];const originalRename=fs.rename;fs.rename=async(...args)=>{const started=performance.now();try{return await originalRename(...args);}catch(error){report.renames.push({destination:path.basename(String(args[1])),elapsedMs:performance.now()-started,code:error.code,at:new Date().toISOString()});throw error;}};
async function mark(name,data={}){report.events.push({name,at:new Date().toISOString(),...data});console.log(name,JSON.stringify(data));await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
async function state(){return server.workspace.read(projectId);}
async function revision(){return Number((await page.locator('.studio-footer').innerText()).match(/Revision (\d+)/)[1]);}
async function saved(previous){await page.waitForFunction(before=>{const value=document.querySelector('.studio-footer')?.textContent??'';return value.includes('All changes saved')&&Number(value.match(/Revision (\d+)/)?.[1])>before;},previous,{timeout:45000});if(await page.locator('.studio-error').count())throw new Error(await page.locator('.studio-error').innerText());}
async function edit(action){const before=await revision();await action();try{await saved(before);}catch(error){if(await page.locator('.studio-error').count())throw new Error(await page.locator('.studio-error').innerText());throw error;}}
async function field(name,value,scope=page){const control=scope.getByRole(typeof value==='number'?'spinbutton':'textbox',{name,exact:true});if(await control.inputValue()===String(value))return;await edit(async()=>{await control.fill(String(value));await control.blur();});}
async function call(name,args){const result=await client.callTool({name,arguments:args},{timeout:60000});assert.equal(result.isError,undefined,JSON.stringify(result.content));return result.structuredContent.data;}
async function choose(name){await page.getByRole('button',{name,exact:true}).click();}
async function seek(frame){await page.getByRole('application',{name:'Timeline',exact:true}).click({position:{x:frame*4,y:13}});await page.locator('.graph-canvas-wrap canvas[data-frame="'+frame+'"]').waitFor({timeout:45000});}
async function originalFrame(name){const data=await page.locator('.graph-canvas-wrap canvas').evaluate(c=>c.toDataURL('image/png').split(',')[1]);await fs.writeFile(path.join(out,name),Buffer.from(data,'base64'));}
const timer=setTimeout(()=>{console.error('Studio motion trial deadline');browser?.close().finally(()=>process.exit(124));},720000);
try{
 server=await startStudio(workspace);client=new Client({name:'looplilt-motion-handoff',version:'1.0.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}}});
 await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'bin/looplilt-mcp.mjs'),'--workspace',workspace],stderr:'pipe',env:process.env}));
 browser=await chromium.launch({headless:true,chromiumSandbox:true,args:['--disable-gpu'],...(process.env.LOOPLILT_BROWSER?{executablePath:process.env.LOOPLILT_BROWSER}:{}),timeout:45000});
 const context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});
 await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===server.origin||['blob:','data:'].includes(url.protocol)?route.continue():route.abort();});
 page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(server.url,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('.studio-footer').filter({hasText:'All changes saved'}).waitFor({timeout:45000});
 projectId=(await server.workspace.list())[0].id;
 await edit(async()=>{await page.locator('.studio-project-name').fill('Follow the Light · motion acceptance');await page.locator('.studio-project-name').blur();});
 await page.locator('.studio-layer').first().click();await field('Background','#102a37');await field('Duration',180);
 await edit(()=>choose('Add title'));await field('Layer name','Message');await field('Text','FOLLOW THE LIGHT');await field('Font Size',48);
 await edit(()=>choose('Add ellipse'));await field('Layer name','Courier');await field('X',160);await field('Y',260);await field('Width',64);await field('Height',64);await field('Fill','#efb969');await field('Fade out',6);
 const courier=Object.values((await state()).document.nodes).find(node=>node.name==='Courier').id;
 await edit(()=>page.getByRole('combobox',{name:'Add motion',exact:true}).selectOption('path'));
 const motion=page.getByRole('region',{name:'Motion path controls',exact:true});
 await field('Path','M0 0 C180 -150 390 170 620 0',motion);await field('Duration',60,motion);
 await seek(30);const beforeDrag=await state(),position=compileGraph(beforeDrag.document).evaluateNode(30,courier).worldPosition;
 const canvas=page.locator('.graph-canvas-wrap canvas'),box=await canvas.boundingBox(),sx=box.width/beforeDrag.document.width,sy=box.height/beforeDrag.document.height;
 await edit(async()=>{await page.mouse.move(box.x+(position.x+32)*sx,box.y+(position.y+32)*sy);await page.mouse.down();await page.mouse.move(box.x+(position.x+72)*sx,box.y+(position.y+47)*sy,{steps:8});await page.mouse.up();});
 const moved=await state();assert.ok(Math.abs(moved.document.nodes[courier].transform.x-200)<3);assert.ok(Math.abs(moved.document.nodes[courier].transform.y-275)<3);
 await mark('path-inspector-and-canvas-drag',{base:moved.document.nodes[courier].transform});
 await edit(()=>choose('Add ellipse'));await field('Layer name','Matte');await field('Width',900);await field('Height',500);await field('X',180);await field('Y',100);
 const matte=Object.values((await state()).document.nodes).find(node=>node.name==='Matte').id;
 await choose('Courier');await edit(()=>page.getByRole('combobox',{name:'Mask layer',exact:true}).selectOption(matte));
 assert.equal((await state()).document.nodes[courier].mask.nodeId,matte);
 await edit(()=>choose('Add ellipse'));await field('Layer name','Tracking light');await field('Width',18);await field('Height',18);await field('Fill','#93d9d0');
 await edit(()=>page.getByRole('combobox',{name:'Add constraint',exact:true}).selectOption('follow'));
 if(await page.getByRole('combobox',{name:'Constraint 1 target',exact:true}).inputValue()!==courier)await edit(()=>page.getByRole('combobox',{name:'Constraint 1 target',exact:true}).selectOption(courier));await field('Offset Y',92);
 await edit(()=>page.getByRole('combobox',{name:'Add motion',exact:true}).selectOption('breathe'));
 assert.equal(Object.values((await state()).document.nodes).find(node=>node.name==='Tracking light').behaviors.length,2);
 await mark('mask-constraint-and-reusable-motion-controls');
 const source=path.join(out,'original-score.wav');await fs.writeFile(source,makeSound((await readProject(path.join(root,'examples/brass-observatory'))).data));
 await page.locator('input[type=file][accept^="video/"]').setInputFiles(source);
 await page.locator('.studio-media-card').filter({hasText:'original-score.wav'}).waitFor({timeout:45000});await edit(()=>page.locator('.studio-media-card').filter({hasText:'original-score.wav'}).click());await field('Gain',.65);
 const before=await state(),audio=Object.values(before.document.nodes).find(node=>node.type==='audio').id,behaviorId=before.document.nodes[courier].behaviors[0].id;
 const changed=await call('looplilt_edit',{projectId,expectedFingerprint:before.fingerprint,label:'Lengthen the route, soften the exit, and rebalance the score',operations:[
  {op:'behavior.patch',id:courier,behaviorId,props:{duration:120}},
  {op:'transition.set',id:courier,side:'out',transition:{type:'fade',duration:18}},
  {op:'node.patch',id:audio,changes:{props:{gain:.42}}}
 ]});
 await saved(before.document.revision);const after=await state();assert.equal(after.fingerprint,changed.fingerprint);
 for(const [id,node]of Object.entries(before.document.nodes))if(![courier,audio].includes(id))assert.deepEqual(after.document.nodes[id],node,id);
 assert.deepEqual(after.document.assets,before.document.assets);
 const compared=await call('looplilt_compare',{projectId,fromFingerprint:before.fingerprint});assert.equal(compared.counts.nodes.changed,2);assert.equal(compared.counts.assets.changed,0);
 const cli=JSON.parse((await run(process.execPath,[path.join(root,'bin/looplilt.mjs'),'graph','inspect',workspace,'--project',projectId,'--view','frame','--at','60'],{timeout:60000})).stdout);
 const inspected=await call('looplilt_inspect',{projectId,view:'frame',frame:60,nodeIds:[courier]});assert.deepEqual(cli.nodes[courier],inspected.items[0]);
 await mark('scenario-d-movement-transition-and-soundtrack-preserved',{fingerprint:after.fingerprint,comparison:compared});
 await choose('Layers');await choose('Courier');await seek(60);
 await page.locator('.graph-canvas-wrap canvas[data-revision="'+after.document.revision+'"]').waitFor({timeout:45000});
 await originalFrame('preview-frame-60.png');await page.screenshot({path:path.join(out,'studio-desktop.png')});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.studio-footer').filter({hasText:'Revision '+after.document.revision}).waitFor({timeout:45000});assert.equal((await state()).fingerprint,after.fingerprint);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'layers',exact:true}).last().click();await choose('Courier');await page.getByRole('button',{name:'properties',exact:true}).click();
 await page.getByRole('region',{name:'Motion path controls',exact:true}).scrollIntoViewIfNeeded();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);await page.screenshot({path:path.join(out,'studio-mobile.png')});await mark('reopen-and-mobile-controls');
 await page.setViewportSize({width:1600,height:1100});await seek(60);
 const downloaded=page.waitForEvent('download',{timeout:180000});await choose('Export film');const video=path.join(out,'motion-acceptance.mp4');await(await downloaded).saveAs(video);
 const probe=JSON.parse((await run(ffprobe(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',video])).stdout),videoStream=probe.streams.find(stream=>stream.codec_type==='video'),audioStream=probe.streams.find(stream=>stream.codec_type==='audio');
 assert.equal(Number(videoStream.nb_read_frames),180);assert.equal(videoStream.width,1280);assert.equal(videoStream.height,720);assert.equal(audioStream.channels,2);
 await run(ffmpeg(),['-v','error','-i',video,'-f','null','-'],{timeout:60000});
 await run(ffmpeg(),['-v','error','-n','-i',video,'-vf','select=eq(n\\,60)','-frames:v','1','-pix_fmt','rgba','-f','rawvideo',path.join(out,'encoded-frame-60.rgba')]);
 await run(ffmpeg(),['-v','error','-n','-i',path.join(out,'preview-frame-60.png'),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo',path.join(out,'preview-frame-60.rgba')]);
 const actual=await fs.readFile(path.join(out,'encoded-frame-60.rgba')),expected=await fs.readFile(path.join(out,'preview-frame-60.rgba'));assert.equal(actual.length,expected.length);
 let sum=0,max=0;for(let i=0;i<actual.length;i++){const difference=Math.abs(actual[i]-expected[i]);sum+=difference;max=Math.max(max,difference);}const mean=sum/actual.length;assert.ok(mean<5,'Encoded frame differs from actual Studio preview: '+mean);
 assert.deepEqual(report.errors,[]);await mark('verified-ui-export',{video,frames:180,stereo:true,meanChannelError:mean,maximumChannelError:max,decoded:true});report.passed=true;
 await fs.writeFile(path.join(root,'.validation/latest-studio-handoff.json'),JSON.stringify({out,report:path.join(out,'report.json')},null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});await mark('failed',{message:String(error).replace(/#workspace=[a-f0-9]{64}/g,'#workspace=[private]')});throw error;}
finally{clearTimeout(timer);await browser?.close();await client?.close();await server?.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed??false}));}

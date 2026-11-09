import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withBrowser} from '../lib/browser.mjs';
import {startStudio} from '../lib/studio/server.mjs';
import {createGraph} from '../lib/graph/schema.mjs';
import {createNodeOperations} from '../lib/graph/commands.mjs';
import {applyTransaction,serializeGraph} from '../lib/graph/transactions.mjs';
import {run} from '../lib/process.mjs';
import {ffmpeg,ffprobe} from '../lib/media-tools.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'.validation','studio-projects-'+Date.now()),workspace=path.join(out,'workspace');
await fs.mkdir(workspace,{recursive:true});
let nested=createGraph({id:'clock-laboratory',title:'Clock laboratory',width:320,height:180,durationFrames:120});
nested=(await applyTransaction(nested,{label:'Prepare nested source clocks',operations:[
 ...createNodeOperations(nested,[{id:'clock-group',type:'group',name:'Clock group',start:12,duration:108},{id:'clock-track',type:'track',name:'Clock track',parentId:'clock-group',start:9,duration:180,props:{kind:'visual'}}]),
 {op:'node.patch',id:'clock-group',changes:{time:{speed:{numerator:3,denominator:2},offset:{numerator:6,denominator:1}}}},
 {op:'node.patch',id:'clock-track',changes:{time:{speed:{numerator:2,denominator:1},offset:{numerator:3,denominator:1}}}}
]})).document;
let short=createGraph({id:'short-film',title:'A complete short film',width:320,height:180,durationFrames:30});
short=(await applyTransaction(short,{label:'Create a visible short film',operations:createNodeOperations(short,[{id:'light',type:'ellipse',name:'A small light',props:{width:60,height:60,fill:'#efbd78'},transform:{x:130,y:60}}])})).document;
const nestedFile=path.join(out,'nested.json'),shortFile=path.join(out,'short.json');
await fs.writeFile(nestedFile,serializeGraph(nested));await fs.writeFile(shortFile,serializeGraph(short));
const server=await startStudio(workspace),report={checks:[],errors:[],passed:false};
try{
 await withBrowser(async browser=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  const clearRange=page.locator('[aria-label="Clear export range"]');
  const saved=()=>page.locator('.studio-footer').filter({hasText:'All changes saved'}).waitFor({timeout:60000});
  async function open(file,title){await page.getByLabel('Open editable project',{exact:true}).setInputFiles(file);await page.waitForFunction(title=>document.querySelector('.studio-project-name')?.value===title,title,{timeout:60000});await saved();}
  async function seek(frame){await page.getByRole('application',{name:'Timeline',exact:true}).click({position:{x:frame*4,y:12}});await page.locator('.graph-canvas-wrap canvas[data-frame="'+frame+'"]').waitFor({timeout:60000});}
  async function save(name){const pending=page.waitForEvent('download');await button('Project file').click();const file=path.join(out,name+'.json');await(await pending).saveAs(file);return JSON.parse(await fs.readFile(file,'utf8'));}
  async function range(){await seek(30);await button('Set export in-point at playhead (I)').click();await seek(45);await button('Set export out-point at playhead (O)').click();assert.equal(await clearRange.count(),1);}
  async function noRange(){await clearRange.waitFor({state:'detached',timeout:30000});}
  try{
   await page.goto(server.origin+'/studio/',{waitUntil:'domcontentloaded',timeout:60000});await saved();
   await open(nestedFile,nested.title);
   await page.getByLabel('Import local media',{exact:true}).setInputFiles(path.join(root,'site/media/paper-garden-landscape.png'));
   const media=page.locator('.studio-media-card').filter({hasText:'paper-garden-landscape.png'});await media.waitFor({timeout:60000});
   await page.locator('.studio-library-tabs').getByRole('button',{name:'Layers',exact:true}).click();
   await page.locator('.studio-layer[title="Clock track"]').click();await seek(30);
   await page.locator('.studio-library-tabs').getByRole('button',{name:/^Media/}).click();await media.click();
   await page.getByRole('spinbutton',{name:'Start',exact:true}).waitFor();await saved();
   const placed=await save('placed'),image=Object.values(placed.nodes).find(node=>node.type==='image');
   assert.equal(image.parentId,'clock-track');assert.equal(image.time.start,51);assert.equal(image.time.duration,270);
   assert.equal((image.time.start+39)/3,30);assert.equal(image.time.duration/3,90);
   report.checks.push('Media placed at project frame 30 in nested shifted, offset and accelerated tracks keeps the intended 90-frame project duration');
   await page.locator('.studio-library-tabs').getByRole('button',{name:'Layers',exact:true}).click();
   for(const [name,id,remaining] of [['Clock track','clock-track',2],['Clock group','clock-group',1]]){
    await page.locator('.studio-layer[title="'+name+'"]').click();await page.keyboard.press('Delete');
    await page.locator('.studio-footer').filter({hasText:(remaining-1)+' layers'}).waitFor({timeout:60000});await saved();
    const removed=await save('deleted-'+id);assert.equal(Object.keys(removed.nodes).length,remaining);assert.equal(removed.nodes[image.id],undefined);assert.equal(removed.nodes[id],undefined);assert.deepEqual(removed.assets,placed.assets);
    await button('Undo').click();await page.locator('.studio-footer').filter({hasText:'3 layers'}).waitFor({timeout:60000});await saved();
    const restored=await save('restored-'+id);assert.deepEqual(restored.nodes,placed.nodes);assert.deepEqual(restored.assets,placed.assets);
   }
   report.checks.push('Populated tracks and groups delete their full subtree in one undoable change; undo restores all layers and media');
   await range();await button('New project').click();await button('Start with a title').waitFor({timeout:60000});await noRange();
   report.checks.push('New project clears both export bounds');
   await button('Start with a title').click();await page.locator('.studio-footer').filter({hasText:'1 layers'}).waitFor({timeout:60000});await saved();
   await range();await page.getByLabel('Project options',{exact:true}).click();
   await page.locator('.studio-recent-projects button').filter({hasText:'Clock laboratory'}).click();
   await page.waitForFunction(()=>document.querySelector('.studio-project-name')?.value==='Clock laboratory');await saved();await noRange();
   report.checks.push('Opening a saved project clears both export bounds');
   await range();await open(shortFile,short.title);await noRange();
   const pending=page.waitForEvent('download',{timeout:180000});await button('Export film').click();await(await pending).saveAs(path.join(out,'complete-short-film.mp4'));
   report.checks.push('Opening a different JSON project clears stale bounds and exports the complete new film');
   assert.equal(await page.locator('.studio-error').count(),0);assert.deepEqual(report.errors,[]);
   await page.screenshot({path:path.join(out,'complete-short-film.png')});
  }catch(error){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});report.browserState=(await page.locator('body').innerText()).slice(-6000);throw error;}
  finally{await context.close();}
 },{graphics:'software',timeout:600000});
 const file=path.join(out,'complete-short-film.mp4');
 const probe=JSON.parse((await run(ffprobe(),['-v','error','-count_frames','-show_streams','-of','json',file])).stdout);
 const video=probe.streams.find(stream=>stream.codec_type==='video');
 assert.equal(Number(video.nb_read_frames),30);assert.equal(video.width,320);assert.equal(video.height,180);
 await run(ffmpeg(),['-v','error','-i',file,'-f','null','-'],{timeout:60000});
 report.export={frames:30,width:320,height:180,fullDecode:true};report.passed=true;
}catch(error){report.error=error.message;throw error;}
finally{await server.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
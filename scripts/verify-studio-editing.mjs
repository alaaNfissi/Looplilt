import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {withBrowser} from '../lib/browser.mjs';
import {startStudio} from '../lib/studio/server.mjs';
import {readProject} from '../lib/project.mjs';
import {makeSound} from '../lib/sound.mjs';
import {run} from '../lib/process.mjs';
import {ffmpeg,ffprobe} from '../lib/media-tools.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.validation','studio-editing-'+Date.now()),workspace=path.join(out,'workspace'),inputs=path.join(out,'inputs');
await fs.mkdir(workspace,{recursive:true});await fs.mkdir(inputs);
await fs.copyFile(path.join(root,'site/media/paper-garden-landscape.mp4'),path.join(inputs,'original-video.mp4'));
await fs.copyFile(path.join(root,'site/media/paper-garden-landscape.png'),path.join(inputs,'original-image.png'));
await fs.writeFile(path.join(inputs,'original-score.wav'),makeSound((await readProject(path.join(root,'examples/brass-observatory'))).data));
const server=await startStudio(workspace),report={kind:'Automated real graphical editing in browser-local storage; not a real person session',events:[],errors:[]};
let page,apiRequests=0;
async function mark(name,data={}){const event={name,at:new Date().toISOString(),...data};report.events.push(event);console.log(name,JSON.stringify(data));await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));}
async function revision(){return Number((await page.locator('.studio-footer').innerText()).match(/Revision (\d+)/)[1]);}
async function edit(action){const before=await revision();await action();try{await page.waitForFunction(before=>{const text=document.querySelector('.studio-footer')?.textContent??'';return text.includes('All changes saved')&&Number(text.match(/Revision (\d+)/)?.[1])>before;},before,{timeout:30000});}catch(error){if(await page.locator('.studio-error').count())throw new Error(await page.locator('.studio-error').innerText());throw error;}}
async function field(name,value){const input=page.getByRole(typeof value==='number'?'spinbutton':'textbox',{name,exact:true});if(await input.inputValue()===String(value))return;await edit(async()=>{await input.fill(String(value));await input.blur();});}
async function button(name){await page.getByRole('button',{name,exact:true}).click();}
async function chooseMedia(name){await edit(()=>page.locator('.studio-media-card').filter({hasText:name}).click());}
async function seek(frame){await page.getByRole('application',{name:'Timeline',exact:true}).click({position:{x:frame*4,y:13}});await page.locator('.graph-canvas-wrap canvas[data-frame="'+frame+'"]').waitFor({timeout:45000});}
async function save(name){const pending=page.waitForEvent('download');await button('Project file');const file=path.join(out,name);await(await pending).saveAs(file);return JSON.parse(await fs.readFile(file,'utf8'));}
async function drag(from,to){const box=await page.getByRole('application',{name:'Timeline',exact:true}).boundingBox();await edit(async()=>{await page.mouse.move(box.x+from,box.y+50);await page.mouse.down();await page.mouse.move(box.x+to,box.y+50,{steps:12});await page.mouse.up();});}
try{
 await withBrowser(async browser=>{
  const context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});
  try{
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))apiRequests++;return url.origin===server.origin||['blob:','data:'].includes(url.protocol)?route.continue():route.abort();});
  page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  // No companion token: this explicitly exercises the hosted browser-local mode.
  await page.goto(server.origin+'/studio/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.studio-footer').filter({hasText:'All changes saved'}).waitFor({timeout:45000});
  await edit(async()=>{await page.locator('.studio-project-name').fill('Small world · visual editing acceptance');await page.locator('.studio-project-name').blur();});
  await page.locator('.studio-layer').first().click();await field('Duration',330);
  await page.getByLabel('Import local media',{exact:true}).setInputFiles(['original-video.mp4','original-image.png','original-score.wav'].map(name=>path.join(inputs,name)));
  await page.locator('.studio-media-card').filter({hasText:'original-score.wav'}).waitFor({timeout:45000});await mark('real-local-video-image-and-layered-score-imported');
  await chooseMedia('original-video.mp4');
  const muted=page.getByRole('checkbox',{name:'Muted',exact:true});if(!await muted.isChecked())await edit(()=>muted.click());assert.equal(await muted.isChecked(),true);
  await drag(2,120);await field('Start',0);await drag(200,260);
  const moved=await save('moved.looplilt.json'),movedVideo=Object.values(moved.nodes).find(node=>node.type==='video');
  assert.equal(movedVideo.time.start,15);assert.equal(movedVideo.time.offset.numerator,30);assert.equal(movedVideo.time.duration,300);
  await field('Start',0);await mark('timeline-trim-and-rearrangement',{sourceOffset:30,trimmedDuration:300,movedStart:15,finalStart:0});
  await chooseMedia('original-image.png');await field('Width',320);await field('Height',180);await field('X',900);await field('Y',390);await field('Fade in',12);await field('Fade out',12);
  await chooseMedia('original-score.wav');await field('Gain',.65);
  await edit(()=>button('Add rectangle'));await field('Layer name','Caption panel');await field('X',42);await field('Y',600);await field('Width',1196);await field('Height',82);await field('Fill','#173d2c');await field('Opacity',.96);
  await edit(()=>button('Add title'));await field('Text','SMALL WORLD. ROOM TO GROW.');await field('Font Size',32);await field('X',78);await field('Y',622);await field('Fill','#f3efdb');await field('Fade in',10);await field('Fade out',12);
  await edit(()=>button('Set x keyframe at playhead'));await seek(60);await field('X',130);
  const graph=await save('edited.looplilt.json'),video=Object.values(graph.nodes).find(node=>node.type==='video'),title=Object.values(graph.nodes).find(node=>node.type==='text');
  assert.equal(graph.durationFrames,330);assert.equal(video.time.offset.numerator,30);assert.equal(video.time.start,0);assert.equal(video.time.duration,300);assert.equal(title.animations['transform.x'].length,2);assert.equal(title.animations['transform.x'][1].frame,60);assert.equal(Object.keys(graph.assets).length,3);
  await page.locator('.graph-canvas-wrap canvas[data-frame="60"][data-revision="'+graph.revision+'"]').waitFor();
  const image=await page.locator('.graph-canvas-wrap canvas').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]);await fs.writeFile(path.join(out,'preview-frame-60.png'),Buffer.from(image,'base64'));
  await page.screenshot({path:path.join(out,'desktop.png')});await mark('editable-graph-and-animated-title-verified',{revision:graph.revision,nodeCount:Object.keys(graph.nodes).length});
  await page.close();page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));await page.goto(server.origin+'/studio/',{waitUntil:'domcontentloaded'});
  await page.locator('.studio-footer').filter({hasText:'Revision '+graph.revision}).waitFor({timeout:45000});assert.deepEqual(await save('reopened.looplilt.json'),graph);
  await page.locator('.studio-library-tabs').getByRole('button',{name:'Layers',exact:true}).click();
  await button('Collapse original-video.mp4');assert.equal(await page.getByRole('button',{name:'Expand original-video.mp4',exact:true}).getAttribute('aria-expanded'),'false');await button('Expand original-video.mp4');
  await seek(60);await button('Play');await page.getByRole('button',{name:'Pause',exact:true}).waitFor({timeout:45000});await page.waitForFunction(()=>document.querySelector('.studio-timecode')?.textContent.startsWith('00:03'));await button('Pause');await mark('browser-save-close-reopen-and-audio-clock');
  for(const viewport of [{width:390,height:844},{width:320,height:760},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   if(viewport.width<760){await page.getByRole('button',{name:'properties',exact:true}).click();await page.getByLabel('Project options',{exact:true}).click();await page.getByRole('button',{name:'Undo latest change',exact:true}).waitFor();await page.getByLabel('Project options',{exact:true}).click();}
   const layout=await page.evaluate(()=>({horizontal:document.documentElement.scrollWidth>innerWidth+1,height:document.querySelector('.looplilt-studio').getBoundingClientRect().height,viewport:innerHeight}));
   assert.equal(layout.horizontal,false);assert.ok(layout.height<=layout.viewport+1);
   const exportBox=await page.getByRole('button',{name:'Export film',exact:true}).boundingBox();assert.ok(exportBox.x>=0&&exportBox.x+exportBox.width<=viewport.width+1);
   await page.screenshot({path:path.join(out,'studio-'+viewport.width+'x'+viewport.height+'.png')});
  }
  await page.setViewportSize({width:1600,height:1100});await seek(60);assert.deepEqual(await save('after-navigation.looplilt.json'),graph);await mark('phone-landscape-and-layer-navigation-preserve-project');
  const pending=page.waitForEvent('download',{timeout:180000});await button('Export film');await(await pending).saveAs(path.join(out,'visual-editing.mp4'));
  assert.equal(apiRequests,0);assert.deepEqual(report.errors,[]);await mark('actual-browser-export',{apiRequests});
  }catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});report.browserState=(await page.locator('body').innerText()).slice(-7000);}throw error;}finally{await context.close();}
 },{timeout:600000,graphics:'software'});
 const file=path.join(out,'visual-editing.mp4'),probe=JSON.parse((await run(ffprobe(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',file])).stdout),video=probe.streams.find(stream=>stream.codec_type==='video'),audio=probe.streams.find(stream=>stream.codec_type==='audio');
 assert.equal(Number(video.nb_read_frames),330);assert.equal(video.width,1280);assert.equal(video.height,720);assert.equal(audio.channels,2);
 await run(ffmpeg(),['-v','error','-i',file,'-f','null','-'],{timeout:60000});
 const encoded=path.join(out,'encoded.rgba'),preview=path.join(out,'preview.rgba');
 await run(ffmpeg(),['-v','error','-n','-i',file,'-vf','select=eq(n\\,60)','-frames:v','1','-pix_fmt','rgba','-f','rawvideo',encoded]);
 await run(ffmpeg(),['-v','error','-n','-i',path.join(out,'preview-frame-60.png'),'-frames:v','1','-pix_fmt','rgba','-f','rawvideo',preview]);
 const actual=await fs.readFile(encoded),expected=await fs.readFile(preview);assert.equal(actual.length,expected.length);let differences=0;for(let i=0;i<actual.length;i++)differences+=Math.abs(actual[i]-expected[i]);const mean=differences/actual.length;assert.ok(mean<5,'Preview/export frame disagreement: '+mean);
 for(const [input,name,gain]of [[file,'export-audio',null],[path.join(inputs,'original-score.wav'),'reference-audio',.65]])await run(ffmpeg(),['-v','error','-n','-i',input,'-map','0:a:0',...(gain===null?[]:['-af','volume='+gain]),'-t','11','-ac','2','-ar','48000','-f','f32le',path.join(out,name+'.f32')]);
 const decodedBytes=await fs.readFile(path.join(out,'export-audio.f32')),referenceBytes=await fs.readFile(path.join(out,'reference-audio.f32'));
 const samples=new Float32Array(decodedBytes.buffer,decodedBytes.byteOffset,decodedBytes.byteLength/4),reference=new Float32Array(referenceBytes.buffer,referenceBytes.byteOffset,referenceBytes.byteLength/4);
 const length=Math.min(samples.length,reference.length);let xy=0,xx=0,yy=0,peak=0;
 for(let i=0;i<length;i++){assert.ok(Number.isFinite(samples[i]));xy+=samples[i]*reference[i];xx+=samples[i]**2;yy+=reference[i]**2;peak=Math.max(peak,Math.abs(samples[i]));}
 const correlation=xy/Math.sqrt(xx*yy),gain=xy/yy;assert.ok(correlation>.995);assert.ok(Math.abs(gain-1)<.02);assert.ok(peak<1);
 let best={lag:0,correlation:-1};for(let lag=-128;lag<=128;lag++){let sum=0,a=0,b=0;for(let i=512;i<length-512;i+=32){const x=samples[i+lag*2],y=reference[i];sum+=x*y;a+=x*x;b+=y*y;}const r=sum/Math.sqrt(a*b);if(r>best.correlation)best={lag,correlation:r};}
 assert.ok(Math.abs(best.lag)<=1,'Soundtrack offset: '+best.lag);
 await mark('verified-video-audio-and-preview',{file,frames:330,fullDecode:true,meanChannelError:mean,audio:{correlation,gain,lagSamples:best.lag,sampleRate:48000,peak}});
 report.passed=true;
}catch(error){report.error=error.message;throw error;}
finally{await server.close();report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(root,'.validation/latest-studio-editing.json'),JSON.stringify({out,report:path.join(out,'report.json')},null,2));console.log(JSON.stringify({out,passed:report.passed??false}));}

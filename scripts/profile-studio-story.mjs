import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startStudio} from '../lib/studio/server.mjs';
import {withBrowser} from '../lib/browser.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.validation','story-load-profile-'+Date.now());
await fs.mkdir(path.join(out,'workspace'),{recursive:true});const host=await startStudio(path.join(out,'workspace'));let result;
try{await withBrowser(async browser=>{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(host.origin+'/studio/',{waitUntil:'domcontentloaded',timeout:60000});
 const control=page.getByRole('button',{name:'Open example: The Last Light',exact:true});await control.waitFor({timeout:60000});
 await page.evaluate(()=>{
  window.loadProfile={clicked:0,phases:[],longTasks:[]};
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(window.loadProfile.clicked)window.loadProfile.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:false});
  const button=document.querySelector('[aria-label="Open example: The Last Light"]');
  button.addEventListener('click',()=>{window.loadProfile.clicked=performance.now();},{capture:true,once:true});
  new MutationObserver(()=>{
   const p=window.loadProfile;if(!p.clicked)return;
   const loading=document.querySelector('.studio-export-progress'),footer=document.querySelector('.studio-footer')?.textContent??'';
   const phase=loading?.textContent??(footer.includes('2795 layers')?'Ready to edit':null);
   if(phase&&p.phases.at(-1)?.phase!==phase)p.phases.push({phase,milliseconds:performance.now()-p.clicked});
  }).observe(document.body,{subtree:true,childList:true,characterData:true});
 });
 await control.click();await page.locator('.studio-footer').filter({hasText:'2795 layers'}).waitFor({timeout:120000});
 await page.locator('.studio-export-progress').waitFor({state:'hidden',timeout:120000});
 await page.locator('.graph-canvas-wrap canvas[data-project="the-last-light-directors-cut"][data-frame="0"]').waitFor({timeout:60000});
 result=await page.evaluate(()=>{const p=window.loadProfile;return {phases:p.phases,longTasks:p.longTasks.map(t=>({...t,start:t.start-p.clicked})),totalLongTaskMs:p.longTasks.reduce((sum,t)=>sum+t.duration,0),network:performance.getEntriesByType('resource').filter(r=>r.name.includes('/stories/')).map(r=>({path:new URL(r.name).pathname,milliseconds:r.duration})),measuredAt:performance.now()-p.clicked};});
 console.log(JSON.stringify(result,null,2));await page.close();
},{graphics:'software',timeout:240000});}finally{await host.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(result??{error:'Did not finish'},null,2));console.log(out);}

import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {serveSite} from './site-server.mjs';import {withBrowser} from '../lib/browser.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.validation','studio-welcome-'+Date.now());await fs.mkdir(out,{recursive:true});const server=await serveSite(path.join(root,'.site')),stories=JSON.parse(await fs.readFile(path.join(root,'studio/stories.json'),'utf8')),report={layouts:[],stories:[],errors:[]};
try{await withBrowser(async browser=>{
 for(const [width,height]of [[1600,1000],[1280,800],[390,844],[320,720],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  try{
   await page.goto(server.origin+'/studio/',{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('heading',{name:/What will you/}).waitFor({timeout:60000});assert.equal(await page.locator('.studio-story-card').count(),stories.length);
   const geometry=await page.locator('.studio-start').evaluate(node=>({welcomeWidth:node.clientWidth,scrollWidth:node.scrollWidth,scrollTop:node.scrollTop,headingTop:node.querySelector('h1').getBoundingClientRect().top,top:node.getBoundingClientRect().top}));
   assert.ok(geometry.scrollWidth<=geometry.welcomeWidth+1,'Welcome horizontal overflow');assert.ok(geometry.headingTop>=geometry.top,'Heading cannot be scrolled into view from a negative offset');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('.studio-story-card img').evaluateAll(async images=>{await Promise.all(images.map(image=>image.decode()));if(images.some(image=>!image.naturalWidth))throw new Error('Missing example poster');});
   await page.screenshot({path:path.join(out,'welcome-'+width+'x'+height+'.png')});
   for(const story of stories){const card=page.getByRole('button',{name:'Open example: '+story.title,exact:true});await card.scrollIntoViewIfNeeded();await card.focus();assert.equal(await card.evaluate(node=>node===document.activeElement),true);assert.ok((await card.innerText()).includes(story.audio));}
   if(width>=760){await page.locator(".studio-layer").first().click();await page.getByRole("spinbutton",{name:"Duration",exact:true}).waitFor();assert.equal(await page.locator(".studio-start").count(),0,"A selected composition must reveal its properties");await page.getByRole("button",{name:"New project",exact:true}).click();await page.getByRole("button",{name:"Start with a title",exact:true}).waitFor();}
   await page.getByRole("button",{name:"Start with a title",exact:true}).focus();await page.keyboard.press("Space");await page.locator(".studio-footer").filter({hasText:"1 layers"}).waitFor({timeout:60000});assert.equal(await page.locator(".studio-timeline").isVisible(),true,"Editing timeline returns after keyboard creation");
   report.layouts.push({width,height,...geometry});
  }finally{await context.close();}
 }
 for(const story of stories){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();let remote=0;
  page.on('request',r=>{if(!['data:','blob:'].includes(new URL(r.url()).protocol)&&new URL(r.url()).origin!==server.origin)remote++;});page.on('pageerror',e=>report.errors.push(e.message));
  try{
   const original=JSON.parse(await fs.readFile(path.join(root,'examples/studio',story.slug,'project.looplilt.json'),'utf8'));
   await page.goto(server.origin+'/studio/?story='+story.slug,{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('.studio-footer').filter({hasText:(Object.keys(original.nodes).length-1)+' layers'}).waitFor({timeout:120000});
   await page.locator('.studio-export-progress').waitFor({state:'hidden',timeout:120000});await page.waitForURL(server.origin+'/studio/',{timeout:60000});
   assert.equal(remote,0,'Film import must not upload or request third-party services');
   const timeline=page.getByRole('application',{name:'Timeline',exact:true});await timeline.waitFor();await page.waitForFunction(()=>document.querySelector('canvas[aria-label="Timeline"]').clientWidth>100);const box=await timeline.boundingBox(),expected=Math.round((original.durationFrames+2)*.75);await page.mouse.click(box.x+box.width*.75,box.y+12);await page.waitForFunction(frame=>Math.abs(Number(document.querySelector('.graph-canvas-wrap canvas')?.dataset.frame)-frame)<4,expected,{timeout:60000});
   await page.screenshot({path:path.join(out,'opened-'+story.slug+'.png')});report.stories.push({slug:story.slug,nodes:Object.keys(original.nodes).length,externalRequests:remote});
  }finally{await context.close();}
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.goto(server.origin,{waitUntil:'networkidle',timeout:60000});await page.locator('#studio-films').screenshot({path:path.join(out,'showcase-desktop.png')});await page.locator('#start').screenshot({path:path.join(out,'installation-desktop.png')});await page.setViewportSize({width:390,height:844});await page.locator('#studio-films').screenshot({path:path.join(out,'showcase-phone.png')});await page.close();
 assert.deepEqual(report.errors,[]);report.passed=true;
 },{graphics:'software',timeout:600000});
}finally{await server.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}

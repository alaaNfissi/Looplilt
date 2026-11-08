import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';

const repository=fileURLToPath(new URL('../',import.meta.url)),root=path.join(repository,'.validation','graph-jobs-'+Date.now());
await fs.mkdir(path.join(root,'imports','own-film'),{recursive:true});
for(const name of ['project.json','draw.js'])await fs.copyFile(path.join(repository,'examples','paper-garden',name),path.join(root,'imports','own-film',name));
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(repository,'bin','looplilt-mcp.mjs'),'--workspace',root],stderr:'pipe',env:process.env});
let stderr='';transport.stderr?.on('data',chunk=>{stderr+=chunk;});
const client=new Client({name:'looplilt-render-acceptance',version:'1.0.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}}}),report={workspace:root,checks:[],artifacts:[]};
async function call(name,args){const value=await client.callTool({name,arguments:args},{timeout:60000});assert.equal(value.isError,undefined,JSON.stringify(value.content));return value;}
async function data(name,args){return (await call(name,args)).structuredContent.data;}
async function wait(id,{maximum=300000}={}){
 const start=Date.now();let previous='';
 while(Date.now()-start<maximum){
  const job=await data('looplilt_jobs',{action:'status',jobId:id}),phase=job.status+':'+job.progress.phase;
  if(phase!==previous){console.log(id.slice(0,8)+' '+phase);previous=phase;}
  if(['completed','failed','cancelled','interrupted'].includes(job.status))return job;
  await delay(500);
 }
 throw new Error('Acceptance render timed out');
}
try{
 await client.connect(transport);
 const available=await client.listTools();for(const name of ['looplilt_render','looplilt_jobs','looplilt_artifact','looplilt_readiness'])assert.ok(available.tools.some(tool=>tool.name===name));
 let state=await data('looplilt_project_create',{id:'growing-together',title:'Growing together — editable source',width:1280,height:720,durationFrames:480});
 state=await data('looplilt_legacy_import',{projectId:state.projectId,expectedFingerprint:state.fingerprint,source:'imports/own-film'});
 state=await data('looplilt_nodes_create',{projectId:state.projectId,expectedFingerprint:state.fingerprint,label:'An editable message over original artwork',nodes:[
  {id:'caption-panel',type:'rectangle',name:'Caption backdrop',transform:{x:58,y:602},props:{width:1120,height:78,fill:'#163d2b'},opacity:.95},
  {id:'message',type:'text',name:'Editable message',transform:{x:84,y:622},props:{text:'SMALL STEPS. SOMETHING GROWS.',fontSize:32,fill:'#f3edda'}}
 ]});
 const original=state.fingerprint;
 const preflight=await data('looplilt_readiness',{projectId:state.projectId,request:{kind:'video',width:640,endFrame:90}});
 assert.equal(preflight.readyToAttemptRender,true,JSON.stringify(preflight.blockers));report.checks.push({name:'preflight',result:preflight});
 const frame=await data('looplilt_render',{projectId:state.projectId,expectedFingerprint:original,request:{kind:'frame',frame:80,width:640}});
 state=await data('looplilt_edit',{projectId:state.projectId,expectedFingerprint:original,label:'Keep editing during snapshot export',operations:[{op:'node.patch',id:'message',changes:{props:{text:'SMALL STEPS. A SHARED STORY.'}}}]});
 const finishedFrame=await wait(frame.id);assert.equal(finishedFrame.status,'completed',finishedFrame.error);assert.equal(finishedFrame.fingerprint,original);
 const inline=await call('looplilt_artifact',{jobId:frame.id,includeImage:true}),image=inline.content.find(item=>item.type==='image');assert.ok(image);
 await fs.writeFile(path.join(root,'mcp-frame.png'),Buffer.from(image.data,'base64'));report.artifacts.push(inline.structuredContent.data);
 report.checks.push({name:'snapshot-isolation',renderedFingerprint:original,currentFingerprint:state.fingerprint});
 for(const request of [{kind:'storyboard',width:320,frames:[0,45,90,180,300,479]},{kind:'video',format:'mp4',width:640,endFrame:90},{kind:'video',format:'webm',width:640,endFrame:90}]){
  const job=await data('looplilt_render',{projectId:state.projectId,expectedFingerprint:state.fingerprint,request});
  const finished=await wait(job.id);assert.equal(finished.status,'completed',finished.error);
  const artifact=await data('looplilt_artifact',{jobId:job.id});assert.equal(artifact.verification.decoded,true);report.artifacts.push(artifact);
  if(request.kind==='video'){assert.equal(artifact.frames,90);assert.equal(artifact.hasAudio,true);assert.ok(artifact.verification.audio);}
 }
 const cancellable=await data('looplilt_render',{projectId:state.projectId,expectedFingerprint:state.fingerprint,request:{kind:'video',width:1920,height:1080}});
 const started=Date.now();let running;
 while(Date.now()-started<120000){running=await data('looplilt_jobs',{action:'status',jobId:cancellable.id});if(running.progress.completedFrames>0)break;if(['failed','completed'].includes(running.status))throw new Error('Cancellation trial did not reach active encoding: '+running.error);await delay(100);}
 assert.ok(running.progress.completedFrames>0,'Renderer reached active encoding');
 const cancelledAt=Date.now();await data('looplilt_jobs',{action:'cancel',jobId:cancellable.id});const cancelled=await wait(cancellable.id,{maximum:30000});
 assert.equal(cancelled.status,'cancelled');report.checks.push({name:'real-encoder-cancellation',elapsedMs:Date.now()-cancelledAt,framesBeforeCancel:running.progress.completedFrames});
 assert.equal((await data('looplilt_inspect',{projectId:state.projectId})).fingerprint,state.fingerprint);
 const contents=await fs.readdir(path.join(root,'renders',cancellable.id));assert.equal(contents.some(name=>name.startsWith('render-')||name==='result.mp4'),false);
 report.checks.push({name:'cancellation-preserves-project',fingerprint:state.fingerprint});
 assert.equal(stderr,'');
 report.finishedAt=new Date().toISOString();report.passed=true;
}finally{
 await client.close();report.stderr=stderr;await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(repository,'.validation/latest-graph-jobs.json'),JSON.stringify({root,report:path.join(root,'report.json')},null,2));
 console.log(JSON.stringify({root,passed:report.passed??false,artifacts:report.artifacts.map(item=>item.file)}));
}

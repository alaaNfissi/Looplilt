import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';
import {createGraph} from '../lib/graph/schema.mjs';
import {createNodeOperations} from '../lib/graph/commands.mjs';
import {applyTransaction,graphFingerprint} from '../lib/graph/transactions.mjs';
import {GraphRenderJobs} from '../lib/graph/jobs.mjs';
const repository=fileURLToPath(new URL('../',import.meta.url)),root=path.join(repository,'.validation','graph-shutdown-'+Date.now());
await fs.mkdir(root,{recursive:true});
const workspace=await GraphWorkspace.open(root);
let graph=createGraph({id:'shutdown-film',title:'Original cancellation test',width:1280,height:720,durationFrames:1800});
const nodes=Array.from({length:48},(_,i)=>({id:'light-'+i,type:'ellipse',name:'Light '+i,transform:{x:(i*137)%1200,y:(i*79)%640},props:{width:70+(i%3)*30,height:70+(i%3)*30,fill:i%2?'#dfac79':'#75b5aa'},opacity:.7}));
graph=(await applyTransaction(graph,{expectedFingerprint:await graphFingerprint(graph),label:'Build an original encoding fixture',operations:createNodeOperations(graph,nodes)})).document;
const state=await workspace.create(graph),report={kind:'Real MCP process with active Chromium encoding',checks:[],startedAt:new Date().toISOString()};
let child,reader,stderr='',buffer='',sequence=0,closed=false,exitPromise;const pending=new Map();
async function call(method,params={}){
 if(closed)throw new Error('MCP process already closed');
 const id=++sequence;
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('MCP request timed out: '+method));},60000);
  pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n',error=>{if(error){pending.delete(id);clearTimeout(timeout);reject(error);}});
 });
}
async function tool(name,args){const result=await call('tools/call',{name,arguments:args});assert.equal(result.isError,undefined,JSON.stringify(result.content));return result.structuredContent.data;}
async function active(jobId){
 const started=Date.now();let previous='';
 while(Date.now()-started<150000){
  const job=await tool('looplilt_jobs',{action:'status',jobId}),phase=job.status+':'+job.progress.phase;
  if(phase!==previous){console.log(phase);previous=phase;}
  if(job.status==='running'&&job.progress.completedFrames>=2)return job;
  if(['failed','completed','cancelled'].includes(job.status))throw new Error('Encoding did not stay active: '+JSON.stringify(job));
  await delay(250);
 }
 throw new Error('Active encoding was not observed');
}
async function noPartial(id){
 const names=await fs.readdir(path.join(root,'renders',id));
 assert.equal(names.some(name=>name.startsWith('render-')||name==='result.mp4'),false);
 assert.equal((await workspace.read(graph.id)).fingerprint,state.fingerprint);
}
try{
 child=spawn(process.execPath,[path.join(repository,'bin/looplilt-mcp.mjs'),'--workspace',root],{stdio:['pipe','pipe','pipe'],env:process.env,windowsHide:true});
 exitPromise=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>{closed=true;for(const request of pending.values())request.reject(new Error('MCP process closed'));pending.clear();resolve({code,signal});});});
 child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-16000);});
 child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
  buffer+=chunk;if(buffer.length>4*1024*1024)throw new Error('Unexpected unbounded protocol output');
  for(;;){const newline=buffer.indexOf('\n');if(newline<0)break;const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(!line.trim())continue;const message=JSON.parse(line),request=pending.get(message.id);if(!request)continue;pending.delete(message.id);if(message.error)request.reject(new Error(JSON.stringify(message.error)));else request.resolve(message.result);}
 });
 const initialized=await call('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'looplilt-shutdown-check',version:'1.0.0'}});
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 report.protocolVersion=initialized.protocolVersion;
 const request={projectId:graph.id,expectedFingerprint:state.fingerprint,request:{kind:'video',format:'mp4',width:1920,height:1080}};
 const first=await tool('looplilt_render',request),observed=await active(first.id),began=performance.now();
 await tool('looplilt_jobs',{action:'cancel',jobId:first.id});
 let cancelled;
 while(performance.now()-began<45000){cancelled=await tool('looplilt_jobs',{action:'status',jobId:first.id});if(cancelled.status==='cancelled')break;assert.notEqual(cancelled.status,'completed');await delay(250);}
 assert.equal(cancelled.status,'cancelled');await noPartial(first.id);
 report.checks.push({name:'explicit-cancel-during-real-encoding',framesObserved:observed.progress.completedFrames,elapsedMs:Math.round(performance.now()-began),status:cancelled.status,projectUnchanged:true,noPartialOutput:true});
 console.log(JSON.stringify(report.checks.at(-1)));
 const second=await tool('looplilt_render',request),secondObserved=await active(second.id),endedAt=performance.now();
 child.stdin.end(); // Real EOF: no client-side process kill or timeout-driven close.
 let timer;
 const ended=await Promise.race([exitPromise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('MCP did not finish cleanup after stdin EOF')),45000);})]).finally(()=>clearTimeout(timer));
 assert.equal(ended.code,0);assert.equal(ended.signal,null);
 const inspector=new GraphRenderJobs(workspace),record=await inspector.status(second.id);await inspector.close();
 assert.equal(record.status,'cancelled');await noPartial(second.id);assert.equal(stderr,'');
 report.checks.push({name:'stdin-eof-during-real-encoding',framesObserved:secondObserved.progress.completedFrames,elapsedMs:Math.round(performance.now()-endedAt),status:record.status,cleanProcessExit:true,projectUnchanged:true,noPartialOutput:true});
 report.passed=true;console.log(JSON.stringify(report.checks.at(-1)));
}catch(error){report.error=error.message;throw error;}
finally{
 if(child&&!closed){child.stdin.end();await Promise.race([exitPromise,delay(5000)]);if(!closed)child.kill('SIGTERM');}
 report.stderr=stderr;report.finishedAt=new Date().toISOString();
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
 await fs.writeFile(path.join(repository,'.validation/latest-graph-shutdown.json'),JSON.stringify({root,report:path.join(root,'report.json')},null,2));
 console.log(JSON.stringify({root,passed:report.passed??false}));
}

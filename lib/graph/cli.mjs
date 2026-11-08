import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {GraphWorkspace} from './workspace.mjs';
import {createGraph,assertJson} from './schema.mjs';
import {createNodeOperations} from './commands.mjs';
import {compileGraph} from './evaluate.mjs';
import {GraphRenderJobs} from './jobs.mjs';
import {graphReadiness} from './readiness.mjs';
import {importWorkspaceAsset} from './assets.mjs';
import {importLegacyProject} from './legacy-import.mjs';

export const GRAPH_HELP=`Looplilt graph — one editable project for Studio, CLI and MCP

  looplilt graph create <workspace> --input <project-options.json>
  looplilt graph list <workspace>
  looplilt graph inspect <workspace> --project <id> [--view document|frame|summary] [--at 0]
  looplilt graph compare <workspace> --project <id> --from <fingerprint> [--to <fingerprint>]
  looplilt graph nodes <workspace> --project <id> --input <nodes-request.json>
  looplilt graph edit <workspace> --project <id> --input <transaction.json>
  looplilt graph import <workspace> --project <id> --input <media-request.json>
  looplilt graph legacy-import <workspace> --project <id> --input <source-request.json>
  looplilt graph frame <workspace> --project <id> --at 60 [--out <frame.png>]
  looplilt graph storyboard <workspace> --project <id> [--width 480] [--out <sheet.png>]
  looplilt graph render <workspace> --project <id> [--from 0 --to 180] [--format mp4|webm]
  looplilt graph check <workspace> --project <id> [--input <render-request.json>]
  looplilt graph jobs <workspace> [--offset 0 --limit 20]
  looplilt graph job <workspace> --job <id>
  looplilt graph cancel <workspace> --job <id>
  looplilt graph artifact <workspace> --job <id>

The workspace must already exist. All results are JSON. Times are integer project
frames. Editing input requires expectedFingerprint from a fresh inspection.
Render input may contain {expectedFingerprint,request}; otherwise export snapshots
the currently saved revision. Jobs and verified outputs remain under workspace/renders.
An optional --out copies the completed result exclusively to a new explicit path.
Ctrl+C cancels owned rendering. Existing projects and output files are preserved.
`;
const actions={
 compare:['project','from','to','offset','limit'],create:['input'],list:[],inspect:['project','view','at'],nodes:['project','input'],edit:['project','input'],
 import:['project','input'],'legacy-import':['project','input'],
 frame:['project','input','out','at','width','height'],storyboard:['project','input','out','width','height'],
 render:['project','input','out','from','to','width','height','format'],check:['project','input'],
 jobs:['offset','limit'],job:['job'],cancel:['job'],artifact:['job']
};
async function readInput(file){
 const info=await fs.lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>8*1024*1024)throw new Error('Input must be a regular JSON file of at most8MiB');
 const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{const bytes=Buffer.alloc(info.size+1),read=await handle.read(bytes,0,bytes.length,0);if(read.bytesRead!==info.size)throw new Error('Input changed while reading');return assertJson(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,read.bytesRead))));}
 finally{await handle.close();}
}
export async function graphCli(args,{signal}={}){
 const [action,directory,...rest]=args;if(!action||['help','--help'].includes(action)){console.log(GRAPH_HELP);return;}
 if(!Object.hasOwn(actions,action)||!directory||directory.startsWith('--'))throw new Error(GRAPH_HELP);
 const allowed=new Set([...actions[action],'json']),options={};
 for(let i=0;i<rest.length;i++){const name=rest[i].startsWith('--')?rest[i].slice(2):'';if(!allowed.has(name)||Object.hasOwn(options,name))throw new Error('Unknown or repeated graph option: '+rest[i]);if(name==='json'){options.json=true;continue;}if(!rest[i+1]||rest[i+1].startsWith('--'))throw new Error('--'+name+' requires a value');options[name]=rest[++i];}
 if(actions[action].includes('project')&&!options.project)throw new Error('--project is required');
 if(['create','nodes','edit','import','legacy-import'].includes(action)&&!options.input)throw new Error('--input is required');
 if(['job','cancel','artifact'].includes(action)&&!options.job)throw new Error('--job is required');
 const workspace=await GraphWorkspace.open(directory),input=options.input?await readInput(options.input):null;
 const numeric=name=>options[name]===undefined?undefined:Number(options[name]);
 let value;
 if(action==='create')value=await workspace.create(input.format==='looplilt'?input:createGraph(input));
 else if(action==='list')value=await workspace.list();
 else if(action==='compare')value=await workspace.compare(options.project,{fromFingerprint:options.from,toFingerprint:options.to,offset:numeric('offset'),limit:numeric('limit'),signal});
 else if(action==='inspect'){
  const state=await workspace.read(options.project),view=options.view??'summary';
  if(!['document','frame','summary'].includes(view))throw new Error('Choose document, frame or summary');
  value=view==='document'?state:view==='frame'?{fingerprint:state.fingerprint,...compileGraph(state.document).evaluate(numeric('at')??0)}:{projectId:state.document.id,title:state.document.title,fingerprint:state.fingerprint,revision:state.document.revision,width:state.document.width,height:state.document.height,frameRate:state.document.frameRate,durationFrames:state.document.durationFrames,rootId:state.document.rootId,nodes:Object.keys(state.document.nodes).length,assets:Object.keys(state.document.assets).length};
 }else if(action==='nodes'){
  const state=await workspace.read(options.project);
  value=await workspace.transact(options.project,{expectedFingerprint:input.expectedFingerprint,label:input.label,operations:createNodeOperations(state.document,input.nodes)},{signal});
 }else if(action==='edit')value=await workspace.transact(options.project,input,{signal});
 else if(action==='import')value=await importWorkspaceAsset(workspace,{...input,projectId:options.project},{signal});
 else if(action==='legacy-import')value=await importLegacyProject(workspace,{...input,projectId:options.project},{signal});
 else if(action==='check')value=await graphReadiness(workspace,{projectId:options.project,request:input?.request??input??{kind:'video'}},{signal});
 else{
  let last=0;const jobs=new GraphRenderJobs(workspace,{onProgress:progress=>{if(Date.now()-last<500&&progress.ratio<1)return;last=Date.now();console.error(JSON.stringify({type:'progress',...progress}));}});
  const cancel=()=>void jobs.close();signal?.addEventListener('abort',cancel,{once:true});
  try{
   signal?.throwIfAborted();
   if(action==='jobs')value=await jobs.list({offset:numeric('offset')??0,limit:numeric('limit')??20});
   else if(action==='job')value=await jobs.status(options.job);
   else if(action==='cancel')value=await jobs.cancel(options.job);
   else if(action==='artifact')value=await jobs.artifact(options.job,{signal});
   else{
    const state=await workspace.read(options.project),request={...(input?.request??{}),kind:action==='render'?'video':action};
    for(const [flag,key] of [['at','frame'],['from','startFrame'],['to','endFrame'],['width','width'],['height','height']])if(options[flag]!==undefined)request[key]=numeric(flag);
    if(options.format)request.format=options.format;
    if(options.out){const extension=action==='render'?request.format??'mp4':'png';if(path.extname(options.out).toLowerCase()!=='.'+extension)throw new Error('Output must end in .'+extension);try{await fs.lstat(options.out);throw new Error('Output already exists; choose a new path');}catch(error){if(error.code!=='ENOENT')throw error;}}
    const job=await jobs.start({projectId:options.project,expectedFingerprint:input?.expectedFingerprint??state.fingerprint,request},{signal});
    console.error(JSON.stringify({type:'job',jobId:job.id,fingerprint:job.fingerprint}));
    const completed=await jobs.wait(job.id);if(completed.status!=='completed')throw Object.assign(new Error(completed.error||'Render did not complete'),{code:completed.status.toUpperCase()});
    value=await jobs.artifact(job.id,{signal});
    if(options.out){const output=path.resolve(options.out);await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(value.file,output,constants.COPYFILE_EXCL);value={...value,copiedTo:output};}
   }
  }finally{signal?.removeEventListener('abort',cancel);await jobs.close();}
 }
 console.log(JSON.stringify(value,null,2));return value;
}

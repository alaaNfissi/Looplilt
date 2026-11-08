import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateGraph} from './schema.mjs';
import {verifyWorkspaceAssets} from './assets.mjs';
import {normalizeRenderRequest} from './render-request.mjs';
import {ffmpeg,ffprobe} from '../media-tools.mjs';
import {run} from '../process.mjs';
import {verifyStudioRuntime} from '../studio/distribution.mjs';

/** An honest preflight, not a subjective quality score or a promised export. */
export async function graphReadiness(workspace,{projectId,request={kind:'video'}},{signal}={}){
 signal?.throwIfAborted();const state=await workspace.read(projectId),blockers=[],warnings=[],checks=[];
 try{
  const validation=validateGraph(state.document,{allowUnsupported:true});
  if(validation.unsupported.length)blockers.push({check:'graph',message:'Unsupported nodes or effects must be resolved before rendering',items:validation.unsupported.slice(0,100)});
  else checks.push({check:'graph',passed:true});
 }catch(error){blockers.push({check:'graph',message:error.message});}
 let normalized;
 try{normalized=normalizeRenderRequest(state.document,request);checks.push({check:'render-limits',passed:true});}
 catch(error){blockers.push({check:'render-limits',message:error.message});}
 const integrity=await verifyWorkspaceAssets(workspace,projectId,{signal});
 if(integrity.fingerprint!==state.fingerprint)blockers.push({check:'revision',message:'The project changed during preflight; inspect its new revision and retry'});
 if(!integrity.valid)blockers.push({check:'media-integrity',message:'Some source files are missing or changed',items:integrity.assets.filter(asset=>asset.status!=='valid').slice(0,100)});
 else checks.push({check:'media-integrity',passed:true,assets:integrity.assets.length,bytes:integrity.inspectedBytes});
 try{await verifyStudioRuntime(fileURLToPath(new URL('../../',import.meta.url)),{stories:false});checks.push({check:'studio-runtime',passed:true});}
 catch(error){blockers.push({check:'studio-runtime',message:error.message});}
 if((request.kind??'video')==='video'){
  const dependencies=await Promise.allSettled([ffmpeg(),ffprobe()].map(binary=>run(binary,['-version'],{signal,timeout:15000,maxOutput:256*1024})));
  dependencies.forEach((result,index)=>{const check=index===0?'ffmpeg':'ffprobe';if(result.status==='fulfilled')checks.push({check,passed:true,version:result.value.stdout.split('\n')[0]});else blockers.push({check,message:result.reason.message});});
 }
 signal?.throwIfAborted();
 if(process.env.LOOPLILT_BROWSER){
  try{if(!(await fs.stat(process.env.LOOPLILT_BROWSER)).isFile())throw new Error('Not a file');checks.push({check:'configured-browser-file',passed:true});}
  catch{blockers.push({check:'browser',message:'LOOPLILT_BROWSER does not point to an accessible browser executable'});}
 }
 const sourceNodes=Object.values(state.document.nodes).filter(node=>node.type==='canvas'||node.type==='score').length;
 if(sourceNodes)warnings.push('Procedural source remains editable, but its execution and soundtrack must be checked by an actual render.');
 warnings.push('Codec availability, media decoding, visual quality and synchronization are not established by preflight. Render representative frames and a video, then inspect the completed artifact.');
 return {projectId,fingerprint:state.fingerprint,revision:state.document.revision,stage:'preflight',readyToAttemptRender:blockers.length===0,checks,blockers,warnings,request:normalized??null};
}

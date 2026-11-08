import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { GraphWorkspace, scopedPath } from '../graph/workspace.mjs';
import { assertJson, stableId, GRAPH_LIMITS } from '../graph/schema.mjs';
import { putWorkspaceAsset, readWorkspaceAsset } from '../graph/assets.mjs';
import {studioHeaders,serveStudioFile} from './http.mjs';
import {verifyStudioRuntime} from './distribution.mjs';

function failure(message,status=400,code='INVALID_REQUEST'){return Object.assign(new Error(message),{status,code});}
function exact(value,names){assertJson(value);if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(key=>!names.includes(key)))throw failure('Invalid request fields');}
async function body(request,limit,signal){const chunks=[];let bytes=0;for await(const chunk of request){signal.throwIfAborted();bytes+=chunk.length;if(bytes>limit)throw failure('Request exceeds its byte limit',413,'TOO_LARGE');chunks.push(chunk);}return Buffer.concat(chunks);}
async function json(request,signal){if(request.headers['content-type']?.split(';')[0]!=='application/json')throw failure('Use application/json',415);const bytes=await body(request,GRAPH_LIMITS.bytes,signal);const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));assertJson(result);return result;}
function send(response,status,data){const bytes=Buffer.from(JSON.stringify(data));response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length});response.end(bytes);}

/** A scoped loopback companion. It cannot execute shell text, fetch remote media,
 * change its workspace, or serve arbitrary local files. Studio and MCP both use
 * GraphWorkspace; the HTTP layer adds no second project or transaction model. */
export async function startStudio(directory,{port=0,staticDirectory=fileURLToPath(new URL('../../studio/apps/web/out/',import.meta.url)),signal}={}){
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw new Error('Studio port must be 0–65535');
 signal?.throwIfAborted();
 const productRoot=fileURLToPath(new URL('../../',import.meta.url));
 if(path.resolve(staticDirectory)===path.resolve(productRoot,'studio/apps/web/out'))await verifyStudioRuntime(productRoot,{stories:false});
 signal?.throwIfAborted();const workspace=await GraphWorkspace.open(directory),staticRoot=await fs.realpath(staticDirectory);
 await fs.access(path.join(staticRoot,'index.html'));
 const token=randomBytes(32).toString('hex'),secret=Buffer.from(token),controllers=new Set();let origin='',active=0,closed=false;
 const server=http.createServer({maxHeaderSize:32768},async(request,response)=>{
  const controller=new AbortController();controllers.add(controller);
  const timeout=setTimeout(()=>controller.abort(failure('Operation timed out',408,'TIMEOUT')),30000);
  const disconnect=()=>{if(!response.writableEnded)controller.abort(new Error('Client disconnected'));};request.once('aborted',disconnect);response.once('close',disconnect);
  studioHeaders(response);
  let counted=false;
  try{
   if(request.headers.host!==new URL(origin).host)throw failure('Unrecognized local host',403,'FORBIDDEN');
   if(request.headers.origin&&request.headers.origin!==origin||request.headers['sec-fetch-site']==='cross-site')throw failure('Cross-origin requests are not allowed',403,'FORBIDDEN');
   const url=new URL(request.url,origin);if(url.origin!==origin)throw failure('Invalid request target',403);
   if(url.pathname.startsWith('/api/')){
    const provided=Buffer.from(String(request.headers.authorization??'').replace(/^Bearer /,''));
    if(provided.length!==secret.length||!timingSafeEqual(provided,secret))throw failure('Open the Studio URL printed by your local companion to reconnect.',401,'UNAUTHORIZED');
    if(active>=4)throw failure('Four operations are already running. Retry shortly.',429,'SERVER_BUSY');active++;counted=true;
    const parts=url.pathname.split('/').filter(Boolean);if(parts.some(part=>part.includes('%')))throw failure('Encoded API paths are not supported');
    if(parts.length===2&&parts[1]==='projects'){
     if(request.method==='GET')return send(response,200,{ok:true,data:await workspace.list()});
     if(request.method==='POST')return send(response,201,{ok:true,data:await workspace.create(await json(request,controller.signal))});
    }
    if(parts[1]==='projects'&&parts.length>=3){
     const id=stableId(parts[2]);
     if(parts.length===3&&request.method==='GET')return send(response,200,{ok:true,data:await workspace.read(id)});
     if(parts.length===4&&parts[3]==='revision'&&request.method==='GET')return send(response,200,{ok:true,data:await workspace.revisionStamp(id)});
     if(parts.length===4&&parts[3]==='edit'&&request.method==='POST')return send(response,200,{ok:true,data:await workspace.transact(id,await json(request,controller.signal),{signal:controller.signal})});
     if(parts.length===4&&parts[3]==='history'&&request.method==='POST'){
      const args=await json(request,controller.signal);exact(args,['action','expectedFingerprint','recoveryFingerprint','offset','limit']);let data;
      if(args.action==='inspect')data=await workspace.history(id,{offset:args.offset,limit:args.limit,signal:controller.signal});
      else if(args.action==='checkpoint')data=await workspace.checkpoint(id,args.expectedFingerprint,{signal:controller.signal});
      else if(args.action==='restore')data=await workspace.restore(id,args.recoveryFingerprint,args.expectedFingerprint,{signal:controller.signal});
      else data=await workspace.undoRedo(id,args.action,args.expectedFingerprint,{signal:controller.signal});
      return send(response,200,{ok:true,data});
     }
     if(parts.length===5&&parts[3]==='assets'){
      const assetId=stableId(parts[4]);
      if(request.method==='PUT'){
       if(request.headers['content-type']!=='application/octet-stream')throw failure('Use application/octet-stream',415);
       const header=request.headers['x-looplilt-asset'];if(typeof header!=='string'||header.length>16384)throw failure('A bounded asset manifest is required');
       const asset=JSON.parse(decodeURIComponent(header));assertJson(asset);if(asset.id!==assetId)throw failure('Asset ID does not match its path');
       if(!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>256*1024*1024)throw failure('Media exceeds the 256 MiB limit',413);
       if(request.headers['content-length']&&Number(request.headers['content-length'])!==asset.bytes)throw failure('Upload size does not match its manifest');
       await putWorkspaceAsset(workspace,id,asset,request,{signal:controller.signal});return send(response,200,{ok:true,data:{stored:true}});
      }
      if(request.method==='GET'){
       const {asset,bytes}=await readWorkspaceAsset(workspace,id,assetId,{signal:controller.signal});
       response.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bytes.length,'X-Looplilt-SHA256':asset.sha256});response.end(bytes);return;
      }
     }
    }
    throw failure('Unknown Studio API route',404,'NOT_FOUND');
   }
   await serveStudioFile(request,response,url,staticRoot);
  }catch(error){
   if(!response.headersSent&&!response.destroyed){const status=error.status??(error.code==='REVISION_CONFLICT'?409:error.code==='PROJECT_BUSY'?423:error.code==='ENOENT'?404:400);const message=error.code==='ENOENT'?'The requested project, media, or Studio file was not found.':error.message;send(response,status,{ok:false,error:{code:error.code??'INVALID_OPERATION',message:String(message).slice(0,2000),...(error.expected?{expected:error.expected,actual:error.actual}:{})}});}else if(!response.writableEnded)response.destroy();
  }finally{clearTimeout(timeout);controllers.delete(controller);request.removeListener('aborted',disconnect);response.removeListener('close',disconnect);if(counted)active--;}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;server.keepAliveTimeout=1000;server.maxRequestsPerSocket=100;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
 origin='http://127.0.0.1:'+server.address().port;
 const close=async()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',stop);for(const controller of controllers)controller.abort(new Error('Studio companion stopped'));await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});};
 const stop=()=>void close();signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)await close();
 return {origin,url:origin+'/studio/#workspace='+token,workspace,close};
}

import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateGraph,stableId} from './schema.mjs';
import {graphFingerprint} from './transactions.mjs';
import {readGraphAsset} from './assets.mjs';
import {studioHeaders,serveStudioFile} from '../studio/http.mjs';
import {verifyStudioRuntime} from '../studio/distribution.mjs';

function send(response,status,value){const bytes=Buffer.from(JSON.stringify(value));response.writeHead(status,{'Content-Type':'application/json','Content-Length':bytes.length});response.end(bytes);}
/** Read-only, authenticated snapshot host. It exposes no editing, import, shell,
 * directory browsing, or arbitrary file endpoints to the render browser. */
export async function startGraphRenderHost(workspace,state,{staticDirectory=fileURLToPath(new URL('../../studio/apps/web/out/',import.meta.url)),signal}={}){
 signal?.throwIfAborted();const snapshot=structuredClone(state);validateGraph(snapshot.document);
 if(await graphFingerprint(snapshot.document)!==snapshot.fingerprint)throw new Error('Render snapshot failed its integrity check');
 // The packaged renderer must match the current graph/editor sources. An
 // explicit alternate directory is a trusted integration/test host, never a
 // project or MCP option; it is still confined by the read-only HTTP host.
 const productRoot=fileURLToPath(new URL('../../',import.meta.url)),builtRoot=path.join(productRoot,'studio/apps/web/out');
 if(path.resolve(staticDirectory)===path.resolve(builtRoot))await verifyStudioRuntime(productRoot,{stories:false});
 signal?.throwIfAborted();
 const staticRoot=await fs.realpath(staticDirectory);await fs.access(path.join(staticRoot,'render/index.html'));
 const token=randomBytes(32).toString('hex'),secret=Buffer.from(token),controllers=new Set();let origin,closed=false,active=0;
 const server=http.createServer({maxHeaderSize:32768},async(request,response)=>{
  const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(new Error('Render host request timed out')),35000);let counted=false;
  const disconnected=()=>{if(!response.writableEnded)controller.abort(new Error('Render browser disconnected'));};request.once('aborted',disconnected);response.once('close',disconnected);studioHeaders(response);
  try{
   if(closed||request.headers.host!==new URL(origin).host||request.headers.origin&&request.headers.origin!==origin||request.headers['sec-fetch-site']==='cross-site')throw Object.assign(new Error('Unapproved render origin'),{status:403});
   const url=new URL(request.url,origin);if(url.origin!==origin)throw Object.assign(new Error('Invalid render host'),{status:403});
   if(url.pathname.startsWith('/api/')){
    const provided=Buffer.from(String(request.headers.authorization??'').replace(/^Bearer /,''));
    if(provided.length!==secret.length||!timingSafeEqual(provided,secret))throw Object.assign(new Error('Invalid render token'),{status:401});
    if(request.method!=='GET')throw Object.assign(new Error('Render snapshots are read-only'),{status:405});
    if(active>=2)throw Object.assign(new Error('Render media requests are busy'),{status:429});active++;counted=true;
    if(url.pathname==='/api/render/project')return send(response,200,{document:snapshot.document,fingerprint:snapshot.fingerprint});
    const match=/^\/api\/render\/assets\/([a-zA-Z0-9_-]{1,80})$/.exec(url.pathname);
    if(match){const id=stableId(match[1]),asset=snapshot.document.assets[id];if(!asset)throw Object.assign(new Error('Unknown snapshot asset'),{status:404});
     const {bytes}=await readGraphAsset(workspace,snapshot.document.id,asset,{signal:controller.signal});response.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bytes.length,'X-Looplilt-SHA256':asset.sha256});response.end(bytes);return;
    }
    throw Object.assign(new Error('Unknown render route'),{status:404});
   }
   await serveStudioFile(request,response,url,staticRoot,{entry:'/studio/render/'});
  }catch(error){if(!response.headersSent&&!response.destroyed)send(response,error.status??(error.code==='ENOENT'?404:400),{error:String(error.code==='ENOENT'?'Snapshot media or Studio runtime is missing':error.message).slice(0,1000)});else if(!response.writableEnded)response.destroy();}
  finally{clearTimeout(timer);controllers.delete(controller);request.removeListener('aborted',disconnected);response.removeListener('close',disconnected);if(counted)active--;}
 });
 server.requestTimeout=35000;server.headersTimeout=10000;server.keepAliveTimeout=1000;server.maxRequestsPerSocket=100;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});origin='http://127.0.0.1:'+server.address().port;
 const close=async()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',stop);for(const controller of controllers)controller.abort(new Error('Render host closed'));await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});};
 const stop=()=>void close();signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)await close();
 return {origin,url:origin+'/studio/render/#render='+token,close};
}

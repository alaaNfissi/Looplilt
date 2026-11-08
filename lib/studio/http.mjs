import fs from 'node:fs/promises';
import path from 'node:path';
import {scopedPath} from '../graph/workspace.mjs';
const mime={'.looplilt':'application/x-looplilt-project','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
export function studioHeaders(response){
 response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');
 response.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' blob: data:; connect-src 'self'; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
}
export async function serveStudioFile(request,response,url,staticRoot,{entry='/studio/'}={}){
 if(!['GET','HEAD'].includes(request.method))throw Object.assign(new Error('Method is not allowed'),{status:405});
 if(url.pathname==='/'){response.writeHead(302,{Location:entry});response.end();return;}
 if(!url.pathname.startsWith('/studio/'))throw Object.assign(new Error('Not found'),{status:404});
 let relative=decodeURIComponent(url.pathname.slice('/studio/'.length));if(!relative||relative.endsWith('/'))relative+='index.html';
 const file=await scopedPath(staticRoot,relative),type=mime[path.extname(file)];if(!type)throw Object.assign(new Error('Unsupported static asset'),{status:404});
 const info=await fs.stat(file);if(!info.isFile()||info.size>32*1024*1024)throw Object.assign(new Error('Invalid static asset'),{status:404});
 response.writeHead(200,{'Content-Type':type,'Content-Length':info.size});if(request.method==='HEAD')response.end();else response.end(await fs.readFile(file));
}

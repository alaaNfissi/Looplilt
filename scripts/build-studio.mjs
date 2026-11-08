import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {buildStudioStories} from './build-studio-stories.mjs';
import {generateLegacyRuntime} from './build-legacy-runtime.mjs';
import {createStudioManifest,verifyStudioRuntime} from '../lib/studio/distribution.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),web=path.join(root,'studio/apps/web');
await generateLegacyRuntime({check:true});
const binary=path.join(web,'node_modules/next/dist/bin/next');
try{await fs.access(binary);}catch{throw new Error('Install the pinned editor dependencies first: npm run studio:setup');}
for(const name of ['.next','out']){
 const folder=path.join(web,name),info=await fs.lstat(folder).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(info&&(info.isSymbolicLink()||await fs.realpath(folder)!==folder))throw new Error('Refusing to build over an unexpected Studio output directory');
}
const child=spawn(process.execPath,[binary,'build','--webpack'],{cwd:web,windowsHide:true,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH}});
const stop=signal=>child.kill(signal);
const interrupt=()=>stop('SIGINT'),terminate=()=>stop('SIGTERM');
process.on('SIGINT',interrupt);process.on('SIGTERM',terminate);
try{await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>code===0?resolve():reject(new Error('Studio build failed: '+(signal??code))));});}
finally{process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',terminate);}
await buildStudioStories(root);
const manifest=await createStudioManifest(root);await verifyStudioRuntime(root);
console.log(JSON.stringify({built:'Looplilt Studio',version:manifest.packageVersion,files:manifest.files.length,output:path.join(web,'out'),sources:manifest.sources}));

import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const GENERATED=new Set(['node_modules','.next','.turbo','out','dist','coverage']);
async function tree(root,relative,{source=false}={}){
 const entries=[];let total=0;
 async function visit(name){
  const absolute=path.join(root,name),info=await fs.lstat(absolute);
  if(info.isSymbolicLink())throw new Error('Distribution cannot contain a symlink: '+name);
  if(info.isDirectory()){
   for(const child of (await fs.readdir(absolute)).sort()){
    if(source&&(GENERATED.has(child)||child.endsWith('.tsbuildinfo')||child==='next-env.d.ts'))continue;
    if(child.startsWith('.')&&child!=='.prettierrc.json'||/\.(?:log|pem|key|p12)$/i.test(child))throw new Error('Unexpected distribution content: '+name+'/'+child);
    await visit(name+'/'+child);
   }
  }else{
   if(!info.isFile()||info.size>32*1024*1024||entries.length>=5000||(total+=info.size)>128*1024*1024)throw new Error('Distribution content exceeds its regular-file budget');
   entries.push({name,data:await fs.readFile(absolute)});
  }
 }
 await visit(relative);return entries;
}
export async function studioSourceEntries(root){
 try{return await tree(root,'studio',{source:true});}catch(error){if(error.code==='ENOENT'&&!(await fs.stat(path.join(root,'studio')).catch(()=>null)))return [];throw error;}
}
const fingerprint=entries=>hash(Buffer.concat(entries.map(entry=>Buffer.from(entry.name+'\0'+hash(entry.data)+'\n'))));
export async function studioSourceFingerprints(root){
 const graph=await tree(root,'lib/graph'),shared={name:'lib/project-schema.mjs',data:await fs.readFile(path.join(root,'lib/project-schema.mjs'))},studio=await studioSourceEntries(root);
 const examples=await fs.stat(path.join(root,'examples/studio')).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 const stories=examples?await tree(root,'examples/studio'):[];
 return {graph:fingerprint([...graph,shared]),stories:fingerprint(stories),studio:studio.length?fingerprint(studio):null};
}
export async function createStudioManifest(root){
 const prefix='studio/apps/web/out/',entries=(await tree(root,prefix.slice(0,-1))).filter(entry=>entry.name!==prefix+'runtime.json');
 const sources=await studioSourceFingerprints(root),{version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 const manifest={version:1,product:'looplilt-studio',packageVersion:version,graphVersion:2,sources,files:entries.map(entry=>({path:entry.name.slice(prefix.length),bytes:entry.data.length,sha256:hash(entry.data)}))};
 for(const required of ['index.html','render/index.html'])if(!manifest.files.some(file=>file.path===required))throw new Error('Studio build is missing '+required);
 await fs.writeFile(path.join(root,prefix,'runtime.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
export async function verifyStudioRuntime(root,{required=true,source=true,assets=true,stories=true}={}){
 const prefix='studio/apps/web/out/',file=path.join(root,prefix,'runtime.json');
 let manifest;
 try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)throw new Error('Invalid Studio runtime manifest');manifest=JSON.parse(await fs.readFile(file,'utf8'));}
 catch(error){if(error.code==='ENOENT'&&!required)return null;if(error.code==='ENOENT')throw new Error('Looplilt Studio is not built. Run npm run studio:setup, then npm run studio:build, or use a release bundle containing Studio.');throw error;}
 const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 if(manifest.version!==1||manifest.product!=='looplilt-studio'||manifest.graphVersion!==2||manifest.packageVersion!==version||!Array.isArray(manifest.files)||manifest.files.length>5000)throw new Error('Studio runtime does not match this Looplilt release; rebuild it');
 if(source){const current=await studioSourceFingerprints(root);if(manifest.sources?.graph!==current.graph||current.studio!==null&&manifest.sources?.studio!==current.studio)throw new Error('Studio runtime is stale; run npm run studio:build after changing graph or editor sources');if(stories&&manifest.sources?.stories!==current.stories)throw new Error('Studio example content is stale; run npm run studio:stories after editing original story sources');}
 if(assets){
  const actual=await tree(root,prefix.slice(0,-1)),indexed=new Map(actual.map(entry=>[entry.name.slice(prefix.length),entry]));
  if(indexed.size!==manifest.files.length+1)throw new Error('Studio runtime contains missing or unexpected files');
  const seen=new Set();
  for(const entry of manifest.files){const found=indexed.get(entry.path);if(seen.has(entry.path)||!found||found.data.length!==entry.bytes||hash(found.data)!==entry.sha256)throw new Error('Studio runtime integrity failed: '+String(entry.path).slice(0,160));seen.add(entry.path);}
 }
 for(const required of ['index.html','render/index.html'])if(!manifest.files.some(entry=>entry.path===required))throw new Error('Studio runtime is missing '+required);
 return manifest;
}
export async function studioRuntimeEntries(root,{required=false}={}){
 if(!await verifyStudioRuntime(root,{required}))return [];
 return tree(root,'studio/apps/web/out');
}

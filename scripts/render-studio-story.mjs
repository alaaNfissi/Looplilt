import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';
import {renderGraphSnapshot} from '../lib/graph/render.mjs';
import {createProjectBundle} from '../lib/graph/bundle.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),slug=process.argv[2],kind=process.argv[3]??'storyboard';
if(!/^[a-z][a-z0-9-]+$/.test(slug??'')||!['storyboard','video','frame'].includes(kind))throw new Error('Use: node scripts/render-studio-story.mjs <slug> [storyboard|video|frame]');
const source=path.join(root,'examples/studio',slug),document=JSON.parse(await fs.readFile(path.join(source,'project.looplilt.json'),'utf8'));
const out=path.join(root,'.validation','story-'+slug+'-'+Date.now()),folder=path.join(out,'workspace');await fs.mkdir(folder,{recursive:true});const workspace=new GraphWorkspace(folder),state=await workspace.create(document);
for(const asset of Object.values(document.assets)){const target=path.join(folder,'projects',document.id,asset.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(source,asset.path),target);}
const bundle=await createProjectBundle(document,{getAsset:async asset=>new Blob([await fs.readFile(path.join(source,asset.path))],{type:asset.mime})});await fs.writeFile(path.join(out,slug+'.looplilt'),new Uint8Array(await bundle.arrayBuffer()));
const request=kind==='storyboard'?{kind,width:384,frames:Array.from({length:24},(_,i)=>Math.min(document.durationFrames-1,Math.floor((i+.25)*document.durationFrames/24)))}:kind==='frame'?{kind,frame:Number(process.argv[4]??90)}:{kind,format:'mp4'};
let previous='';const artifact=path.join(out,slug+(kind==='video'?'.mp4':kind==='frame'?'-frame.png':'-storyboard.png'));
const result=await renderGraphSnapshot(workspace,state,request,artifact,{timeout:1800000,onProgress:p=>{const key=p.phase+' '+Math.floor(p.ratio*10);if(key!==previous){previous=key;console.log(p.phase,Math.round(p.ratio*100)+'%',p.completedFrames+'/'+p.totalFrames);}}});
const report={slug,kind,artifact,fingerprint:state.fingerprint,nodeCount:Object.keys(document.nodes).length,result};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(root,'.validation/latest-story-'+slug+'.json'),JSON.stringify({out,...report},null,2));console.log(JSON.stringify({out,artifact,bytes:result.bytes,frames:result.frames,elapsedMs:result.metrics.elapsedMs}));

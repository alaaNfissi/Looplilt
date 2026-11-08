import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {graphFingerprint} from '../lib/graph/transactions.mjs';
import {GraphWorkspace} from '../lib/graph/workspace.mjs';import {renderGraphSnapshot} from '../lib/graph/render.mjs';
import {run} from '../lib/process.mjs';import {ffmpeg} from '../lib/media-tools.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),source=path.join(root,'examples/studio/the-shape-of-returning'),out=path.join(root,'.validation','garden-memory-'+Date.now()),target=path.join(root,'examples/studio/a-signal-for-the-garden/inputs');
const original=JSON.parse(await fs.readFile(path.join(source,'project.looplilt.json'),'utf8')),document=structuredClone(original);
document.id='garden-rain-memory';document.title='Rain remembered · original Looplilt footage';document.nodes={root:document.nodes.root,landscape:document.nodes.landscape};document.nodes.root.children=['landscape'];
document.assets=Object.fromEntries([document.nodes.landscape.props.projectAsset,document.nodes.landscape.props.scriptAsset].map(id=>[id,document.assets[id]]));
document.extensions={looplilt:{source:'the-shape-of-returning',purpose:'Original moving-image insert for A Signal for the Garden',range:[870,1050]}};
await fs.mkdir(path.join(out,'workspace'),{recursive:true});const workspace=await GraphWorkspace.open(path.join(out,'workspace')),state=await workspace.create(document);
for(const asset of Object.values(document.assets)){const file=path.join(out,'workspace/projects',document.id,asset.path);await fs.mkdir(path.dirname(file),{recursive:true});await fs.copyFile(path.join(source,asset.path),file);}
const video=path.join(out,'rain-memory.mp4'),render=await renderGraphSnapshot(workspace,state,{kind:'video',startFrame:870,endFrame:1050,width:640},video,{onProgress:p=>{if(p.completedFrames%30===0)console.log(p.phase,p.completedFrames+'/'+p.totalFrames);}});
await run(ffmpeg(),['-v','error','-n','-i',video,'-vf','select=eq(n\\,60)','-frames:v','1',path.join(out,'rain-memory.png')]);
await fs.mkdir(target,{recursive:true});const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const name of ['rain-memory.mp4','rain-memory.png']){const bytes=await fs.readFile(path.join(out,name));const old=await fs.readFile(path.join(target,name)).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(old&&sha(old)!==sha(bytes))throw new Error('Existing original input differs; preserve it and select a new input filename');if(!old)await fs.writeFile(path.join(target,name),bytes,{flag:'wx'});}
await fs.writeFile(path.join(target,'SOURCE.json'),JSON.stringify({sourceFilm:original.id,sourceFingerprint:await graphFingerprint(original),renderFingerprint:state.fingerprint,range:[870,1050],seconds:6,width:640,height:360,frames:180,render},null,2));
await fs.writeFile(path.join(out,'report.json'),JSON.stringify({out,render},null,2));console.log(JSON.stringify({out,target,bytes:render.bytes,frames:render.frames}));

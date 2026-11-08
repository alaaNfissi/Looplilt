import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createStudioManifest,verifyStudioRuntime} from '../lib/studio/distribution.mjs';
import {createProjectBundle} from '../lib/graph/bundle.mjs';
import {validateGraph} from '../lib/graph/schema.mjs';
/** Original, integrity-checked project bundles served by both hosted Studio and
 * its local companion. These are editable copies, never live user workspaces. */
export async function buildStudioStories(root){
 const catalog=JSON.parse(await fs.readFile(path.join(root,'studio/stories.json'),'utf8'));
 if(!Array.isArray(catalog)||catalog.length>24)throw new Error('Invalid Studio story catalog');
 const output=path.join(root,'studio/apps/web/out/stories');await fs.mkdir(output,{recursive:true});
 if((await fs.lstat(output)).isSymbolicLink())throw new Error('Studio stories output must not be a symlink');
 const seen=new Set();
 for(const story of catalog){
  if(!/^[a-z][a-z0-9-]{0,60}$/.test(story.slug)||seen.has(story.slug))throw new Error('Invalid or duplicate Studio story');seen.add(story.slug);
  const folder=path.join(root,'examples/studio',story.slug),bytes=await fs.readFile(path.join(folder,'project.looplilt.json'));if(bytes.length>8*1024*1024)throw new Error('Story graph is too large');
  const document=JSON.parse(bytes);validateGraph(document);
  const bundle=await createProjectBundle(document,{getAsset:async asset=>new Blob([await fs.readFile(path.join(folder,asset.path))],{type:asset.mime})});
  if(bundle.size>32*1024*1024)throw new Error('Hosted Studio examples must be at most32MiB');
  await fs.writeFile(path.join(output,story.slug+'.looplilt'),new Uint8Array(await bundle.arrayBuffer()));
  await fs.copyFile(path.join(folder,'poster.png'),path.join(output,story.slug+'.png'));
 }
 return catalog.length;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=fileURLToPath(new URL('../',import.meta.url));
 // Never stamp changed renderer code as built when refreshing only content.
 await verifyStudioRuntime(root,{stories:false});await buildStudioStories(root);
 const manifest=await createStudioManifest(root);await verifyStudioRuntime(root);
 console.log(JSON.stringify({storiesUpdated:true,files:manifest.files.length,sources:manifest.sources}));
}

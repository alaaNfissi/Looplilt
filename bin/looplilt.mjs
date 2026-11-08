#!/usr/bin/env node
import fs from 'node:fs/promises';
import { EXAMPLE_NAMES } from '../lib/catalog.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProject, writeNew } from '../lib/project.mjs';
import { buildProject } from '../lib/build.mjs';
import { captionsVtt, makeSound } from '../lib/sound.mjs';
import { inspectProject, reviseProject, exportFrame } from '../lib/inspect.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const HELP = `Looplilt — small stories, real motion

  node bin/looplilt.mjs init <new-folder> [--example ${EXAMPLE_NAMES.join('|')}]
  node bin/looplilt.mjs inspect <project>
  node bin/looplilt.mjs build <project> --out <film.html> [--format portrait] [--audio pcm]
  node bin/looplilt.mjs preview <project> [--format portrait] [--port 0]
  node bin/looplilt.mjs frame <project> --at 2.5 --out <frame.png> [--scene shot-id]
  node bin/looplilt.mjs storyboard <project> --out <sheet.png> [--scene shot-id]
  node bin/looplilt.mjs revise <project> --patch <revision.json> --out <new-folder>
  node bin/looplilt.mjs render <project> --out <film.mp4> [--scene shot-id | --from 2 --to 6]
      [--format landscape|portrait|square] [--workers 2] [--narration voice.wav]
  node bin/looplilt.mjs captions <project> --out <captions.vtt>
  node bin/looplilt.mjs sound <project> --out <score.wav>
  node bin/looplilt.mjs check <film.mp4>
  node bin/looplilt.mjs studio <workspace> [--port 0]
  node bin/looplilt.mjs graph help
  node bin/looplilt.mjs doctor
  node bin/looplilt.mjs capabilities

Add --json for structured command results and errors. Inspect always returns JSON.
Frame --at is seconds inside the selected scene, or absolute seconds without --scene.
Outputs and existing projects are never overwritten. Preview is local and read-only.
Drawing scripts run in a browser: use projects you trust. Ctrl+C cancels owned work.
HTML needs Node.js 22+ only. Frame/video export adds Chromium; MP4 adds FFmpeg/FFprobe.
`;
const flags = {
  init: ['example'], inspect: [], build: ['out','format','audio'], preview: ['format','port'],
  frame: ['out','format','at','scene'], storyboard: ['out','format','scene'],
  revise: ['patch','out'], render: ['out','format','workers','narration','scene','from','to','timeout'],
  captions: ['out'], sound: ['out'], check: [], doctor: [], capabilities: [], studio: ['port']
};
export function argumentsFor(args) {
  const values = [], options = {}, allowed = new Set([...Object.values(flags).flat(), 'json']);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) { values.push(args[i]); continue; }
    const name = args[i].slice(2);
    if (!allowed.has(name) || Object.hasOwn(options, name)) throw new Error('Unknown or repeated option --' + name);
    if (name === 'json') { options[name] = true; continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--' + name + ' requires a value');
    options[name] = args[++i];
  }
  return { values, options };
}
export async function main(args, { signal } = {}) {
  const command = args[0];
  if (!command || ['help', '--help', '-h'].includes(command)) { console.log(HELP); return; }
  const version = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version;
  if (command === '--version') { console.log(version); return; }
  if(command==='graph'){const {graphCli}=await import('../lib/graph/cli.mjs');return graphCli(args.slice(1),{signal});}
  if (!Object.hasOwn(flags, command)) throw new Error('Unknown command: ' + command + '\n' + HELP);
  const { values, options } = argumentsFor(args.slice(1)), project = values[0];
  for (const key of Object.keys(options)) if (key !== 'json' && !flags[command].includes(key)) throw new Error('--' + key + ' is not supported by ' + command);
  if (['doctor','capabilities'].includes(command) ? values.length : (!project || values.length !== 1)) throw new Error('Provide exactly one project folder or input file; doctor and capabilities take none');
  if (['build','frame','render','storyboard','captions','sound','revise'].includes(command) && !options.out) throw new Error('--out is required');
  const emit = result => console.log(options.json || typeof result !== 'string' ? JSON.stringify(result, null, 2) : result);
  const numeric = key => options[key] === undefined ? undefined : Number(options[key]);
  if (command === 'capabilities') {
    emit({ version, projectVersions: [1,2], commands: {...flags,graph:['create','list','inspect','nodes','edit','import','legacy-import','frame','storyboard','render','check','jobs','job','cancel','artifact']}, formats: ['landscape','portrait','square'],
      integration: 'Local CLI, portable Agent Skill, stdio MCP and Looplilt Studio share the canonical editable graph; no account or cloud render service required',
      revision: { version:1, expectedSourceHash:'from inspect', changes:[{scene:'shot-id',params:{existingParameter:'new value'}}] } }); return;
  }
  if (command === 'studio') {
    const {startStudio}=await import('../lib/studio/server.mjs');
    const studio=await startStudio(project,{port:numeric('port')??0,signal});
    emit(options.json?{url:studio.url,workspace:studio.workspace.root,scope:'selected local workspace'}:'Open '+studio.url+'\nStudio and MCP share this workspace. Keep the link private. Stop with Ctrl+C.');
    if(signal){await new Promise(resolve=>{if(signal.aborted)resolve();else signal.addEventListener('abort',resolve,{once:true});});await studio.close();}
    return;
  }
  if (command === 'init') {
    const example = options.example || 'paper-garden';
    if (!EXAMPLE_NAMES.includes(example)) throw new Error('Unknown example');
    await fs.mkdir(project, { recursive: false });
    const source = path.join(root, 'examples', example);
    for (const name of await fs.readdir(source)) await fs.cp(path.join(source,name),path.join(project,name),{recursive:true,force:false,errorOnExist:true});
    emit(options.json ? {directory:path.resolve(project),example} : path.resolve(project));
  } else if (command === 'inspect') emit(await inspectProject(project));
  else if (command === 'build') {
    const file = await buildProject(project, options.out, options.format, { audio: options.audio ?? 'synth' });
    emit(options.json ? {file} : file);
  } else if (command === 'frame') emit(await exportFrame(project,options.out,{at:numeric('at')??0,scene:options.scene,format:options.format,signal}));
  else if (command === 'revise') {
    if (!options.patch) throw new Error('--patch is required');
    const stat = await fs.lstat(options.patch);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('Patch must be a regular JSON file under 2 MiB');
    emit(await reviseProject(project, JSON.parse(await fs.readFile(options.patch,'utf8')), options.out));
  } else if (command === 'preview') {
    const { startPreview } = await import('../lib/preview.mjs');
    const preview = await startPreview(project,{format:options.format,port:numeric('port')??0,signal});
    emit(options.json ? {url:preview.url,readOnly:true} : 'Open ' + preview.url + '\nWatching your project. Stop with Ctrl+C.');
    if (signal) {
      await new Promise(resolve => { if(signal.aborted)resolve();else signal.addEventListener('abort',resolve,{once:true}); });
      await preview.close();
    }
  } else if (command === 'captions' || command === 'sound') {
    const { data } = await readProject(project), file = await writeNew(options.out,command==='captions'?captionsVtt(data):makeSound(data));
    emit(options.json ? {file} : file);
  } else {
    const media = await import('../lib/render.mjs');
    if (command === 'render') emit(await media.renderProject(project,options.out,{
      format:options.format,workers:numeric('workers')??2,narration:options.narration,scene:options.scene,
      from:numeric('from'),to:numeric('to'),timeout:numeric('timeout')??1800000,signal,
      onProgress:progress=>console.error(options.json?JSON.stringify({type:'progress',...progress}):progress.finished+'/'+progress.frames+' frames')
    }));
    if (command === 'storyboard') {
      const file = await media.storyboard(project,options.out,options.format,{scene:options.scene,signal});
      emit(options.json ? {file} : file);
    }
    if (command === 'check') emit(await media.checkVideo(project,{}, {signal}));
    if (command === 'doctor') {
      const {run}=await import('../lib/process.mjs'), {withBrowser}=await import('../lib/browser.mjs');
      const binaries=[];
      for(const binary of [media.ffmpeg(),media.ffprobe()])binaries.push((await run(binary,['-version'],{signal})).stdout.split('\n')[0]);
      const browser=await withBrowser(async browser=>browser.version(),{signal});
      emit({node:process.version,binaries,chromium:browser,sandbox:true});
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cancellation = new AbortController();
  const cancel = () => cancellation.abort(new Error('Operation cancelled'));
  process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
  main(process.argv.slice(2),{signal:cancellation.signal}).catch(error=>{
    if(process.argv.includes('--json'))console.error(JSON.stringify({ok:false,error:{code:error.code??'LOOPLILT_ERROR',message:error.message}}));
    else console.error('Looplilt: '+error.message);
    process.exitCode=1;
  }).finally(()=>{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);});
}

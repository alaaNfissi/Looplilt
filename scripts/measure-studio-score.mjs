import fs from 'node:fs/promises';import path from 'node:path';import {makeSound} from '../lib/sound.mjs';import {run} from '../lib/process.mjs';import {ffmpeg} from '../lib/media-tools.mjs';
const slug=process.argv[2];if(!/^[a-z][a-z0-9-]+$/.test(slug??''))throw new Error('Specify an original Studio film');
const source=path.resolve('examples/studio',slug),graph=JSON.parse(await fs.readFile(path.join(source,'project.looplilt.json'),'utf8')),node=Object.values(graph.nodes).find(n=>n.type==='score');
if(!node||node.animations['props.gain'])throw new Error('This isolated score check expects a constant score gain; validate an automated mix with the completed film');
const asset=graph.assets[node.props.asset],project=JSON.parse(await fs.readFile(path.join(source,asset.path),'utf8'));
const out=path.resolve('.validation','score-'+slug+'-'+Date.now());await fs.mkdir(out);const wav=path.join(out,'original.wav');await fs.writeFile(wav,makeSound(project));
const measured=await run(ffmpeg(),['-hide_banner','-i',wav,'-af','volume='+node.props.gain+',loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-f','null','-'],{timeout:90000});
const levels=JSON.parse(measured.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);await fs.writeFile(path.join(out,'levels.json'),JSON.stringify({gain:node.props.gain,levels},null,2));console.log(JSON.stringify({out,gain:node.props.gain,levels}));

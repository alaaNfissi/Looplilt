import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {run} from '../lib/process.mjs';
import {ffmpeg,ffprobe} from '../lib/media-tools.mjs';
import {makeSound} from '../lib/sound.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),slug=process.argv[2];
if(!/^[a-z][a-z0-9-]+$/.test(slug??''))throw new Error('Specify an original Studio story slug');
const pointer=JSON.parse(await fs.readFile(path.join(root,'.validation/latest-story-'+slug+'.json'),'utf8'));
assert.equal(pointer.kind,'video');const out=pointer.out,file=pointer.artifact,source=path.join(root,'examples/studio',slug),document=JSON.parse(await fs.readFile(path.join(source,'project.looplilt.json'),'utf8'));
const probe=JSON.parse((await run(ffprobe(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{timeout:90000})).stdout),video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
assert.equal(Number(video.nb_read_frames),document.durationFrames);assert.equal(video.width,1280);assert.equal(video.height,720);assert.equal(audio.channels,2);assert.equal(Number(audio.sample_rate),48000);
await run(ffmpeg(),['-v','error','-i',file,'-f','null','-'],{timeout:120000});
await run(ffmpeg(),['-v','error','-n','-i',file,'-vf','fps='+24/(document.durationFrames*document.frameRate.denominator/document.frameRate.numerator)+',scale=426:240,tile=3x8','-frames:v','1',path.join(out,'full-timeline.png')],{timeout:90000});
await run(ffmpeg(),['-v','error','-n','-ss',String((document.extensions?.looplilt?.reviewFrame??Math.floor(document.durationFrames*.62))*document.frameRate.denominator/document.frameRate.numerator),'-i',file,'-frames:v','1',path.join(out,'close-up.png')]);
await run(ffmpeg(),['-v','error','-n','-ss',String((document.extensions?.looplilt?.posterFrame??105)*document.frameRate.denominator/document.frameRate.numerator),'-i',file,'-frames:v','1',path.join(out,'poster.png')]);
const loudness=await run(ffmpeg(),['-hide_banner','-i',file,'-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-f','null','-'],{timeout:90000});
const match=loudness.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);if(!match)throw new Error('Could not measure soundtrack loudness');const levels=JSON.parse(match[0]);
const score=Object.values(document.nodes).find(n=>n.type==='score'),asset=score&&document.assets[score.props.asset];let alignment=null;
if(asset){
 // This isolated reference supports the original films' full-length, unpanned score.
 // Reject other mixing arrangements instead of silently measuring the wrong reference.
 assert.equal(score.parentId,document.rootId);assert.equal(score.time.start,0);assert.equal(score.time.duration,document.durationFrames);assert.equal(score.time.offset.numerator,0);assert.equal(score.time.speed.numerator,score.time.speed.denominator);assert.equal(score.props.pan??0,0);
 const keys=score.animations['props.gain'];let referenceFilter='volume='+score.props.gain;
 if(keys){assert.equal(keys.length,3);assert.equal(keys[0].frame,0);assert.equal(keys[0].value,score.props.gain);assert.equal(keys[1].value,score.props.gain);assert.equal(keys[2].value,0);assert.equal(keys[2].frame,document.durationFrames);assert.ok(keys[2].frame>keys[1].frame);assert.ok(keys.every(key=>!key.easing||key.easing==='linear'));const rate=document.frameRate.numerator/document.frameRate.denominator;referenceFilter+=',afade=t=out:st='+keys[1].frame/rate+':d='+(keys[2].frame-keys[1].frame)/rate;}
 const scoreProject=JSON.parse(await fs.readFile(path.join(source,asset.path),'utf8'));await fs.writeFile(path.join(out,'reference-score.wav'),makeSound(scoreProject));
 for(const [input,name,gain]of [[file,'decoded-audio',null],[path.join(out,'reference-score.wav'),'reference-audio',score.props.gain]])await run(ffmpeg(),['-v','error','-n','-i',input,'-map','0:a:0',...(gain===null?[]:['-af',referenceFilter]),'-ac','2','-ar','48000','-f','f32le',path.join(out,name+'.f32')],{timeout:60000});
 const a=await fs.readFile(path.join(out,'decoded-audio.f32')),b=await fs.readFile(path.join(out,'reference-audio.f32')),decoded=new Float32Array(a.buffer,a.byteOffset,a.byteLength/4),reference=new Float32Array(b.buffer,b.byteOffset,b.byteLength/4),length=Math.min(decoded.length,reference.length);
 let xy=0,xx=0,yy=0,peak=0;for(let i=0;i<length;i++){assert.ok(Number.isFinite(decoded[i]));xy+=decoded[i]*reference[i];xx+=decoded[i]**2;yy+=reference[i]**2;peak=Math.max(peak,Math.abs(decoded[i]));}
 let best={lag:0,correlation:-1};for(let lag=-128;lag<=128;lag++){let sum=0,x2=0,y2=0;for(let i=512;i<length-512;i+=64){const x=decoded[i+lag*2],y=reference[i];sum+=x*y;x2+=x*x;y2+=y*y;}const r=sum/Math.sqrt(x2*y2);if(r>best.correlation)best={lag,correlation:r};}
 alignment={correlation:xy/Math.sqrt(xx*yy),gain:xy/yy,lagSamples:best.lag,peak};assert.ok(alignment.correlation>.99);assert.ok(Math.abs(alignment.gain-1)<.02);assert.ok(Math.abs(best.lag)<=1);assert.ok(peak<1);
}
const report={film:slug,seconds:Number(probe.format.duration),frames:Number(video.nb_read_frames),size:[video.width,video.height],codec:video.codec_name,audio:{codec:audio.codec_name,channels:audio.channels,sampleRate:Number(audio.sample_rate),integratedLufs:Number(levels.input_i),truePeakDb:Number(levels.input_tp),loudnessRange:Number(levels.input_lra),alignment},completeDecode:true,contactSheet:'full-timeline.png',originalGraphNodes:Object.keys(document.nodes).length,subjectiveReview:'Contact sheet and representative full-size frames require visual review; technical checks do not establish artistic quality.'};
await fs.writeFile(path.join(out,'quality.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report},null,2));

import { validateProject, dimensions } from '../project-schema.mjs';
import { assertJson } from './schema.mjs';
import { scoreFor } from '../music.mjs';

export const LEGACY_SOURCE_LIMIT = 2 * 1024 * 1024;
export const LEGACY_SOURCE_KINDS = Object.freeze(['legacy-project', 'legacy-script', 'score']);
const sourceFormats = {
 'legacy-project': {extension:'project.json',mime:'application/json'},
 'legacy-script': {extension:'draw.js',mime:'text/javascript'},
 score: {extension:'score.json',mime:'application/json'},
};
/** Source is retained byte-for-byte. Validation never executes drawing code. */
export function inspectLegacySource(kind, bytes) {
 if(!Object.hasOwn(sourceFormats,kind))throw new Error('Unknown Looplilt source kind');
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(!data.byteLength||data.byteLength>LEGACY_SOURCE_LIMIT)throw new Error('Each Looplilt source file must contain 1 byte to 2 MiB');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(data);
 if(kind==='legacy-script'){
  if(!/\bfunction\s+drawFrame\s*\(/.test(text))throw new Error('draw.js must declare function drawFrame');
  return {...sourceFormats[kind],kind,text,metadata:{}};
 }
 const value=JSON.parse(text);assertJson(value);const project=validateProject(value);
 return {...sourceFormats[kind],kind,text,project,metadata:{title:project.title,durationSeconds:project.duration,fps:project.fps,hasAudio:scoreFor(project).length>0}};
}
export async function legacyAsset(kind, bytes, name) {
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),checked=inspectLegacySource(kind,data);
 const digest=await crypto.subtle.digest('SHA-256',data),sha256=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 return {id:'asset_'+sha256,kind,name:(name??(kind==='legacy-script'?'draw.js':'project.json')).slice(0,200),path:'assets/'+sha256+'.'+checked.extension,sha256,bytes:data.byteLength,mime:checked.mime,metadata:checked.metadata};
}
export function legacyDimensions(format){return dimensions(format);}

/** Signature and dimension checks shared by disk and browser imports. This is
 * a bounded preflight, not a substitute for a successful media decode. */
export function inspectMediaHeader(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const starts=(text,offset=0)=>bytes.length>=offset+text.length&&[...text].every((c,i)=>bytes[offset+i]===c.charCodeAt(0));
 const dimensions=(width,height)=>{if(!width||!height||width>16384||height>16384||width*height>67108864)throw new Error('Image dimensions exceed the supported pixel budget');return {width,height};};
 const image=(mime,extension,width,height)=>({kind:'image',mime,extension,...(width!==undefined?{metadata:dimensions(width,height)}:{})});
 if(bytes.length>=24&&starts('\x89PNG\r\n\x1a\n'))return image('image/png','png',view.getUint32(16),view.getUint32(20));
 if(bytes.length>=10&&(starts('GIF87a')||starts('GIF89a')))return image('image/gif','gif',view.getUint16(6,true),view.getUint16(8,true));
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){
  let at=2;
  while(at+4<=bytes.length){
   if(bytes[at++]!==255)throw new Error('Invalid JPEG marker');while(bytes[at]===255)at++;const marker=bytes[at++];
   if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;
   if(at+2>bytes.length)break;const length=view.getUint16(at);if(length<2)throw new Error('Invalid JPEG segment');
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&at+7<=bytes.length)return image('image/jpeg','jpg',view.getUint16(at+5),view.getUint16(at+3));
   at+=length;
  }
  throw new Error('JPEG dimensions were not found within the bounded header');
 }
 if(starts('RIFF')&&starts('WEBP',8)){
  if(starts('VP8X',12)&&bytes.length>=30){const u24=i=>bytes[i]+bytes[i+1]*256+bytes[i+2]*65536;return image('image/webp','webp',u24(24)+1,u24(27)+1);}
  if(starts('VP8L',12)&&bytes.length>=25&&bytes[20]===47){const bits=view.getUint32(21,true);return image('image/webp','webp',(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1);}
  if(starts('VP8 ',12)&&bytes.length>=30&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return image('image/webp','webp',view.getUint16(26,true)&0x3fff,view.getUint16(28,true)&0x3fff);
  throw new Error('Unsupported or invalid WebP header');
 }
 if(starts('RIFF')&&starts('WAVE',8))return {kind:'audio',mime:'audio/wav',extension:'wav'};
 if(starts('fLaC'))return {kind:'audio',mime:'audio/flac',extension:'flac'};
 if(starts('OggS'))return {kind:'audio',mime:'audio/ogg',extension:'ogg'};
 if(starts('ID3')||bytes.length>1&&bytes[0]===255&&(bytes[1]&224)===224)return {kind:'audio',mime:'audio/mpeg',extension:'mp3'};
 if(starts('ftyp',4))return {kind:'video',mime:'video/mp4',extension:'mp4'};
 if(bytes.length>=4&&view.getUint32(0)===0x1a45dfa3)return {kind:'video',mime:'video/webm',extension:'webm'};
 if(starts('wOFF'))return {kind:'font',mime:'font/woff',extension:'woff'};
 if(starts('wOF2'))return {kind:'font',mime:'font/woff2',extension:'woff2'};
 if(starts('OTTO')||bytes.length>=4&&view.getUint32(0)===0x00010000)return {kind:'font',mime:'font/ttf',extension:'ttf'};
 throw new Error('Unsupported media signature. Import PNG, JPEG, WebP, GIF, MP4, WebM, WAV, MP3, FLAC, Ogg, or a font. Code and SVG are not media imports.');
}

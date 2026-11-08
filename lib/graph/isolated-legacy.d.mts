export class LegacyCanvasSource {
 static open(project:Uint8Array|ArrayBuffer,script:Uint8Array|ArrayBuffer,options?:{format?:string;signal?:AbortSignal}):Promise<LegacyCanvasSource>;
 frame(time:number,options?:{signal?:AbortSignal}):Promise<{image:ImageBitmap;width:number;height:number;release:()=>void}>;
 dispose():Promise<void>;
}
export function synthesizeLegacyAudio(project:Uint8Array|ArrayBuffer,options?:{signal?:AbortSignal}):Promise<ArrayBuffer>;

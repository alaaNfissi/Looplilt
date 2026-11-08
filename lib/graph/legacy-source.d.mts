import type { GraphAsset } from './types.mjs';
export const LEGACY_SOURCE_LIMIT:number;
export const LEGACY_SOURCE_KINDS:readonly string[];
export function inspectLegacySource(kind:string,bytes:Uint8Array|ArrayBuffer):{extension:string;mime:string;kind:string;text:string;project?:any;metadata:GraphAsset['metadata']};
export function legacyAsset(kind:string,bytes:Uint8Array|ArrayBuffer,name?:string):Promise<GraphAsset>;
export function legacyDimensions(format:string):[number,number];

import type {GraphRepository} from './types.mjs';
export function importProjectBundle(blob:Blob,repository:GraphRepository,options?:{signal?:AbortSignal;onProgress?:(value:{stage:'checking'|'saving';completed:number;total:number})=>void}):Promise<{projectId:string;title:string;mediaCount:number;created:boolean}>;

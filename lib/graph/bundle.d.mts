import type {GraphDocument,GraphRepository} from './types.mjs';
export const BUNDLE_LIMIT:number;
export interface BundleOptions {signal?:AbortSignal;onProgress?:(completed:number,total:number)=>void}
export function isProjectBundle(blob:Blob):Promise<boolean>;
export function createProjectBundle(document:GraphDocument,repository:GraphRepository,options?:BundleOptions):Promise<Blob>;
export function readProjectBundle(blob:Blob,options?:BundleOptions):Promise<{document:GraphDocument;assets:Map<string,Blob>}>;

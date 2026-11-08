import type {GraphDocument,GraphRequest,GraphReceipt} from './types.mjs';
export function graphFingerprint(document:GraphDocument):Promise<string>;
export function serializeGraph(document:GraphDocument):string;
export function applyTransaction(document:GraphDocument,request:GraphRequest):Promise<Omit<GraphReceipt,"history"|"savedAt">>;
export class RevisionConflict extends Error {code:'REVISION_CONFLICT';expected:string;actual:string;constructor(expected:string,actual:string)}

import type {GraphDocument,GraphRequest,GraphState,GraphReceipt,GraphAsset,GraphRepository} from './types.mjs';
export class RemoteGraphWorkspace implements GraphRepository {
 constructor(origin:string,token:string);
 read(id:string):Promise<GraphState>;create(document:GraphDocument):Promise<GraphState>;
 list():Promise<{id:string;title:string;fingerprint:string;revision:number;savedAt:number}[]>;
 transact(id:string,request:GraphRequest,options?:{signal?:AbortSignal}):Promise<GraphReceipt>;
 undoRedo(id:string,direction:'undo'|'redo',fingerprint:string):Promise<GraphState>;
 putAsset(asset:GraphAsset,blob:Blob,options?:{signal?:AbortSignal;projectId?:string}):Promise<void>;
 getAsset(asset:GraphAsset,projectId?:string):Promise<Blob>;
 subscribe(listener:(event:{projectId:string;fingerprint?:string;error?:string})=>void):()=>void;
 close():void;
}
export function companionFromLocation():RemoteGraphWorkspace|null;

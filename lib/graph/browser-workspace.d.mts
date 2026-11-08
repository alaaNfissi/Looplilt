import type {GraphRepository,GraphDocument,GraphState,GraphRequest,GraphReceipt,GraphAsset} from './types.mjs';
export class BrowserGraphWorkspace implements GraphRepository {
 static open(options?:{name?:string}):Promise<BrowserGraphWorkspace>;
 create(document:GraphDocument):Promise<GraphState>;read(id:string):Promise<GraphState>;
 list():Promise<{id:string;title:string;fingerprint:string;revision:number;savedAt:number}[]>;
 transact(id:string,request:GraphRequest,options?:{signal?:AbortSignal}):Promise<GraphReceipt>;
 undoRedo(id:string,direction:'undo'|'redo',fingerprint:string,options?:{signal?:AbortSignal}):Promise<GraphState>;
 getAsset(asset:GraphAsset):Promise<Blob>;putAsset(asset:GraphAsset,blob:Blob,options?:{signal?:AbortSignal}):Promise<void>;
 subscribe(listener:(event:{projectId:string;fingerprint:string})=>void):()=>void;close():void;
}

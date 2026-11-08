export type Json = null | boolean | number | string | Json[] | { [key:string]: Json };
export type Rational = { numerator:number; denominator:number };
export type Keyframe = { frame:number; value:number; easing?:string|[number,number,number,number] };
export interface GraphNode {
 id:string; type:string; version:number; name:string; parentId:string|null; children:string[];
 time:{start:number;duration:number;offset:Rational;speed:Rational};
 transform:{x:number;y:number;rotation:number;scaleX:number;scaleY:number;anchorX:number;anchorY:number};
 opacity:number;visible:boolean;locked:boolean;blend:string;props:Record<string,string|number|boolean>;
 animations:Record<string,Keyframe[]>;effects:{id:string;type:string;version:number;enabled:boolean;props:Record<string,string|number|boolean>}[];
 behaviors?:{id:string;type:string;version:number;enabled:boolean;props:Record<string,string|number|boolean>}[];
 mask:{nodeId:string;mode:'alpha'|'inverse-alpha'}|null;constraints:Record<string,Json>[];transition:{in:{type:'fade';duration:number}|null;out:{type:'fade';duration:number}|null};extensions:Record<string,Json>;
}
export interface GraphAsset { id:string;kind:string;name:string;path:string;sha256:string;bytes:number;mime:string;metadata:Record<string,Json> }
export interface GraphDocument { format:'looplilt';version:2;id:string;title:string;revision:number;frameRate:Rational;width:number;height:number;durationFrames:number;rootId:string;nodes:Record<string,GraphNode>;assets:Record<string,GraphAsset>;extensions:Record<string,Json> }
export type GraphOperation={op:string;[key:string]:unknown};
export interface GraphState {document:GraphDocument;fingerprint:string;storageStamp?:string;history:{undo:string[];redo:string[]};savedAt:number}
export interface GraphRequest {expectedFingerprint:string;label:string;operations:GraphOperation[]}
export interface GraphReceipt extends GraphState {previousFingerprint:string;changedNodes:string[];changedAssets:string[];noop:boolean}
export interface GraphRepository { read(id:string):Promise<GraphState>;create(document:GraphDocument):Promise<GraphState>;list():Promise<{id:string;title:string;fingerprint:string;revision:number;savedAt:number}[]>;transact(id:string,request:GraphRequest,options?:{signal?:AbortSignal}):Promise<GraphReceipt>;undoRedo(id:string,direction:'undo'|'redo',fingerprint:string):Promise<GraphState>;getAsset(asset:GraphAsset,projectId?:string):Promise<Blob>;putAsset(asset:GraphAsset,blob:Blob,options?:{signal?:AbortSignal;projectId?:string}):Promise<void>;subscribe(listener:(event:{projectId:string;fingerprint?:string;error?:string})=>void):()=>void;close():void }

/** Read-only assets needed by preview and export; no editing authority required. */
export type GraphAssetReader = Pick<GraphRepository,'getAsset'>;

import type {NodeRegistry} from './registry.mjs';
import type {CanvasRenderRegistry} from './canvas-render-registry.mjs';
import type {GraphDocument} from './types.mjs';
import type {EvaluatedNode,EvaluatedScene} from './evaluate.mjs';
export interface GraphMediaProvider { prepare?(scene:EvaluatedScene,options:{signal?:AbortSignal}):Promise<void>|void;frame(node:EvaluatedNode,scene:EvaluatedScene,options:{signal?:AbortSignal}):Promise<{image:CanvasImageSource;width:number;height:number;release?:()=>void|Promise<void>}> }
export class CanvasGraphRenderer {
 constructor(canvas:HTMLCanvasElement|OffscreenCanvas,document:GraphDocument,options?:{registry?:NodeRegistry;renderers?:CanvasRenderRegistry;mediaProvider?:GraphMediaProvider;surfaceBudget?:number;canvasFactory?:(width:number,height:number)=>HTMLCanvasElement|OffscreenCanvas});
 readonly document:GraphDocument;replace(document:GraphDocument):void;render(frame:number,options?:{signal?:AbortSignal}):Promise<{frame:number;revision:number;scene:EvaluatedScene;surfaceBytes:number}>;dispose():void;
}

import type {EvaluatedNode,EvaluatedScene} from './evaluate.mjs';
export type CanvasPainter=(context:CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D,node:EvaluatedNode,scene:EvaluatedScene,options:{signal?:AbortSignal;outputScale:number})=>void;
export class CanvasRenderRegistry {
 registerNode(definition:{type:string;version:number;draw:CanvasPainter}):this;
 node(type:string,version?:number):CanvasPainter|undefined;
}
export const standardCanvasRenderers:CanvasRenderRegistry;

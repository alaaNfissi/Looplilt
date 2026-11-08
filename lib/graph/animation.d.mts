import type {GraphDocument,GraphNode,Keyframe} from './types.mjs';
export function transformPoint(matrix:number[],x:number,y:number):{x:number;y:number};
export function multiplyTransform(a:number[],b:number[]):number[];
export function transformMatrix(transform:GraphNode['transform']):number[];
export function keyframeValue(keys:Keyframe[],frame:number,fallback?:number):number;

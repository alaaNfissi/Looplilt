import type {NodeRegistry} from './registry.mjs';
import type {GraphDocument,GraphNode} from './types.mjs';
export interface EvaluatedNode extends Omit<GraphNode,'time'> {time:{elapsed:number;sourceFrame:number;seconds:number;speed:number};active:boolean;worldMatrix:number[];worldOpacity:number;worldPosition:{x:number;y:number};audioGain:number;audioEnabled:boolean}
export interface EvaluatedScene {projectId:string;revision:number;frame:number;seconds:number;width:number;height:number;rootId:string;nodes:Record<string,EvaluatedNode>;paintOrder:string[];maskSources:string[];audio:EvaluatedNode[]}
export function compileGraph(document:GraphDocument,options?:{registry?:NodeRegistry}):{project:GraphDocument;evaluate(frame:number):EvaluatedScene;evaluateNode(frame:number,id:string):EvaluatedNode};
export function evaluateGraph(document:GraphDocument,frame:number,options?:{registry?:NodeRegistry}):EvaluatedScene;
export function inverseTransform(matrix:number[]):number[];

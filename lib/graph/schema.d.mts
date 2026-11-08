import type {GraphDocument,GraphNode,Rational} from './types.mjs';
export function createGraph(options?:{id?:string;title?:string;width?:number;height?:number;durationFrames?:number;frameRate?:Rational}):GraphDocument;
export function createNode(options:{id:string;type?:string;name?:string;parentId?:string|null;duration?:number;props?:Record<string,string|number|boolean>} & Partial<GraphNode>):GraphNode;
export function validateGraph(document:unknown,options?:{allowUnsupported?:boolean}):{evaluationOrder:string[];unsupported:string[]};
export function assertJson(value:unknown):unknown;
export function propertyDefinition(node:GraphNode,property:string):{kind:string;min?:number;max?:number;integer?:boolean;animate?:boolean}|undefined;

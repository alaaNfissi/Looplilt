import type {GraphDocument,GraphOperation,GraphNode} from './types.mjs';
export function createNodeOperations(document:GraphDocument,specifications:(Partial<GraphNode>&{id?:string;type?:string;parentId?:string;duration?:number;start?:number})[]):GraphOperation[];

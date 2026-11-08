import type {GraphNode} from './types.mjs';
export interface PropertyMetadata {kind:string;default?:string|number|boolean;min?:number;max?:number;integer?:boolean;animate?:boolean;maxLength?:number;values?:string[];kinds?:string[]}
export interface TypeMetadata {type:string;version:number;label:string;container?:boolean;visual?:boolean;audio?:boolean;properties:Record<string,PropertyMetadata>}
export type MotionBehavior=NonNullable<GraphNode['behaviors']>[number];
export type BehaviorFactory=(behavior:MotionBehavior,context:{node:GraphNode;propertyMetadata:(node:GraphNode,property:string)=>PropertyMetadata|undefined})=>(state:{transform:GraphNode['transform'];props:GraphNode['props'];opacity:number},sourceFrame:number,props:MotionBehavior['props'])=>void;
export class NodeRegistry {
 constructor(options?:{builtins?:boolean});
 registerNode(definition:TypeMetadata):this;registerEffect(definition:TypeMetadata):this;registerBehavior(definition:TypeMetadata,compile?:BehaviorFactory):this;
 node(type:string,version?:number):TypeMetadata|undefined;effect(type:string,version?:number):TypeMetadata|undefined;behavior(type:string,version?:number):TypeMetadata|undefined;behaviorFactory(type:string,version?:number):BehaviorFactory|undefined;
 catalog():{nodes:TypeMetadata[];effects:TypeMetadata[];behaviors:TypeMetadata[]};
}
export const standardRegistry:NodeRegistry;
export const TRANSFORM_PROPERTIES:Record<string,PropertyMetadata>;
export const OPACITY_PROPERTY:PropertyMetadata;
export const BLEND_MODES:readonly string[];
export function defaults(properties:Record<string,PropertyMetadata>):Record<string,string|number|boolean>;
export function validateProperty(value:unknown,definition:PropertyMetadata,location:string,assets?:unknown):void;

import type {GraphDocument,Rational} from './types.mjs';
export interface RenderRequest {kind?:'frame'|'storyboard'|'video';format?:'mp4'|'webm';width?:number;height?:number;frame?:number;frames?:number[];startFrame?:number;endFrame?:number;rate?:Rational}
export interface NormalizedRenderRequest extends Required<RenderRequest> {outputFrames:number;durationSeconds:number;sheetWidth?:number;sheetHeight?:number;columns?:number}
export function normalizeRenderRequest(document:GraphDocument,request?:RenderRequest):NormalizedRenderRequest;

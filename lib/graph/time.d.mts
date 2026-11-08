import type {Rational} from './types.mjs';
export function frameRate(value?:Rational):Rational;
export function frameMicroseconds(frame:number,rate:Rational):number;
export function frameSeconds(frame:number,rate:Rational):number;
export function sampleFrame(frame:number,sourceRate:Rational,outputRate:Rational):number;
export function outputTiming(frameCount:number,sourceRate:Rational,outputRate?:Rational):{frames:number;rate:Rational;sourceSeconds:number;seconds:number;tailSeconds:number};
export function advanceTime(offset:Rational,frames:number,speed?:Rational):Rational;

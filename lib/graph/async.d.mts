export function awaitBounded<T>(promise:Promise<T>,options?:{signal?:AbortSignal;timeout?:number;label?:string;onCancel?:()=>void;disposeLate?:(value:T)=>void}):Promise<T>;

export class AsyncSemaphore {constructor(limit:number);acquire(options?:{signal?:AbortSignal}):Promise<()=>void>;run<T>(action:()=>Promise<T>,options?:{signal?:AbortSignal}):Promise<T>}

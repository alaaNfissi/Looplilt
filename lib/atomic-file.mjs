import fs from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
/** Retry transient Windows sharing violations without deleting the destination.
 * Callers retain their project lock and validate scoped paths before calling. */
export async function atomicRename(source,destination,{signal,beforeAttempt,platform=process.platform,timeout=2000}={}){
 if(!Number.isFinite(timeout)||timeout<0||timeout>5000)throw new Error('Atomic rename retry budget must be0–5000ms');
 const started=performance.now();let attempt=0;
 for(;;){
  signal?.throwIfAborted();await beforeAttempt?.();signal?.throwIfAborted();
  try{await fs.rename(source,destination);return;}
  catch(error){
   if(platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||performance.now()-started>=timeout)throw error;
   await delay(Math.min(25*2**Math.min(attempt++,3),200,Math.max(1,timeout-(performance.now()-started))),undefined,{signal});
  }
 }
}

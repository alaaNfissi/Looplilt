/** FIFO slots for bounded browser I/O. A cancelled waiter never consumes a slot. */
export class AsyncSemaphore{
 #limit;#active=0;#waiting=[];
 constructor(limit){if(!Number.isInteger(limit)||limit<1||limit>32)throw new Error('Concurrency must be1–32');this.#limit=limit;}
 #release(){
  let used=false;
  return ()=>{
   if(used)return;used=true;
   const next=this.#waiting.shift();
   if(next){next.signal?.removeEventListener('abort',next.abort);next.resolve(this.#release());}
   else this.#active--;
  };
 }
 acquire({signal}={}){
  signal?.throwIfAborted();
  if(this.#active<this.#limit){this.#active++;return Promise.resolve(this.#release());}
  if(this.#waiting.length>=128)return Promise.reject(new Error('Too many media requests are waiting'));
  return new Promise((resolve,reject)=>{
   const entry={resolve,reject,signal,abort:null};
   entry.abort=()=>{const index=this.#waiting.indexOf(entry);if(index<0)return;this.#waiting.splice(index,1);signal.removeEventListener('abort',entry.abort);reject(signal.reason??new Error('Media request cancelled'));};
   this.#waiting.push(entry);signal?.addEventListener('abort',entry.abort,{once:true});if(signal?.aborted)entry.abort();
  });
 }
 async run(action,{signal}={}){const release=await this.acquire({signal});try{signal?.throwIfAborted();return await action();}finally{release();}}
}

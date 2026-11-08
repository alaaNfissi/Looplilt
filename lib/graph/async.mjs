/** Bound a browser operation even when an underlying decoder stops responding.
 * Native resources are closed by onCancel; late transferable results are released. */
export function awaitBounded(promise,{signal,timeout=20000,label='Operation',onCancel,disposeLate}={}){
 if(!Number.isFinite(timeout)||timeout<=0)throw new Error('Operation timeout must be positive');
 return new Promise((resolve,reject)=>{
  let settled=false;const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  const fail=error=>{if(settled)return;settled=true;cleanup();try{onCancel?.();}catch{/* Preserve the initiating failure. */}reject(error);};
  const abort=()=>fail(signal?.reason??new DOMException('Operation cancelled','AbortError'));
  const timer=setTimeout(()=>fail(new Error(label+' timed out')),timeout);
  signal?.addEventListener('abort',abort,{once:true});
  Promise.resolve(promise).then(value=>{if(settled){try{disposeLate?.(value);}catch{}return;}settled=true;cleanup();resolve(value);},error=>{if(settled)return;settled=true;cleanup();reject(error);});
  if(signal?.aborted)abort();
 });
}

/** Tokens only authorize ephemeral loopback sessions. Never include them in
 * diagnostic messages, original browser call-log stacks, or nested causes. */
export function redactStudioError(value) {
 const redact=text=>String(text).replace(/#(render|workspace)=[a-f0-9]{64}/gi,'#$1=[private]');
 const error=value instanceof Error?value:new Error(redact(value)),seen=new Set();
 function visit(current,depth){
  if(!(current instanceof Error)||seen.has(current)||depth>4)return;
  seen.add(current);current.message=redact(current.message);
  if(typeof current.stack==='string')current.stack=redact(current.stack);
  if(typeof current.cause==='string')current.cause=redact(current.cause);else visit(current.cause,depth+1);
  if(Array.isArray(current.errors))for(const nested of current.errors)visit(nested,depth+1);
 }
 visit(error,0);return error;
}

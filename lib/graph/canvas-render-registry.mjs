/**
 * Trusted application extensions. Serialized projects carry a type/version and
 * data, never module URLs or executable plugin code. A host registers painters.
 */
export class CanvasRenderRegistry {
 #painters=new Map();
 registerNode({type,version,draw}){
  if(typeof type!=='string'||! /^[a-z][a-z0-9:-]{0,79}$/.test(type)||!Number.isInteger(version)||version<1||version>10000)throw new TypeError('A Canvas painter needs a stable type and version');
  if(typeof draw!=='function'||/^(Async|Generator|AsyncGenerator)Function$/.test(draw.constructor?.name))throw new TypeError('A Canvas painter must be a synchronous trusted function');
  const key=type+'@'+version;if(this.#painters.has(key))throw new Error('Canvas painter already registered: '+key);
  this.#painters.set(key,draw);return this;
 }
 node(type,version=1){return this.#painters.get(type+'@'+version);}
}
export const standardCanvasRenderers=new CanvasRenderRegistry();

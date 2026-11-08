const generic=new Set(['serif','sans-serif','monospace','cursive','fantasy','system-ui','ui-serif','ui-sans-serif','ui-monospace','ui-rounded','math','emoji','fangsong']);
/** Preserve ordered font fallbacks while quoting each family as data. */
export function canvasFontFamily(value){
 const families=[];let part='',quote=null,escaped=false;
 for(const character of value){
  if(escaped){part+=character;escaped=false;continue;}
  if(quote&&character==='\\'){escaped=true;continue;}
  if(quote){if(character===quote)quote=null;else part+=character;continue;}
  if((character==='"'||character==="'")&&!part.trim()){quote=character;continue;}
  if(character===','){if(part.trim())families.push(part.trim());part='';}else part+=character;
 }
 if(part.trim())families.push(part.trim());
 return families.map(name=>generic.has(name.toLowerCase())?name.toLowerCase():JSON.stringify(name)).join(', ')||'sans-serif';
}

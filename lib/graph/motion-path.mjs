const cache=new Map(),MAX_SEGMENTS=256,MAX_SAMPLES=16385;
function point(segment,t){
 const p=segment.points,u=1-t;
 if(segment.type==='L')return [p[0][0]*u+p[1][0]*t,p[0][1]*u+p[1][1]*t];
 if(segment.type==='Q')return [u*u*p[0][0]+2*u*t*p[1][0]+t*t*p[2][0],u*u*p[0][1]+2*u*t*p[1][1]+t*t*p[2][1]];
 return [u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0],u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1]];
}
function tangent(segment,t){
 const p=segment.points,u=1-t;let x,y;
 if(segment.type==='L'){x=p[1][0]-p[0][0];y=p[1][1]-p[0][1];}
 else if(segment.type==='Q'){x=2*u*(p[1][0]-p[0][0])+2*t*(p[2][0]-p[1][0]);y=2*u*(p[1][1]-p[0][1])+2*t*(p[2][1]-p[1][1]);}
 else{x=3*u*u*(p[1][0]-p[0][0])+6*u*t*(p[2][0]-p[1][0])+3*t*t*(p[3][0]-p[2][0]);y=3*u*u*(p[1][1]-p[0][1])+6*u*t*(p[2][1]-p[1][1])+3*t*t*(p[3][1]-p[2][1]);}
 if(Math.hypot(x,y)<1e-12){const a=point(segment,Math.max(0,t-1e-5)),b=point(segment,Math.min(1,t+1e-5));x=b[0]-a[0];y=b[1]-a[1];}
 return Math.atan2(y,x)*180/Math.PI;
}
function tokensFor(source){
 if(typeof source!=='string'||source.length>30000)throw new Error('Motion path must contain at most30000 characters');
 const tokens=[],token=/[MLCQZmlcqz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/iy;
 let offset=0;
 while(offset<source.length){
  const gap=/^[\s,]+/.exec(source.slice(offset));if(gap){offset+=gap[0].length;continue;}
  token.lastIndex=offset;const match=token.exec(source);if(!match)throw new Error('Motion paths support M, L, Q, C and Z commands');
  const value=/^[a-z]$/i.test(match[0])?match[0]:Number(match[0]);
  if(typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>1000000))throw new Error('Motion path coordinates must stay within one million project pixels');
  tokens.push(value);if(tokens.length>4096)throw new Error('Motion path exceeds its command budget');offset=token.lastIndex;
 }
 return tokens;
}
/** Deterministic arc-length lookup for one continuous line/Bezier SVG path.
 * Curves use64 samples per segment; positions still evaluate the original
 * Bezier at the interpolated parameter. No DOM or frame history is involved. */
export function compileMotionPath(source){
 const found=cache.get(source);if(found){cache.delete(source);cache.set(source,found);return found;}
 const tokens=tokensFor(source),segments=[];let index=0,command=null,current=[0,0],start=null;
 const coordinates=count=>{
  if(index+count>tokens.length||tokens.slice(index,index+count).some(value=>typeof value!=='number'))throw new Error('Motion path command has incomplete coordinates');
  const values=tokens.slice(index,index+count);index+=count;return values;
 };
 while(index<tokens.length){
  if(typeof tokens[index]==='string')command=tokens[index++];
  if(!command)throw new Error('Motion path needs an initial move command');
  const kind=command.toUpperCase(),relative=command!==kind;
  if(!start&&kind!=='M')throw new Error('Motion path must begin with M');
  if(kind==='Z'){
   if(!start)throw new Error('Cannot close an empty motion path');
   segments.push({type:'L',points:[current,start]});current=start;command=null;
  }else{
   const values=coordinates(kind==='C'?6:kind==='Q'?4:2),points=[];
   for(let i=0;i<values.length;i+=2)points.push([values[i]+(relative?current[0]:0),values[i+1]+(relative?current[1]:0)]);
   if(points.some(value=>value.some(coordinate=>Math.abs(coordinate)>1000000)))throw new Error('Relative motion path coordinates exceed their bounds');
   if(kind==='M'){if(start)throw new Error('Use one continuous motion path; disconnected subpaths would jump');current=points[0];start=current;command=relative?'l':'L';continue;}
   segments.push({type:kind,points:[current,...points]});current=points.at(-1);
  }
  if(segments.length>MAX_SEGMENTS)throw new Error('Motion path exceeds256 segments');
 }
 if(!segments.length)throw new Error('Motion path needs a line or curve after M');
 const samples=[{distance:0,segment:0,t:0}],lengths=[];let distance=0,previous=segments[0].points[0];
 for(let segment=0;segment<segments.length;segment++){
  const item=segments[segment],steps=item.type==='L'?1:64;lengths.push(distance);
  for(let step=1;step<=steps;step++){const t=step/steps,next=point(item,t);distance+=Math.hypot(next[0]-previous[0],next[1]-previous[1]);samples.push({distance,segment,t});previous=next;if(samples.length>MAX_SAMPLES)throw new Error('Motion path exceeds its sampling budget');}
 }
 if(distance<1e-9||!Number.isFinite(distance))throw new Error('Motion path must have a positive finite length');
 const result=Object.freeze({length:distance,segments:segments.length,sample(progress){
  if(!Number.isFinite(progress))throw new Error('Motion path progress must be finite');
  const target=Math.max(0,Math.min(1,progress))*distance;let low=1,high=samples.length-1;
  while(low<high){const middle=(low+high)>>>1;if(samples[middle].distance<target)low=middle+1;else high=middle;}
  const right=samples[low],left=samples[low-1],segment=segments[right.segment];
  const from=left.segment===right.segment?left.t:0,span=right.distance-left.distance,weight=span?Math.max(0,Math.min(1,(target-left.distance)/span)):0,t=from+(right.t-from)*weight;
  const [x,y]=point(segment,t);return {x,y,rotation:tangent(segment,t)};
 }});
 cache.set(source,result);if(cache.size>32)cache.delete(cache.keys().next().value);return result;
}

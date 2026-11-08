import fs from 'node:fs/promises';
import path from 'node:path';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** The Studio catalog only contains original, portable projects with finished
 * masters. Keep it separate from the fully supported v1 Canvas catalog. */
export async function studioGalleryMarkup(root){
 const stories=JSON.parse(await fs.readFile(path.join(root,'studio/stories.json'),'utf8'));
 const cards=[];
 for(const story of stories){
  if(!/^[a-z][a-z0-9-]{0,60}$/.test(story.slug))throw new Error('Invalid original Studio film slug');
  for(const extension of ['mp4','png'])await fs.access(path.join(root,'site/media',story.slug+'-studio.'+extension));
  const graph=JSON.parse(await fs.readFile(path.join(root,'examples/studio',story.slug,'project.looplilt.json'),'utf8'));
  const duration=graph.durationFrames*graph.frameRate.denominator/graph.frameRate.numerator;
  if(Math.abs(duration-story.seconds)>.01)throw new Error('Studio film duration disagrees with its graph');
  const slug=story.slug,title=escape(story.title);
  cards.push('<article class="studio-film" id="studio-film-'+slug+'">'+
   '<div class="studio-film-screen"><video controls playsinline preload="none" poster="media/'+slug+'-studio.png" aria-label="'+title+' — original Looplilt film"><source src="media/'+slug+'-studio.mp4" type="video/mp4"></video><span class="studio-film-length">'+story.seconds+' SEC</span></div>'+
   '<div class="studio-film-copy"><p class="studio-film-style">'+escape(story.style)+'</p><h3>'+title+'</h3><p>'+escape(story.description)+'</p>'+
   (story.audio?'<p class="studio-film-score"><span aria-hidden="true">♫</span> '+escape(story.audio)+'</p>':'')+
   '<div class="studio-film-actions"><a class="button primary" href="studio/?story='+slug+'">Open editable film <span aria-hidden="true">↗</span></a><a href="studio/stories/'+slug+'.looplilt" download>Take the project home ↓</a></div>'+
   '<a class="studio-film-source" href="https://github.com/alaaNfissi/Looplilt/tree/main/examples/studio/'+slug+'">Explore the original source ↗</a></div></article>');
 }
 return cards.join('\n');
}

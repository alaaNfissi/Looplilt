"use client";
import {Film,Import,Type,ArrowUpRight} from "lucide-react";
import stories from "../../../../../stories.json";
export function StudioStart({disabled,onImport,onTitle,onStory}:{disabled:boolean;onImport:()=>void;onTitle:()=>void;onStory:(slug:string)=>void}){
 return <section className="studio-start" aria-labelledby="studio-start-title">
  <div className="studio-start-copy"><span className="studio-start-kicker">A LITTLE POSSIBILITY. ALL YOURS.</span><h1 id="studio-start-title">What will you <em>bring to life?</em></h1><p>Start with your footage, a title, or an original film you can take apart and make your own.</p>
   <div className="studio-start-actions"><button disabled={disabled} onClick={onImport}><Import size={16}/>Import your footage</button><button disabled={disabled} onClick={onTitle}><Type size={16}/>Start with a title</button></div><small>Saved on this device. Export a portable project to keep a copy.</small>
  </div>
  <div className="studio-start-stories">{stories.map(story=><button key={story.slug} className="studio-story-card" disabled={disabled} onClick={()=>onStory(story.slug)} aria-label={"Open example: "+story.title}>
   <img src={"/studio/stories/"+story.slug+".png"} alt="" width="640" height="360"/><span className="studio-story-meta"><Film size={13}/>{story.style} · {story.seconds}s</span><strong>{story.title}<ArrowUpRight size={18}/></strong><span>{story.description}</span><span className="studio-story-audio">Original score · {story.audio}</span><b>Open editable film →</b>
  </button>)}</div>
 </section>;
}

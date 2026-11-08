"use client";
import {memo,useMemo} from "react";
import {Eye,EyeOff,Lock,LockOpen,Plus,Volume2,VolumeX} from "lucide-react";
import {IconButton,cn} from "@looplilt-studio/ui";
import {useShallow} from "zustand/react/shallow";
import {layoutTracks,RULER_HEIGHT,totalTracksHeight} from "./geometry";
import {selectOrderedTracks,useGraphEditorStore} from "@/state/graphEditorStore";

/** Accessible controls for the visible lanes. The full graph stays available
 * through layer search; scrolling never allocates thousands of DOM buttons. */
export const TrackHeaders=memo(function TrackHeaders({scrollY,viewportHeight}:{scrollY:number;viewportHeight:number}){
 const tracks=useGraphEditorStore(useShallow(selectOrderedTracks)),selected=useGraphEditorStore(state=>state.selectedClipIds);
 const select=useGraphEditorStore(state=>state.selectClips),setTrackFlag=useGraphEditorStore(state=>state.setTrackFlag),addTrack=useGraphEditorStore(state=>state.addTrack);
 const layouts=useMemo(()=>layoutTracks(tracks),[tracks]),height=totalTracksHeight(tracks)+36;
 const visible=layouts.filter(row=>row.top+row.height>=scrollY&&row.top<=scrollY+viewportHeight);
 return <div className="studio-track-headers border-border-subtle bg-surface-panel relative w-(--size-track-header-width) shrink-0 border-r" style={{height,minHeight:viewportHeight}}>
  <div className="border-border-subtle bg-surface-panel sticky top-0 z-10 border-b" style={{height:RULER_HEIGHT}}/>
  {visible.map(({track,top})=><div key={track.id} data-track-id={track.id} className={cn("border-border-subtle/50 absolute left-0 right-0 flex items-center gap-1 border-b px-2",selected.includes(track.graphNodeId??track.id)?"bg-surface-raised":"")} style={{top,height:track.height}}>
   <div className="min-w-0 flex-1"><button type="button" className="text-text-primary w-full truncate text-left text-xs font-medium" aria-label={"Select "+track.name} aria-pressed={selected.includes(track.graphNodeId??track.id)} onClick={()=>select([track.graphNodeId??track.id])}>{track.name}</button><p className="text-2xs text-text-tertiary capitalize">{track.kind}</p></div>
   <div className="flex shrink-0 items-center">
    {track.kind==="audio"&&track.graphMute!==false?<IconButton size="sm" label={(track.muted?"Unmute ":"Mute ")+track.name} active={track.muted} onClick={()=>setTrackFlag(track.id,"muted",!track.muted)}>{track.muted?<VolumeX size={13}/>:<Volume2 size={13}/>}</IconButton>:track.graphVisual!==false?<IconButton size="sm" label={(track.hidden?"Show ":"Hide ")+track.name} active={track.hidden} onClick={()=>setTrackFlag(track.id,"hidden",!track.hidden)}>{track.hidden?<EyeOff size={13}/>:<Eye size={13}/>}</IconButton>:null}
    <IconButton size="sm" disabled={track.graphInheritedLocked} label={track.graphInheritedLocked?"Locked by parent group":(track.locked?"Unlock ":"Lock ")+track.name} active={track.locked} onClick={()=>setTrackFlag(track.id,"locked",!track.locked)}>{track.locked?<Lock size={13}/>:<LockOpen size={13}/>}</IconButton>
   </div>
  </div>)}
  <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1.5" style={{height:36}}>
   {(["video","audio"] as const).map(kind=><button key={kind} onClick={()=>addTrack(kind)} className="border-border-default bg-surface-raised text-text-secondary text-2xs flex flex-1 items-center justify-center gap-1 rounded-sm border py-1 capitalize"><Plus size={12}/>{kind}</button>)}
  </div>
 </div>;
});

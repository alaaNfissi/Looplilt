"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {useShallow} from "zustand/react/shallow";
import {useElementSize} from "@/hooks/useElementSize";
import {selectOrderedTracks} from "@/state/graphEditorStore";
import {layoutTracks,RULER_HEIGHT} from "./geometry";
import {
  Braces,
  Magnet,
  Scissors,
  SquareChevronLeft,
  SquareChevronRight,
  Trash2,
  ZoomIn,
  Maximize2,
  ZoomOut,
} from "lucide-react";
import { IconButton, Panel } from "@looplilt-studio/ui";
import { formatTimecode } from "@looplilt-studio/timeline-engine";
import { TimelineCanvas } from "./TimelineCanvas";
import { TrackHeaders } from "./TrackHeaders";
import { useGraphEditorStore } from "@/state/graphEditorStore";

export function TimelinePanel() {
  const scrolling=useRef<HTMLDivElement>(null),[scrollY,setScrollY]=useState(0),trackSize=useElementSize(scrolling);
  const tracks=useGraphEditorStore(useShallow(selectOrderedTracks)),selected=useGraphEditorStore(state=>state.selectedClipIds),projectId=useGraphEditorStore(state=>state.graph.id);
  const layouts=useMemo(()=>layoutTracks(tracks),[tracks]);
  useEffect(()=>{if(scrolling.current)scrolling.current.scrollTop=0;setScrollY(0);},[projectId]);
  useEffect(()=>{const view=scrolling.current,id=selected[0];if(!view||!id)return;const lane=layouts.find(item=>(item.track.graphNodeId??item.track.id)===id);if(!lane)return;if(lane.top<view.scrollTop+RULER_HEIGHT||lane.top+lane.height>view.scrollTop+view.clientHeight)view.scrollTop=Math.max(0,lane.top-RULER_HEIGHT);},[selected,layouts]);
  const playhead = useGraphEditorStore((state) => state.playhead);
  const fps = useGraphEditorStore((state) => state.project.settings.frameRate);
  const duration = useGraphEditorStore((state) => state.project.durationFrames);
  const snapEnabled = useGraphEditorStore((state) => state.snapEnabled);
  const selectionCount = useGraphEditorStore((state) => state.selectedClipIds.length);

  const inPoint = useGraphEditorStore((state) => state.inPoint);
  const outPoint = useGraphEditorStore((state) => state.outPoint);

  const zoomBy = useGraphEditorStore((state) => state.zoomBy);
  const toggleSnap = useGraphEditorStore((state) => state.toggleSnap);
  const splitAtPlayhead = useGraphEditorStore((state) => state.splitAtPlayhead);
  const deleteSelected = useGraphEditorStore((state) => state.deleteSelected);
  const setInPoint = useGraphEditorStore((state) => state.setInPoint);
  const setOutPoint = useGraphEditorStore((state) => state.setOutPoint);
  const clearInOut = useGraphEditorStore((state) => state.clearInOut);

  const hasRange = inPoint !== null || outPoint !== null;

  return (
    <Panel bare scrollable={false} className="border-border-subtle border-t">
      <div className="flex h-full flex-col">
        <div className="studio-timeline-toolbar border-border-subtle flex h-9 shrink-0 items-center gap-1 border-b px-2">
          <span className="tabular text-text-primary text-sm">{formatTimecode(playhead, fps)}</span>
          <span className="tabular text-text-tertiary text-xs">
            / {formatTimecode(duration, fps)}
          </span>

          <div className="bg-border-subtle mx-2 h-4 w-px" />

          <IconButton size="sm" label="Split at playhead (S)" onClick={splitAtPlayhead}>
            <Scissors size={14} />
          </IconButton>
          <IconButton
            size="sm"
            label="Delete selection (Delete)"
            disabled={selectionCount === 0}
            onClick={deleteSelected}
          >
            <Trash2 size={14} />
          </IconButton>
          <IconButton
            size="sm"
            label="Toggle snapping (N)"
            active={snapEnabled}
            onClick={toggleSnap}
          >
            <Magnet size={14} />
          </IconButton>

          <div className="bg-border-subtle mx-2 h-4 w-px" />

          <IconButton
            size="sm"
            label="Set export in-point at playhead (I)"
            active={inPoint !== null}
            onClick={() => setInPoint(playhead)}
          >
            <SquareChevronRight size={14} />
          </IconButton>
          <IconButton
            size="sm"
            label="Set export out-point at playhead (O)"
            active={outPoint !== null}
            onClick={() => setOutPoint(playhead)}
          >
            <SquareChevronLeft size={14} />
          </IconButton>
          {hasRange && (
            <IconButton size="sm" label="Clear export range" onClick={clearInOut}>
              <Braces size={14} />
            </IconButton>
          )}

          <div className="flex-1" />

          {selectionCount > 0 && (
            <span className="text-text-tertiary mr-2 text-xs">{selectionCount} selected</span>
          )}

          <IconButton size="sm" label="Zoom out" onClick={() => zoomBy(1 / 1.3)}>
            <ZoomOut size={14} />
          </IconButton>
          <IconButton size="sm" label="Fit whole film" onClick={()=>{const width=scrolling.current?.querySelector('canvas')?.clientWidth??900;useGraphEditorStore.getState().setZoom(width/(duration+2));useGraphEditorStore.getState().setScrollFrame(0);}}><Maximize2 size={14}/></IconButton>
          <IconButton size="sm" label="Zoom in" onClick={() => zoomBy(1.3)}>
            <ZoomIn size={14} />
          </IconButton>
        </div>

        <div ref={scrolling} tabIndex={0} aria-label="Timeline layers" onScroll={event=>setScrollY(event.currentTarget.scrollTop)} className="studio-track-scroll flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <TrackHeaders scrollY={scrollY} viewportHeight={Math.max(1,trackSize.height)}/>
          <div className="min-w-0 flex-1">
            <TimelineCanvas scrollY={scrollY} viewportHeight={Math.max(1,trackSize.height)}/>
          </div>
        </div>
      </div>
    </Panel>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Film,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { IconButton } from "@looplilt-studio/ui";
import { formatTimecode } from "@looplilt-studio/timeline-engine";
import { useEditorStore } from "@/state/editorStore";
import { PreviewStage } from "@/features/preview/PreviewStage";
import { MaskOverlay } from "@/features/masks/MaskOverlay";
import { useElementSize } from "@/hooks/useElementSize";

/**
 * Video preview surface and transport controls.
 *
 * This owns the *frame* around the compositor: aspect-ratio fitting with
 * letterboxing, safe guides, and transport. `PreviewStage` mounts the PixiJS
 * renderer into the fitted box and is told only its pixel size, which keeps
 * layout concerns out of the renderer entirely.
 */
export function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGuides, setShowGuides] = useState(true);

  const resolution = useEditorStore((state) => state.project.settings.resolution);
  const background = useEditorStore((state) => state.project.settings.backgroundColor);
  const playhead = useEditorStore((state) => state.playhead);
  const duration = useEditorStore((state) => state.project.durationFrames);
  const fps = useEditorStore((state) => state.project.settings.frameRate);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  // A brand-new project renders a black rectangle, which reads as broken rather
  // than empty. Knowing there are no clips lets us say so.
  const isEmpty = useEditorStore((state) => Object.keys(state.project.entities.clips).length === 0);

  const togglePlaying = useEditorStore((state) => state.togglePlaying);
  const setPlayhead = useEditorStore((state) => state.setPlayhead);

  // Fit the project's aspect ratio inside the available space, letterboxing as
  // needed. Derived during render rather than stored in state — it is a pure
  // function of the container size and the project resolution, so keeping a
  // second copy in state could only ever disagree with them.
  const containerSize = useElementSize(containerRef);

  const stageSize = (() => {
    const padding = 32;
    const availableWidth = Math.max(0, containerSize.width - padding);
    const availableHeight = Math.max(0, containerSize.height - padding);
    const projectAspect = resolution.width / resolution.height;

    const width = Math.min(availableWidth, availableHeight * projectAspect);
    return { width, height: width / projectAspect };
  })();

  return (
    <div className="bg-surface-base flex h-full flex-col">
      <div ref={containerRef} className="bg-canvas relative min-h-0 flex-1">
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="shadow-panel relative"
            style={{
              width: stageSize.width,
              height: stageSize.height,
              backgroundColor: background,
            }}
          >
            {stageSize.width > 0 && (
              <PreviewStage width={stageSize.width} height={stageSize.height} />
            )}

            {showGuides && <SafeGuides />}

            {isEmpty && <StartHint />}

            {stageSize.width > 0 && (
              <MaskOverlay
                width={stageSize.width}
                height={stageSize.height}
                resolution={resolution}
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-border-subtle bg-surface-panel flex h-11 shrink-0 items-center gap-1 border-t px-3">
        <span className="tabular text-text-primary w-24 text-sm">
          {formatTimecode(playhead, fps)}
        </span>

        <div className="flex flex-1 items-center justify-center gap-0.5">
          <IconButton label="Go to start" onClick={() => setPlayhead(0)}>
            <SkipBack size={15} />
          </IconButton>
          <IconButton label="Previous frame" onClick={() => setPlayhead(playhead - 1)}>
            <ChevronsLeft size={15} />
          </IconButton>
          <IconButton
            label={isPlaying ? "Pause (Space)" : "Play (Space)"}
            variant="secondary"
            onClick={togglePlaying}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </IconButton>
          <IconButton label="Next frame" onClick={() => setPlayhead(playhead + 1)}>
            <ChevronsRight size={15} />
          </IconButton>
          <IconButton label="Go to end" onClick={() => setPlayhead(duration)}>
            <SkipForward size={15} />
          </IconButton>
        </div>

        <div className="flex w-24 justify-end">
          <IconButton
            size="sm"
            label="Toggle safe guides"
            active={showGuides}
            onClick={() => setShowGuides((value) => !value)}
          >
            <span className="text-2xs font-semibold">SAFE</span>
          </IconButton>
        </div>
      </div>
    </div>
  );
}

/**
 * First-run guidance.
 *
 * Shown only while the timeline is empty, and never interactive — it sits over
 * the stage purely so the first thing someone sees answers "what now?" instead
 * of being an unexplained black rectangle. It disappears the moment a clip
 * exists, so it costs a returning user nothing.
 */
function StartHint() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center p-4 text-center"
    >
      <div className="flex flex-col items-center gap-1.5">
        <Film size={22} className="text-text-tertiary/50" />
        <p className="text-text-secondary text-xs font-medium">Import media to get started</p>
        <p className="text-text-tertiary text-2xs max-w-[240px] leading-relaxed">
          Drag a video, image, or audio file anywhere in the window — or press Import. Nothing is
          uploaded.
        </p>
      </div>
    </div>
  );
}

/**
 * Title- and action-safe guides.
 *
 * The inner box is the 80% title-safe area; the outer is 90% action-safe. These
 * are the broadcast conventions, and they map closely to where TikTok and Reels
 * overlay their own UI — which is the practical reason creators need them.
 */
function SafeGuides() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-[5%] border border-white/20" />
      <div className="absolute inset-[10%] border border-white/15" />
      <div className="absolute top-1/2 right-0 left-0 h-px bg-white/10" />
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
    </div>
  );
}

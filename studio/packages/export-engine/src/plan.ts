/**
 * Turning a project + export settings into a concrete, validated render plan.
 *
 * This is the bridge between the document and the encode loop, and it is pure:
 * it decides *which frames* to render and *at what size and rate*, but never
 * touches a codec or a canvas. The same plan drives any backend, so what gets
 * encoded is exactly what the plan says — the frame count and timing can be
 * unit-tested without a browser.
 */

import type { ExportSettings, Frame, ProjectDocument, Size } from "@looplilt-studio/types";

/** A validated, backend-agnostic description of an export job. */
export interface ExportPlan {
  /** First timeline frame to render (inclusive). */
  startFrame: Frame;
  /** One past the last frame to render (exclusive), half-open like the timeline. */
  endFrame: Frame;
  /** Number of frames to render — always `endFrame - startFrame`, and > 0. */
  totalFrames: number;
  /** Output pixel dimensions. Both even, as video codecs require. */
  resolution: Size;
  frameRate: number;
  /** Wall-clock length of the output in seconds. */
  durationSeconds: number;
  format: ExportSettings["format"];
  videoCodec: ExportSettings["videoCodec"];
  audioCodec: ExportSettings["audioCodec"];
  videoBitrate: number;
  audioBitrate: number;
  /**
   * Non-fatal things worth telling the user before they wait for a render —
   * chiefly that the picture will be black. Empty for an ordinary export.
   */
  warnings: string[];
}

/** What actually falls inside an export range, used to catch empty renders. */
interface RangeContent {
  /** Clips that draw something (video, image, text). */
  visual: number;
  /** Audio clips — they make a render worthwhile even with no picture. */
  audio: number;
  /** Caption blocks overlapping the range. */
  captions: number;
}

/**
 * Counts what a range would actually render.
 *
 * Hidden clips and clips on hidden tracks are skipped, because the renderer
 * skips them too — counting them would let a "there is content here" check pass
 * for a range that draws nothing. Ranges are half-open on both sides, matching
 * the timeline.
 */
function contentInRange(project: ProjectDocument, start: Frame, end: Frame): RangeContent {
  const { clips, tracks, captionTracks } = project.entities;
  const content: RangeContent = { visual: 0, audio: 0, captions: 0 };

  for (const clip of Object.values(clips)) {
    const clipEnd = clip.startFrame + clip.durationFrames;
    if (clipEnd <= start || clip.startFrame >= end) continue;
    if (clip.hidden || tracks[clip.trackId]?.hidden) continue;
    if (clip.content.kind === "audio") content.audio += 1;
    else content.visual += 1;
  }

  for (const track of Object.values(captionTracks)) {
    for (const block of track.blocks) {
      if (block.endFrame > start && block.startFrame < end) {
        content.captions += 1;
        break;
      }
    }
  }

  return content;
}

/** Thrown when settings cannot produce a valid export. Carries a user-facing reason. */
export class ExportPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportPlanError";
  }
}

/**
 * Builds a render plan, or throws {@link ExportPlanError} with a reason the UI
 * can show. Validation lives here rather than in the encoder so a bad request is
 * rejected before any expensive resource is allocated.
 */
export function planExport(project: ProjectDocument, settings: ExportSettings): ExportPlan {
  const startFrame = settings.range ? settings.range.start : 0;
  const endFrame = settings.range ? settings.range.end : project.durationFrames;

  if (endFrame <= startFrame) {
    throw new ExportPlanError(
      "Nothing to export — the timeline is empty or the selected range has no length.",
    );
  }

  const { width, height } = settings.resolution;
  if (width <= 0 || height <= 0) {
    throw new ExportPlanError("Export resolution must be positive.");
  }
  // Every mainstream video codec requires even dimensions (chroma subsampling
  // works on 2×2 blocks). Reject rather than silently rounding, so the output
  // size is never a surprise.
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new ExportPlanError(`Export dimensions must be even (got ${width}×${height}).`);
  }

  if (settings.frameRate <= 0) {
    throw new ExportPlanError("Frame rate must be greater than zero.");
  }

  const totalFrames = endFrame - startFrame;

  // A range with nothing in it renders a file that is blank and silent. That is
  // never what someone means by "export", and letting it through silently is
  // indistinguishable from a broken encoder — so refuse it with the reason.
  const content = contentInRange(project, startFrame, endFrame);
  if (content.visual === 0 && content.audio === 0 && content.captions === 0) {
    throw new ExportPlanError(
      "Nothing to export in this range — it contains no clips. Check your in/out points, and that the tracks you want are not hidden.",
    );
  }

  // Audio-only is legitimate (a podcast, a music bed) but the picture *will* be
  // black, so say so up front rather than letting it look like a failed render.
  const warnings: string[] = [];
  if (content.visual === 0 && content.captions === 0) {
    warnings.push("This range has audio but no visible clips, so the picture will be black.");
  }

  return {
    startFrame,
    endFrame,
    totalFrames,
    resolution: { width, height },
    frameRate: settings.frameRate,
    durationSeconds: totalFrames / settings.frameRate,
    format: settings.format,
    videoCodec: settings.videoCodec,
    audioCodec: settings.audioCodec,
    videoBitrate: settings.videoBitrate,
    audioBitrate: settings.audioBitrate,
    warnings,
  };
}

/** Presentation timestamp of a plan-relative frame index, in microseconds. */
export function frameTimestampMicros(plan: ExportPlan, frameIndex: number): number {
  // Derived from the index, never accumulated, so rounding never drifts across a
  // long export — the same reason the preview clock derives the playhead.
  return Math.round((frameIndex * 1_000_000) / plan.frameRate);
}

/** Nominal duration of one frame in microseconds. */
export function frameDurationMicros(plan: ExportPlan): number {
  return Math.round(1_000_000 / plan.frameRate);
}

/** A short human summary, e.g. `1920×1080 · 30 fps · 0:05 · 150 frames`. */
export function describeExport(plan: ExportPlan): string {
  const totalSeconds = Math.round(plan.durationSeconds);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${plan.resolution.width}×${plan.resolution.height} · ${plan.frameRate} fps · ${mm}:${ss} · ${plan.totalFrames} frames`;
}

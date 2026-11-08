"use client";

import { awaitBounded } from "@graph/async.mjs";
import type { ExportPlan, VideoWriter } from "@looplilt-studio/export-engine";
import type { MediaContainer } from "./MediaContainer";
import type { ResolvedVideoConfig } from "./capabilities";

/**
 * A VideoWriter that encodes frames with WebCodecs into a shared MediaContainer.
 *
 * The engine drives *when* each frame is written and at what timestamp; this
 * class owns *how* — encoder configuration, keyframe cadence, and backpressure.
 * The muxer lives in the container (shared with the audio track), so this
 * writer's `finalize` flushes the video encoder and then finalises the whole
 * file — by which point any audio has already been muxed in.
 *
 * Two correctness details:
 * - Timestamps come from the engine, not the source frame: each frame is
 *   re-wrapped with the engine's PTS/duration before encoding, so the chunk's
 *   own timestamp is exact and the muxer needs no override. The encoder runs in
 *   `realtime` latency mode, disabling B-frames, so decode order == presentation
 *   order and no composition-time bookkeeping is needed.
 * - Backpressure is honoured via the encoder's `dequeue` event, so a long export
 *   doesn't buffer every frame in memory at once.
 */
export class WebCodecsVideoWriter implements VideoWriter<VideoFrame> {
  private readonly encoder: VideoEncoder;
  private readonly container: MediaContainer;
  private framesEncoded = 0;
  private readonly keyFrameInterval: number;
  /** The first fatal encoder error, surfaced on the next call. */
  private failure: Error | null = null;
  private readonly signal?: AbortSignal;
  private readonly cancel = () => this.dispose();

  private constructor(encoder: VideoEncoder, container: MediaContainer, keyFrameInterval: number, signal?: AbortSignal) {
    this.encoder = encoder;
    this.container = container;
    this.keyFrameInterval = keyFrameInterval;
    this.signal = signal;
    signal?.addEventListener("abort", this.cancel, {once:true});
  }

  /** Configures a video encoder that feeds the shared container. */
  static create(
    plan: ExportPlan,
    container: MediaContainer,
    config: ResolvedVideoConfig,
    {signal}: {signal?:AbortSignal} = {},
  ): WebCodecsVideoWriter {
    signal?.throwIfAborted();
    // A keyframe every ~2 seconds: enough seek granularity without inflating the
    // file the way all-keyframe output would.
    const keyFrameInterval = Math.max(1, Math.round(plan.frameRate * 2));

    const writer = new WebCodecsVideoWriter(
      new VideoEncoder({
        // The chunk's own timestamp is the engine PTS (each frame is re-stamped
        // before encoding), so the muxer needs no timestamp override.
        output: (chunk, meta) => {
          try {
            container.addVideoChunk(chunk, meta);
          } catch (error) {
            writer.failure ??= asError(error);
          }
        },
        error: (error) => {
          writer.failure ??= asError(error);
        },
      }),
      container,
      keyFrameInterval,
      signal,
    );

    // realtime mode disables B-frames, keeping decode order == presentation order.
    try { writer.encoder.configure({ ...config.encoderConfig, latencyMode: "realtime" }); }
    catch(error) { writer.dispose(); throw error; }
    return writer;
  }

  async addFrame(
    frame: VideoFrame,
    timestampMicros: number,
    durationMicros: number,
  ): Promise<void> {
    this.signal?.throwIfAborted();
    if (this.failure) throw this.failure;

    // Backpressure: let the encoder drain before piling on more work.
    const stalledAt=performance.now()+30000;
    while (this.encoder.encodeQueueSize > 8) {
      this.signal?.throwIfAborted();
      if(performance.now()>stalledAt)throw new Error("Video encoder stopped making progress");
      await waitForDequeue(this.encoder);
      if (this.failure) throw this.failure;
    }

    this.signal?.throwIfAborted();
    const keyFrame = this.framesEncoded % this.keyFrameInterval === 0;
    // A fresh VideoFrame carrying the engine's timestamp/duration makes the
    // encoded chunk's own timing exact, so the muxer needs no PTS override.
    const stamped = new VideoFrame(frame, {
      timestamp: timestampMicros,
      duration: durationMicros,
    });
    try {
      this.encoder.encode(stamped, { keyFrame });
    } finally {
      stamped.close();
    }
    this.framesEncoded += 1;
  }

  /** Flushes the video encoder and finalises the whole container. */
  async finalize(): Promise<Uint8Array> {
    if (this.failure) throw this.failure;
    this.signal?.throwIfAborted();
    await awaitBounded(this.encoder.flush(),{signal:this.signal,timeout:60000,label:"Video encoder finalization",onCancel:()=>this.dispose()});
    if (this.failure) throw this.failure;
    return this.container.finalize();
  }

  dispose(): void {
    this.signal?.removeEventListener("abort", this.cancel);
    if (this.encoder.state !== "closed") this.encoder.close();
  }
}

/** Resolves when the encoder signals it has drained a chunk, or after a tick. */
function waitForDequeue(encoder: VideoEncoder): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      encoder.removeEventListener("dequeue", done);
      resolve();
    };
    // Fallback in case the browser does not emit 'dequeue' promptly.
    const timer = setTimeout(done, 8);
    encoder.addEventListener("dequeue", done, { once: true });
  });
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

"use client";

import { awaitBounded } from "@graph/async.mjs";
import type { MediaContainer } from "./MediaContainer";
import type { ResolvedAudioConfig } from "./capabilities";

/** Samples per AudioData chunk fed to the encoder — a balance of overhead vs latency. */
const CHUNK_FRAMES = 4_096;

/**
 * Encodes a mixed AudioBuffer into the container's audio track.
 *
 * The buffer is sliced into fixed-size AudioData chunks (planar float32) with
 * index-derived timestamps, so audio timing can't drift over a long export —
 * the same discipline the video side uses. Encoder errors surface synchronously
 * on the next chunk or after flush.
 */
export async function encodeAudioBuffer(
  buffer: AudioBuffer,
  config: ResolvedAudioConfig,
  container: MediaContainer,
  {signal}: {signal?:AbortSignal} = {},
): Promise<void> {
  if (typeof globalThis.AudioEncoder === "undefined") throw new Error("Audio encoding is unavailable");
  signal?.throwIfAborted();

  let failure: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => {
      try {
        container.addAudioChunk(chunk, meta);
      } catch (error) {
        failure ??= asError(error);
      }
    },
    error: (error) => {
      failure ??= asError(error);
    },
  });
  const cancel=()=>{if(encoder.state!=="closed")encoder.close();};
  signal?.addEventListener("abort",cancel,{once:true});
  try {
  encoder.configure(config.encoderConfig);

  const { numberOfChannels, sampleRate, length } = buffer;

  for (let offset = 0; offset < length; offset += CHUNK_FRAMES) {
    signal?.throwIfAborted();
    if (failure) break;
    const stalledAt=performance.now()+30000;
    while(encoder.encodeQueueSize>8){if(performance.now()>stalledAt)throw new Error("Audio encoder stopped making progress");await new Promise(resolve=>setTimeout(resolve,4));signal?.throwIfAborted();if(failure)throw failure;}

    const frames = Math.min(CHUNK_FRAMES, length - offset);
    // Planar layout: all of channel 0, then all of channel 1, …
    const planar = new Float32Array(frames * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      buffer.copyFromChannel(
        planar.subarray(channel * frames, (channel + 1) * frames),
        channel,
        offset,
      );
    }

    const data = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels,
      timestamp: Math.round((offset / sampleRate) * 1_000_000),
      data: planar,
    });
    try {
      encoder.encode(data);
    } finally {
      data.close();
    }

    // Yield periodically so a large mix doesn't block the main thread outright.
    if (offset % (CHUNK_FRAMES * 32) === 0) await new Promise(resolve=>setTimeout(resolve,0));
  }

  if (!failure) await awaitBounded(encoder.flush(),{signal,timeout:60000,label:"Audio encoder finalization",onCancel:cancel});
  if (encoder.state !== "closed") encoder.close();
  if (failure) throw failure;
  } finally {signal?.removeEventListener("abort",cancel);cancel();}
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

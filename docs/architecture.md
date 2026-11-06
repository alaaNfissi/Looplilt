# Architecture

Looplilt keeps one version-1 project model and two execution environments. Existing two-file projects need no migration.

```text
project.json + draw.js
        |
  validate + source hash -----> inspect / guarded revision to a new folder
        |
  optional scenes, cues, patterns -> ordinary Canvas + timed score
        |
  standalone HTML <----------- local read-only watch preview
        |
  sandboxed Chromium -> ordered, backpressured PNG stream
        |                         |
  procedural WAV + narration --> FFmpeg -> staged H.264/AAC
                                              |
                                 FFprobe + complete decode
                                              |
                                 exclusive final output
```

## Responsibilities

| Module | Contract |
| --- | --- |
| project | Bounded input files, syntax checking without executing drawing code in Node, additive schema validation, source fingerprints. |
| motion | Pure absolute-time easing, keyframes, analytic springs, cubic paths, transforms, shot lookup. No hidden simulation state. |
| music | Named patterns and track clips expand into the existing score; cues can anchor both visuals and sound. |
| inspect | Read-only JSON inspection, exact-frame export, and allowlisted same-type parameter revisions to new folders. |
| build / player | A portable document, scene navigation, captions and story descriptions. Sound is prepared on demand in a worker. |
| pcm / synth / studio-sound | The same deterministic sample generation runs in Node and the browser worker. No downloaded samples or voice service. |
| preview | Manually started loopback server, random URL token, strict Host/origin checks, sandboxed film iframe, read-only reload. |
| browser / process | Owned child lifetimes, cancellation, deadlines, blocked renderer requests, bounded process output, backpressure. |
| render | Exact frame selection, ordered PNG batches, scene/time-range audio trim, explicit Rec.709 conversion, staging, verification, no overwrite. |
| remix | Shared validated settings and source export for the constrained browser greenhouse. Its optional audio uses the same worker. |

## Stable creative surface

The original Canvas arguments remain. Drawings can additionally use `project`, `shot`, `motion`, and `cue(id)`. Named scenes are optional; a small parameter object gives a scene explicit creative controls without forcing every object into a scene graph. A revision can change those controls safely, but a new action still requires drawing code. See the [workflow contract](workflow.md).

The CLI is the supported automation boundary: strict arguments, optional JSON results, useful errors, and progress on stderr. See [programmatic use](api.md) for module-level integration. A skill supplies guidance; it does not grant execution permissions. No MCP server or hosted control plane is required.

## Resource behavior

HTML contains synthesis code and note data instead of a large base64 WAV by default. The browser generates PCM only after Sound is enabled. `build --audio pcm` retains an explicit embedded-PCM fallback. The finished MP4 remains H.264/AAC.

Rendering holds at most a worker-sized ordered PNG batch, waits for encoder backpressure, and writes no per-frame PNG files. Audio and the staged movie still use temporary disk. Node audio synthesis and browser canvases still consume memory; this is not a hard resource sandbox. A process forcibly killed by the OS can leave its owned temporary directory.

Only pinned Playwright is an npm runtime dependency. Chromium, FFmpeg and FFprobe are separately installed. No dependency source, binary, account integration, telemetry, secret storage, or remote rendering service is bundled. Font and browser differences can change pixels between machines.

The [decision record](evolution/DECISIONS.md) explains alternatives; the [security review](evolution/SECURITY.md) defines trust boundaries.

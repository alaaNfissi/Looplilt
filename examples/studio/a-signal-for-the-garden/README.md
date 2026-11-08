# A Signal for the Garden

A 52-second original pixel-art story. A caretaker follows a faint signal, repairs a rain engine, reconnects an exterior antenna, and brings a space station's last garden back to life.

The world is drawn at 320×180 and enlarged with nearest-neighbor sampling. Original moving footage from The Shape of Returning appears inside the station's screens. The canonical graph keeps those video inserts, stills, masks, color treatments, display compositing, animated typography, a curved signal path and the soundtrack editable.

The score combines a syncopated bass line, piano chords, drums, a restrained chiptune counterline, marimba, warm pads and environmental sound. It is synthesized locally by Looplilt. All artwork, music and imported media are original.

## Reproduce

The checked original rain insert is included in inputs/. To rebuild the film, run these commands from the repository root:

1. node examples/studio/a-signal-for-the-garden/create.mjs
2. node scripts/render-studio-story.mjs a-signal-for-the-garden storyboard
3. node scripts/render-studio-story.mjs a-signal-for-the-garden video
4. node scripts/verify-studio-story.mjs a-signal-for-the-garden

A matching built Studio runtime, Chromium, FFmpeg and FFprobe are required. The renderer creates a new output directory and a portable .looplilt bundle.

scripts/prepare-garden-memory.mjs documents and reproduces the original six-second moving-image insert from the water film. Its source graph and render fingerprints are recorded in inputs/SOURCE.json. The script preserves any existing, differing input master.

## Editing evidence

Run npm run test:studio-complex for the reproducible mixed-media acceptance scenario. It inspects this composition through CLI and MCP, changes a caption using the actual Studio UI, rejects a stale MCP edit, verifies that all media stays unchanged, saves and reopens, then exports six seconds. Three actual UI preview frames are compared with the encoded video. This is an automated UI acceptance test, not a claim of another real-person session.

The procedural pixel objects remain editable in draw.js. The imported footage remains its own video clip; it is not falsely described as individual vector shapes.

## Measured master

The reviewed 1280×720 master has 1,560 frames at 30fps and 48kHz stereo AAC. Full decoding passed. Integrated loudness is −16.47LUFS; true peak is −1.83dBTP. The encoded soundtrack correlates 0.99966 with the original score, with zero measured sample offset. These measurements describe the checked master, not future edits.

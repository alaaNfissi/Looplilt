# Architecture

Looplilt has one project model and two execution environments.

```text
project.json + draw.js
        |
        v
   validate + build --------> standalone HTML player
        |                            |
        |                       drawFrame(time)
        v                            |
  sandboxed Chromium <---------------+
        |
        v
   exact PNG frames + procedural WAV + optional narration
        |
        v
      FFmpeg --------> H.264 / AAC MP4 --------> FFprobe + full decode check
```

`lib/project.mjs` reads and validates the two input files without executing drawing code in Node. `lib/build.mjs` embeds the drawing, project data, player, score, and runtime license into one HTML document. `lib/player.js` owns playback controls and captions; the scene owns its visual composition.

`lib/sound.mjs` creates PCM samples from note events. `lib/browser.mjs` starts an isolated sandboxed browser owned by the operation and blocks external resource requests on rendering pages. `lib/render.mjs` samples frames, checks repeatability, renders to a unique temporary folder, encodes a staged film, verifies it, and only then creates the requested output file. It never fetches or executes another repository's project code.

The only npm runtime dependency is pinned Playwright. Chromium, FFmpeg, and FFprobe are installed separately. No dependency source or binary is vendored here. The project contains no account integration, telemetry, secret storage, hosted rendering endpoint, or background service.

The API intentionally exposes standard Canvas rather than a scene graph. That keeps source easy to edit and inspect, while leaving scene organization, character rigs, and timing helpers to each project. There is no guarantee that pixels match across different operating systems or font installations.

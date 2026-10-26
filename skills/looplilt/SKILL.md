---
name: looplilt
description: Create editable Canvas animations with Looplilt, preview them as standalone HTML, and export local videos with original visuals, scores, captions, or supplied narration.
---

# Looplilt

Use Looplilt for procedural, editable visual stories. Respect the user's requested format, story, language, and delivery scope. The project owns its artwork and drawing code; do not import illustrations or examples from unrelated projects.

Locate the Looplilt repository by its `package.json` and `bin/looplilt.mjs`. In the portable skill bundle it is in `runtime/` beside this file. Commands below run from that root. If the environment cannot run Node, Chromium, and FFmpeg, produce editable project files and explain which local steps remain. An instruction file does not supply execution tools or a voice service.

Read `docs/authoring.md` for the project schema and drawing API. Read `docs/tools.md` when installing, rendering, or troubleshooting local tools.

Translate the idea into a few visible actions before adding text. Create a project with `node bin/looplilt.mjs init <new-folder>`, or write `project.json` and `draw.js` directly. Derive drawing state from absolute time `t`; avoid mutable frame counters, unseeded randomness, external requests, and remote fonts. Compose for the actual width and height. Reserve space for captions when present.

Build a preview with `node bin/looplilt.mjs build <project> --out <new-file.html>`. Scrub transitions and inspect readable text at the delivery size. Use `storyboard` to produce a six-panel PNG when it helps review composition. Ask for creative choices only when needed or requested; do not add an approval gate to work the user has already authorized.

For MP4 delivery, check tools with `doctor`, then use `render <project> --out <new-file.mp4> [--format portrait]`. An optional `--narration <audio-file>` mixes a supplied recording; never claim a score is narration. Keep recordings local unless the user authorizes a provider. Use `captions` to export WebVTT.

The renderer verifies repeatability and the encoded file. Also review important frames, timing, and sound, distinguishing automated measurements from actual listening. Deliver the finished file and editable source with material limitations stated plainly. Publishing, uploading, and changing repository visibility require authorization beyond creating a local film.

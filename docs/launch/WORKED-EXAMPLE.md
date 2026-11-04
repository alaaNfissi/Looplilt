# Reproduce the launch film

The worked example is **A little idea**: a dot becomes a flower, an orbit, and a kite, then reveals Looplilt. It is a direct project-to-film workflow, with no staged terminal or agent recording.

The creative input is [draw.js](../../examples/little-idea/draw.js) and [project.json](../../examples/little-idea/project.json). Canvas code determines every visual frame; the JSON score determines the original synthesized audio.

From a Looplilt checkout:

```sh
node bin/looplilt.mjs init my-little-idea --example little-idea
node bin/looplilt.mjs build my-little-idea --out little-idea.html
node bin/looplilt.mjs storyboard my-little-idea --out little-idea-board.png
node bin/looplilt.mjs render my-little-idea --out little-idea-wide.mp4
node bin/looplilt.mjs render my-little-idea --format portrait --out little-idea-tall.mp4
node bin/looplilt.mjs check little-idea-wide.mp4
node bin/looplilt.mjs check little-idea-tall.mp4
```

HTML needs Node.js 22+. Storyboards and MP4s add the pinned browser; MP4s also need FFmpeg/FFprobe. Output names must be new. The film's two compositions were rendered and checked using Looplilt's runtime; their actual measurements are in [QUALITY.md](QUALITY.md).

For a first edit, change the flower palette in draw.js and rebuild to a new filename. The visible petal chip uses the same value as the petals. Change orbitPeriod to alter both orbital motion and its visible label. This connects the on-screen illustration to the source without pretending it is a coding-agent screen capture.

[The setup prompt](../installation-prompt.txt) automates the environment handoff for a suitably equipped coding agent. Skill discovery, tool access, and creative quality are separate concerns; this worked example is not an autonomous-agent benchmark.

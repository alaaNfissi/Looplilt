# Ink Tide

A curious fish nudges a drifting leaf. The leaf wakes, turns, and joins it. A small encounter told with brush-like marks, ripples, and space to breathe.

**22 seconds · 30 fps · Ink on paper.** Original Looplilt artwork, characters, and score.

The apparent leaf has no tail until its reveal. Pond washes, lily pads, translucent ripples, reeds, and a gentle camera move support an intentionally quiet scene.

## Sound

Plucked strings and marimba trade phrases above a quiet pond ambience. The editable stereo arrangement contains 49 note and sound events, with per-event panning and effect sends. These are locally synthesized timbres and textures, with no downloaded recordings. See [the sound guide](../../docs/audio.md).

## Try it

```sh
node bin/looplilt.mjs init my-film --example ink-tide
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs render my-film --out output/my-film.mp4
node bin/looplilt.mjs render my-film --format portrait --out output/my-film-tall.mp4
```

The source recomposes for wide and tall frames and also supports square output. Change actions and framing in `draw.js`; change notes, room sound, timing, and captions in `project.json`. Use a new output name for each revision.

The example is available under the repository’s [MIT license](../../LICENSE).

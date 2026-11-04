# One More Light

A storm, a stranded boat, and a lighthouse keeper with one last battery. Five shots move from a sleeping harbor to the machinery inside the tower.

**40 seconds · 30 fps · Pixel adventure.** Original Looplilt artwork, characters, and score.

Five shots move from the harbor blackout, through a cottage and a dropped crate, into the lighthouse mechanism, then back outside for the boat’s return. A fixed pixel grid, integer camera positions, and a close-up preserve the pixel-art language.

## Sound

Strings, plucked melody, a restrained chip lead, and coastal weather. The editable stereo arrangement contains 320 note and sound events, with per-event panning and effect sends. These are locally synthesized timbres and textures, with no downloaded recordings. See [the sound guide](../../docs/audio.md).

## Try it

```sh
node bin/looplilt.mjs init my-film --example one-more-light
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs render my-film --out output/my-film.mp4
node bin/looplilt.mjs render my-film --format portrait --out output/my-film-tall.mp4
```

The source recomposes for wide and tall frames and also supports square output. Change actions and framing in `draw.js`; change notes, room sound, timing, and captions in `project.json`. Use a new output name for each revision.

The example is available under the repository’s [MIT license](../../LICENSE).

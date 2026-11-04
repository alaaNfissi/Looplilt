# The Little Lift

Two friends are separated by a roof. A tiny helper steps onto a counterweight, turning an idle pulley into a way to meet.

**24 seconds · 30 fps · Isometric miniature.** Original Looplilt artwork, characters, and score.

The helper’s weight pulls the opposite platform upward. A connected pulley, rotating spokes, a roof garden, character reactions, and a closer view of the mechanism make the cause and effect visible.

## Sound

A music-box ensemble with plucked strings, soft piano, and timed mechanical details. The editable stereo arrangement contains 111 note and sound events, with per-event panning and effect sends. These are locally synthesized timbres and textures, with no downloaded recordings. See [the sound guide](../../docs/audio.md).

## Try it

```sh
node bin/looplilt.mjs init my-film --example the-little-lift
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs render my-film --out output/my-film.mp4
node bin/looplilt.mjs render my-film --format portrait --out output/my-film-tall.mp4
```

The source recomposes for wide and tall frames and also supports square output. Change actions and framing in `draw.js`; change notes, room sound, timing, and captions in `project.json`. Use a new output name for each revision.

The example is available under the repository’s [MIT license](../../LICENSE).

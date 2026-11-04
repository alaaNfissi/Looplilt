# The Missing Beat

A newcomer arrives at Small Hours with a triangle and terrible timing. An accidental foot tap becomes the missing piece of the band.

**36 seconds · 30 fps · Jazz-club comedy.** Original Looplilt artwork, characters, and score.

An establishing view gives way to a character exchange, a foot-tap close-up, an ensemble performance, and a bow. Layered stage lighting, costumes, instruments, a back bar, and audience reactions support the story.

## Sound

Piano-like keys, walking bass, brass, brushed drums, and a well-timed triangle. The editable stereo arrangement contains 530 note and sound events, with per-event panning and effect sends. These are locally synthesized timbres and textures, with no downloaded recordings. See [the sound guide](../../docs/audio.md).

## Try it

```sh
node bin/looplilt.mjs init my-film --example the-missing-beat
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs render my-film --out output/my-film.mp4
node bin/looplilt.mjs render my-film --format portrait --out output/my-film-tall.mp4
```

The source recomposes for wide and tall frames and also supports square output. Change actions and framing in `draw.js`; change notes, room sound, timing, and captions in `project.json`. Use a new output name for each revision.

The example is available under the repository’s [MIT license](../../LICENSE).

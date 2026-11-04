# Moonrise Express

Across a moonlit viaduct, the last train follows a small light home. Layered scenery gives way to a close view of the person waiting at the platform.

**24 seconds · 30 fps · Art Deco postcard.** Original Looplilt artwork, characters, and score.

Foreground reeds, water glints, viaduct arches, mountains, and a distant moon move at different depths. The camera comes closer for the arrival and reunion at the platform.

## Sound

A lilting string-and-piano waltz with a slowing railway rhythm. The editable stereo arrangement contains 258 note and sound events, with per-event panning and effect sends. These are locally synthesized timbres and textures, with no downloaded recordings. See [the sound guide](../../docs/audio.md).

## Try it

```sh
node bin/looplilt.mjs init my-film --example moonrise-express
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs render my-film --out output/my-film.mp4
node bin/looplilt.mjs render my-film --format portrait --out output/my-film-tall.mp4
```

The source recomposes for wide and tall frames and also supports square output. Change actions and framing in `draw.js`; change notes, room sound, timing, and captions in `project.json`. Use a new output name for each revision.

The example is available under the repository’s [MIT license](../../LICENSE).

# Neon Relay

Two signals can see each other but cannot connect. After a collision, one discovers a route above the city. A detour becomes a shared rhythm.

**24 seconds · 30 fps · Luminous motion.** Original Looplilt artwork, characters, and score.

A collision motivates the route over the wall. A layered signal district, perspective floor, glowing route, and two camera moves give the action a setting.

## Sound

Layered electronic groove, rounded bass, pads, percussion, and a warmer final chord. The editable stereo arrangement contains 207 note and sound events, with per-event panning and effect sends. These are locally synthesized timbres and textures, with no downloaded recordings. See [the sound guide](../../docs/audio.md).

## Try it

```sh
node bin/looplilt.mjs init my-film --example neon-relay
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs render my-film --out output/my-film.mp4
node bin/looplilt.mjs render my-film --format portrait --out output/my-film-tall.mp4
```

The source recomposes for wide and tall frames and also supports square output. Change actions and framing in `draw.js`; change notes, room sound, timing, and captions in `project.json`. Use a new output name for each revision.

The example is available under the repository’s [MIT license](../../LICENSE).

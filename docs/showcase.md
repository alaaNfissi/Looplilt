# A tour of the original films

The showcase contains twelve complete, editable Looplilt projects. Narrative, scientific, and kinetic-typography films now demonstrate the named-scene workflow; the existing stories and three compact starters remain available. A separate 26-second launch film, [Little Idea](../examples/little-idea), moves through several visual metaphors.

Every scene is drawn by Looplilt’s Canvas runtime. Every example score is synthesized by Looplilt. There are no stock clips, image-generation outputs, sampled music tracks, or private client projects in this collection.

| Film | Story and visual approach | Sound |
| --- | --- | --- |
| [The Brass Observatory](../examples/brass-observatory) · 32s | Clockwork storybook: a keeper fits a missing gear, aligns a telescope, and discovers a constellation. Five named shots, mechanisms, gestures, and layered scenery. | A six-track chamber waltz, plucked motifs, strings, piano, and clockwork details. |
| [The Quiet Between](../examples/the-quiet-between) · 32s | Scientific visualization: synchronized traces, a phase dial, point-by-point addition, and a perspective interference field. | A spacious five-track piano, pad, marimba, bass, and brushed arrangement. |
| [Make Room](../examples/make-room) · 28s | Kinetic typography: letter blocks, a circle that cannot fit, a spring-driven rearrangement, a curved route, and a geometric bloom. | Eight tracks of syncopated bass, clipped piano, brass, plucked phrases, drums, and sustained harmony. |
| [One More Light](../examples/one-more-light) · 40s | A lighthouse keeper restores a beacon. Pixel sprites, a coastal world, five shots, camera pans, a mechanism close-up, and a returning boat. | Strings, plucked melody, restrained chip lead, weather, footsteps, and machinery. |
| [The Missing Beat](../examples/the-missing-beat) · 36s | A newcomer finds a place in a jazz band. Character acting, ensemble choreography, close-ups, stage lighting, costumes, instruments, and audience reactions. | Walking bass, piano-like keys, brass, brushes, drums, and a triangle cue. |
| [Moonrise Express](../examples/moonrise-express) · 24s | The last train arrives where someone is waiting. Art Deco shapes, a layered viaduct, mountains, water glints, and a camera move toward the reunion. | A string-and-piano waltz and railway rhythm that slows at arrival. |
| [Neon Relay](../examples/neon-relay) · 24s | Two signals find a path around a wall. Luminous trails, perspective floor lines, layered buildings, and a route discovered through action. | Electronic groove, pads, bass, percussion, and a warmer harmonic resolution. |
| [Ink Tide](../examples/ink-tide) · 22s | A fish discovers that a leaf is company. Brush-like paths, translucent washes, ripples, lily pads, and a restrained transformation. | Plucked strings and marimba in conversation, with quiet water texture. |
| [The Little Lift](../examples/the-little-lift) · 24s | A tiny helper connects two friends. Isometric shapes, an opposing counterweight, a turning pulley, and readable cause and effect. | Music-box ensemble, gentle piano, plucked strings, and mechanical details. |
| [Pocket greenhouse](../examples/paper-garden) · 16s | Seed, rain, flower, visitor. A compact paper-world starter and the basis of the browser remixer. | A small melodic score. |
| [One motion. Two views.](../examples/orbit-to-wave) · 16s | A circular motion traces a wave. A compact explanation built around a geometric relationship. | A steady procedural pulse. |
| [Tiny delivery](../examples/tiny-delivery) · 16s | A robot solves a door problem. A compact pixel-comedy starter. | Playful accents and a short melody. |

## What the examples demonstrate

The renderer calls a drawing function at an absolute time. Camera cuts, zooms, parallax, lighting, textures, facial expressions, and character choreography are authored in JavaScript. They are drawing techniques, not separate editor features. The isometric film uses a 2D projection; the toolkit is not a 3D scene or physics engine.

Pixel art works by snapping geometry and camera positions to a chosen grid. Use whole pixel sizes and deliberate silhouettes. One More Light uses a fixed grid with a closer shot; Tiny delivery is a smaller starting point.

Wide, portrait, and square frames receive their own dimensions. The examples use that information to fit the scene. Wide and portrait MP4s are prepared for the gallery; square output is checked for playback and deterministic drawing but is not a separately curated gallery edit.

The new stereo studio expands the sound palette to 20 synthesized voices with panning, room reflections, echo, percussion, and environmental textures. The larger films use different arrangements. Named patterns and tracks in the three newest projects keep phrases and cue alignment editable. See [audio.md](audio.md) for the exact controls and the distinction between synthesized timbres and recorded instruments.

## Start with the closest creative problem

```sh
node bin/looplilt.mjs init my-film --example one-more-light
node bin/looplilt.mjs build my-film --out output/my-film.html
node bin/looplilt.mjs storyboard my-film --format portrait --out output/my-storyboard.png
node bin/looplilt.mjs render my-film --format portrait --out output/my-film.mp4
```

Change one action and one musical phrase first. Rebuild to a new output name, scrub the cause and effect, then watch the entire export. Adding layers only helps when they support the story.

To reproduce the complete gallery, run:

```sh
node scripts/make-showcase.mjs --out output/showcase
```

The destination must be new. The command renders both formats, captures the catalog’s chosen poster frames, builds players, and measures the delivered audio. It does not modify the live website.

## Boundaries worth understanding

Looplilt provides drawing, playback, synthesis, captions, and local export. It does not automatically invent a story, generate character artwork from a prompt, provide text-to-speech, or select licensed music. A person or coding agent authors the project files. The files remain inspectable and editable.

Storyboards help with composition; repeatability, decoding, and loudness checks help with technical quality. They do not replace watching and listening to a finished film. See [the current quality record](evolution/REPORT.md) for checks actually run and their limits.

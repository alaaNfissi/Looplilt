# A little idea

A 26-second original film: a restless dot becomes a flower, an orbit, and a kite. One character connects three uses of drawing code. The ending invites a viewer to make something of their own.

The color chip displays the actual `petal` value used to fill the flower. The orbit uses `orbitPeriod` to drive both motion and the displayed trace. The final drawing signature is Looplilt's API. These are illustrated code values, not a screen recording of an editor or agent session.

Change `colors` or `orbitPeriod` in `draw.js`, or reshape the kite's four points. Edit note events in `project.json` to change the original score. Every visual is a Canvas path or system-font glyph. There are no remote assets, sampled tracks, narration, or generated video clips.

```sh
node bin/looplilt.mjs build examples/little-idea --out output/little-idea.html
node bin/looplilt.mjs render examples/little-idea --out output/little-idea-wide.mp4
node bin/looplilt.mjs render examples/little-idea --format portrait --out output/little-idea-tall.mp4
```

Wide and tall frames are separately composed. This film has an ending rather than a seamless loop. See [launch preparation](../../docs/launch/README.md) for delivery files and review evidence.

Original artwork, drawing code, and score © 2026 Alaa Nfissi, under the repository's MIT license.

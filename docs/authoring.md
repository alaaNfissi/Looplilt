# Author a film

Start with `node bin/looplilt.mjs init my-film`. The folder contains a complete example you can edit. A project is deliberately small: `project.json` describes time and sound; `draw.js` draws the current frame.

## Project data

```json
{
  "version": 1,
  "title": "A small idea",
  "duration": 6,
  "fps": 30,
  "captions": [
    { "start": 0.5, "end": 3, "text": "Every big idea starts somewhere." }
  ],
  "score": [
    { "at": 0.2, "length": 1.4, "pitch": 60, "voice": "bell", "gain": 0.2 }
  ]
}
```

Duration is 0.5–600 seconds; frame rate is an integer from 1–60. Their product must be a whole number. Captions must be ordered, non-overlapping, and inside the film. Notes also stay inside the film. MIDI pitch 69 is A440; supported pitches are 24–108. `gain` defaults to 0.2 and `voice` defaults to `soft`. Other voices are `bell`, `pluck`, and `tick`.

The synthesizer produces a mono 48 kHz WAV with deterministic samples and peak headroom. Video export mixes an optional narration recording over a quieter score and normalizes the mix toward −16 LUFS with a −1.5 dBTP target. These are processing targets; measure the encoded audio when delivery specifications matter.

## Draw a moment

```js
function drawFrame({ ctx, w, h, t }) {
  ctx.fillStyle = '#f5f2e8';
  ctx.fillRect(0, 0, w, h);
  const x = w * (0.2 + 0.6 * Math.min(t / 4, 1));
  ctx.fillStyle = '#ea815e';
  ctx.beginPath();
  ctx.arc(x, h / 2, Math.min(w, h) * 0.08, 0, Math.PI * 2);
  ctx.fill();
}
```

`ctx` is a Canvas 2D context. `w` and `h` are the requested output dimensions. `t` is an absolute time in seconds. `progress` is `t / duration`; `frame` is the current integer frame index. `portrait` is true when height exceeds width.

Derive every position from `t`. Do not accumulate movement between frames, mutate global scene state, read the wall clock, or use unseeded randomness. Frames may be rendered out of order on separate browser pages. The runtime resets the canvas before every drawing call and adds captions afterward. Browser, operating system, and font differences can change pixels between machines; repeatability checks apply within the same rendering environment.

Use local helper functions for visual vocabulary. Keep content self-contained: no imports, remote fonts, network images, or fetches. The HTML player's content policy blocks network access. Project JavaScript executes in a browser, so open and render code you trust.

## Think in actions

Give each beat something physical to do: grow, compare, open, connect, split, or reveal. Use text to name what the viewer is already seeing. A good first pass has a visible setup, a meaningful change, and a clear payoff.

Build layouts from `w` and `h`. For tall frames, consider stacking elements that sit side by side in wide frames. Reserve the bottom 15% for captions if you use them. Keep essential detail inside a comfortable margin and test at phone size. Long captions can wrap; edit them into short cues rather than shrinking the type.

## Review and export

Build an HTML player and scrub the transitions. Export a storyboard for composition checks. Check the start, end, and every scene boundary at the actual output format. A contact sheet cannot reveal awkward timing or audio problems, so play the finished film too.

Use `--narration recording.wav` to mix a recording. Narration longer than the film is rejected, so adjust timing before export. Looplilt does not contact voice providers or create speech. Score timing and caption timing remain editable in `project.json`.

Outputs are created as new files. Choose a new name for a revision; delete an older render yourself only when you no longer need it.

# Programmatic use

The CLI is the most stable integration point. Module APIs are available from a source checkout; Looplilt is not currently published as an npm package. Use Node.js 22+ and ECMAScript modules.

```js
import { readProject } from './lib/project.mjs';
import { makeHtml } from './lib/build.mjs';
import { inspectProject, reviseProject, exportFrame } from './lib/inspect.mjs';
import { renderProject } from './lib/render.mjs';
import { startPreview } from './lib/preview.mjs';

const project = await readProject('./my-film'); // validates; never executes draw.js in Node
const html = await makeHtml(project, 'landscape'); // string, no browser dependency
const report = await inspectProject('./my-film');
```

| Function | Result / important options |
| --- | --- |
| readProject(directory) | Validated data, drawing, exact source text and SHA-256 fingerprint. |
| makeHtml(project, format, options) | HTML string; options sound (default true), audio ('synth' or 'pcm'). Caller controls how to save it. |
| inspectProject(directory) | JSON-compatible scene, cue, audio and validation report. Does not render. |
| reviseProject(directory, patch, outputDirectory) | New project plus revision receipt. Requires expectedSourceHash; changes only existing scene parameters of the same type. |
| exportFrame(directory, outputFile, options) | PNG and frame metadata; at is seconds, relative to scene when selected. Requires Chromium. |
| renderProject(directory, outputFile, options) | Verified media report; format, workers, scene or from/to, narration, signal, timeout, onProgress. |
| startPreview(directory, options) | { url, close, refresh }; format, port, signal. Starts a loopback-only read-only server. |

```js
const controller = new AbortController();
const video = await renderProject('./my-film', './output/reply.mp4', {
  scene: 'reply', format: 'portrait', workers: 2,
  signal: controller.signal, timeout: 180000,
  onProgress: ({ finished, frames }) => console.error(finished, '/', frames)
});
console.log(video.frames, video.duration, video.metrics);
```

Renderer and frame outputs refuse an existing file. A revision refuses an existing directory. Keep those protections when building a wrapper. Errors are thrown; callers should handle cancellation and await completion before reusing paths. Cancellation cannot interrupt synchronous Node audio synthesis until the event loop resumes.

Pure helpers can be imported from motion.mjs; scoreFor/expandMusic are in music.mjs. The drawing receives the same motion object without imports. Do not expose arbitrary drawing execution as an unauthenticated service. Projects are trusted JavaScript, not a safe upload format.

Module signatures may evolve in a future minor release. There is no TypeScript declaration package or promise of compatibility with browser engines other than the tested Chromium environment.

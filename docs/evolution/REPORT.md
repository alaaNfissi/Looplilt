# Looplilt 0.3 — engineering delivery and evidence

Validation: 5–6 November 2026. Baseline: v0.2.1, commit de670d44a29a95cfb5263ff55be02283aab559a0. Local environment: Windows, Node 24.19.0, Playwright 1.58.2, Chromium 145.0.7632.6, FFmpeg/FFprobe. Measurements below are executed results, with limits stated beside them.

## Conclusions and product direction

Looplilt is a local workshop for short, original, editable films. Its useful distinction is the complete path from ordinary source files to a specific creative revision and verified portable media, with no account or hosted renderer. An agent skill, CLI, or watch preview alone is not unique; competing tools already provide those.

The investigation confirmed the need for discoverable scenes, exact inspection, musical organization and less expensive previews/exports. It did not justify replacing Canvas with a universal scene graph, adding a network-facing MCP service, or building a nonlinear editor. The [decision record](DECISIONS.md) cites the official sources reviewed for Remotion, Motion Canvas, Manim, Rive, LottieFiles, MCP, Agent Skills, Anime.js, GSAP and p5.js. Competitors were researched, not benchmarked.

The first HTML preview still needs only Node. A nontechnical visitor can remix a real project in the browser and download editable source. Developers and suitably equipped coding agents use the same validated CLI and files. Documentation names example agents without claiming that every provider or execution environment has been tested.

## Architecture and implementation

The existing project.json + draw.js → standalone HTML → sandboxed Chromium → FFmpeg pipeline remains. Schema version 1 accepts optional named scenes, cues and musical arrangements; existing projects need no migration. There are no new npm dependencies.

- Scenes have stable IDs, local time, descriptions and small creative parameters. Pure-time keyframes, easing, analytical springs, cubic paths and scoped transforms supplement the standard Canvas API.
- Inspect reports scene ranges, cues, audio structure, requirements, warnings and a source fingerprint without executing drawing code. Frame exports inspect a precise instant; render accepts a scene or time range.
- Revise checks the expected source fingerprint, permits existing same-type scene parameters, and writes a new project directory. Adding a new action still requires drawing code; the command does not claim semantic editing of arbitrary JavaScript.
- A manually started, read-only loopback preview watches the two source files, retains the playhead and last valid film, and reports malformed edits. It provides scene navigation without becoming a filesystem editor.
- Named musical tracks and patterns expand to the existing score engine. Visual cues can anchor musical clips. Procedural voices, local supplied narration, captions, stereo placement and effects remain available offline.
- The standalone player synthesizes its score in a worker on demand. An embedded-PCM build option remains. The browser remixer now offers synchronized opt-in sound and preserves that score in the downloaded source.
- Export streams ordered PNG batches with backpressure into FFmpeg, uses explicit Rec.709 conversion, validates and fully decodes staged H.264/AAC, then exclusively creates the requested destination. It no longer writes a PNG per frame.

The JSON CLI, portable skill, [workflow guide](../workflow.md), [programmatic API](../api.md) and copyable installation prompt describe the same contracts. No hosted renderer, asset importer, external voice provider, npm publication, TypeScript package or MCP server is implied.

## Original films

The public gallery contains twelve curated films across eleven named styles. These three additions use original Looplilt drawing code and procedural arrangements; no external rendered clips or generated images are used. Each has complete wide and tall MP4s, an HTML player, source and a production note.

| Film | Story and visual craft | Score | Duration / measured AAC |
| --- | --- | --- | --- |
| [The Brass Observatory](https://looplilt.com/play/brass-observatory.html) · [source](../../examples/brass-observatory) | Clockwork storybook: a keeper repairs a telescope and reconnects a constellation; five composed shots, layered machinery and character action. | Six-track chamber waltz, nine voices. | 32 s; −14.94 LUFS, −1.55 dBTP |
| [The Quiet Between](https://looplilt.com/play/the-quiet-between.html) · [source](../../examples/the-quiet-between) | Scientific editorial illustration: wave packets, phase, synchronized component/sum plots and a two-source interference field. | Piano, pad, marimba, bass and brushes. | 32 s; −16.02 LUFS, −1.87 dBTP |
| [Make Room](https://looplilt.com/play/make-room.html) · [source](../../examples/make-room) | Kinetic typography: a circle cannot fit, a composition rearranges itself, and a graphic flower resolves the story. | Eight-track syncopated keys, bass, brass, guitar, strings and drums. | 28 s; −15.82 LUFS, −1.38 dBTP |

Every-second encoded contact sheets were visually inspected across both formats of all three films. All six exports fully decoded and completed real Chromium playback with zero reported dropped frames and no playback errors. This supports technical and visual review, not a claim of independent human preference or listening. [Media measurements](films.json) retain dimensions, timing, frame counts, loudness and playback evidence. The science film illustrates linear superposition; it does not claim a physical fluid simulation or disappearance of energy.

A fourth, separate [agent-created film and targeted revision](AGENT-TRIAL.md) is a worked evaluation example, not an extra gallery item.

## Executed verification

| Area | Result |
| --- | --- |
| Core | 47 tests passed: the prior 32 plus meaningful motion/music and workflow/security regressions. |
| Examples | All 13 CLI examples in three formats: 39 browser cases passed, including seek-order repeatability and playback controls. |
| Compatibility | Ten original projects retained byte-identical complete WAVs and 180 exact sampled PNG pairs against the untouched baseline on the same host. [Evidence](legacy-parity.json). |
| Workflow | Real scene navigation, exact PNGs, unchanged neighboring scenes after revision, worker/Node PCM equality, actual sound, live reload at the playhead and invalid-edit recovery passed. |
| Media workflow | Actual full 6 s / 180-frame and scene-range 2 s / 60-frame exports, decoded frame order/color, audio offset, existing-output protection and mid-render cancellation passed. An infinite drawing terminated within the test deadline. |
| Website | Desktop, 390 px, 320 px and tablet layouts; twelve films and all 24 media variants; style filters, clipboard, focus/keyboard, reduced motion, no-JavaScript and project-subpath operation passed. |
| Remixer | Real controls and ZIP download, 15 preview/export image comparisons, opt-in sound, audio-clock seeking, pace changes, worker/export PCM equality and an actual 12.8 s / 384-frame downloaded-project MP4 passed. |
| Installation | Portable skill and first named-scene film in a path containing spaces, without runtime node_modules; scene/track inspection and existing-file protection passed. |
| Supplied narration | Actual local tone-WAV fixture with captions, mixing, padding, duration rejection, portrait export and overwrite protection passed. This is a pipeline test, not a voice-quality evaluation. |

Reproduce with npm test, npm run test:browser, npm run test:workflow, npm run test:site, npm run test:remix and npm run test:install. Set LOOPLILT_TEST_MEDIA=1 for real media branches; see [validation](../validation.md) for requirements. CI includes Node 22/24 on Windows/Linux for core/build/package checks and Ubuntu Chromium/media tests. A configuration is not a passing remote run; consult the linked release's commit checks for their execution state.

Testing found and fixed a phone preview overflow, a reload/playhead issue, an RGB/YUV color-matrix mismatch and scene-end/negative-relative-frame boundary handling. Same-host pixel comparisons are meaningful; cross-platform font pixels are not promised identical.

## Performance and tradeoffs

The same benchmark harness ran baseline/current/baseline/current, two rounds each, with two workers and no concurrent rendering workload. Both versions used LOOPLILT_DISABLE_GPU=1 after an intermittent Windows graphics startup timeout; Chromium's sandbox stayed enabled. The failed default-graphics attempt is disclosed and excluded from the matched table. These are local ranges, not universal throughput promises.

| Measurement | Tiny delivery: 16 s / 480 frames, 0.2.1 → 0.3 | One More Light: 40 s / 1,200 frames, 0.2.1 → 0.3 |
| --- | --- | --- |
| HTML size | 2,063,187 → 36,081 bytes | 10,286,874 → 67,768 bytes |
| HTML build | 133–154 → 2.4–5.4 ms | 8,271–8,845 → 1.9–2.0 ms |
| Preview load | 405–704 → 165 ms | 1,509–8,209 → 150–219 ms |
| Actual MP4 render | 17.84–27.45 → 9.97–18.47 s | 53.16–69.06 → 25.38–33.26 s |
| Peak sampled scratch bytes | 25,029,884 → 2,059,446 | 46,929,941 → 10,167,885 |
| Peak Node RSS | 173–185 → 137 MB | 210–300 → 208–209 MB |
| Output MP4 bytes | 475,208 → 476,166 | 2,448,998 → 2,440,605 |

HTML is approximately 98.3% and 99.3% smaller. One matched tiny-film render was slower than its paired baseline; the longer film improved in both rounds. Node RSS excludes Chromium and FFmpeg. Scratch sampling at 100 ms can miss very brief peaks. No PNG frame files remained; browser-owned transient files and the staged WAV/MP4 still consume scratch storage. Encoded byte differences also reflect corrected color conversion.

Lazy sound shifts synthesis work rather than eliminating it. In a supplementary single run, first sound took 279 ms for Tiny delivery and 8,465 ms for One More Light; the latter retained 423 UI heartbeat ticks during synthesis. Embedded PCM prepared the work at build time and first sound took 55/36 ms, with much larger HTML and slower loading. Both modes passed play/pause/seek checks, and worker samples matched Node byte for byte. [Raw matched measurements](benchmarks.json), [audio comparison](audio-player.json), and scripts/benchmark.mjs make the conditions explicit.

## Separate-agent evidence

Two genuine separate sessions received the same original 12-second courier task and a corrected, bounded payoff revision. Both produced valid wide/tall HTML, retained their originals, preserved the score and checked earlier frames. The new participant used inspection and fingerprint-checked color revision, plus a new keyframe expression for the added hop.

The trial does not establish a revision-speed improvement: current revision elapsed time was longer and it inspected many more frames (480 pairs versus 20). Host stalls, different drawing/camera choices, one participant per version and a frozen development snapshot limit comparison. No token/cost, cross-provider or human-preference claim is made. [Task, measurements and exact original source](AGENT-TRIAL.md) are retained for reproduction.

## Security and release boundaries

[The security review](SECURITY.md) documents trust boundaries and executed regressions. Controls include bounded regular project files, syntax-only inspection, strict patch validation, token/Host/Origin-protected read-only preview routes, sandboxed offline rendering, CSP, blocked renderer requests, shell-free subprocess arguments, deadlines/cancellation, ordered bounded frame buffering, allowlisted archive entries and exclusive destination creation. Original licenses and prior releases are preserved. No telemetry, account or paid service is added.

Drawing JavaScript remains trusted source. There is no OS-level CPU/RAM quota or guarantee that arbitrary malicious uploads are safe. Synchronous Node synthesis can delay abort handling. A ten-minute schema ceiling is not a throughput guarantee. Standalone HTML uses browser security and cannot receive all renderer interception controls.

Release version is 0.3.0. Source and portable-skill ZIPs carry inventories and SHA-256 checksums. Publication uses the established repository, GitHub Pages and https://looplilt.com; it preserves earlier tags/assets and the maintainer's commit identity. The [release page](https://github.com/alaaNfissi/Looplilt/releases/tag/v0.3.0) and associated CI runs are the authoritative publication record. The domain checker covers canonical HTTPS/redirects and all current gallery assets.

Physical devices, non-Chromium browser engines, human headphone/phone listening, independent human creative review and broad agent-provider testing were not available. These limits do not convert into invented compatibility or quality claims.

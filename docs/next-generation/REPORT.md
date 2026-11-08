# Looplilt 0.4 — implementation and evidence

Validation: 6–8 November 2026. Starting point: v0.3.1, commit `411d09d195afeff612101e4e3976c3efbdfcfdd6`. Local environment: Windows, Node 24.22.1, Playwright 1.58.2 and Chrome 156 with its sandbox enabled. FFmpeg and FFprobe perform native media verification. This report distinguishes executed results from supported contracts and untested environments.

## Product and research conclusions

Looplilt now has one editable graph shared by a visual editor, code, local MCP tools and composition rendering. The original Canvas workflow remains available. A hosted Studio project stays in browser storage; the local companion connects Studio to the same disk workspace used by code and MCP. A portable project explicitly moves between those storage choices.

The [foundation assessment](../studio-foundation.md) records pinned source investigations and meaningful integrations with both Elah and Cutaway. Both imported original video, an image and audio, edited a composition, preserved Looplilt source and exported 330-frame films with stereo AAC. Cutaway was selected for its contained package boundaries and the observed integration behavior. The weighted scores, 4.20 and 2.90, are engineering judgments. They are not measured quality ratings.

Both candidates exposed timing or serialization limitations; Looplilt owns the canonical rational clock, serialization and compositor. OpenTimelineIO was assessed as editorial interchange, not a replacement for the visual graph. No OTIO adapter is shipped. Prior research and measurements in [the 0.3 report](../evolution/REPORT.md) remain historical baselines.

## Delivered architecture

[Architecture](../architecture.md), [graph contracts](../scene-graph.md), [Studio](../studio.md) and [MCP](../mcp.md) describe the implementation in detail.

- Version-2 graph documents have stable IDs, hierarchical source clocks, rational frame rates, transforms, shapes, paths, text, media, procedural source, cameras, masks, blend modes, effects, keyframes, transitions, constraints and reusable motion.
- Validated transactions support atomic multi-operation edits, optimistic fingerprints, undo/redo and recovery. Timeline lanes and selection derive from that graph.
- Assets use bounded reads, content hashes, project-relative references and verified portable bundles. Missing media can be relinked to matching original bytes.
- Studio adds visual selection, dragging, trimming, splitting, layer ordering, keyframes, motion controls, project management, import, synchronized playback and MP4/WebM export.
- The shared compositor awaits media readiness before publishing a frame. Preview, browser export and native graph jobs use the same evaluation and drawing path.
- Fifteen scoped stdio MCP tools expose creation, inspection, revision, comparison, asset import, readiness, rendering, cancellation and artifact retrieval. There is no arbitrary shell, unrestricted filesystem or universal JavaScript tool.
- Matching release ZIPs include the static Studio runtime. Source fingerprints and file hashes reject stale or modified distributions. The original dependency-free HTML build remains available.

## Real acceptance

| Scenario | Executed result |
| --- | --- |
| A — original film | Original source was preserved and combined with editable layers and media. Exact RGBA comparisons at 30 sampled frames across three formats, reverse seeks and two exact WAV comparisons passed. A portable 16-second / 480-frame composition exported and reopened. |
| B — visual editing | Actual video/image/audio import, timeline trim/move, animated title, save/close/reopen, phone and landscape layouts and a real 11-second / 330-frame export passed. Mean preview-to-encoded channel error: 1.27086 / 255. Audio correlation: 0.998398; offset: 0 samples. |
| C — agent → person → agent | The user confirmed a real Studio text edit. MCP then read revision 4 and its changed Message layer. A subsequent revision changed only the courier movement and preserved all 120 other nodes and the person's line. That line remains in the finished The Last Light. |
| D — visual → MCP | Browser-created motion, masks and constraints were followed by targeted MCP movement, fade and gain changes. Only two intended nodes changed; assets stayed identical. A 180-frame export fully decoded; mean preview channel error: 1.27896 / 255. |
| E — complex composition | The 88-node pixel/footage film combined groups, keyframes, masks, effects, text and audio. CLI and MCP agreed. A visual caption edit changed only node n80, preserved five assets, survived reopen and exported 180 frames. Three preview errors: 1.10167, 1.04780 and 1.04209 / 255. |
| F — concurrent edits | Stale transactions were rejected; visual drafts survived conflict. Disk and browser concurrency, undo/redo and checksum-verified history were tested. The complex acceptance rejected an MCP edit based on the revision preceding the visual edit. |
| G — failures and adversarial data | Graph cycles, unsafe paths, symlinks, malformed JSON, oversized media, invalid origins/hosts/tokens, missing assets, interrupted saving, stalled codecs, cancellation and stdin EOF were exercised. Completed artifacts and valid projects were preserved. |

These are real implementations and actual media. Automated UI operations are described as automated. The one person-confirmed editing session is separate evidence, not a claim of broad usability testing or a fabricated recording.

## Client integration

A real installed Codex CLI session used the local MCP server to create a six-second scene, animate a circle, inspect frame 90, change only a title and compare revisions. Two malformed operation requests were rejected before the client corrected them. Concrete operation examples were added to the catalog and documentation afterward.

Modern and legacy MCP SDK protocol modes, plus raw stdio, exercise creative workflows, concurrency and shutdown. They are not counted as independent desktop applications. Cursor was installed, but the native automation helper failed to initialize in two bounded attempts; no real Cursor conversation is claimed. Other client environments remain unverified locally. Any client with compatible local stdio MCP can attempt the documented setup; this is a capability requirement, not an assertion that every agent has been tested.

## Three original complete films

All three use Looplilt's graph, compositor, drawing source and procedural music. All are 1280×720 at 30 fps with 48 kHz stereo AAC. Complete decoding, full-timeline contact sheets, representative full-size visual review and encoded-audio comparison passed. No external stock film or generated raster artwork is used.

| Film | Visual story | Original sound | Measured output |
| --- | --- | --- | --- |
| [The Last Light](https://looplilt.com/#studio-film-the-last-light) · [editable](https://looplilt.com/studio/?story=the-last-light) | A courier's last delivery lights a sleeping street; 2,796 individually addressable graph nodes. | Piano, strings, guitar, marimba, bass, brushed percussion and weather. | 48 s / 1,440 frames; −16.42 LUFS, −1.24 dBTP; audio correlation 0.999072, zero lag. |
| [The Shape of Returning](https://looplilt.com/#studio-film-the-shape-of-returning) · [editable](https://looplilt.com/studio/?story=the-shape-of-returning) | A six-chapter scientific fieldbook follows water through ocean, vapor, cloud, rain, ground and sea. | Fingerpicked guitar, marimba, strings, piano, brushes, surf and rain. | 60 s / 1,800 frames; −17.75 LUFS, −1.58 dBTP; correlation 0.997581, zero lag. |
| [A Signal for the Garden](https://looplilt.com/#studio-film-a-signal-for-the-garden) · [editable](https://looplilt.com/studio/?story=a-signal-for-the-garden) | A pixel caretaker reconnects a station; original moving footage appears inside its monitors. | Syncopated bass, piano, drums, marimba, pads and chiptune counterpoint. | 52 s / 1,560 frames; −16.47 LUFS, −1.83 dBTP; correlation 0.999662, zero lag. |

The fieldbook and pixel film retain procedural artwork as drawing source, with separate editable graph titles, media and effects. They do not claim that arbitrary drawing code became individual vector objects. The pixel film's six-second rain clip was rendered from Looplilt's own fieldbook source. The original twelve-film gallery and remixer remain.

See [film measurements](films.json), [original source](../../examples/studio) and the source READMEs for reproduction. Source, portable projects, posters and finished masters are included. Loudness and waveform analysis do not replace a human headphone/phone listening review; none is claimed.

## Measured performance and quality

- A 2,796-node film reached “Ready to edit” 1,327.5 ms after its welcome-card click in a dedicated Chrome measurement. The 1.7 MB bundle download took 8.6 ms on the local server. Four measured long tasks totaled 1,204 ms. This is one local measurement, not a network or device guarantee.
- The same film's timeline had a 223 px viewport and a bounded 223 px canvas, with four mounted track headers and eight initial layer rows for a 150,296 px scroll range. Selection after a 70,000 px scroll, search, edit, reopen and range export passed.
- Focused evaluation of one audio dependency in a synthetic 1,202-node graph took 2.3346 ms for 720 samples, compared with 1,242.2456 ms for full evaluation, with exact gain parity. The approximately 532× ratio applies only to that evaluator experiment.
- Complete native render jobs, including cleanup and verification, measured 127.772 s for The Last Light, 105.242 s for The Shape of Returning and 124.604 s for A Signal for the Garden. Their masters are 17,971,361, 23,967,533 and 5,332,225 bytes respectively. They are different films and do not form a matched encoder benchmark.
- Preview comparisons use the same browser/platform/fonts. The values above measure lossy encoded pixels, not artistic merit. Software graphics were used for these media trials; no GPU speedup is claimed.

## Security and recovery review

Project text and metadata are data, not executable instructions. Custom node implementations require trusted host registration. Legacy drawing runs in a terminable worker within an opaque, network-blocked iframe, with its original bytes preserved. The source adapter is not executed in Node.

The companion binds to 127.0.0.1 and validates Host, Origin and a random private token. Render and workspace tokens are removed from error messages, original browser stacks and nested causes. Runtime source/hash checks run before default Studio and render hosts start.

Edits stage and flush files before atomic publication. A per-project lock, expected fingerprint and checksum-verified snapshots protect recovery. Imported media is bounded, scoped and hash checked. One render runs at a time, with four total accepted jobs. A job retains an immutable project snapshot; later edits do not change its output.

Real cancellation and stdin EOF stopped active native jobs after 15 and 19 encoded frames, preserved source and published no partial file. On this Windows host, browser cleanup took about 36–39 seconds. Codec cancellation reacted in 5–7 ms; a never-settling codec flush hit its approximately 60-second deadline and a subsequent export succeeded. Abrupt process termination can still leave an owned temporary directory or edit lock. Recovery does not guess that another process's lock is stale.

## Reproduce the verification

```sh
npm ci --ignore-scripts
npm test
npm run studio:setup
npm run studio:build
npm run studio:check
npm run test:graph-renderer
npm run test:legacy
npm run test:graph-jobs
npm run test:graph-shutdown
npm run test:codec-failures
npm run test:studio-editing
npm run test:studio-handoff
npm run test:studio-stories
npm run test:studio-complex
npm run site
npm run test:studio-welcome
npm run test:site
npm run test:install
npm run test:browser
npm run test:workflow
npm run test:remix
npm run pack
```

Media checks need Chromium, FFmpeg and FFprobe. Set `LOOPLILT_TEST_MEDIA=1` for the additional original-workflow and remixer media checks. [Validation](../validation.md) explains each command. The local core suite passed **124/124** in 216.515 seconds. Later browser, installation, packaging and remote CI results are recorded in [release status](RELEASE.md); a workflow configuration alone is not a passing CI run.

## Supported scope and remaining limits

Chrome 156 on Windows was used for current native/browser acceptance. CI adds actual Linux Chromium and Windows/Linux Node 22/24 checks when run. Responsive viewports are emulation, not physical-device testing. Edge is an intended Chromium target; Edge, Safari, Firefox, macOS and physical phone exports were not locally validated.

The graph focuses on 2D and video composition. Limits include 8 MiB JSON, 10,000 nodes, a one-hour graph timeline, bounded audio decode/mix memory and a 256 MiB estimated browser output budget. Original Canvas films retain their ten-minute limit. Codec support depends on the browser and device. Native graph jobs perform full FFmpeg verification; direct browser downloads cannot silently claim that native verification occurred.

No 3D engine, cloud renderer, OTIO adapter, automatic speech generation or unlimited export service is shipped. A browser project needs a portable-file backup. The local companion is the path for shared agent editing. Original source stays editable at its actual level of representation.

Public release and deployment are complete only after the checks recorded in RELEASE.md succeed.

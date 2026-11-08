# Validation

Checks distinguish technical correctness from creative judgment. A valid file is not proof of an excellent film.

| Layer | Reproducible command | What it checks |
| --- | --- | --- |
| Core and security | npm test | Schema limits, motion, music, revisions, output protection, HTML escaping, process cancellation, preview request boundaries, packaging. |
| Shared graph compositor | npm run test:graph-renderer | Real pixels, motion paths, custom painters, masks, effects, atomic failures and IndexedDB concurrency. |
| Legacy source adapter | npm run test:legacy | Exact original RGBA and audio, sandbox isolation and cancellation. |
| MCP render jobs | npm run test:graph-jobs | Real snapshots, frame/storyboard/video artifacts, full decode and active cancellation. |
| Render shutdown | npm run test:graph-shutdown | Explicit cancellation and true stdin EOF during real Chromium encoding; clean exit and no partial output. |
| Codec failures | npm run test:codec-failures | Never-settling native flush promises, cancellation, the real deadline, resource closure and a verified recovery export. |
| Visual editing | npm run test:studio-editing | Browser-local media import, real timeline trim/move, animated text, reopen, phone/landscape layouts, encoded pixels and audio alignment. |
| Visual-to-MCP handoff | npm run test:studio-handoff | UI motion/masks/constraints, targeted MCP movement/fade/gain edit, unrelated-data preservation and real export. |
| Large original Studio film | npm run test:studio-stories | One-click import, bounded timeline, search/edit/reopen, real range export, phone link and preview agreement against the published original. |
| Complex mixed-media handoff | npm run test:studio-complex | Own footage, pixel artwork, masks, effects and audio; UI-to-CLI/MCP agreement, stale-edit rejection, asset preservation, reopen and three encoded-frame comparisons. |
| Studio welcome and original films | npm run site; npm run test:studio-welcome | Five screen layouts, keyboard creation, all three portable-film links, no third-party media requests and visual evidence. |
| Studio distribution | npm run studio:check | Matching sources and complete static-runtime hashes. |
| All examples | npm run test:browser | Three formats, seek-order repeatability, actual playback and sound controls for every catalog example. |
| Creation workflow | npm run test:workflow | Live preview reload/errors, shot navigation, exact frames, targeted edits, worker/Node PCM, responsive layouts and bounded hostile drawing. |
| Real media workflow | LOOPLILT_TEST_MEDIA=1 npm run test:workflow | Full and scene-range exports, exact frames, decoded colors and order, audio timing, cancellation, output protection. |
| Website | npm run site; npm run test:site | Desktop/phone layouts, links, every media variant, filters, clipboard, focus/keyboard, reduced motion, no-JS and subpath operation. |
| Remixer | npm run test:remix | Actual controls and ZIP download, 15 export/preview image comparisons, audio opt-in/sync/retiming and exact worker/export PCM. |
| Installation | npm run test:install | Portable skill, first HTML without npm dependencies, paths with spaces, existing-file protection. |
| Performance | node scripts/benchmark.mjs new-report-folder | Actual render time, HTML size/build/load, sampled scratch storage and Node RSS, draw latency and hashes. |
| Deployment | node scripts/verify-domain.mjs | Canonical HTTPS redirects, routes and every showcase media asset. |

Set environment variables using your shell syntax; for example, PowerShell uses `$env:LOOPLILT_TEST_MEDIA='1'`. Media tests require Chromium, FFmpeg and FFprobe. Performance output folders must be new. Use LOOPLILT_BENCH_ENGINE to point the benchmark at a different trusted checkout while keeping the harness unchanged.

The original Canvas renderer checks H.264/AAC, yuv420p, dimensions, frame count/rate, duration and complete decoding before creating the destination; its FFmpeg path applies explicit Rec.709 conversion. Graph exports use the shared Studio compositor and browser WebCodecs, with format-specific H.264/AAC or VP9/Opus verification. Native graph jobs check timing and complete decoding before publication. Acceptance compares actual preview pixels and the encoded soundtrack. Showcase generation also measures integrated loudness and true peak.

Image comparisons apply within the same browser, platform and font environment. Runtime checks sample repeatability; they cannot prove all possible drawing times are deterministic. Tests do not establish physical-device support, human listening quality, cross-provider agent success, artistic merit, or rights to a user's supplied assets.

The [0.4 evidence report](next-generation/REPORT.md) records the shared Studio/graph/MCP implementation and its actual acceptance results. The [0.3 evidence report](evolution/REPORT.md) records executed results, original films, baseline comparisons and limitations. The [previous launch report](launch/QUALITY.md) is historical evidence for the earlier release, not a current test run.

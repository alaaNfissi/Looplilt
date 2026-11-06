# Validation

Checks distinguish technical correctness from creative judgment. A valid file is not proof of an excellent film.

| Layer | Reproducible command | What it checks |
| --- | --- | --- |
| Core and security | npm test | Schema limits, motion, music, revisions, output protection, HTML escaping, process cancellation, preview request boundaries, packaging. |
| All examples | npm run test:browser | Three formats, seek-order repeatability, actual playback and sound controls for every catalog example. |
| Creation workflow | npm run test:workflow | Live preview reload/errors, shot navigation, exact frames, targeted edits, worker/Node PCM, responsive layouts and bounded hostile drawing. |
| Real media workflow | LOOPLILT_TEST_MEDIA=1 npm run test:workflow | Full and scene-range exports, exact frames, decoded colors and order, audio timing, cancellation, output protection. |
| Website | npm run site; npm run test:site | Desktop/phone layouts, links, every media variant, filters, clipboard, focus/keyboard, reduced motion, no-JS and subpath operation. |
| Remixer | npm run test:remix | Actual controls and ZIP download, 15 export/preview image comparisons, audio opt-in/sync/retiming and exact worker/export PCM. |
| Installation | npm run test:install | Portable skill, first HTML without npm dependencies, paths with spaces, existing-file protection. |
| Performance | node scripts/benchmark.mjs new-report-folder | Actual render time, HTML size/build/load, sampled scratch storage and Node RSS, draw latency and hashes. |
| Deployment | node scripts/verify-domain.mjs | Canonical HTTPS redirects, routes and every showcase media asset. |

Set environment variables using your shell syntax; for example, PowerShell uses `$env:LOOPLILT_TEST_MEDIA='1'`. Media tests require Chromium, FFmpeg and FFprobe. Performance output folders must be new. Use LOOPLILT_BENCH_ENGINE to point the benchmark at a different trusted checkout while keeping the harness unchanged.

Video export checks H.264/AAC, yuv420p, dimensions, frame count/rate, duration and complete decoding before creating the destination. Showcase generation also measures the delivered AAC's integrated loudness and true peak. Export uses explicit Rec.709 conversion and metadata.

Image comparisons apply within the same browser, platform and font environment. Runtime checks sample repeatability; they cannot prove all possible drawing times are deterministic. Tests do not establish physical-device support, human listening quality, cross-provider agent success, artistic merit, or rights to a user's supplied assets.

The [0.3 evidence report](evolution/REPORT.md) records executed results, original films, baseline comparisons and limitations. The [previous launch report](launch/QUALITY.md) is historical evidence for the earlier release, not a current test run.

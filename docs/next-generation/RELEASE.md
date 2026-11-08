# Release verification

Looplilt 0.4.0 adds the shared scene graph, scoped MCP service and Studio editor. The public repository and canonical website are https://github.com/alaaNfissi/Looplilt and https://looplilt.com/.

## Executed local checks

- Windows 11, Node 24.22.1 and Chrome 156 with its sandbox enabled: the complete core suite passed 124/124 tests in 216.515 seconds. The final MCP catalog and request fixtures passed a separate 4/4 run.
- Studio production build, TypeScript checking and runtime integrity verification passed. Three finished original films passed full native media verification; [films.json](films.json) records their visual and audio measurements.
- Studio welcome, keyboard creation and real timeline seeking passed at desktop, 390 px, 320 px and short landscape sizes. All three editable films opened without external requests.
- Website checks passed for original and new films, exclusive audio, mobile layout, filtering, keyboard access, copy controls, reduced motion and JavaScript-disabled fallbacks. The project-subpath remixer link was corrected and rechecked separately.
- Portable skill installation passed inventory hashes, existing-folder protection and dependency-free first HTML creation and playback. The remixer passed 15 pixel comparisons and exact worker/export PCM checks.
- A real Codex CLI MCP session created, animated, inspected and revised an isolated project. Independent saved-file inspection confirmed its title-only revision. [Client evidence](client.json).
- Both release ZIPs were independently extracted into a new temporary directory and every inventory hash checked. A clean production install from the pinned npm lock completed. Using Node 24.19.0, the extracted skill runtime created and animated a scene through MCP, opened it in Studio, saved a real graphical text edit, inspected the change through MCP and preserved the unrelated animated circle. Its native renderer exported and fully decoded 90 H.264 frames at 640 by 360, 30 fps. This short installation check was intentionally silent; the three showcase films provide the soundtrack acceptance evidence. [Archive handoff evidence](archive.json).
- A real Opus-in-MP4 regression verified the Linux AAC fallback: native export produced stereo 48 kHz AAC, preserved every encoded video byte, retained audio alignment with correlation 0.9998098474783418, left existing AAC files untouched and removed conversion temporaries. Cancellation preserved the original bytes. [Audio compatibility evidence](audio-normalization.json).
- The complete OneDrive workspace audit checked 8,910 files without backup blockers or read errors before adding the final durable archive backups. New source paths were also checked against the 255 UTF-16-unit backup limit.

The clean five-package npm install took 21 minutes on this Windows machine. Installation duration is environment-dependent; no fast-install timing claim is made.

## Versioned publication records

[The 0.4.0 release record](https://github.com/alaaNfissi/Looplilt/releases/tag/v0.4.0) identifies the published commit, actual CI runs, downloadable source and portable skill archives, checksums, and post-publication website checks. Archive inventories cover each bundled file. Retain the supplied checksums with downloaded releases.

[Main checks](https://github.com/alaaNfissi/Looplilt/actions/workflows/check.yml?query=branch%3Amain) cover Windows/Linux Node 22/24 and Linux Chromium/media acceptance. [Pages deployments](https://github.com/alaaNfissi/Looplilt/actions/workflows/pages.yml) record the website build and deployment separately. A workflow definition alone is not evidence that its jobs passed.

The live-site verifier checks canonical HTTP/HTTPS and www redirects, old GitHub Pages deep links, Studio, runtime JavaScript and CSS MIME types, original and new films, and editable project downloads. GitHub Pages retains the looplilt.com custom domain with HTTPS enforcement.

See [the engineering report](REPORT.md) for acceptance A–G, commands, architecture, measured limitations and platform coverage.

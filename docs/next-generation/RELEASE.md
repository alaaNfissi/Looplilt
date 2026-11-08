# Release verification

Looplilt 0.4.0 is the release candidate for the shared graph, MCP service and Studio editor. The public repository and canonical website remain https://github.com/alaaNfissi/Looplilt and https://looplilt.com/.

## Completed local checks

- Windows 11, Node 24.22.1, Chrome 156 with its sandbox enabled: the complete core suite passed 124/124 tests in 216.515 seconds. The final MCP catalog and request fixtures passed a separate 4/4 run.
- Studio production build, TypeScript checking and runtime integrity verification passed. Three finished films passed full native media verification; their quality measurements are in [films.json](films.json).
- Studio welcome, keyboard creation and actual timeline seeking passed at desktop, 390 px, 320 px and short landscape sizes. All three editable films opened without external requests.
- Website checks passed for original and new films, exclusive audio, mobile layout, filtering, keyboard access, copy controls, reduced motion and JavaScript-disabled fallbacks. The project-subpath remixer link was corrected and rechecked separately.
- Portable skill installation passed its inventory hashes, existing-folder protection and dependency-free first HTML creation and playback. The remixer passed 15 pixel comparisons and exact worker/export PCM checks.
- A real Codex CLI MCP session created, animated, inspected and revised an isolated project. Independent saved-file inspection confirmed its title-only revision. [Client evidence](client.json).
- GitHub Pages retained the looplilt.com custom domain and HTTPS enforcement during preparation. New deployment and release downloads require separate post-publication verification.

## Publication record

The final extracted-archive checks, pull request, remote CI, release downloads and deployed website checks will be recorded here as they complete. No successful remote publication is claimed by the local results above.

See [the engineering report](REPORT.md) for acceptance A–G, exact commands, measured limitations and platform coverage.

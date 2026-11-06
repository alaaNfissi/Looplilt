# The editable film workflow

Decision record · 5 November 2026 · target release 0.3.0

## Product contract

Looplilt is a local workshop for short, original, programmable films. A creator or equipped coding agent should be able to name the shots, make a first film, inspect any moment, change one meaningful property, compare the result, and export verified media while retaining ordinary editable files. The browser remixer remains the small, installation-free introduction. The core remains useful without an account, model subscription, network service, or media toolchain for the first HTML preview.

This release succeeds when that complete loop works on original narrative, explanation, and motion-design projects; existing films retain their frames and scores; the new commands protect inputs and outputs; installation, website, CI, packages, and documentation agree with the actual implementation.

## Independent findings

The published baseline is v0.2.1, commit `de670d44a29a95cfb5263ff55be02283aab559a0`. Its 32 tests were rerun successfully. Its execution paths validate two files, compile-check drawing syntax without running it in Node, embed a standalone player, capture deterministic PNGs in sandboxed Chromium, synthesize local audio, encode H.264/AAC, decode the result, then exclusively copy to the destination. These are valuable contracts to preserve.

Confirmed friction: every example invents its own timing vocabulary; scene boundaries are not discoverable through data; the only visual inspection command samples six fixed moments; revision means editing arbitrary code; there is no live local preview. HTML eagerly synthesizes and embeds PCM even before sound is requested. Rendering keeps every PNG until encoding. Process timeout rejection can precede child-process exit, making cleanup harder to reason about. Browser `evaluate` calls need an outer cancellation boundary because an infinite drawing loop can outlive normal locator timeouts.

Initial real-media measurements on Windows, Node 24.19.0, Chromium 145.0.7632.6, two workers: Tiny delivery (16 s / 480 frames) took 24.70 s and peaked at 25.03 MB of scratch files; One More Light (40 s / 1200 frames) took 50.71 s and peaked at 46.93 MB. Their HTML files were 2.06 MB and 10.29 MB. This is one local run, not a throughput guarantee. Node RSS excludes browser and encoder memory. The reproducible harness is `scripts/benchmark.mjs`; the final sanitized comparison is published in benchmarks.json and REPORT.md.

## Ecosystem review and implications

Reviewed official sources on 5 November 2026; these are documented capabilities, not performance comparisons from running competitors.

| System | Relevant observation | Decision for Looplilt |
| --- | --- | --- |
| [Remotion](https://www.remotion.dev/docs/) and [its skills](https://www.remotion.dev/docs/ai/skills) | React video authoring, studio, render APIs, and extensive agent skills already exist. | Do not claim that an agent skill is unique. Keep dependency-light plain files and a first preview requiring only Node. |
| [Motion Canvas](https://motioncanvas.io/docs/) and [time events](https://motioncanvas.io/docs/time-events/) | Generator-driven scenes and editable timing events explicitly address voice-over synchronization. | Name shots and cues, but preserve absolute-time random access rather than adopting a generator scheduler. |
| [Manim internals](https://docs.manim.community/en/stable/guides/deep_dive.html) | Scenes, mathematical objects, and renderers form a specialized explanatory-animation system. | Offer useful educational films without attempting symbolic mathematics or duplicating its object library. |
| [Rive agents](https://rive.app/agents) | Plain-text authoring, inspect/verify/render commands, watch previews, and editor handoff are already part of an agent workflow. | Generic CLI/MCP features are not differentiation. Prioritize coherent, editable, offline film production. |
| [LottieFiles documentation](https://docs.lottiefiles.com/en) | Timeline authoring, JSON/dotLottie packaging, and application runtimes solve asset delivery across products. | Do not invent another embedded application-animation interchange format. Keep HTML and broadly playable MP4. |
| [Agent Skills](https://agentskills.io/specification) | Skills package instructions and supporting resources; they do not supply execution permissions. | Strengthen the existing portable skill and report actual interaction trials separately from compatibility documentation. |
| [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture) | MCP standardizes host/client/server tool exchange. | Defer a server: the chosen users already have file and terminal tools. A validated JSON CLI gives immediate value without a second permission boundary or protocol service. |
| [Anime.js](https://animejs.com/documentation/), [GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/), [p5.js](https://p5js.org/reference/) | Focused motion vocabularies, composition, and approachable drawing APIs are established strengths. | Add a small pure-time motion vocabulary; retain unrestricted standard Canvas drawing instead of importing a second animation engine. |

## Architecture decisions

1. **Keep schema version 1 and the two-file project.** Add optional named scenes, cues, and a declarative arrangement. Validate additive fields strictly. Old drawings receive their original arguments plus optional helpers; existing score synthesis must remain byte-identical. No migration is necessary for old projects.
2. **Scenes, not a universal scene graph.** Stable shot IDs, local shot time, descriptions, and small named parameters provide inspectable intent. The artist still controls drawing and transforms. Parameters only affect visuals when drawing code uses them; diagnostics will not pretend otherwise.
3. **One data model for both people and agents.** Inspection emits JSON with source hashes, ranges, cues, score structure, and actionable warnings. Revisions apply an explicit allowlisted scene-parameter patch to a new folder and require the expected source hash. Exact frames and scene ranges are first-class exports. Subjective artistic review stays distinct from deterministic checks.
4. **A local preview, not a nonlinear editor.** A manually started loopback server serves only one authorized project, protects its endpoints with an unguessable URL and Host checks, and offers reload, scene navigation, and useful errors. It cannot write files or browse a filesystem. The source editor remains the editing interface.
5. **Stream ordered frames with bounded buffering.** Adopt the verified backpressured PNG pipe into FFmpeg. Preserve staging, full media validation, output protection, exact frame order, and browser sandboxing. Retain the old implementation in Git for reproducible comparisons rather than promising GPU acceleration.
6. **Compact portable sound.** Adopt verified lazy synthesis from the score using the same pure PCM implementation in a worker. This removes eager base64 PCM and keeps the UI responsive, without adding a codec dependency to HTML creation. Exact Node/browser sample parity, timing and PCM fallback were verified; first-sound synthesis remains a documented tradeoff.
7. **Compose music as named tracks and reusable patterns.** Expand arrangements into the existing validated score. Reuse named visual cues as anchors. Keep procedural voices, supplied narration, and captions; defer network voice providers and sample imports.
8. **No new npm service or monorepo.** Keep the pinned browser dependency, source ZIP, and portable skill. Add documented programmatic contracts and declarations if they clarify the new primitives. Defer npm publication until ownership and a meaningful update channel justify another distribution surface.

## Evidence and release gate

Run core/security tests; real full and scene-range exports; Node/browser audio parity; deterministic frame comparisons for existing films; interruption and failure cleanup; local preview Host/token/path tests; mobile/desktop interactions; remixer export parity; installation in paths with spaces; package inventory checks; separate-agent creation and targeted revision trials. Render and inspect the new films throughout their timelines. Record untested physical devices, browser engines, human listening, and cross-provider agent environments honestly.

The live domain remains `https://looplilt.com/`, hosted by GitHub Pages. Preserve prior releases, original media, private-work exclusions, and the maintainer's commit identity. Publish only after applicable CI and release evidence are complete.

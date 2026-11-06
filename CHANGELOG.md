# Changelog

## 0.3.0 — 2026-11-06

- Add optional named scenes, creative parameters and shared cues while preserving version-1 projects.
- Add inspect, exact-frame export, scene/time-range rendering, source-hash-checked revisions to new folders, JSON results, and a local read-only watch preview.
- Add pure-time keyframes, easing, analytical springs, cubic paths and scoped transforms, plus named musical patterns and tracks.
- Generate portable-player sound on demand with the same PCM engine in a worker; keep an embedded-PCM fallback. Add synchronized, opt-in sound to the browser remixer.
- Stream ordered PNG batches to FFmpeg with backpressure, explicit Rec.709 color conversion, bounded child lifetimes, cancellation, staging and full decoding before final output.
- Add three original films: The Brass Observatory, The Quiet Between and Make Room, with wide/tall exports and distinct arrangements. Preserve the existing films.
- Update the public workflow, agent setup prompt, APIs, security review, installation guidance, and release evidence. Extend CI to Node 22 and 24 core checks on Windows and Linux, plus actual browser/media workflow tests.
- Publish reproducible local baseline comparisons and separate-agent creation/revision evidence with their limitations.

## 0.2.1 — 2026-11-04

- Redesign the launch site with a compact film gallery, eight explicit visual-style filters, story descriptions, and expandable craft and score notes.
- Add opt-in preview sound, larger touch controls, clearer wide/tall playback, and resilient clipboard and media fallbacks.
- Improve phone navigation and switching between remix controls and the result; add an optional full-screen preview and accessible palette selection.
- Present agent-assisted and terminal setup together. Document Codex, Claude Code, Cursor Agent, Gemini CLI, and GitHub Copilot CLI, with honest tool requirements and verified installation boundaries.
- Welcome contributions in animation, music, writing, design, testing, and code.
- Complete the looplilt.com custom domain, canonical redirects, and enforced HTTPS on GitHub Pages.

## 0.2.0 — 2026-11-03

- Add six original story films in wide and portrait, expanding the showcase to nine films across eight visual styles. Each project includes editable drawings and a distinct score.
- Add optional stereo scoring with 20 synthesized voices, instrument panning, room reflections, echo, percussion, and environmental sounds. Existing mono scores remain compatible.
- Add a browser remixer for Pocket greenhouse, with constrained controls, matching preview/export frames, and downloadable editable source.
- Add a portable instruction-skill installer and a copyable setup prompt, with a dependency-free path to a first HTML film.
- Improve gallery navigation, posters, mobile controls, reduced motion, and the standalone player's discovery link.
- Generate gallery players from source during website builds and omit duplicate player HTML from source archives.
- Prepare looplilt.com metadata and a tested domain-cutover checker covering canonical redirects and all nine films.
- Validate clean Windows/Linux installs, 32 core tests, 30 project/format browser combinations, all 12 new MP4s, and complete render/decode workflows.

Video export requires Chromium, FFmpeg, and FFprobe. Instrument sounds are synthesized approximations. Physical-device, non-Chromium, and human headphone/phone listening reviews are not included in the automated results.

## 0.1.0

Initial independent Looplilt release: editable Canvas projects, standalone players, local video rendering, original starter films, and a portable instruction skill.

# Candidate quality report

Validation dates: 29 October–3 November 2026. This report separates executed checks from launch gates. The stable v0.1.0 release is unchanged; this candidate must be reviewed before merging, deploying, or publishing.

## Executed locally

Windows, Node.js 24.19.0, Playwright 1.58.2 / Chromium 145, FFmpeg and FFprobe. Source checks and media checks also ran from a fresh temporary copy outside the synced workspace.

| Check | Observed result |
| --- | --- |
| Core unit suite | 32 tests passed, including project validation, overwrite protection, audio determinism, ZIP safety, source-text escaping, prompt consistency, canonical metadata, band-limited chip synthesis, and the stereo studio |
| Remixer | Controls, invalid values, safe text, real ZIP download, play/pause, reset, keyboard seeking, four viewport widths, and no external requests passed again on 3 November |
| Preview/export parity | 15 byte-identical PNG comparisons: five times in each of wide, tall, and square, using a customized title, palette, and pace |
| Downloaded project | Actual browser ZIP rendered to a 12.8-second MP4: 384 frames, 1280×720, 30 fps, H.264/AAC; complete decoding passed |
| Website | Layout at 320, 390, 768, and 1440 pixels; all 18 gallery MP4 variants; preview selection, pause, keyboard seek, reduced motion, links, and exact clipboard prompt passed |
| Source packaging | A fresh copy without generated gallery HTML passed all 28 core tests, built nine standalone players, and produced source and portable-skill archives. The source ZIP is about 41 MB; the portable runtime/skill ZIP is about 119 KB. Versioned checksums preserve earlier manifests. |
| Domain cutover checker | Four fixture tests cover canonical redirects, all nine films and 53 assets, missing videos, and incorrect media types. Current public DNS still points to Namecheap parking; live GitHub Pages DNS, certificate, and redirect verification remains pending activation. |
| Former repository path | Home → remixer navigation and relative assets passed when mounted at /Looplilt/; canonical metadata uses looplilt.com |
| Portable skill | New destination, inventory hashes, existing-folder refusal, independent runtime lookup, dependency-free init/build, drawing, playback, and safe attribution link passed again with the expanded runtime on 3 November |
| Skill metadata/discovery | Skill validator passed. skills CLI 1.7.4 found exactly one local skill named looplilt; telemetry was disabled |
| Original examples and launch source | All 30 combinations (ten projects × three formats) passed real playback and five-frame forward/reverse seek comparisons on 3 November |
| Launch renders | Both 26-second compositions contain 780 frames at 30 fps, H.264 yuv420p and AAC; complete decoding passed |
| Launch playback | Both MP4s reached the end with all 780 frames and zero dropped frames in the 3 November repeat. An earlier concurrent run had reported 18 dropped frames for wide |
| Visual review | Both launch compositions sampled across the full duration at two frames per second, plus storyboards; no cropped titles or missing scenes observed |
| Sound measurement | Launch files measured −15.07 LUFS integrated and −1.50 dBTP. These are delivered-file measurements, not a listening review |

The corrected reset control had shadowed the native form.reset method. The browser test caught that behavior. The preview also now uses the same opaque canvas context and final-frame clamp as the exported player.

## Expanded showcase

Six revised films are complete in wide and tall formats: One More Light (40s), The Missing Beat (36s), Moonrise Express (24s), Neon Relay (24s), Ink Tide (22s), and The Little Lift (24s). The first two use multiple shots and more developed character staging; the four shorter studies have deeper settings, more deliberate camera movement, and different musical arrangements.

All twelve exports contain their expected 660–1200 frames, decode completely, and reach the end in real browser playback. The latest checks recorded zero dropped frames for every version. The jazz film’s first wide playback had four dropped frames on a busy host; a repeat after rendering finished had zero, and both observations are preserved in the report. The delivered tracks are stereo AAC at 48 kHz. Integrated loudness ranges from −16.41 to −14.79 LUFS; measured true peaks range from −3.98 to −1.15 dBTP. [The machine-readable report](media/showcase-report.json) includes per-file results, playback counters, and SHA-256 hashes of both the media and its two project files.

Both compositions of each revised film were reviewed through full-duration contact sheets sampled once per second, alongside complete automated playback. Storyboard and close-up checks supplemented this review. This does not constitute a human listening review.

The original three scores remain byte-identical in a before/after comparison on this host. Studio mode is explicit opt-in. Unit tests cover all new timbres, exact stereo duration, deterministic samples, panning, decaying room tails, and dense-mix peak headroom.

The final gallery was reviewed visually on desktop and mobile. [Desktop capture](media/site-desktop.png), [phone capture](media/site-mobile.png), and [jazz-film card](media/gallery-jazz.png) show the candidate. The gallery does not autoplay its nine films or preload their video data; the muted hero is independently controlled and respects reduced motion.

## Environment limitations and pending checks

- Clean npm ci stalled repeatedly on this host, including another fresh temporary directory with a 120-second limit on 3 November. Pinned dependency bytes were restored from registry archives only after SHA-512 verification against the lockfile. This is not a successful local npm-ci result. The PR's clean Windows/Linux CI jobs are the gate for the normal installation path; consult their results for the current head.
- An optional LOOPLILT_DISABLE_GPU=1 compatibility setting was used for the remixer media check and the launch renders after intermittent headless timeouts. The sandbox stayed enabled. Website, installation, and twelve-format regression checks subsequently passed with default graphics settings.

- A file-layout and CLI discovery test does not prove Codex's live skill selector or an independent agent's success rate. No independent-user study or native integration is claimed.
- Human listening on headphones and a phone, physical-device testing, and non-Chromium browser coverage remain prelaunch review tasks. No subjective sound review is claimed.
- looplilt.com DNS, GitHub Pages custom-domain settings, certificate issuance, HTTPS enforcement, and real redirects are prepared but not activated or verified. Follow [the domain handoff](../domain.md).
- Launch posts, directory submissions, analytics services, a release, and production deployment have not been published or enabled.

## Baseline preserved

Before changes, the 16-test core suite, site build and four-width checks, doctor, init/build/sound, full 16-second render and decode, media fixture, and release packaging were exercised. Nine original example/format browser combinations subsequently passed. Existing release assets were preserved.

The branch adds a real constrained remixer, a portable installer, a setup prompt, a clickable runtime credit, an optional stereo sound studio, original editable films, and review materials. It introduces no backend, user-code editor, tracking, uploaded artwork, or cloud rendering.

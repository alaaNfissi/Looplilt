# Product assessment and decisions

Review baseline: 26 October 2026, main commit `a7c750e`, stable release `v0.1.0`. This assessment informed v0.2.0; the maintainer approved promotion to main and release publication on 3 November 2026.

## What inspection established

Looplilt has a small, understandable project format, three original starter films with scores, standalone players, and a local renderer. The brand is distinctive and already communicates craft. The main technical advantage is that the source is small enough to inspect and change.

The baseline visitor could watch six wide/tall MP4s and download examples. Creating anything required leaving the site for a clone and terminal workflow. The hero's studio language did not immediately explain JavaScript or the toolkit boundary. Agent instructions explained manual copying, but an instruction-only skill installation could leave the runtime missing. Standalone players named Looplilt without a clickable discovery path and placed a copyright line close to the film title.

These are observed interface and workflow facts. Their effect on conversion is a hypothesis: there are no visitor interviews, funnel analytics, or independent user tests in this review.

The existing core suite, website build and responsive playback checks, doctor, init, HTML build, complete 16-second render, decode check, media fixture, and packaging were exercised. npm stalled on this host; exact dependencies were restored from registry archives after SHA-512 verification against the lockfile. Standalone browser checks initially timed out, then passed all nine original example/format combinations. Detailed outcomes and remaining limitations belong in [QUALITY.md](QUALITY.md).

## A realistic place among adjacent tools

| Tool | What its primary documentation demonstrates | Implication for Looplilt |
| --- | --- | --- |
| [Remotion](https://www.remotion.dev/docs/) | React video projects, a preview/editor ecosystem, parameterization, rendering, and coding-agent workflows | Agent-assisted video is not a unique claim. Stay smaller than a React production platform. |
| [Motion Canvas](https://motioncanvas.io/docs/) | TypeScript generator-based animation with a real-time editor, especially for informative vector animation | Do not imitate its editor. Explain absolute-time Canvas authoring and the portable player. |
| [Manim Community](https://docs.manim.community/en/stable/installation.html) | Programmatic mathematical animation, local Python tooling, and browser notebook options | Browser experimentation is not unique either. Offer a crafted first result and plain JavaScript source. |
| [Open skill conventions](https://agentskills.io/) | Reusable instruction packages for compatible agents | A skill helps an existing agent work; it does not provide execution tools or prove native integration. |

Positioning: **a small JavaScript animation toolkit for editable short films, portable HTML previews, and local video export**. Intended users are curious developers, creative coders, and educators willing to edit code or work with an equipped coding agent. It is not a full browser video editor.

## Decisions

| Proposal | Decision and expected benefit | Cost, risk, simpler alternative |
| --- | --- | --- |
| Browser remixer | Accept one trusted greenhouse. Remove installation from the first meaningful creative action. | Small static UI and shared parameter model. No code uploads, backend, persistence, or generic editor. A color-only mockup would not produce a usable project. |
| Agent installation | Add a copyable setup prompt and explicit portable local installer. Build HTML before installing media tools. | Copying a small runtime avoids hidden absolute paths. No registry publication, auto-updater, system installer, or claims that a skill supplies tools. |
| Sharing attribution | Link the player footer to Looplilt and explicitly label runtime ownership. | One normal link; no tracking, canvas watermark, or creator database. |
| Website | Preserve the brand; state the toolkit category and show distinct remix/setup routes. | Small copy and onboarding changes. No redesign or additional frontend framework. |
| Launch demonstration | One original 26-second story, wide and tall. Show code values that drive actual drawings. | Drawing and review time. Reject a fake agent recording and an undifferentiated montage of existing examples. |
| Expanded showcase and sound | Add six original story projects and an optional stereo studio. Show a wider creative range through real output and editable scores. | Keep the existing mono path compatible. Use locally synthesized instruments and effects; no sample library or voice service. |
| Community | One GitHub issue form and an initial creative prompt. | Manual review until demand exists. No invented gallery, weekly commitment, leaderboard, or rewards. |
| Analytics | Document a voluntary first-film study and available aggregate GitHub signals. | No new tracking account or personal identifiers. Stars and download counts are not successful creators. |
| Browser MP4 export | Defer. | Browser encoding/audio compatibility would expand scope and support burden. The MVP makes the local export boundary explicit. |
| Cloud rendering, general code editor, GPU encoder, TTS | Defer. | They do not remove the first-use gap as cheaply as an HTML-first path. Existing rendering remains portable and unchanged. |

## Risks and next evidence

The largest remaining risk is that people enjoy the remixer but never work with source. Invite a small voluntary cohort to take one downloaded project through HTML preview and a meaningful edit. Record where they stop, not just whether they click Download.

A second risk is installation variability. Report actual tested environments and preserve an HTML-only route. A successful scripted installation is not an independently measured agent success rate.

Preserve earlier release assets. Verify launch destinations after deployment and domain activation. External posts still require the maintainer's approval.

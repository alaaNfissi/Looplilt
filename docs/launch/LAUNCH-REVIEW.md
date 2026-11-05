# Launch review — v0.2.1

Completed locally on 4 November 2026. The launch pass improves the website, mobile editing, setup, and contribution paths. The nine original films and their audio remain reproducible from the included Looplilt projects.

## Experience

- Three-column desktop gallery, two-column tablet gallery, and readable phone cards. Eight explicit visual styles have keyboard-operable filters; each film exposes its story, source, format, drawing techniques, and original score.
- Opt-in hero sound, exclusive film playback, larger touch controls, reduced-motion support, and usable no-JavaScript and clipboard fallbacks.
- Agent-assisted and terminal setup side by side, with the exact maintained setup prompt. The compatibility guide names Codex, Claude Code, Cursor Agent, Gemini CLI, and GitHub Copilot CLI and explains the required execution tools.
- Unobstructed phone remix controls, direct links between controls and preview, optional full-screen preview, and accessible palette state. The downloaded project includes the score; local MP4 export requirements are explicit.
- An invitation for everyone to contribute films, sound, writing, design, testing, or code, with a practical first-contribution guide.

## Executed checks

| Area | Result |
| --- | --- |
| Core | All 32 tests pass, including exact setup-prompt synchronization, safe output creation, score validation, and archive checks. |
| Installation | Portable skill inventory, existing-folder protection, independent runtime lookup, dependency-free first HTML build, playback, and drawing pass. |
| Website | 320, 390, 768, and 1440px layouts pass without horizontal overflow. All 18 MP4 variants load and play at desktop and phone widths. |
| New interactions | Style counts and keyboard filters, same-hash links to hidden films, playback handoff, opt-in sound, 44px key touch controls, clipboard selection fallback, no-JavaScript content, and reduced motion pass. |
| Remixer | Safe text, invalid input, palettes, phone control access, preview/edit navigation, playback, reset, keyboard seeking, ZIP download, and zero external requests pass. |
| Export fidelity | Fifteen pixel-exact comparisons across wide, tall, and square previews and the downloaded drawing pass. |
| Actual video | Downloaded source renders to 384 frames at 1280×720, 30fps, 12.8 seconds, H.264/AAC; complete decoding passes. |
| Domain | looplilt.com uses GitHub Pages with enforced HTTPS. The domain checker covers seven canonical/redirect routes and 53 gallery assets; it must be rerun after deployment. |

The final source was validated from a fresh temporary copy outside the synced workspace. The existing pinned browser and media dependencies were used, with Chromium sandboxing enabled. The repository's Windows/Linux and browser/media CI remains the release gate; inspect the workflow result for the published commit.

## Scope and limits

The compatibility table records official agent capabilities, not independent end-to-end trials in every named product. An agent still needs file/process access and permission to execute commands. Text-only chats cannot render by themselves.

Responsive Chromium checks are not physical-device or Safari/Firefox certification. No new subjective human listening study or independent-user conversion study is claimed. Earlier media validation and its limits remain in the [v0.2.0 quality report](QUALITY.md). External launch posts and directory submissions remain drafts.

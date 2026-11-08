# Contributing to Looplilt

Everyone is welcome to help. Films, musical ideas, clearer documentation, design improvements, bug reports, and code all count. Programming experience is not a prerequisite.

## Find a first contribution

| You enjoy… | A useful place to begin |
| --- | --- |
| Animation and storytelling | Make an original short film from a starter and share its editable project. |
| Music and sound | Improve a procedural score or explain an audio technique. |
| Writing and teaching | Try the setup guide, clarify a confusing step, or contribute a short tutorial. |
| Design and accessibility | Report a difficult mobile interaction, keyboard problem, or unreadable detail. |
| Testing and troubleshooting | Report a reproducible bug or a platform-specific installation problem. |
| JavaScript and tooling | Improve the player, renderer, remixer, validation, or developer workflow. |

Browse [open issues](https://github.com/alaaNfissi/Looplilt/issues), or [start a new issue](https://github.com/alaaNfissi/Looplilt/issues/new/choose) with an idea. If you are unsure where to begin, say what you would like to help with. Discuss substantial new features and gallery films before investing in a large change.

## Report something that did not work

Small, focused changes are welcome. Open an issue for a bug, an unclear setup step, or a new capability you would use. Include your operating system, Node version, the command, and a minimal project that reproduces the issue. Remove private material first.

For website or accessibility reports, include the browser, approximate screen size, and steps to reproduce the problem. A written description is enough; a screenshot can help explain a layout issue.

## Send a focused pull request

Fork the repository and create a branch for one clear change. Describe the problem and resulting behavior in the pull request. Add a screenshot or short clip when it helps review a visual change.

For a code change, run `npm test`. If it affects drawing, the player, or rendering, also run `npm run test:browser` and inspect a short exported film. Website changes should pass `npm run site` and `npm run test:site`; remixer changes should also pass `npm run test:remix`. Report the checks you ran and any environment limits. Documentation-only fixes do not need the full video-rendering suite. Keep temporary outputs, local paths, credentials, and dependency folders out of commits.

## Work on Studio or MCP

From a source checkout, run `npm ci --ignore-scripts`, `npm run studio:setup`, `npm run studio:build` and `npm run studio:check`. Studio uses a pinned frontend workspace; its generated runtime stays outside version control and is included in verified release ZIPs. After changing only an original Studio film, `npm run studio:stories` refreshes the example bundles without recompiling unchanged editor code.

Use shared graph transactions for new editing behavior. Do not add a competing saved timeline model. Run the relevant [acceptance commands](docs/validation.md): visual editing, legacy source import, MCP handoff or complex mixed-media export. For welcome-screen changes, build the site and run `npm run test:studio-welcome`. Include actual frames or media when reporting renderer changes; a passing schema check does not establish visual correctness.

## Share original work

Examples should tell a distinct visual story and include their editable drawing and score. Submit only material you have the right to share. Do not copy another project's illustrations, characters, prose, code, or example media into the collection. By contributing, you agree to license your contribution under this repository's MIT license; retain notices required for any separately licensed contribution and discuss them before adding it.

The maintainer is Alaa Nfissi. Use descriptive commit messages about the change, and be considerate of other contributors. Ideas and careful feedback are welcome alongside finished patches.

To share a finished original film, use the [showcase guide](docs/community.md) and the repository's Share a creation issue form. This is a new initiative: submissions are reviewed before any gallery inclusion.

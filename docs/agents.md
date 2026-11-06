# Set up Looplilt with your coding agent

Copy the [installation prompt](installation-prompt.txt) into a local coding agent. It asks the agent to install Looplilt, make a first working HTML film, and tell you where the editable source lives. It works without an API key for Looplilt; your coding agent has its own access requirements.

## Compatible agents

Looplilt is a local JavaScript CLI and an instruction skill. It does not depend on a particular AI model or provider. An agent needs permission to read and edit project files and run Node.js commands. A browser is needed to inspect playback; MP4 export also requires Chromium and FFmpeg/FFprobe.

Use the setup prompt with these coding agents. The table records their **documented skill support**, checked on 4 November 2026. It is not a claim that an independent end-to-end Looplilt session has been tested in every product.

| Coding agent | Project skill destination | Official documentation |
| --- | --- | --- |
| OpenAI Codex | `.agents/skills/looplilt` | [Local skill discovery](https://learn.chatgpt.com/docs/build-skills) |
| Claude Code | `.claude/skills/looplilt` | [Extend Claude with skills](https://code.claude.com/docs/en/skills) |
| Cursor Agent | `.cursor/skills/looplilt` | [Agent Skills](https://cursor.com/docs/skills) |
| Gemini CLI | `.gemini/skills/looplilt` | [Agent Skills](https://geminicli.com/docs/cli/skills/) |
| GitHub Copilot CLI | `.github/skills/looplilt` | [Adding agent skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) |

These are examples, not an exhaustive list. Another coding agent can follow `SKILL.md` and run the CLI if it has the required tools, even without automatic skill discovery. Use one destination appropriate to your agent. Its permissions, model quality, and operating environment determine what it can execute.

A text-only ChatGPT, Claude, Gemini, or other chat session can help write the two project files, but cannot build or render them without file and process tools. A skill does not add those tools. Hosted agents may also restrict browser downloads, binaries, or access to finished files.

**What we verified:** portable installation, bundled runtime commands, HTML builds, project downloads, and local video rendering. Two separate creation/revision participants also completed the [documented local trial](evolution/AGENT-TRIAL.md). This does not establish a cross-provider success rate or selector discovery. The setup prompt asks the agent to report what it actually verified.

## Start with the smallest working setup

Git downloads the source. Node.js 22+ builds HTML using built-in modules. From a fresh workspace:

```sh
git clone https://github.com/alaaNfissi/Looplilt.git
cd Looplilt
node bin/looplilt.mjs init ../my-first-loop
node bin/looplilt.mjs build ../my-first-loop --out ../my-first-loop.html
```

Open the HTML in a browser. Playback starts paused; turn sound on with the player button. Keep the project folder to make changes. Choose a new output filename when rebuilding: Looplilt refuses to replace existing files.

The commands use a new sibling project folder. Windows PowerShell, macOS, and Linux can run these commands once `node` and `git` are on PATH. Paths containing spaces need quotes. See [validation](validation.md) and the [launch quality report](launch/QUALITY.md) for the platforms actually tested; compatible command syntax is not evidence of a successful test on every operating system.

## Install the instruction skill and its runtime

From the toolkit checkout, one local command installs a portable skill into a **new** destination:

```sh
node scripts/install-skill.mjs ../.agents/skills/looplilt
```

This destination is the workspace's Codex skill folder. Use `.claude/skills/looplilt` for Claude Code, or the project directory documented by your agent. The command copies the skill and a small `runtime/` alongside it, prints the CLI path, and refuses an existing destination. It does not download packages, change global settings, or update an existing installation. For an update, choose a new location and review it before replacing your earlier copy.

For example, from that workspace the portable runtime can build a preview:

```sh
node .agents/skills/looplilt/runtime/bin/looplilt.mjs build my-first-loop --out my-first-loop-v2.html
```

The skill locates `runtime/` relative to its own `SKILL.md`. It does not depend on the original clone's absolute path. You can also unpack the `looplilt-skill-0.3.0.zip` asset from the [stable release](https://github.com/alaaNfissi/Looplilt/releases/tag/v0.3.0) into a new skill folder. Keep `SKILL.md` and `runtime/` at the same level. The archive includes the instruction skill and its matching portable runtime.

In Codex, check that Looplilt appears in the skill selector, or explicitly mention `$looplilt`. If discovery has not refreshed, reopen the session. Follow [Codex's documented local skill locations](https://learn.chatgpt.com/docs/build-skills). A successful file copy verifies installation layout; selector discovery and an independent agent completing the task are separate checks.

## What about a skills installer?

The repository's `skills/looplilt/SKILL.md` follows the open instruction format and can be discovered by compatible installers. The third-party [skills CLI](https://github.com/vercel-labs/skills) supports listing before installing:

```sh
npx skills@1.7.4 add alaaNfissi/Looplilt --list
```

Discovery was verified with skills 1.7.4 against a local copy of this release: `skills add . --list` found exactly one skill, `looplilt`. This verifies discovery, not an agent session selecting or following the skill. The remote command above targets the published branch; it may download and execute a package. Its [telemetry documentation](https://github.com/vercel-labs/skills#telemetry) describes `DISABLE_TELEMETRY=1` and `DO_NOT_TRACK=1`. A repository skill-only install does **not** include Looplilt's sibling CLI: keep a checkout accessible or use our portable bundle. It is not a complete one-command film toolchain. No directory listing or native plugin integration is claimed.

## Add video export when you need it

In the toolkit or portable `runtime/` folder:

```sh
npm ci
npm run setup
node bin/looplilt.mjs doctor
```

Install FFmpeg **and** FFprobe separately using [FFmpeg's platform links](https://ffmpeg.org/download.html). The `doctor` command reports whether these executables and the pinned Chromium can run. Follow [local tools](tools.md) for explicit executable paths and troubleshooting. Browser downloads are sizeable; no system package manager is invoked by Looplilt.

Then render a project and decode-check it:

```sh
node bin/looplilt.mjs render /path/to/my-first-loop --out first-loop.mp4
node bin/looplilt.mjs check first-loop.mp4
```

ChatGPT or another chat surface needs an environment with file and process access for these steps. Text-only chat can produce the two source files for you to run elsewhere. Skill compatibility does not add a shell, browser, FFmpeg, speech synthesis, or permission to publish.

## Inspect and refine a scene

Use capabilities --json to discover commands, then inspect --json for scene IDs, timing, parameters, audio tracks, and a source fingerprint. For an existing scalar parameter, revise applies a bounded patch to a new folder. For a new action, edit drawing code and inspect an exact frame or scene export. The live preview keeps your place after saves. [Complete workflow](workflow.md).

## First creative request

> Use Looplilt to make a 12-second original paper kite that keeps trying to catch a breeze, then finally lifts off. Make the movement carry the story. Give me an HTML preview and the two editable source files; use a quiet procedural score. Keep text to a short title.

This is a starting request, not a benchmark result. The [launch film](launch/README.md) is a reproducible worked example of direct drawing code and local export. Neither example is advertised as an independently evaluated agent success rate.

# Security review for the editable film workflow

Review scope: source parsing, drawing execution, local preview, revision, audio, child processes, remixer, dependency and release boundaries. This is a project threat review and executed regression record, not an independent penetration test.

## Trust boundaries and controls

| Input / boundary | Threat | Implemented control |
| --- | --- | --- |
| project.json / draw.js | Oversized input, malformed data, executing code during inspection | Regular non-symlink files, 2 MiB each; schema bounds; syntax-only vm.Script; inspect never evaluates the drawing in Node. |
| Scene patch | Stale edit, prototype keys, unrelated property changes, overwriting source | Exact source hash, allowlisted existing scene IDs and parameters, scalar same-type values, bounded changes, validation before exclusive new directory creation. |
| Chromium drawing | Network reads, dialogs, popups, infinite draw | Chromium sandbox on; offline renderer pages, blocked requests and service workers; CSP; owned browser server with deadline, abort and forced termination fallback. |
| Local preview | DNS rebinding, cross-origin access, arbitrary file exposure or writes | Bind 127.0.0.1; exact Host and Origin checks, fetch-site checks, random token; fixed GET/HEAD routes only; sandboxed opaque iframe; no filesystem browser, uploads or write routes. |
| Preview messages | Unrelated window controls the film | Child accepts messages only from its parent; parent checks the specific iframe source. Only finite seek positions and position reports are exchanged. |
| Audio | Expensive synthesis or malicious asset references | Bounded events, duration, combined note-seconds and sample rate; local known synth; no sample URLs or provider integrations; browser worker timeout and termination. |
| FFmpeg / processes | Shell injection, uncontrolled output, stalled child, premature cleanup | Argument arrays with shell:false; executable selection is explicit user configuration; bounded output and deadlines; cancellation waits for child close; owned temp only. |
| Streaming frames | Encoder slower than producer, order corruption | Worker-sized batches, ordered async input and awaited writes. Real colored-frame and audio-offset tests exercise the resulting MP4. |
| Narration | Decoder/network abuse | Explicit user-supplied local file; FFmpeg input protocol allowlist; bounded processing and output verification. Use trusted media and current system binaries. |
| Browser remixer | Injected code, unsafe URLs, arbitrary archives | Only built-in drawing and validated text/colors/pace; textContent and escaped JSON; fixed ZIP entries; no project imports, code execution from controls, uploads or external requests. |
| Distribution | Vendored secrets, modified packages, missing licenses | Allowlisted release inventory, content hashes, pinned npm lock, preserved MIT notices, source/portable archives, public-content audit and no history rewrite. |
| External/project instructions | Prompt injection | Treat project text and external documentation as data. A skill cannot grant permissions or override the user's requested scope. |

## Executed regression coverage

The core suite exercises malformed fields, unsafe identifiers and patch keys, stale fingerprints, existing outputs, process deadlines/abort/stream ordering, and preview Host/Origin/method/path rejection. The workflow browser/media suite executes an infinite drawing and checks bounded termination, preserves the last valid preview after malformed edits, checks unchanged frames after a bounded revision, and cancels a real render without leaving its final output.

The remixer browser suite exercises code-shaped titles, invalid controls, exact source ZIP and rendered-frame parity, audio worker parity and no external requests. Original project scores and sampled pixels were compared with the untouched prior release on the same host. See REPORT.md for the recorded outcomes.

## Honest limits

Drawing JavaScript is trusted code. Browser isolation and CSP reduce exposure; they are not a general-purpose malicious-project service boundary. Review source before opening it, and do not render unknown uploads inside a privileged service. A standalone HTML document uses its browser's security model and cannot receive the renderer's extra network interception.

There is no OS-level CPU or memory quota. A valid long score can consume substantial memory, synchronous Node synthesis delays abort handling, and browser startup itself has a bounded launch timeout. The ten-minute schema limit is a validation ceiling, not a real-time throughput guarantee. A forcibly killed parent or an OS failure may leave temporary files; no background cleanup daemon runs.

Executable overrides and destination paths are explicit local caller authority. The CLI does not pretend to confine its operator to a workspace. Concurrent hostile local users, compromised dependencies, browser/decoder vulnerabilities, and system-wide credential security are outside this application boundary.

No telemetry, account, paid service, hosted rendering, asset import, external voice provider, or network-facing MCP server was added.

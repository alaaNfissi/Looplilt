# Local tools

HTML builds need Node.js 22 or newer. Rendering, storyboards, and browser checks also need `npm ci` and a Chromium browser installed with `npm run setup`. Video encoding and checking need FFmpeg with the `libx264` and AAC encoders plus FFprobe.

Run `node bin/looplilt.mjs doctor` to check the local environment. No credentials are read by Looplilt. No network requests are required while rendering a self-contained project after dependencies have been installed.

## Optional executable paths

| Variable | Meaning |
| --- | --- |
| `LOOPLILT_BROWSER` | Absolute path to a compatible Chromium executable; otherwise use Playwright's installed browser. |
| `LOOPLILT_FFMPEG` | FFmpeg executable; otherwise resolve `ffmpeg` from `PATH`. |
| `LOOPLILT_FFPROBE` | FFprobe executable; otherwise resolve `ffprobe` from `PATH`. |

In PowerShell, use `$env:LOOPLILT_FFMPEG = 'C:/tools/ffmpeg.exe'`. In a POSIX shell, use `export LOOPLILT_FFMPEG=/path/to/ffmpeg`. Keep machine-specific paths out of shared projects.

`--workers 2` is the default for video export. Choose 1 for lower memory use or up to 8 on a machine with enough resources. More pages do not always make rendering faster. The encoder uses the portable CPU `libx264` preset; hardware acceleration is not configured in this release.

## Troubleshooting

- **Browser executable missing:** run `npm run setup` from the repository. On a supported Linux system, Playwright may also need system packages; use its documented dependency installer.
- **Browser sandbox unavailable:** use a normal user account and a host that supports Chromium sandboxing. The renderer does not disable the sandbox as a workaround.
- **FFmpeg command missing:** install FFmpeg/FFprobe, restart the terminal, and check `PATH` or set the executable variables.
- **Drawing depends on frame history:** replace mutable counters and random calls with expressions based on `t`. Seek to the same time twice in the HTML player.
- **Existing output:** choose a new filename. This protects work already on disk.
- **Long export:** PNG capture uses temporary disk space proportional to the film. Test a short project first and check free space. Normal completion or a handled failure removes the renderer's own temporary directory; a forcibly killed process can leave a `looplilt-*` folder in the system temp directory for manual review.

## Development commands

`npm test` checks project validation, audio output, HTML embedding, file protection, packaging, and process timeouts. `npm run test:browser` checks real playback and seek-order repeatability across three examples and three formats. `node scripts/make-showcase.mjs --out output/showcase` creates fresh wide/tall videos, posters, HTML players, a social card, and measured audio reports. The output folder must not already exist; its parent must exist.

`npm run site` copies reviewed site files into `.site`. `npm run pack` creates source and portable skill ZIPs in `dist` and prints their checksums. These generated folders are ignored by Git.

GitHub Pages deploys the checked-in `site` assets using the workflow in this repository. To update a film, render and review it first, then copy only its public MP4, poster, and player into the matching site folders.

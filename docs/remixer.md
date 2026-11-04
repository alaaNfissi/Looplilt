# A real project, from a small browser remixer

The greenhouse remixer is a static page. It edits a short title, petal and leaf colors, one of three paces, and the preview's frame format. It starts paused at the bloom so color changes are visible immediately. Press Play from start to see the full story.

## One drawing, two routes

The site build reads `examples/paper-garden/draw.js` and emits a module exporting its drawing function. The browser calls that function with validated settings. A download contains the **same drawing**, a small settings wrapper, a retimed `project.json`, the original MIT license, and instructions.

`lib/remix.mjs` is shared between source generation and the browser. It retimes notes and caption cues along with duration; changing the pace does not pitch-shift the score. The browser preview is explicitly silent. The HTML player and local MP4 include the score.

The exported project works with the existing CLI. It needs no remixer server, account, network, or new runtime API. Its selected format appears in its README commands. You can render the same source in any supported frame.

## Boundaries

The page accepts no code, imported projects, asset uploads, or remote URLs. It executes only the checked-in drawing. A sandboxed general-purpose code editor would add a different security and maintenance problem, and is outside this MVP.

Titles are bounded to 32 characters and exclude control and directional override characters. Colors must be six-digit hex values; paces and formats come from allowlists. DOM labels use textContent. Source generation uses escaped JSON values. Nothing from an editable value becomes HTML, a file path, an import, or an expression.

The ZIP writer accepts bounded UTF-8 text entries with safe relative names. Download names are fixed. The page makes no analytics requests, stores no changes in localStorage, and sends no creations to a server. Reloading loses unsaved settings; download before leaving.

The page's Content Security Policy permits only same-origin scripts and assets, blocks connections and object content, and does not allow inline scripts or evaluation. This is a constrained-parameters feature, not a promise that arbitrary drawing files are safe. The CLI continues to accept trusted JavaScript projects only.

## Verification

Run `npm run site`, then `npm run test:remix`. The browser check exercises real controls, invalid input, text injection attempts, the downloaded ZIP, playback, reset, keyboard seeking, and four viewport widths. It compares decoded Canvas PNG bytes from the exported player and remixer at five times in all three formats.

The test prints the downloaded project folder. Render that actual folder with the CLI and run `check` on the MP4. See the [quality report](launch/QUALITY.md) for completed runs and limits. Pixel equality is tested within one browser/font environment, not asserted between all operating systems.

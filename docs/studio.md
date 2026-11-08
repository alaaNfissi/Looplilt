# Looplilt Studio

Studio is Looplilt's visual editing workspace. Layers, timeline clips, inspector fields, motion, audio and exports use the same editable graph as the CLI and MCP.

## Choose your workspace

The hosted editor is designed for browser-local projects. It does not require an account or upload your media to a cloud service. Save a portable `.looplilt` project to carry its verified media to another browser. JSON alone contains references, not the media bytes.

For shared editing with a local agent, start the companion:

```sh
node bin/looplilt.mjs studio /absolute/path/to/creative-workspace
```

Open the local URL it prints. It binds to 127.0.0.1, validates Host and Origin, and uses a random token. The URL is private. Give your MCP client the same workspace directory. External changes refresh in Studio; stale focused field edits remain available for review instead of silently replacing newer work.

A source checkout needs a Studio build first:

```sh
npm ci --ignore-scripts
npm run studio:setup
npm run studio:build
npm run studio:check
```

The build emits static files and an integrity manifest. Release packaging verifies that the graph and editor sources match that build. A matching release bundle avoids rebuilding the editor.

## Make a film

1. Create a project and set its dimensions and duration. Rational frame rates can also be configured through the graph API.
2. Import video, images, audio or fonts. Add media to a scene from the media library.
3. Arrange layers and clips. Drag, trim, split, snap and zoom on the timeline.
4. Select an object in the canvas or layer list. Edit its properties or add keyframes.
5. Add reusable motion, masks, constraints, fades and supported effects.
6. Mix audio gain and fades. Play to check timing and synchronization.
7. Save a portable project, then export MP4 or WebM.

The original Canvas-film import accepts `project.json` and `draw.js` together. Their source remains intact. Graph layers can surround and transform that film; the imported drawing's individual objects remain editable in its drawing code.

## Precision and recovery

Keyframes use source frames. Splitting a clip preserves its animation phase. Relative motion paths follow the layer's base position, so dragging moves the path without applying its displacement twice. Absolute paths and constraints drive position directly.

Saved-project search distinguishes loading, no matches and unreadable entries. Imports keep existing projects intact. A failed portable-media upload reports the recoverable project and can resume; it does not overwrite a separately edited copy. Relinking verifies the original bytes against the manifest.

Undo and redo apply to graph transactions. A focused unsaved field is retained if an external edit causes a conflict. Review the new value before applying the draft again.

## Keyboard and mobile

Space plays or pauses, S splits at the playhead, N toggles snapping, I/O mark an export range, Home/End seek, arrows move one frame and Shift+arrows move ten. Ctrl/Cmd+Z undoes and Shift+Ctrl/Cmd+Z redoes. These shortcuts do not intercept typing in fields.

On a narrow screen, Layers, Canvas and Properties become separate panels. Desktop remains the recommended layout for precise multitrack work. Video export requires WebCodecs and the chosen codecs; current Chrome and Edge are the primary target browsers. Browser support is checked at use time, and unsupported decoding/encoding reports an error.

## Scope

This release path focuses on 2D animation and media composition, with Canvas 2D and shared deterministic evaluation. It does not claim a native desktop app, universal codec support, automatic 3D rendering or unlimited export sizes. Custom nodes require trusted host registration. See [graph contracts](scene-graph.md) and [MCP](mcp.md).

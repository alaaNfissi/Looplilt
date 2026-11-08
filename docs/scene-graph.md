# One editable project

Looplilt graph projects use `project.looplilt.json` with `format: "looplilt"` and `version: 2`. Studio, the graph CLI, the local companion, MCP and the export renderer consume this same document. Timeline lanes and selection are views of its nodes; they are not an independently saved timeline.

A project contains dimensions, a rational frame rate, an integer duration, a root composition, stable node IDs, hashed assets, a revision and an extensions object. A transaction declares the fingerprint it inspected. A stale transaction fails instead of overwriting a newer edit.

## Timing and composition

Time is measured in project frames. A child uses its parent's source clock. A node has a start, duration, rational source offset and rational speed. Its animation keys and motion behaviors use source frames. Visibility uses half-open intervals: the final frame is excluded. Splitting or trimming preserves the source offset and therefore the original animation phase.

Child order is back to front. Transforms inherit through groups. Camera nodes transform their children through an inverse view transform. Compositions can clip their contents. Opacity on a group applies to the composited group, including overlapping children. Alpha and inverse-alpha masks use another graph node; a mask source is hidden from ordinary painting.

Validation rejects missing dependencies, parent/constraint cycles, recursive mask compositions and non-finite values. Imported future node, effect and behavior versions are preserved as opaque data. They require an installed evaluator and renderer before playback or export.

## Delivered nodes

- Composition, group, track and camera.
- Rectangle, ellipse and SVG path.
- Text and caption.
- Image, video and audio.
- Canvas source and procedural score adapters for original Looplilt projects.

The registry provides defaults, numeric bounds, animatable properties and type versions. `looplilt_catalog` is the machine-readable contract. Visual rendering currently uses Canvas 2D; this is not a 3D or WebGPU engine.

## Motion and relationships

Numeric properties accept keyframes with supported easing. Built-in reusable behaviors include motion paths and oscillation. Paths support continuous SVG M, L, Q, C and Z commands, with distance-based sampling of Bézier curves. They can follow time, explicit progress or progress keyframes; repeat once, loop or ping-pong; and orient toward the path tangent.

Studio offers Follow a path, Float, Sway and Breathe presets. These create ordinary behavior entries. Relative paths can be repositioned by dragging their layer. Absolute paths determine position directly. Follow constraints use a target's world position transformed into the parent's coordinates; look-at constraints orient toward a target.

Evaluation order is keyframes, behaviors in list order, constraints, then inherited transforms and fades. Inspector transform fields show authored base values so editing an animated object does not accidentally apply its procedural movement twice.

## Programmatic extension

Register declarative metadata in `NodeRegistry`. Register a synchronous Canvas painter in `CanvasRenderRegistry`, then pass both registries to `CanvasGraphRenderer`. A painter receives the evaluated node, scene and a saved Canvas context with the node transform applied. Shared grouping, masks, effects and atomic frame publication still apply.

Behavior factories compile trusted application functions once per revision. Evaluators must be synchronous and return no value. Projects contain only data. A document cannot load a JavaScript URL, install a plugin or execute a custom function through MCP. The distributed Studio includes the built-in registry; custom extensions require a host that registers their implementation.

## Transactions and history

`node.add/patch/remove/move`, `animation.set`, effect and behavior add/patch/remove, `mask.set`, `constraints.set`, `transition.set`, `clip.split/trim`, asset add/remove and `project.patch` share one validated transaction engine.

Disk edits use an exclusive per-project lock, flushed files and atomic rename. Fingerprint-selected journals retain undo/redo; immutable snapshots permit recovery. Recovery files are retained until the owner explicitly archives them. History inspection is paginated. An abandoned lock is never automatically deleted.

`compileGraph(document)` validates and snapshots once, then evaluates any frame independently of seek order. `evaluateNode(frame, id)` evaluates only the required dependency closure using the same semantics. `compareGraphDocuments` reports bounded structural differences. Structural equality does not prove visual or artistic equivalence.

## Assets and portability

Assets use project-relative paths, SHA-256 hashes, byte lengths and explicit kinds. The local companion refuses traversal, junctions, alternate streams and unrelated paths. Portable `.looplilt` files contain a bounded manifest and verified blobs without extracting an archive. Import preserves existing edits; an interrupted media upload can resume into the same unchanged copy.

Original `project.json` and `draw.js` bytes remain immutable source assets. Their drawing runs in a terminable worker inside an opaque, network-blocked iframe. These layers can be trimmed, transformed, mixed and composited. Individual shapes in arbitrary drawing code remain editable in the source; Looplilt does not pretend they were converted into vector nodes.

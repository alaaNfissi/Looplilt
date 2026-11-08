# Studio foundation decision

Looplilt Studio uses the Cutaway foundation, with a new canonical graph, compositor, persistence boundary and agent interface. This is an architectural decision informed by working integrations and encoded media, not a ranking by repository popularity.

## What was actually exercised

Both leading candidates were installed, built and launched. Each integration imported the same original 1280×720 video, PNG and WAV; combined them with preserved Looplilt source and editable text; made a visual edit; checked that unrelated clips stayed unchanged; and exported an eleven-second film. These were automated browser trials, not person-led usability sessions.

| Evidence | Elah integration | Cutaway integration |
| --- | --- | --- |
| Pinned source | [d4e8b237](https://github.com/elahlabs/elah/tree/d4e8b237778128ac453bbd93fd6cb85c758c9b91) | [e9c6cc06](https://github.com/S07K/cutaway/tree/e9c6cc06b549d7fa857bb8f43f02c47a39368e33) |
| Export | 330 frames, 1280×720, 30 fps, H.264 | 330 frames, 1280×720, 30 fps, H.264 |
| Soundtrack | Stereo AAC, 44.1 kHz | Stereo AAC, 48 kHz |
| Full decode | Passed | Passed |
| Audio correlation against reference | 0.998546 | 0.999375 |
| Measured audio offset | 0 samples | 0 samples |
| Original source hashes | Preserved | Preserved |
| Persistence check | Same-session document round trip | Page closed and reopened, clips and media preserved |
| Preview finding | Evaluated frame advanced while the displayed source image could remain at its opening frame | Media readiness was awaited before preview capture |

The export trials were not controlled performance benchmarks. Their elapsed times were affected by browser startup and local disk latency. They do not establish a general speed advantage.

Source-level probes exposed problems in both models. Cutaway's original 30 fps → 24 fps export plan changed a three-second sequence to 3.75 seconds instead of resampling it; it also accepted a non-finite frame rate. Elah's reader rounded 30000/1001 fps to 30 and discarded unknown metadata. Looplilt therefore does not delegate authoritative timing or serialization to either original project reader.

## Weighted decision

Scores below are engineering judgments on a five-point scale, based on the experiments and source structure. They are not measured quality ratings or promises about every feature.

| Criterion | Weight | Cutaway | Elah | Reason |
| --- | ---: | ---: | ---: | --- |
| Fit for a shared canonical graph | 25% | 4 | 3 | Cutaway's separable timeline and export packages made replacement of the saved project authority more contained. |
| Preview/export consistency | 25% | 4 | 2 | Both exported valid media; the Elah integration exposed an additional stale-preview boundary. Neither original renderer was accepted unchanged. |
| Maintainable integration surface | 20% | 5 | 3 | The inspected Cutaway tree was substantially smaller and its package seams were easier to isolate. Size alone is not a quality measure. |
| Local media and persistence | 15% | 4 | 3 | Both imported real files; Cutaway's tested flow reopened the complete project and media. |
| Useful editor interactions | 10% | 4 | 4 | Both supplied meaningful timeline, media, text and export workflows. |
| Browser delivery fit | 5% | 4 | 4 | Both fit a local-first browser product. |
| **Weighted total** | **100%** | **4.20** | **2.90** | Decision aid, not a benchmark. |

Clypra, OpenCut Classic and the ongoing OpenCut rewrite were also source-screened at the recorded revisions below. They were not presented as having passed the same two integration trials. A Rust/Tauri-first distribution adds a separate native application surface; an archived editor or a rewrite requires a different maintenance commitment. Neither justified displacing the two browser candidates for this release.

- [Clypra 83b2d28a](https://github.com/AIEraDev/Clypra/tree/83b2d28a38a632816b0f9043fe68875c5aaeee4f)
- [OpenCut Classic cf5e79e9](https://github.com/OpenCut-app/opencut-classic/tree/cf5e79e919144200294fb9fed22a222592a0aeea)
- [OpenCut e6680107](https://github.com/OpenCut-app/OpenCut/tree/e668010778568641babef2cc40be4703ae6916d6)

## What Looplilt changes

The retained editor foundation supplies timeline interaction, UI primitives, media/container integration and the export orchestration interfaces. Looplilt's timeline adapter derives its lanes from graph nodes. It does not serialize a second timeline or translate saved graph changes through the original editor store.

The main Studio path uses Looplilt's graph store, shared transaction engine, Canvas compositor, exact-frame media provider, score mixer and graph export. It adds source-preserving Canvas import, verified portable projects, local companion access, external-change refresh, conflict-aware fields, reusable motion, mask and constraint controls, and a dedicated Looplilt interface.

The original project model remains relevant only to retained foundation code that has not been migrated into the active graph path. New functionality must enter through the graph contracts. An upstream change that modifies an editor project reader must not silently replace the canonical document.

Future maintenance should compare focused upstream changes against the pinned base, port the useful behavior, and rerun graph, timeline, media and persistence acceptance. The dependency lockfile and static-runtime manifest make the delivered implementation reproducible.

## Interchange assessment

[OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) represents editorial timing, tracks, clips and external media references. It is not a compositor or a container for arbitrary visual behavior.

A future OTIO adapter could preserve ordinary clip order, source ranges and rational timing. Looplilt transforms, masks, procedural source, constraints and behaviors would need explicit metadata or a declared approximation. Such an adapter must report loss rather than flattening an editable production without notice.

No OTIO importer or exporter is currently shipped. Delivered interchange is canonical graph JSON, verified portable `.looplilt` bundles, original Canvas source import, and rendered MP4/WebM/PNG. Each has a different purpose; a rendered video does not preserve the graph's editability.

## Evidence location

The reproducible foundation harnesses and their reports were retained in the implementation checkpoint. The original export runs were `elah/run-1794012216577` and `cutaway/run-1794014507590`; later preview investigations were `elah/run-1794016327708` and `cutaway/run-1794016430178`. The source-contract probes are recorded separately from browser and media acceptance.

The actual person editing check was performed later in Looplilt Studio, on the original “The Last Light” graph. It is separate evidence and is not attributed to either foundation trial.

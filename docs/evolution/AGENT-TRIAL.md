# Independent creation and revision trial

Two separate coding-agent sessions worked from isolated instructions and different runtime snapshots. They did not inspect each other's output. This is a small qualitative trial, not a success-rate study or proof that Looplilt outperforms another product.

## Shared task

Create an original 12-second film: a courier carries a seed across a rooftop gap, fails on the first attempt, discovers a clever second approach, and reaches a rooftop garden. Use three meaningful beats, landscape and portrait compositions, restrained text, and layered original music. Produce editable source and working HTML. Do not copy existing example drawings or assets.

After preserving creation, change only the payoff: make the main blossom lavender (#b8a4dc), and add one gentle hop from 10.4–11.2 seconds, with its apex at 10.8 reaching 4% of the composition's logical stage height. Preserve earlier beats, timing, captions, music, framing and other colors.

The initial revision brief asked for a percentage increase in a hop that did not exist. The baseline participant identified that ambiguity. The task owner corrected the brief to add a hop; both participants received that corrected action. This is recorded as an intervention, not an engine failure.

## Recorded outcome

| Observation | Published 0.2.1 participant | 0.3 development participant |
| --- | --- | --- |
| Creation elapsed | 1,349.783 s | 893.837 s |
| Revision elapsed | 638.325 s | 1,163.080 s |
| Technically valid wide/tall HTML | Yes | Yes |
| Original creation retained | Yes | Yes |
| Earlier images checked by participant | 20 pairs, all exact | 480 pairs, all exact |
| Score after revision | Byte-identical | Byte-identical |
| Lavender visible | Yes | Yes |
| Hop returns to standing endpoints | Yes | Yes |
| New code needed for new motion | Yes | Yes, one keyframe expression |
| Bounded parameter edit used | Unavailable | Source-hash-checked revise for blossom color |

The new workflow exposes the payoff and its parameter through inspection and supplies a safe patch operation. It does not automatically author a new action. The participant still wrote a hop and inspected its result. One participant restored the original JSON formatting after the patch operation, which preserves data rather than formatting.

The timing does **not** establish faster revision: the current participant spent longer and checked substantially more frames. The baseline suffered host command stalls. The films use different logical-stage and camera conventions; the same logical-height instruction produces different screen-pixel displacements. Raw timing should not be converted into a product speedup, preference score, or provider ranking.

The current participant used a frozen pre-release runtime snapshot, before final preview reload and color-matrix fixes. Neither participant had MP4 or human listening evaluation in the trial itself. Later release verification is a separate activity.

## Reproduction and evidence

[Sanitized measurements](agent-trial.json) retain timestamps, scope, concrete checks, and limitations. [Source manifest](trials/MANIFEST.json) identifies the exact original files. The four source folders are:

- [Baseline creation](trials/baseline/creation) and [revision](trials/baseline/revision).
- [Current creation](trials/current/creation) and [revision](trials/current/revision).

They are original projects under the repository MIT license. Build either with the appropriate runtime's CLI and a new output filename. The baseline was commit de670d44a29a95cfb5263ff55be02283aab559a0. These are evaluation projects, separate from the curated twelve-film gallery.

[Play the revised current film](https://looplilt.com/play/agent-trial-revision.html) and [compare the creation](https://looplilt.com/play/agent-trial-creation.html). Both keep their editable sources above.

Token/cost telemetry, human preference evaluation, human listening, physical-device testing, and cross-provider testing were unavailable. No independent adoption or universal agent compatibility is inferred.

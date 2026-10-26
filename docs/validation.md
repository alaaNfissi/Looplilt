# Validation

The test suite checks malformed timeline data, caption overlap, invalid sound events, exact PCM length, audio headroom, safe HTML embedding, existing-file protection, CLI parsing, and process timeouts. Browser checks sample the same frames in different orders, exercise playback and sound controls, and test landscape, portrait, and square layouts for all three examples.

Video export checks H.264 / AAC codecs, pixel format, dimensions, frame count, frame rate, duration, and full decoding before creating the final output. Showcase generation also measures integrated loudness and true peak from the delivered AAC track.

These checks detect concrete failures; they do not judge storytelling, artistic merit, voice quality, licensing of user-supplied material, or readability in every viewing context. Review composition at phone size, watch the full film, and listen to audio before publishing your own work. The bundled example scores contain no narration.

The repeatability check samples one time on separate pages and after an intervening seek. The broader browser suite samples four beats. Neither is a proof of determinism at every possible time. Browser and font versions can change the pixels between machines.

All tests run locally without a service account. CI runs the core suite on Linux and Windows; browser tests can also be run locally with `npm run test:browser`.

## Release checks — 26 October 2026

The initial release was checked on Windows with Node 24.19.0. The 16 core tests passed. All three examples passed playback and seek-order checks in landscape, portrait, and square formats. The site passed layout, local-link, playback, and format-switching checks at 1440 px and 390 px widths using Playwright's Chromium 145 browser.

All six bundled MP4s contain 480 frames at 30 fps for a 16-second duration. Their measured integrated loudness ranges from −16.13 to −15.54 LUFS, with true peaks from −5.78 to −1.49 dBTP. Every file passed format checks and full decoding. A separate short fixture verified captions, local audio mixing, duration rejection, existing-output protection, and storyboard generation.

The ZIPs were also checked with Python's ZIP reader. These automated checks and sampled visual inspections do not imply that narration was recorded or that the example scores received a listening review.

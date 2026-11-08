# The Last Light

An original 48-second cinematic vector story: one last delivery carries a little warmth through a sleeping street.

The film contains 2,796 graph nodes. Buildings, windows, characters, masks, lighting, titles and camera moves remain editable in Studio. The original chamber score combines piano, synthesized strings, plucked guitar, marimba, bass, brushes, wind and rain. Everything is created locally with Looplilt.

The closing line, “Every window has a story. Enjoy it.”, preserves the real person's Studio edit from the human/agent handoff trial. The saved seed is included as handoff.looplilt.json. The finished film expands that seed into four chapters; it does not claim that all new artwork was authored in the UI.

## Reproduce

From the repository root:

1. Run node examples/studio/the-last-light/create.mjs.
2. Build Studio with npm run studio:build if its renderer code changed.
3. Run node scripts/render-studio-story.mjs the-last-light video.
4. Run node scripts/verify-studio-story.mjs the-last-light.

Chromium, FFmpeg and FFprobe are required for native rendering. The completed video and portable .looplilt project are placed in a new .validation/story-the-last-light-* folder. The bundle includes the exact score source and canonical graph.

## Measured master

The reviewed master is 1280×720 at30fps, with1,440 video frames and48kHz stereo AAC. Full decoding passed. Measured integrated loudness was−16.42LUFS and true peak−1.24dBTP. The encoded soundtrack matched the original synthesized score with correlation0.99907 and zero measured sample offset.

These measurements describe the checked master, not every future edit. The downloadable video is in site/media/the-last-light-studio.mp4.

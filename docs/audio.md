# Compose sound in Looplilt

A score is a list of timed notes and sound events in `project.json`. Looplilt synthesizes it locally into a WAV, embeds it in the HTML player, and mixes it into video exports. It needs no sample library, voice account, or remote audio service.

## Choose a sound mode

Existing projects keep their original mono engine. Its five voices are `soft`, `bell`, `pluck`, `tick`, and `chip`. The new studio is an explicit opt-in:

```json
{
  "version": 1,
  "title": "A room with a rhythm",
  "duration": 4,
  "fps": 30,
  "audio": { "mode": "studio", "room": 0.3, "delay": 0.08, "echoSeconds": 0.375 },
  "score": [
    { "at": 0, "length": 1.8, "pitch": 60, "voice": "piano", "gain": 0.3, "pan": -0.3, "send": 0.35 },
    { "at": 0, "length": 1.2, "pitch": 36, "voice": "bass", "gain": 0.2, "pan": 0, "send": 0.05 },
    { "at": 0.75, "length": 0.15, "pitch": 60, "voice": "hat", "gain": 0.04, "pan": 0.4, "send": 0.1 },
    { "at": 1.5, "length": 1.2, "pitch": 67, "voice": "guitar", "gain": 0.2, "pan": 0.3, "send": 0.35 }
  ]
}
```

The studio outputs stereo, 16-bit PCM at 48 kHz by default. Instruments, room reflections, and noise are deterministic for the same project and runtime. Old projects without `audio` continue through the existing mono path.

## The palette

These are synthesized timbres, not recordings of acoustic instruments. Their names describe the intended musical role.

| Voice | Character and use |
| --- | --- |
| `piano` | Decaying, slightly inharmonic partials and a short hammer-like attack; chords and melodic replies. |
| `guitar` | A damped noise-excited string with a rounded fundamental; plucked melody and arpeggios. |
| `strings` | Detuned harmonic layers and vibrato; give sustained notes room to rise and release. |
| `pad` | Slowly evolving tones; atmosphere and harmonic support. |
| `bass` | Rounded, decaying low notes; walking lines and rhythmic foundations. |
| `brass` | Harmonic tone with a softer attack; short ensemble phrases. |
| `marimba` | Inharmonic resonances; woody accents and music-box patterns. |
| `kick`, `snare`, `hat`, `brush` | Synthesized percussion; vary gain and spacing to avoid a mechanical loop. |
| `wind`, `rain`, `surf` | Filtered noise textures; long quiet events behind the music. |
| `footstep` | A short low impact; footsteps, mechanisms, and rhythm accents. |

The five original voices also work in studio mode. The stereo engine shapes their output differently; opt-in is a creative change, not a promise of identical timbre.

## Note and mix controls

| Field | Range / default | Meaning |
| --- | --- | --- |
| `at` | Seconds, inside the film | Event start. Notes need not be sorted. |
| `length` | At least 0.02 seconds | Complete event duration, including its envelope. Must end inside the film. |
| `pitch` | MIDI 24–108 | 69 is A440. Percussion and environment voices use fixed internal frequencies; supply a valid pitch anyway. |
| `voice` | Default `soft` | Timbre from the palette. |
| `gain` | 0–1, default 0.2 | Relative level before the final mix. |
| `pan` | −1 to 1, default 0 | Equal-power position: left, center, right. Studio only. |
| `send` | 0–1, default 0.22 | Amount sent to the shared room and echo. Studio only. |

| Audio setting | Range / default | Meaning |
| --- | --- | --- |
| `room` | 0–1, default 0.2 | Level of the damped stereo room reflections. |
| `delay` | 0–1, default 0 | Level of the alternating stereo echo. |
| `echoSeconds` | 0.05–1.5, default 0.375 | Delay spacing; at 120 BPM, 0.375 seconds is a dotted eighth note. |

For a dry mix use `room: 0, delay: 0`. Keep bass and percussion sends low when the room becomes crowded. Leave roughly half a second to a second and a half after the last musical event for effects to settle. The WAV lasts exactly as long as the film; its final 90 ms fade to silence.

## Build an arrangement around the story

Give a character a short motif. Repeat it with a different instrument when the character changes. Use a bass line to connect chords, make percussion support physical actions, and let the arrangement thin out before a reveal. Silence and restraint can make the ending stronger.

The six new examples show different approaches:

- [The Missing Beat](../examples/the-missing-beat): a jazz-club arrangement with walking bass, keys, brass, brushes, and a newcomer’s triangle cue.
- [One More Light](../examples/one-more-light): a coastal score combining strings, plucked melody, a restrained chip lead, and weather.
- [Moonrise Express](../examples/moonrise-express): a waltz with a railway pulse that slows at arrival.
- [Neon Relay](../examples/neon-relay): an electronic groove that opens into a warmer ending.
- [Ink Tide](../examples/ink-tide): a plucked-string and marimba conversation with quiet water texture.
- [The Little Lift](../examples/the-little-lift): a music-box ensemble with timed mechanical sounds.

All score events are editable data. There are no downloaded music assets.

## Export, narration, and review

```sh
node bin/looplilt.mjs sound my-film --out output/score.wav
node bin/looplilt.mjs render my-film --out output/film.mp4
node bin/looplilt.mjs render my-film --narration voice.wav --out output/narrated.mp4
```

WAV and HTML playback retain the score’s synthesized levels and peak headroom. MP4 export applies loudness normalization toward −16 LUFS and −1.5 dBTP. Those are processing targets; measure the delivered AAC track when exact limits matter.

With narration, the score is mixed at a fixed quieter level. It does not automatically duck around speech. Looplilt accepts a local recording; it does not synthesize speech or connect to a voice provider.

Review the complete film with sound on, on speakers and headphones if possible. Check musical endings, intelligibility, sharp transients, stereo balance, and phone-speaker translation. Automated PCM, decoding, and loudness checks cannot judge whether a composition feels right.

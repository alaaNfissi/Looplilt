# The Shape of Returning

An original one-minute scientific fieldbook film, following one possible water-cycle journey through ocean, vapor, cloud, rain, soil and groundwater.

Six procedural landscapes combine cartographic linework, botanical details, particles, magnified insets and moving cameras. The draw.js artwork is preserved byte-for-byte inside the graph's source assets. Its individual drawn marks remain editable as JavaScript; they are not falsely presented as separate vector objects. The titles, explanations, chapter timing and callouts are individual graph layers.

The original acoustic score uses fingerpicked guitar, marimba, strings, piano, bass and brushed percussion, with synthesized surf, rain and wind. No stock footage, third-party illustration or recorded music is used.

## Reproduce

From the repository root:

1. Run node examples/studio/the-shape-of-returning/create.mjs.
2. Build Studio with npm run studio:build if its renderer code changed.
3. Run node scripts/render-studio-story.mjs the-shape-of-returning storyboard to inspect all six chapters.
4. Run node scripts/render-studio-story.mjs the-shape-of-returning video.
5. Run node scripts/verify-studio-story.mjs the-shape-of-returning.

The scripts use the actual Looplilt graph compositor and export pipeline. A portable .looplilt project includes all artwork and music source. New outputs go into .validation; existing masters are preserved.

## Scientific framing

Evaporation changes liquid water into vapor; condensation changes vapor into liquid droplets. Precipitation returns water to the surface. Water can travel over land, enter soil, and flow through pores and cracks underground. Rivers and groundwater can discharge to the sea. [NASA's water-cycle explanation](https://gpm.nasa.gov/resources/faq/what-water-cycle) and the [USGS water-cycle guide](https://www.usgs.gov/water-science-school/water-cycle) support these concepts.

The drawings are original. The visible droplet is a narrative symbol, not a scale model of one molecule. Cloud droplets and invisible vapor are distinguished by their labels. Water has many pathways and residence times; the film explicitly compresses time and scale and follows only one possible route.

## Measured master

The reviewed 1280×720 master has1,800 frames at30fps and48kHz stereo AAC. Full decoding passed. Integrated loudness is−17.75LUFS; true peak is−1.58dBTP. The encoded soundtrack correlates0.99758 with its source score, with zero measured sample offset. These measurements describe this master, not future edits.

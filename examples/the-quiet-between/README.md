# The Quiet Between

An original 32-second scientific visualization of linear superposition. Five named scenes move from passing packets to constructive interference, a half-cycle phase change, a perspective two-source field, and a visual conclusion.

The three traces share one spatial and temporal coordinate: y1=sin(kx−ωt), y2=sin(kx−ωt+φ), y=y1+y2. At φ=0 the amplitude doubles; at φ=π the sum is zero. The final field uses equal-frequency radial sources with a softened 1/√(1+r) falloff for a bounded illustration. It is not a fluid simulation or a model of energy loss. The soundtrack is a composed score, not a sonification of cancellation.

Concept reference: [OpenStax, Superposition and interference](https://openstax.org/books/physics/pages/13-3-wave-interaction-superposition-and-interference). Artwork, diagrams, code, and music are original; no source illustrations were copied.

Sound: felt-piano phrases, sustained harmonics, marimba droplets, rounded bass, brushed rhythm, and a soft water bed. The arrangement leaves space during the phase experiment.

Change the sum color with scene.params.accent. Inspect the phase scene with frame --scene shift --at 5, or render only that scene with render --scene shift.

Copyright (c) 2026 Alaa Nfissi. MIT license, as in the repository LICENSE.

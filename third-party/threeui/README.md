## Current runtime — v10

The current Buyer web uses the derived `StreetEnergyOrb.tsx` runtime, based on the pinned EnergyOrb source below. It imports the complete canonical GLSL module, adds two-axis surface rotation in `street-orb-shader.ts`, limits framebuffer size/FPS, preserves an integrated animation clock through unmounts, adapts auto resolution down when frame delivery stays slow, and releases detached contexts. The original EnergyOrb.tsx and shader files remain unchanged for provenance checks; the unused original React renderer is not imported into the application runtime.

Constellation remains the pinned standalone source. Its focused document applies a DPR cap and frame scheduler; `constellation-runtime.ts` normalizes node velocity and pointer pull by elapsed time so reducing frame frequency does not intentionally change particle movement speed. The source file itself remains byte-for-byte intact. Historical v5/v6 implementation notes below describe those releases.

# ThreeUI provenance

Upstream: https://github.com/MengTo/threeui (Meng To, MIT).

The selected effect is **Constellation Field**, following the upstream standalone implementation guide in `src/components/buildSkillMarkdown.js`.

- Canonical authored source: `src/shaders/neuform-isolated/sources/constellation-field.html`.
- Vendored location: `apps/web/public/effects/threeui/constellation-field.html`.
- Upstream Git blob: `230e3c7beac33eac788f98ed5985506d9513ddfd`.
- SHA-256: `1920ad4fe34f2ed2348e3a52110c37b4969bc45d71ff29f2738cb4542ad9f610`.
- `apps/web/lib/threeui-focus.ts` retains the source focus/control adapter from upstream `NeuformBatchEffects.tsx`, with its required types and background resolver.
- `apps/web/components/threeui-constellation.tsx` is the Next.js host integration.

The canonical HTML is byte-for-byte upstream source. At runtime the host excludes the demo shell's external script tags and images, focuses the original canvas and forwards mouse coordinates to the original pointer listener. No particle, link, drawing or gravity algorithm is rewritten. The frame has an opaque origin (`sandbox="allow-scripts"`), no focus stop and no pointer hit area. Monochrome grading and opacity apply to the outer host.

Motion-disabled, offscreen and hidden-tab states unmount the frame, releasing its renderer and listeners. The source is fetched only while visible and motion is enabled; interrupted fetches are aborted. Unselected variants and unrelated ThreeUI components are not included in the runtime bundle. No npm dependency is added.

License text is retained in `LICENSE` in this directory. Verify canonical source with `npm run test:threeui`.

## Energy Orb (v6)

The complete public renderer and authored shader module are copied from:

- https://github.com/MengTo/threeui/blob/main/src/shaders/energy-orb/EnergyOrb.tsx
- https://github.com/MengTo/threeui/blob/main/src/shaders/energy-orb/energyOrbShaders.ts

Local copies are in `apps/web/components/threeui-energy/`, with hashes checked by `tests/threeui-source.test.ts`:

- EnergyOrb.tsx SHA-256: `be9ca83c7d158dd1366bd942aa4cc4c084b901d59156d047a601ebd9cca4a903`.
- energyOrbShaders.ts SHA-256: `03b1b8e2c44042ac1e880003e55016a641329028205c62dcd17e535b99496aec`.

The WebGL renderer and uniforms are unchanged. `street-orb.tsx` supplies the Next.js host, lazy loading, visible/motion gates, palette controls and fallback/error boundary. Its CSS provides the contained layout, an XIII mark on the static fallback. The original renderer owns its shader/program/buffer cleanup; the host unmounts it on pause, global motion-off, visibility exit and context loss. No npm effect dependency or runtime CDN is added. The upstream Community Energy Orb guide and GlobeCollection entry point were reviewed for this integration.

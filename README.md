# Microculture

A living canvas of procedural petri dishes. Explore an infinite grid, watch tissue grow and retire, and combine two specimens to create a third. The interface stays wordless; the organisms carry the visual story.

**[Open the live canvas](https://microculture.vercel.app)**

## Interaction

- Scroll or drag empty space to explore. Pinch, Ctrl/Cmd-scroll, or `+` / `-` to zoom.
- Select a dish to inspect it; swipe or use the side previews to browse.
- Drag a specimen onto another. On touch, hold for 350 ms before dragging. Nearby targets attract the preview magnetically.
- Alternatively, select the merge icon, choose a partner, and confirm with Enter. Escape cancels.
- Pause biological time, switch themes, export a 3840 × 2160 PNG, or hide the bottom bar.

Parents remain intact. A successful merge inserts a row beneath the target and reveals the offspring there; it does not open the child automatically. Offspring and row history persist in that browser's local storage.

## How the particles work

### Sequences become geometry

Each specimen has **25 independently seeded layers**, with a synthetic 384-base sequence per layer. Stable specimen identity, layer identity, and versioned generation recipes make the result reproducible. Sequence traits affect branching, curvature, helix pitch, growth, lifespan, and pigment variation. Offspring crossover and mutation happen before their topology is constructed.

These are **artistic synthetic sequences**, not newly verified animal genomes or a species-calibrated biological simulation. The bundled reference catalog is separate, optional provenance; reference fragments remain unchanged.

### Connected paths, precise grains

`flat-geometry.js` builds connected cubic Bézier paths before projecting and folding them into a mirrored petri structure. Connected parent tangents guide new branches. Paths that cross a symmetry seam are sampled through the seam, avoiding false straight chords.

`render.js` places stable grains along those curves. A small lateral spread gives filaments texture, while the two transfer anchor samples stay on the centerline. Detail increases with displayed size; screen-space occupancy limits overlapping grains. Canvas backing stores use physical pixels, with no glow or blur applied to the artwork.

### Organic emergence and retirement

`tissue-appearance.js` distributes seed previews around the entire dish, rather than confining them to a right-facing wedge. Deterministic layer delays stagger their emergence. The reveal follows the existing topology and completes once; evicting a rendering cache does not replay a specimen's birth.

The simulation extends active tips, branches under available resources, fuses compatible nearby tissue, and recycles expired material. Nutrient fields couple the layers. Populations are bounded to **400 segments and 72 active tips per specimen**.

Senescence uses normalized age `a` and vitality:

```text
h = (1 − clamp((a − 0.4) / 0.6, 0, 1))²
```

Near-dead tissue retires instead of leaving a long translucent tail. Stable per-grain thresholds thin old populations progressively, so death does not create random frame-to-frame flicker. Attached “mist moss” grows with host age and nutrients, then fades with host vitality; it is crisp fine tissue, not a blur effect.

### Particle manipulation

`particles.js` uses a closed-form critically damped spring for pointer displacement and recovery. For displacement `d = x − home`, velocity `v`, and stiffness frequency `ω`:

```text
c  = v + ωd
x′ = home + (d + cΔt)e^(−ωΔt)
v′ = (v − ωcΔt)e^(−ωΔt)
```

This avoids unstable frame-dependent Euler integration for a stationary target. Pointer forces are bounded and local. Magnetic dragging eases the specimen preview toward a valid target while hit testing continues to use the actual pointer position.

### Inheritance and transfer

`offspring.js` deterministically recombines finalized parental sequences, records crossover and actual mutations, and preserves immutable parents. Layer budgets are normalized so combining parents does not double biological density.

`transfer.js` samples ancestry-weighted particles from both parents. Curved paths, bounded correction forces, and a smooth-union receiving envelope guide those samples into the child. Stable sample identities and shared rendering coordinates preserve the handoff. A reservation separates preparation, row opening, transfer, reveal, commit, and cancellation.

### Color direction

`habitat.js` assigns three restrained nature-inspired families per specimen: a dominant habitat, a substantial warm/cool counterpart, and a small accent. Examples include coral with blue, sage with warm red, and sand with slate. The layer distribution is **13 / 9 / 3**; individual dishes do not cycle through a rainbow.

`colors.js` uses OKLCH with an sRGB gamut ceiling. Somatic mutations perturb shades within a stable habitat. Transfer colors blend locally when their hues are close; distinct families retain their separation.

## Performance architecture

- A single offline Blob worker generates initial specimens and new procedural cells. Its bounded queue deduplicates pending recipes; no generation API or external service is required.
- Stable world coordinates and row identities are independent of reusable rendering slots.
- The atlas retains a bounded working set of 72 specimens; saved offspring survive eviction.
- Offscreen dishes are culled. Texture refreshes share a time budget and prioritize visible work.
- Rendering caches are capped at 128 MiB on desktop and 48 MiB on mobile.
- Pause freezes biological evolution while navigation remains usable. Reduced motion shows completed static emergence.
- 4K export uses a separate rendering pass and includes no interface controls.

Frame-time checks target at least 30 fps. Results depend on viewport, device, and scene density; the focused dish can be more expensive than the grid.

## Run locally

Requires Node.js 22+; Python 3 is used only by the convenience server.

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:8080`. The source `index.html` also supports direct file previews. Build output goes to `dist/`; only the HTML and its referenced runtime assets are published.

## Validate

```sh
npm test
npx playwright install chromium
npm run test:browser
```

`npm run verify` runs both suites. Tests cover deterministic sequences and offspring, lifecycle budgets, connected geometry, dispersed emergence, pigment families, memory limits, cancellation, saved-state reload, mobile dragging, and 4K export.

Browser tests use Playwright's Chromium. On macOS they can also use installed Google Chrome; set `CHROME_PATH` to choose another executable. `BASE_URL` points the browser checks at a hosted deployment instead of the local file preview.

After editing generation dependencies, rebuild the offline worker bundle with `npm run build` or `node scripts/build-generation-worker.cjs`.

## Deploy

Vercel builds with `npm run build` and serves `dist/`. `vercel.json` includes a content security policy that permits the Blob worker. GitHub CI runs unit checks, validates the build, and runs the browser suite. Frame-time thresholds are enforced locally; shared CI runners report timing measurements and enforce memory budgets.

```sh
npx vercel --prod
```

No environment variables, backend, database, or API credentials are needed by the artwork. Browser-local saved work is not uploaded to a server.

## Credits

Particle interaction and generation motion were adapted from user-supplied Bencho components under MIT. Their license notice remains in `particles.js`; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The reference archive and verification scripts accompany the source but are not included in the deployed asset directory.

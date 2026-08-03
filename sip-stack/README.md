# SIP Stack

A timing tower where the tower is a **corpus**, not a pile. A SIP slab slides
above the tower on a linear back-and-forth track — TAP to drop it. The overlap
with the block below survives; the overhang shears off and tumbles away. The
shrinking footprint is both the health bar and the size of every future
instalment. Reach **40 layers** to top out at the Retirement Corpus.

## Financial hook

Score is not a running total of placements — it is the **future value of the
SIPs already in the tower**:

```
corpus = corpus x (1 + growthPerLayer) + contribution      (per placed layer)
```

which is the SIP annuity recurrence. Every layer already standing grows one step
when a new SIP lands on it, so a layer placed early ends the run worth far more
than the same layer placed last (at the default 6%/layer over 40 layers, ×9.7).
The contribution itself scales with how much footprint the drop kept, so a
sloppy layer is a smaller instalment for the rest of the run, not just a thinner
block.

You can see it while you play:

- **Blocks ripen.** A slab is placed brand blue and drifts toward gold as more
  SIPs land on top of it (`maturityOf(age)`), so the tower matures from the base
  up. The gold seam on each block brightens with it.
- **A growth wave** washes down the tower on every placement — everything you
  already own just grew, and you can see exactly which part.
- **Two numbers float on every drop:** the instalment (`+100`) and the growth it
  earned (`growth +412`). Early on the growth is zero; by the summit it dwarfs
  the instalment.
- **The HUD shows `corpus` and `x invested`**, and the result screen compares
  your first layer against your last one side by side.

All figures are indicative game points, not a return projection.

Milestones every 8th layer: SIP Year 1 → Emergency Fund → Home Goal → Education
Goal → Retirement Corpus.

## Controls

- **TAP** anywhere to drop the sliding slab. That's the whole game.
- A **drop guide** shows the rule before it fires: the strip that will survive is
  lit on the landing surface, the overhang is struck through in orange, and the
  centre line goes gold inside the perfect window.
- Drops are judged on the `pointerdown` timestamp (never `click`), with the slab
  phase extrapolated to that exact instant — input latency never eats a perfect.
- Exactly one drop per slab; input is locked for 200ms after each placement.

## Rules & scoring

| Rule | Value |
| --- | --- |
| Win | 40 slabs placed |
| Lose | Total miss, or kept width < 12px — the tower then shears at its narrowest recent layer and everything above it topples |
| Perfect window | offset ≤ max(3px, 3% of current width) → snap, no trim |
| Streak regrowth | from the 3rd consecutive perfect: +7% of original width per perfect |
| Contribution | `100 x (0.3 + 0.7 x keptWidth/originalWidth)`, ×1.5 on a perfect |
| Growth | +6% of the whole corpus per placed layer |
| 3★ | win with ≥ 22 perfects |
| Speed | **px/s is constant within a layer** — traverse 3.8s → 2.9s (L7) → 2.3s (L15) → 1.8s (L25) → 1.5s (L35) for a full-width track, so a narrow tower crosses its shorter track faster |
| Best run | persisted in `localStorage`; results screen shows the delta |

No timer — the speed ramp bounds the session. Modelled through `playRun()`: a
skilled thumb tops out in ~51 s, a casual one gets ~29 s and 24 layers, a
thoroughly sloppy one still gets ~19 s and 14 layers. The opening six layers are
deliberately slow so a first-timer gets a session rather than a result screen.

Anti-pause-scum: the game auto-pauses when the tab is hidden; on return the
world stays frozen behind a 3-2-1 re-acquire countdown and the slab's phase is
re-randomised, so pausing yields zero aiming information.

## Geometry contract

`src/stack.js` `slabFaces()` is the **only** description of a block's shape.
The component fills exactly those polygons and the drop is judged on exactly the
same `[x, x + w]` footprint, and `scripts/balance.mjs` PASS 1 asserts the two
bounding boxes are identical at every width the rules can produce. This is not
decorative: before the contract existed the top and side faces ran to
`w + slabShear`, so every block was drawn **10 logical px wider than it
collided** and a drop that visibly landed on the block was scored as hanging off
it.

## Verification

```bash
node scripts/balance.mjs             # geometry, track, rules, scripted players
npx vite build                       # the build gate
node ../scripts/play-test.mjs sip-stack --all-sizes   # from the repo root
```

`balance.mjs` drives `src/stack.js` — the same pure module the component's rules
are made of — so the table is measured against the code that ships.

## Tech

- Standalone Vite + React 18.3.1 app (no workspace), canvas renderer,
  fixed-step loop from the shared game-kit (`src/kit/`, byte-identical copy).
- Rules, geometry, motion, trim, collapse and compounding live in
  `src/stack.js`, which imports nothing.
- Web Audio synth only (no audio files); AudioContext unlocked on first gesture.
- Blocks are programmatic pseudo-3D slabs — no emoji sprites, no raster assets.
- Lead capture (Name + Mobile only) → LMS, slot booking, and play-count wiring
  per `okf-brain/GAME_STANDARD.md` §2.

## Dev

```bash
cd sip-stack
pnpm install
pnpm dev      # http://localhost:5074
pnpm build    # uat build (the verification gate)
```

Dev server port: **5074**. All gameplay tunables live in `src/data.js`
(`GAME_CONFIG`).

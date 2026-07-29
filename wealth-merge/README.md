# Wealth Merge

Suika/watermelon-style drop-and-merge wealth collector. Drop wealth tokens into
a glass jar; two identical tokens in contact **merge into the next bigger
tier** at their contact point, cascading up an 8-tier ladder — from a single
rupee coin to the glowing **Retirement Corpus**.

Dev port **5072**.

## Concept

The jar is your savings habit. Droppable pieces are the small stuff (tiers
1–4, weighted 4:3:2:1; after 40 s the weights shift toward tiers 2–4 so the
jar fills faster). Merges jostle their neighbours, so one good merge can set
off a **chain cascade** — merges within 1 second of each other deepen a chain
whose score multiplier climbs x1 → x1.5 → x2 → x3 → x4…

- **Win** (either): forge the tier-8 Retirement Corpus, or reach **300
  points** when the 100-second timer ends.
- **Lose**: the jar overflows (a resting token sits above the danger line for
  a continuous 2 seconds), or the timer ends below the target.

The danger line at 18% from the jar's mouth is always visible. A transient
bounce above it never loses the run — only a token **at rest** (speed
< 20 px/s, older than 0.5 s) starts the flashing 2-second countdown, which a
last-second merge-out cancels. That grace window is the comeback engine.

## Financial hook

*Compounding in your hands.* Two rupees become a coin stack, stacks become
ingots, ingots become a piggy bank, a SIP jar, an insurance shield, a home —
and finally a retirement corpus. Nothing in the jar grows by being left alone;
it grows by being **combined and consolidated**, and unmerged clutter is what
overflows the jar. The chain multiplier is compounding made tactile: money
merged sooner multiplies everything that follows it.

## The 8-tier ladder

| # | Token | Radius (px) | Merge score (triangular) |
|---|---|---|---|
| 1 | Rupee Coin | 12 | 1 |
| 2 | Coin Stack | 16 | 3 |
| 3 | Gold Ingot | 22 | 6 |
| 4 | Piggy Bank | 30 | 10 |
| 5 | SIP Jar | 40 | 15 |
| 6 | Gold Shield (insurance) | 54 | 21 |
| 7 | Home | 72 | 28 |
| 8 | Retirement Corpus | 96 | 36 — creating it wins instantly |

Score for a merge = the created tier's triangular number x the live chain
multiplier. Every token is a layered programmatic canvas sprite (radial
gradient body, bevel crescents, white emblem silhouette with punched detail,
gloss highlight) — no emoji, no image files.

## Controls

One finger. **Drag horizontally** to aim — the held token is clamped so it can
never overlap a jar wall, and a dashed guide with a ghost ring previews the
landing spot. **Release to drop.** The next piece (previewed top-right)
arrives 0.4 s after a release.

Anti-stall: a piece held longer than **5 seconds auto-drops** (an orange ring
closes around it as the deadline approaches), and since the win requires the
score target, idling can never win.

## Physics

Hand-rolled deterministic circle physics — no physics library:

- Gravity **1500 px/s²**, restitution **0.15**, friction **0.4**, linear
  damping plus a settle term so a disturbed pile is still within ~2 s.
- Fixed **1/120 s** timestep from the shared kit loop (= 60 Hz with 2
  substeps), **4 solver iterations** per step: circle-circle and circle-wall
  impulses with positional correction, mass ∝ r².
- Merge checks run on **post-solver positions**; a `mergedThisFrame` guard
  means no token can take part in two merges in a single step. The only
  non-integrator impulses are the fixed merge pop (130 px/s up) and the fixed
  outward jostle (90 px/s) that drives cascades.

## Anti-pause-scum

The kit loop auto-pauses on `visibilitychange`. Resuming holds the world AND
the session clock behind a visible 3-2-1 re-acquire countdown (1.5 s), then
refuses input for a further 0.25 s live beat — so backgrounding the app never
buys planning time. The rule lives in `src/physics.js`
(`beginPause`/`endPause`/`isFrozen`), same pattern as `goal-juggler`.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `TIERS`: every tunable in one place.
- `src/physics.js` — **pure**: integration, collision, merging, chains, the
  overflow countdown, auto-drop, pause rule, win/lose. No DOM, no React; the
  config and tier table are parameters.
- `src/WealthMergeGame.jsx` — the canvas component. Mutable state in refs,
  offscreen-prerendered backdrop and per-tier sprites rebuilt only on resize,
  HUD score via `textContent`. It contains no rules.
- `src/Screens.jsx` — Home, How to Play (CSS-animated merge demo + tier
  ladder), Results (score ring, run stats, share, book-a-slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited.
- Lead capture / slot booking / play count copied from the
  `guardian-shelter` gold-standard scaffold (`LEAD_NO_KEY =
  'wealthMergeLeadNo'`).

## Commands

```
pnpm install
pnpm dev            # port 5072
pnpm build          # mode uat — the verification gate
pnpm build:preprod
pnpm build:prod
pnpm preview
```

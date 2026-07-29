---
type: project
title: Premium Tiles
description: Piano-Tiles-style lane tapper where every tap performs the next note of a real 160-note pentatonic melody. Blue premium tiles fall in 4 lanes toward a DUE line; HOLD tiles sustain a note, DOUBLE tiles need both lanes within 100 ms, red risk tiles (impulse buy / scam call) must not be tapped. ~90 s chart of 160 tiles, 3 lives, combo up to x4, star rating by Perfect %.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/premium-tiles
tags:
  - game
  - rhythm
  - lane-tapper
  - melody
  - arcade
timestamp: 2026-07-29
---

# Premium Tiles

Financial hook: *a premium on every note* — never miss a payment and your
family's plan plays like music. Tapping each blue tile (bottom-most first) plays
`MELODY[noteIndex++]`, so the player literally performs the song; a miss breaks
the music with a 110 Hz discordant thud and costs one of 3 lives.

Key mechanics: 4 lanes, ~90 s deterministic chart (`buildChart`, seeded) of 160
scorable tiles; fall speed 55% screen-height/s stepping +10% every 15 s (SPEED
UP flash, cap ×1.7); Perfect (+2) when the tile centre is in the lower third of
travel; combo ×2/×3/×4 at 25/50/75; HOLD tiles from 20 s (+1 per 200 ms held,
sustained synth note), DOUBLE tiles from 40 s (both lanes within 100 ms, two
fingers or two quick taps), red risk tiles ≤10% and never adjacent to a double.
WIN = finish the chart with ≥1 life; stars 1★≥50% / 2★≥75% / 3★≥90% Perfect.

Anti-exploit: empty-lane taps cost a life; >8 taps/s under 50% accuracy counts
extras as misses; hits only on discrete pointerdown (drags never hit); kit
auto-pause resumes behind a frozen 3-2-1 re-acquire count with the clock held
(goal-juggler pattern). Audio is a game-owned Web Audio synth
(`src/synth.js`, latencyHint interactive, pre-warmed on first gesture) because
the immutable kit audio has no sustained-note API.

Standard scaffold: guardian-shelter clone (lead capture → slot booking →
thank-you, playCount, crypto/shortener, kit copied byte-identical). Dev port
**5071**, build `pnpm build` (uat mode).

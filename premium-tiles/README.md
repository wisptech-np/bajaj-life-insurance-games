# Premium Tiles

Piano-Tiles-style lane tapper where **every tap performs the next note of a real melody**.
Blue premium tiles fall down four lanes toward the glowing DUE line; tapping them in order
(bottom-most first) plays a 160-note upbeat pentatonic folk tune — the player literally
performs the song, and breaking the flow breaks the music.

## Financial hook

*A premium on every note.* Never miss a payment and your family's plan plays like music.
Missed tiles are missed premiums, red tiles are impulse buys and scam calls that cost you,
and a clean run keeps the plan in perfect harmony.

## Controls

- **Tap** a blue premium tile (anywhere on the tile) — plays the melody's next note.
  Tiles must be hit in order, lowest first.
- **Tap near the DUE line** (lower third of the fall) for a **Perfect** (+2 instead of +1).
- **HOLD** tiles — press and keep your finger down; a sustained note plays and **+1 banks
  every 200 ms** held, until the tail crosses the line.
- **TAP BOTH** tiles — two lanes in the same row; hit both within **100 ms** (two fingers
  or two rapid taps).
- **RED risk tiles** ("IMPULSE BUY" / "SCAM CALL") must **not** be tapped — tapping one
  costs a life. Tapping an empty lane also costs a life, and letting a blue tile fully
  cross the DUE line costs a life. **3 lives** total.

## Scoring & session

- +1 per tile, +2 for a Perfect; combo multiplier **×2 at 25**, **×3 at 50**, **×4 at 75**
  consecutive hits (a miss resets to ×1 with a visible combo break).
- ~90-second chart of ~160 tiles. Fall speed starts at 55% screen height/s and steps
  **+10% every 15 s** (SPEED UP flash, capped at ×1.7). HOLD tiles enter at 20 s,
  DOUBLE tiles at 40 s; red tiles stay ≤10% of the chart.
- **WIN**: finish the chart with ≥1 life. Star rating by Perfect %:
  1★ ≥50% · 2★ ≥75% · 3★ ≥90%.
- Anti-exploit: mashing fails (empty-lane taps cost a life; >8 taps/s under 50% accuracy
  count as misses), drags never trigger hits, and backgrounding the tab resumes behind a
  frozen 3-2-1 re-acquire countdown with the clock held.

## Tech

- Standalone Vite + React 18 app, canvas renderer, Web Audio synth only (no audio files),
  shared game-kit copied byte-identical into `src/kit/`.
- Dev server port: **5071**.

## Build

```bash
pnpm install
pnpm dev        # http://localhost:5071
pnpm build      # UAT build (the gate)
pnpm build:prod # production LMS endpoints
```

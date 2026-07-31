# Risk Exit — build log

## 2026-07-31 — mechanic replacement: tap-to-fly-off → sliding-block escape

Rebuilt `risk-exit/` (dev port 5034) from a tap-an-arrow-block-and-it-flies-off
board into a **true Rush Hour / Unblock Me sliding-block escape puzzle**. This
was a mechanic replacement, not a reskin — the old directional-arrow model,
neighbour-lock rule and combo scoring are gone.

**New core.** 6x6 tray of 2- and 3-cell rectangles, each locked to one axis
(horizontal slides left/right, vertical up/down). The player **drags**; the
block tracks the finger cell-for-cell inside its legal range and snaps to the
grid on release, so one drag of any distance is one move. A gold 2-cell
horizontal **Family Cover** block sits in row 2; the exit gate is the right wall
of that row. Getting the cover flush against the gate solves the board and it
slides out through the gate.

**Rules extracted to a pure module.** `src/rules.js` (no React, no DOM) owns
`slideRange` — the single definition of a legal move — plus `occupancy`,
`applyMove`, `isSolved`, `blocksHeroRow`, `validateLevel` and a breadth-first
`solve`. `RiskExitGame.jsx` and `gate.mjs` both import it, so the solver
enumerates exactly the moves the finger is allowed.

**Levels are proven, not asserted.** `src/data.js` ships 6 hand-authored grid
layouts with financial names (Early Career → Full Portfolio). Each carries a
`par` that is the BFS minimum, not a guess. `node gate.mjs` re-solves every
board on every run and fails the build if any level is unsolvable or if an
authored par drifts from the solver's minimum. It also replays each solution
back through `slideRange`, checks the ladder never goes backwards, checks the
session clock affords the total par, and self-tests by asserting a deliberately
walled-in board comes back unsolvable. Output: **GATE: PASS**, ladder
4 → 5 → 6 → 8 → 10 → 11, 44 drags total in 120 s = 2.73 s per drag at par.

**Financial hook, translated.** Every obstructing block is a named risk —
debt, illness, market shock, job loss — each with its own red-family tone and
its own drawn glyph (coin-drain, ECG cross, crashing candlesticks, snapped
briefcase). Pushing a risk clear of the cover's lane scores `+40` the moment it
happens and bursts particles. The "clear them in the right order" idea now falls
out of the puzzle itself: move the wrong block first and it boxes in the one you
needed. The optional "frozen until an adjacent risk clears" piece was **not**
built — it risks making authored boards unsolvable for no mechanical gain.

**Polish.** Blocks are drawn as extruded slabs (body gradient, top gloss band,
bottom inner shade, bright top-left / dark bottom-right rim light, recessed icon
plate, axis chevron end-caps). Squash-and-stretch along the travel axis plus
screen shake and `sfxBump` when a drag is shoved past a neighbour; `BOXED IN`
float text and `sfxLocked` for a block wedged solid both ways; gravity-affected
particle bursts on a cleared risk and at the gate; stroked floating score text;
an animated gate mouth with drifting chevrons; spring-in board banners.

**G1.** Email removed from `src/LeadCaptureModal.jsx` — `EMAIL_RE`, the state,
the whole field block, the validation branch, the `lastSubmittedEmail`
session-storage read/write and `email` from both `submitToLMS` and
`onSubmitted`. `api.js` untouched (`email_id: email || ''` keeps the LMS payload
shape identical). `grep -i email src/` outside `api.js` is now zero.

**G2.** `HowToPlayScreen` is one 5-second looping SVG demo: a finger drags a red
block down out of the lane, then a second finger drags the gold block right and
out through the green gate. Instruction paragraphs deleted; remaining text is
the heading, three icon-led labels (Drag / One axis / Exit) and the Play button.

**G3.** `risk-exit/asset-from-here.md` written — 13 Nano Banana prompts covering
the hero block, all four risk types in 2- and 3-cell lengths, axis caps, the
recessed tray with its broken right wall, the gate, the backdrop, HUD icons, the
drag hand, the result crest and the clear-burst sprite sheet. Shape language is
unique to this game (flat-on injection-moulded slabs, 22% radius, hard gloss
band) so it cannot be confused with any other title's art.

**Screens.** `HomeScreen` hero art replaced with a mini board whose gold cover
loops out through the gate. `ResultsScreen` kept at the guardian-shelter
standard; chips retargeted to Boards / Risks / Moves and the ring target moved
from a hard-coded 1500 to `TARGET_SCORE` (2800) in `data.js`. `App.jsx`
contract, lead capture, slot booking and `playCount` wiring unchanged.

**Untouched:** `src/kit/`, `src/api.js`, `src/services/`, `src/utils/`,
`src/audio.js`, every other game folder, the root README.

**Build:** `pnpm install && pnpm build` → `✓ built in 4.77s`
(`dist/assets/index-*.js 395.75 kB │ gzip: 131.21 kB`).

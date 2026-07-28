# Smart Sorter

Conveyor swipe-sorting. Twelve kinds of money decision ride a belt down the
screen; when one reaches the sorting head in the bottom third you have to file it
before it scrolls off the end.

**Port 5061.** `pnpm install && pnpm dev` · build gate: `pnpm build` · balance
gate: `pnpm balance`.

## Concept and financial hook

Every card is one real decision, and each belongs on exactly one shelf:

| Shelf | Gesture | Cards | Icon family |
|---|---|---|---|
| **Protect** | swipe **left** | Term Plan, Health Cover, Critical Illness, Accident Shield | shield silhouettes |
| **Grow** | swipe **right** | SIP, Mutual Fund, Bonds, Gold | bars, donut, trend line, coin stack |
| **Bin** | swipe **down** | Scam Call, Impulse Buy, Lottery Ticket, Dubious Tip | triangle, starburst, torn ticket, bolt |

The hook is the sorting itself. Money decisions arrive faster than you can think
about them, and the three piles are not equally obvious under time pressure — the
things that *feel* urgent (a hot tip, a lottery ticket, a call demanding action
right now) are exactly the ones that belong in the bin, while the things that
actually matter are the boring cards you have to remember to file. Filing a card
on the wrong shelf costs precisely what ignoring it costs: one mistake, three and
you are out.

Colour does the teaching. One brand colour per direction, used for nothing else —
BLUE `#003DA6` is Protect and left, GREEN `#28A745` is Grow and right, ORANGE
`#F26522` is the bin and down. RED is reserved exclusively for mistakes, so
nothing you are supposed to touch is ever red.

## Controls

- **Swipe left / right / down** on the stage. The swipe judges the card nearest
  the bottom of the sorting head.
- A swipe with an empty head, or an upward swipe, does nothing — no penalty. A
  gesture aimed at nothing should never cost a life.
- No taps, no buttons. The whole game is three gestures.

## Rules and scoring

- **90 seconds.** Belt speed rises **+6% every 5 cards**, reaching 1.90x by the
  end of a full run.
- **Every 10th card is urgent**: it glows gold, rides at **1.5x** belt speed and
  pays **double**.
- **Correct sort** = 40 x combo multiplier. **Urgent** = 80 x multiplier.
- **Combo** steps up one notch every 3 consecutive correct sorts and caps at
  **x5**. Any mistake resets it to x1.
- **Mistake** = wrong shelf *or* letting a card scroll past. **3 mistakes ends
  the run.**
- **Win**: survive the full 90 s with fewer than 3 mistakes and at least 1,200
  points. **Lose**: 3 mistakes.

Stats contract: `{ score, sorted, bestCombo, mistakes }`. `bestCombo` is the
longest run of consecutive correct sorts, not the multiplier — see the note in
`okf-brain/smart-sorter/log.md`.

## Balance notes

`node scripts/balance.mjs [runs] [--sweep]` drives the **shipped** rules
(`src/rules.js`, `src/items.js`, `src/layout.js`, `src/data.js` — all pure, no
React and no canvas) at the same fixed 1/120 s step the kit's loop uses. Nothing
in it re-implements a rule. 500 seeded runs per policy:

| Policy | Win | Score (median) | Sorted (median) | Mistakes (mean) |
|---|---|---|---|---|
| Casual — 6% missort, 250 ms reaction (the brief's bot) | **36.2%** | 6,120 | 41 | 2.44 |
| Perfect — 0% missort, 250 ms reaction | 100% | **10,360** | 53 | 0.00 |
| Sloppy — 15% missort, 400 ms reaction | 0.6% | 1,160 | 15 | 2.99 |
| Idle — never swipes | 0% | 0 | 0 | 3.00 (dead in 10.4 s) |

The perfect bot scores **8.6x** the 1,200 target, so the ceiling is nowhere near
the win line. Casual play lands at 36%, mid-band. The gap between 6% and 15%
missort is 36 points of win rate, which is the whole game: this rewards reading
the card, not swiping fast.

Because the run ends the moment three mistakes land, the binding constraint is
the mistake budget rather than the score — anyone who survives 90 s has sorted
~53 cards and cleared 1,200 several times over. That is a deliberate consequence
of the brief's numbers and is documented in the OKF log rather than papered over.

The gate also proves things a win rate cannot:

- **No card ever overlaps another.** Urgent cards ride 1.5x and therefore close
  on whatever is ahead of them, which is why they launch from further back
  (`track.urgentSpacing`). A dedicated *lazy* policy holds every card to the last
  possible instant purely to force the tightest geometry the rules can produce;
  the worst gap measured across all runs is **0.287 track units**, and zero
  spawn-order inversions occur.
- **The reaction window never closes faster than a human can answer.** Narrowest
  window across every card of every run is **0.698 s**, against the bot's 250 ms.
- **The layout holds on real handsets.** `src/layout.js` is resolved for six
  stage sizes from 300x420 up to 410x840; on every one the sorting head's centre
  sits 72-76% down the stage (the brief's "bottom third"), a card fits inside the
  head band, and the tightest card gap in pixels exceeds the card height.
- **Every item has its own icon shape.** The gate reads the `ICONS` table out of
  `SmartSorterGame.jsx` and joins it against `items.js`: 12 items, 12 distinct
  shapes, none missing, none orphaned, four per family.

`--sweep` re-runs the casual bot across base belt speeds 0.13-0.19 so the
sensitivity of the win rate to the one speed constant is visible rather than
assumed.

## Structure

```
src/
  data.js              all tunables + palette (pure)
  items.js             the 12 cards, families, deterministic picker (pure)
  rules.js             belt, spawn schedule, swipe judgement, combo, win/lose (pure)
  layout.js            track units -> pixels (pure)
  SmartSorterGame.jsx  canvas, paint, sound, input, HUD
  Screens.jsx          home / how to play / results
  App.jsx              screen flow + lead capture
scripts/balance.mjs    the balance gate
```

The four pure modules are the contract with the sim: they import nothing from
React, canvas or the DOM, which is why the numbers above are measurements of the
shipping game rather than of a model of it.

All artwork is drawn with canvas paths or inline SVG. There is no image file and
no emoji anywhere in the game.

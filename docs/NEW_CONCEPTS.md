# Five New Concepts — 2026-08-22

**Hard rule applied:** no mechanical or visual overlap with the 33 titles in `bajaj-game-store`, the 35 built titles in this repo, the 8 pending-sign-off titles, or anything dropped by feedback. All five are from scratch. Insurance framing is deliberately light — per the review pattern, Bajaj is rejecting on quality, not on thematic density.

**Every concept below is built for:** 390×844 portrait, one-input or one-drag control, a 10–15 s core loop, zero instructional text, green virus as the sole antagonist, and the shaded-flat-vector doctrine in `BAJAJ_ARCADE_STYLE_GUIDE.md`.

---

## Overlap audit — what was ruled out and why

Before picking, I ruled out every mechanic already spoken for:

| Family | Already taken by |
|---|---|
| Match-3 / merge / triple-match | store match-3 ×2, `smart-match-3d`, `wealth-merge` |
| Runner / climber / flappy / glider | store ×4, `life-soar`, `steady-wings`, `milestone-hopper` |
| Shooter (top-down, rail, galaga, bomberman, archery) | store ×3, `secure-journey`, `coverage-archer`, `guardian-arena` |
| Flick / launch physics (bowling, carrom, pinball, slingshot) | `risk-strike`, `wealth-carrom`, `premium-pinball`, dropped hedgehog-launch |
| Stacking / tower / block-fit / tetris | store stacking + tetris, `sip-stack`, `steady-tower`, `portfolio-fit` |
| Grid logic (sudoku, minesweeper, jigsaw, memory) | store ×7 |
| Line-drawing / path-drawing | dropped "Path to Legacy" |
| Chain reaction / ripple | deleted `ripple-shield` |
| Dual simultaneous control | dropped "Dual Cover" |
| Rhythm / timing tap / Simon | `premium-pulse`, `premium-tiles`, `smart-recall`, `perfect-premium` |
| Territory capture / sonar / time-loop | `ring-fence`, `risk-radar`, `legacy-echo` |
| Sorting into tubes / conveyors | store `life-sorted`, `smart-sorter` |
| Bridge building | store `bridge-builder` |
| Tower defense / quiz / snake / word | store |

What remains genuinely unused: **magnetism, torque/gearing, load balancing, service-queue management, and graph untangling.** That is the set below.

---

## 1. Polarity — *"Pull & Protect"*

| | |
|---|---|
| **Mechanic** | Magnet polarity steering. One input: tap to flip your polarity between attract and repel. |
| **Reference game** | None — from scratch. |
| **Financial concept** | The right pull at the right moment. Cover attracts what you want to keep and repels what you don't. |
| **Directory** | `polarity-cover` |
| **Effort** | 6d |

**Loop.** A cover-orb drifts continuously up a portrait shaft. Gold nodes and green virus nodes line the walls. Your orb has a polarity; tapping flips it. Same polarity repels, opposite attracts. So a single tap simultaneously changes which wall pulls you and which pushes you — one input, two consequences, continuous spatial reasoning.

**Why it's good.** The skill ceiling is real: you're not dodging, you're *using* the hazards to steer. Late levels place a virus cluster exactly where you need attraction, forcing a choice between the fast line and the safe one. That is a decision every 1.5 seconds from a single tap.

**First 30 s.** Orb already drifting. One gold node glows. First tap snaps you to it with a full impact stack. No words.

**Value idea.** *A single warm orb in a cold magnetic shaft; the only other light is the pull you're about to use.*

**Juice.** Field lines bloom on flip. Attraction stretches the orb toward its target (squash/stretch on the velocity axis). Capture = hit-stop + gold burst. Virus contact = flash frame + shake + splitter spawn.

---

## 2. Even Keel — *"Steady Balance"*

| | |
|---|---|
| **Mechanic** | Load-balancing beam. Drag to slide a counterweight along a pivoting beam. |
| **Reference game** | None — from scratch. |
| **Financial concept** | A portfolio is a beam. Shocks land on one side; you rebalance, you don't panic-sell. |
| **Directory** | `even-keel` |
| **Effort** | 5d |

**Loop.** A beam pivots on a fulcrum. Life-goal weights (the 11 icons) drop onto it at unpredictable positions and masses. You drag one counterweight left/right to keep the beam inside a tilt tolerance. Tolerance narrows as the run progresses. Virus blobs land as *negative* weight that drifts along the beam on its own, so a stable configuration becomes unstable without warning.

**Why it's good.** Genuine physics tension with one drag. The drifting virus weight means you can never solve it once — you're continuously re-solving. Torque is instantly legible: everyone understands a see-saw, which is exactly the self-evidence the review demanded.

**First 30 s.** Beam already gently rocking. One weight drops. The counterweight glows. First drag levels it, gold burst, beam rings like a struck bar.

**Value idea.** *A warm brass beam lit from above against a dark hall; the virus side falls into shadow as it tips.*

**Juice.** Beam overshoot with `outElastic`. Weight impacts squash on contact and shake the beam. Near-topple triggers a red vignette pulse and a low string. Perfect level for 3 s = combo.

---

## 3. Front Desk — *"Advisor Rush"*

| | |
|---|---|
| **Mechanic** | Service-queue time management. Tap a customer, tap the matching token. |
| **Reference game** | None — from scratch. |
| **Financial concept** | Needs-based advice: the right cover for the right person, before they walk. |
| **Directory** | `front-desk` |
| **Effort** | 7d |

**Loop.** Families queue at a counter. Each shows a need as one of the 11 life-goal icons above their head, plus a patience meter. You tap a customer to select, then tap the matching token from a shelf of 4–6. Correct match = served, score, patience relief for everyone behind them. Wrong match = patience penalty across the queue. Serving speed increases; needs start arriving in pairs (one customer, two icons, both must be matched in order).

**Why it's good.** It's the only concept here with *escalating cognitive load* rather than escalating reflex demand, which broadens the portfolio. It also uses the 11 life-goal icons as the literal core mechanic — maximum return on the icon set, and the strongest natural fit for the brand of any concept in this list without being preachy.

**First 30 s.** One customer already waiting, their icon pulsing, the matching token glowing. Nothing else is tappable. First serve is unmissable.

**Value idea.** *A warm lit counter in a dark hall; the queue behind fades into shadow, so the person you can help is always the brightest thing on screen.*

**Juice.** Token flies to the customer on an arc. Serve = hit-stop, gold burst, patience meter snaps up with `outBack`. Walk-out = desaturation sweep + door slam. Virus appears as an impatience aura creeping up the queue.

**Compliance note.** Depicts an advisor matching products to needs — keep tokens abstract (goal icons, not named Bajaj products) so this doesn't read as product advertising. Route to legal.

---

## 4. Clockwork — *"Plan in Motion"*

| | |
|---|---|
| **Mechanic** | Gear-train assembly. Drag gears onto pegs to transmit drive from input to output. |
| **Reference game** | None — from scratch. |
| **Financial concept** | A plan only works if every part turns the next one. One missing tooth and nothing moves. |
| **Directory** | `clockwork-plan` |
| **Effort** | 6d |

**Loop.** A driver gear spins on the left, an output wheel sits idle on the right. Between them, empty pegs and a tray of gears in three sizes. Drag gears onto pegs to build a train that reaches the output before the timer. Gear size sets ratio — a small gear spins fast but weakly, so late levels require hitting a *target output speed*, not just connectivity. Virus growth on a peg jams that gear; you have to route around it or clear it by driving a large gear into it.

**Why it's good.** Pure spatial-mechanical puzzle, a family this portfolio has none of. The payoff moment — the last gear seats and the whole train comes alive at once — is one of the most satisfying beats in games, and it's free juice.

**First 30 s.** Driver already spinning. One empty peg, one gear glowing in the tray. Drop it, the train engages, everything turns, full impact stack.

**Value idea.** *Dark oiled machinery; only the gears that are actually turning catch the warm light.*

**Juice.** Gears seat with a mechanical clunk + hit-stop. Engagement propagates down the train with a 40 ms stagger per gear so the train visibly "wakes up". Output wheel completion = gold flood along the whole train.

---

## 5. Untangle — *"Sort My Money"*

| | |
|---|---|
| **Mechanic** | Graph untangling. Drag nodes until no connection crosses another. |
| **Reference game** | None — from scratch. |
| **Financial concept** | Tangled finances hide risk. Straighten the lines and you can finally see what you own. |
| **Directory** | `untangle` |
| **Effort** | 5d |

**Loop.** Life-goal nodes connected by taut cords, deliberately crossed. Drag nodes to eliminate every crossing. Solved boards resolve with a snap into a clean geometric figure. Difficulty scales by node count, not by time pressure. Virus sits *on* a crossing — every crossing you clear kills a virus, so the puzzle state and the threat state are the same thing, and progress is never ambiguous.

**Why it's good.** The one calm title in the set — no timer, no reflex — which the portfolio badly needs for range, and it's the strongest showcase for the new icon set as pure composition. The "aha" reveal when a mess snaps into a clean polygon is the entire hook, and it reads instantly in a 3-second ad clip.

**Distinct from `income-pipeline`** (rotate tiles to route flow, goal = connectivity) and from the dropped line-drawing concept (you draw nothing): here the graph is fixed and you move nodes, goal = planarity.

**First 30 s.** Board already gently breathing. One node glows with two obvious crossings. First drag clears both, two viruses pop, cords flash gold.

**Value idea.** *Cords glow warm where they're clean and sickly green where they cross — the board literally shows you your progress as colour.*

**Juice.** Cords are springs — they wobble on release with `outElastic`. Crossing cleared = virus pop + cord flashes gold along its length. Final crossing = full-board gold cascade, hit-stop, and the figure settles into perfect symmetry.

---

## Summary

| Concept | Bajaj name | Mechanic family (unused) | Effort | Compliance |
|---|---|---|---|---|
| Polarity | Pull & Protect | Magnetism | 6d | Clear |
| Even Keel | Steady Balance | Load balancing / torque | 5d | Avoid "portfolio returns" copy |
| Front Desk | Advisor Rush | Service-queue management | 7d | **Route to legal** — advice depiction |
| Clockwork | Plan in Motion | Gear trains / ratio | 6d | Clear |
| Untangle | Sort My Money | Graph planarity | 5d | Clear |

**Total: 29 developer-days**, on top of the 89d remediation. Art rides the same pipeline and the same icon set — the marginal art cost of these five is low because four of them reuse the 11 life-goal icons as gameplay objects rather than needing bespoke sprite sets.

**Sequencing recommendation:** these are *additive*, not urgent. Build them after Phase 2 of `REMEDIATION_TRIAGE.md` proves the style guide — a new concept built on an unvalidated art system is the same mistake twice. If Bajaj wants something new in the resubmit to signal direction, **Untangle** is the cheapest (5d) and the most visually distinctive at a glance.

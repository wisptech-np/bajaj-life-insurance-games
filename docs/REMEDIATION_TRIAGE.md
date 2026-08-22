# Remediation Triage & Sequencing — 2026-08-22 Review Response

**Input:** BajajLife feedback on 19 submissions. 1 approved, 18 with notes.
**Delivery mode:** single consolidated resubmit (client decision).
**Companion docs:** `RESEARCH_PRODUCTION_QUALITY.md` (why), `BAJAJ_ARCADE_STYLE_GUIDE.md` (the system), `asset-manifest.json` (production).

---

## 0. Two answers you need before reading the table

**"Not found in repo — were these ever shipped?"** Confirmed: **no.** `balance-block-journey` and `shield-cascade` have no directory and no source. The tracker has carried both as *"Not started — no directory"* since the original 25-game spec. They were signed off in concept and never built. They are **new builds**, not repairs.

**`ripple-shield` does not exist either.** It was **deleted on 2026-08-03** along with Dual Cover, Goal Juggler and Time Shield (ports 5046/5079/5068/5076 retired). The "design is too simple and basic, change it totally" note therefore predates its deletion. Two options: treat it as a from-scratch build, or let the deletion stand and put one of the five new concepts in its slot. **Recommendation: let the deletion stand** — rebuilding a title Bajaj already dislikes costs the same as a new concept with none of the baggage.

That makes the real work: **16 repairs + 2 never-built + 1 blocked**, not 18 repairs.

---

## 1. Remediation types

| Code | Type | What changes | What does not |
|---|---|---|---|
| **A** | Asset swap | Art, audio, palette, icons | Loop, screens, physics |
| **U** | UI rebuild | Screens, HUD, layout, feedback | Core loop |
| **M** | Mechanics redesign | The loop itself | — |
| **F** | From scratch | Everything | — |
| **B** | Blocked | Nothing until client call | — |

Effort is person-days for one developer, assuming the shared art/audio pipeline (§3) is already running. **Art production time is not in these numbers** — it runs in parallel off the manifest.

---

## 2. The table

### Tier 1 — Asset swap only (loop is fine, presentation isn't)

| Title | Type | Effort | The actual work |
|---|---|---|---|
| `smart-match-3d` | **A** | 2d | Regenerate all 11 life-goal tiles against §6.1. Existing SVG tiles predate the system. Re-encode the 567 KB PNG background to WebP (→ ~110 KB). |
| `portfolio-fit` | **A** | 2d | Block art: each block gets a life-goal identity instead of a flat colour. Placement/clear juice via the impact stack. |
| `risk-strike` | **A + U** | 3d | *"Too simple and not proper UI."* Pin art + lane surface + real ball. HUD rebuild. Flick arc telegraph. |
| `steady-tower` | **A + U** | 3d | *"Game UI is not good."* Block art with material identity, wobble telegraph, HUD off the tower column. |
| `wealth-drop` | **A + U** | 3d | Bigger ball (2.2× current radius), board art, peg lighting, **zero text** per note. Slot payoff animation. |
| **Bubble Shooter** (approved) | **A** | 1d | Approved, but the portfolio-wide rules still apply: strip instructional text, remove email field, no emoji, virus for hazards. Do not touch the loop. |

**Tier 1 subtotal: 14d.**

### Tier 2 — Presentation + one contained mechanic change

| Title | Type | Effort | The actual work |
|---|---|---|---|
| `spiral-sprint` | **A + U + M** | 4d | Palette per §2 (risk zones dark, shield bright). **Longer run** and a **payoff animation after a long drop** are both loop changes, not polish. |
| `milestone-hopper` | **M + A** | 5d | *"Too basic — improve the mechanic."* Add a real risk: moving virus lanes with telegraphed timing windows, near-miss scoring, escalating lane speed. Lit-safe / unlit-hazard value idea. |
| `swing-to-secure` | **M + U + A** | 6d | Mechanics weak **and** UI basic. Rope physics needs momentum conservation + release-timing skill. Full art pass. |
| `life-soar` | **M + A** | 6d | *"Game mechanics is not good."* Glide needs an energy economy — dive to build speed, climb to spend it — so there's a decision every second. Currently it's hold-to-not-die. |

**Tier 2 subtotal: 21d.**

### Tier 3 — Mechanics redesign, heavy

| Title | Type | Effort | The actual work |
|---|---|---|---|
| `secure-journey` | **M + A** | 7d | Virus dies too easily → HP tiers using the Scout/Standard/Brute/Splitter ladder. *"Powerups too basic"* → real financial powerups with stacking rules and a visible economy. Competitive tension via a rival column. |
| `coverage-archer` | **M + A** | 7d | Archer redrawn, **physics retuned** (drag, gravity, release arc), **single-player only**: virus targets, no return fire. Phaser title — keep Phaser, don't port. |
| `tightrope-protection` | **M + A** | 6d | Still short of reference. Needs the **wire restored** (currently flat ground), crows → green virus, real balance dynamics with recoverable wobble. Phaser title. |

**Tier 3 subtotal: 20d.**

### Tier 4 — From scratch

| Title | Type | Effort | Note |
|---|---|---|---|
| `guardian-shelter` | **F** | 8d | *"Everything is not good, totally change it."* Concept survives (Cover Orange shield physics), execution does not. Cloud hazard → virus. |
| `risk-exit` | **F** | 7d | *"Redesign totally, nothing is same, not a good UI."* Arrow Exit sliding puzzle rebuilt. |
| `balance-block-journey` | **F** | 7d | **Never built.** Bloxorz block-rolling. Single stage, ~2 min cap, no stage progression (per original note). |
| `shield-cascade` | **F** | 8d | **Never built.** Roly-Poly Cannon physics destruction. |
| `ripple-shield` | **F** | 8d | **Deleted 2026-08-03.** Recommend dropping — see §0. |

**Tier 4 subtotal: 30d** (22d if `ripple-shield` stays dropped).

### Blocked

| Title | Type | Effort | Note |
|---|---|---|---|
| `goal-orbit` | **B** | 0d | *"Need to be discussed."* Parked pending client call. **Do not build against assumptions** — it is the one title where guessing wastes the whole effort. Get the call scheduled before the resubmit window closes. |

---

## 3. Shared work — do this first, it unblocks everything

None of the per-title numbers hold unless this lands first. It is also where most of the perceived quality comes from.

| # | Item | Effort | Why first |
|---|---|---|---|
| 1 | **Style guide** — `BAJAJ_ARCADE_STYLE_GUIDE.md` | ✅ done | Everything inherits it |
| 2 | **Asset pipeline** — `gen-assets.mjs`, `clean-svg.mjs`, `preview-assets.mjs`, manifest | ✅ done | Repeatable generation, idempotent, previewable |
| 3 | **Core asset set** — virus ×5, life-goal icons ×11, UI icons ×8 | in progress | Blocks every title's art pass |
| 4 | **Audio library** — licensed SFX, 7 cues, one `sfx.webm` sprite per game; retire oscillator synthesis | 4d | Biggest perceived-quality gain per KB in the plan |
| 5 | **game-kit upgrades** — impact stack helper, anticipation helper, permanence buffer, dynamic camera | 3d | Turns existing juice primitives into a single call every game uses |
| 6 | **Portfolio-wide compliance sweep** — strip instructional text, remove email field, kill emoji, `pointerdown` for time-critical input, 3-2-1 re-acquire countdown after auto-pause, delete score-linked insight box and "Claim Certificate" | 3d | Applies to all 19 including the approved title. Cheap, and every one of these is an explicit review note. |
| 7 | **Atlas + WebP build step** | 2d | Enforces the §10 budgets automatically instead of by discipline |

**Shared subtotal: 12d.**

---

## 4. Totals

| Bucket | Effort |
|---|---|
| Shared foundation | 12d |
| Tier 1 — asset swap | 14d |
| Tier 2 — presentation + contained mechanics | 21d |
| Tier 3 — heavy mechanics | 20d |
| Tier 4 — from scratch (excl. `ripple-shield`) | 22d |
| `goal-orbit` | blocked |
| **Total** | **89 developer-days** |

Plus art production (parallel, pipeline-driven) and one legal/brand review pass.

At 1 developer that is ~18 calendar weeks. At 3 developers with clean file ownership, ~7 weeks. **The single-drop resubmit is gated on the slowest tier**, so Tier 4 determines the date.

---

## 5. Build order for a single consolidated resubmit

You chose one big resubmit, so sequencing is no longer about "fastest path to approval #2" — it's about **de-risking the one shot**. Order accordingly:

**Phase 1 — Foundation (weeks 1–2).** All of §3. Nothing else starts.

**Phase 2 — Prove the system on three titles (weeks 2–4).**
`smart-match-3d` → `wealth-drop` → `milestone-hopper`.
One pure asset swap, one asset+UI, one mechanics change. If the style guide is wrong, it is wrong here — where three titles are affected, not eighteen. **Do not proceed to Phase 3 until these three are visually signed off internally.**

**Phase 3 — Parallel production (weeks 4–12).** Three independent streams, no shared files:
- *Stream A (art-led):* `portfolio-fit`, `risk-strike`, `steady-tower`, `spiral-sprint`, Bubble Shooter
- *Stream B (mechanics):* `swing-to-secure`, `life-soar`, `secure-journey`
- *Stream C (rebuilds + Phaser):* `guardian-shelter`, `risk-exit`, `coverage-archer`, `tightrope-protection`

**Phase 4 — Never-built titles (weeks 8–14, overlapping).** `balance-block-journey`, `shield-cascade`. Last, because they benefit most from a fully proven pipeline and have no legacy to preserve.

**Phase 5 — Consolidation (weeks 14–16).** Compliance sweep re-verified across all titles, budget audit, legal/brand review, one build, one submission.

---

## 6. One risk with the single-drop plan

Bajaj's feedback pattern shows their objections are mostly **taste-level and visual**. A single drop bets all 18 titles on our reading of that taste being right, with no correction cycle. If the style guide misses, it misses everywhere at once and the rework is 18 titles deep.

**Cheap mitigation that doesn't change your delivery model:** send the **Phase 2 trio informally** — not as a submission, just "here's the direction, does this read right to you?" It costs a week, it isn't an approval cycle, and it converts the single biggest unknown into a known before Phase 3 spends 8 weeks. If they say yes, the remaining 15 titles are execution risk only.

Building to the single-drop plan regardless — this is a flag, not a blocker.

---

## 7. Compliance items to route before resubmission

Full detail in `RESEARCH_PRODUCTION_QUALITY.md` §8. Short list for the submission checklist:

- Returns/growth language in `wealth-drop`, `spiral-sprint`, `sip-stack`, `wealth-merge`, `portfolio-fit`
- ULIP-as-investment framing (explicitly restricted by IRDAI) — `spiral-sprint`, `wealth-drop`, `sip-stack`
- Score-linked financial insight box — recommend deleting portfolio-wide
- "Claim Certificate" CTA — rename
- Lead-capture consent copy + DPDP alignment — one central legal sign-off
- Green virus must stay abstract; no medical realism, no illness-specific depiction
- Brand sign-off on the logo lockup and palette in game context

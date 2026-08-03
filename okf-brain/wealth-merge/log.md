# Wealth Merge — build log

## 2026-07-29 — initial build

Built `wealth-merge/` (dev port 5072), the Suika/watermelon-style
drop-and-merge collector, cloned from the `guardian-shelter/` gold-standard
scaffold. Vite 5 + React 18.3.1, isolated app, pnpm only, no physics
dependency — the circle physics is hand-rolled in a pure module.

**Scaffold.** `package.json` (name `wealth-merge`), `vite.config.js`
(rollup output name `WealthMerge`, port 5072, LMS defines kept), `index.html`
(viewport per §6, Poppins). Copied verbatim from `guardian-shelter/src/`:
`main.jsx`, `index.css` (comment headers re-identified), `SlotBookingModal.jsx`,
`LeadCaptureModal.jsx` (title/summary text only), `services/playCount.js`,
`utils/crypto.js`, `utils/shortener.js`. `api.js` copied with
`LEAD_NO_KEY = 'wealthMergeLeadNo'`, default `summaryDtls: 'Wealth Merge
Lead'`, slot remark `'Slot Booking via Wealth Merge'`; modal posts
`'Wealth Merge - Post Game Lead'`. `src/kit/` copied byte-identical from
`shared/game-kit/` (verified with `cmp` on all seven .js files; sync script
not run per the brief). `ThankYouScreen.jsx` uses the gradient-backdrop
variant (goal-juggler precedent) instead of guardian-shelter's version, which
imports a guardian-specific PNG — the game ships zero binary assets.
`grep -ri "guardian" src/` is zero.

**Screen flow.** home → howtoplay → game → results (+LeadCaptureModal when no
lead) → [Book a Slot → SlotBookingModal] → thankyou. `startGame()` calls
`incrementPlayCount()` once; `gameKey` remount for instant restart.

**Game.** All numbers in `GAME_CONFIG` (`src/data.js`):

- 8 tiers, radii 12/16/22/30/40/54/72/96 (×~1.35), triangular merge scores
  1/3/6/10/15/21/28/36 × chain multiplier (x1, x1.5, x2, x3, then +1).
- Play space 360×480 logical, jar walls at x=14/346, floor 466, mouth 74,
  danger line 18% down the interior. Drag to aim (clamped inside the walls),
  release to drop; ghost landing preview; next piece 0.4 s after release,
  preview shown; droppable tiers 1–4 weighted 4:3:2:1, shifting to 1:3:3:2
  at 40 s.
- Physics: gravity 1500, restitution 0.15, friction 0.4, linear damping 0.6/s
  + settle damping 6/s, fixed 1/120 s kit step (60 Hz × 2 substeps), 4 solver
  iterations (impulse + positional correction, mass ∝ r², slop 0.4,
  correction 80%), speed clamp 1600. Deterministic: RNG picks tiers only; the
  only non-integrator impulses are the fixed merge pop (130 up) and jostle
  (90 outward with falloff) — the cascade engine.
- Merge pass on post-solver positions, contact epsilon 1.5 px,
  `mergedThisFrame` guard so no token double-merges in one step; chain window
  1.0 s. Creating tier 8 wins instantly.
- Overflow: resting token (speed < 20, age > 0.5 s) above the line arms a
  continuous 2.0 s countdown — flashing line, red band, heartbeat alarm,
  on-canvas count; countdown resets the moment nothing rests above the line.
- Session 100 s; win at score ≥ 300 on expiry or Corpus; anti-stall auto-drop
  at 5 s held (with a closing telegraph ring); pause-scum closed with the
  goal-juggler two-phase re-acquire (1.5 s frozen 3-2-1 with the session
  clock held via `shouldTickClock`, then 0.25 s live input lock), implemented
  in `physics.js` (`beginPause`/`endPause`/`isFrozen`/`isInputLocked`).

**Presentation.** Per-tier sprites pre-rendered to offscreen canvases at
device resolution: radial-gradient body, bevel crescents, rim, white emblem
silhouette with punched details (stroked rupee mark, coin stack, ingots,
piggy, SIP jar, shield+check, home, vault wheel), gloss + sparkle. Corpus
pulses a live glow. Merge pop = squash-and-stretch + 12/22-particle radial
burst + `audio.combo(tier pitch + chain depth)` — pitch rises one semitone
per chain step. Chain chip + growing score fly-ups, jelly wobble on landings,
screen shake reserved for tier-6+ merges (plus hit-stop), floating score
text, 0.3–0.5 s screen transitions, animated results counter. Web Audio synth
only, unlocked on first gesture; haptics via the kit. HUD score via
`textContent` ref; React state only for values that change rarely, behind
change guards. Pools allocated at mount; no per-frame allocations in the hot
loop (the danger-line gradient is built only while the alarm is active).

### One physics bug found and fixed during the build

**Phantom velocity in resting stacks made the overflow test unsatisfiable.**
Gravity injects `g·dt` of velocity into every token every step, and 4 solver
iterations cannot cancel all of it high up a 7-token column — positional
correction held the pile visually still while tokens near the top retained a
constant ~68 px/s stored velocity, so the "at rest = speed < 20" overflow arm
never fired and the jar could pile above the line forever. Fixed with
displacement-based velocity reconciliation after the solver (PBD-style,
applied only when the step's actual displacement is below rest speed, so
genuine bounces are untouched). Verified: the debug column now settles to
< 1 px/s and overflow ends the run at 2.14 s (settle + the 2.0 s grace).

### Verification

- `pnpm install` — clean (pnpm 10.29.2).
- `pnpm build` (mode uat) — **green, zero errors**: 524 modules,
  `dist/assets/index-oZy5SpxQ.js` 422.26 kB (140.45 kB gzip),
  `index-bneSBdfR.css` 33.60 kB, built in 2.13 s. No dev server left running.
- Headless physics smoke (18/18 pass): same-tier merge → next tier at contact
  midpoint; triangular × multiplier scoring; single survivor token; pile
  settles below rest speed with zero tokens outside the jar; cascade chains
  (depth 2, x1.5 observed); column above the line loses via `overflow` inside
  the grace window; auto-drop fires while idling (2 drops in 12 s, all auto);
  freeze after resume holds the world byte-for-byte and refuses drops, then
  releases; expiry below target loses (`time`) and at target wins (`target`);
  two Homes forge the Corpus and win instantly (`corpus`); weighted picks
  stay in tiers 1–4; stats contract `{score, bestTier, merges, maxChain,
  drops}`.
- Balance probe (30 seeded 100 s sessions per profile): **idle 0% win**
  (28 overflow / 2 time — auto-drops fill the jar with unmerged clutter);
  random-aim dropper at ~1.4 s cadence 93% win (median 911 pts, 11 Corpus);
  aimed matcher 93% win (15 Corpus). The 300 target and all weights are the
  briefed constants; the game is generous to any active player and
  unwinnable by idling, which is the briefed anti-exploit shape.
- Perf probe: 32.5 µs per 1/120 s step with a live jar in Node —
  ~0.07 ms/frame at 60 fps, comfortable low-end headroom.
- Emoji grep over `src/`: only the gold-standard modal's HTML checkbox tick
  and code-comment arrows — no emoji as canvas sprites.
- Lead capture, slot booking, playCount wired per §2 (copied files, key and
  summary strings re-identified only).

### Deviations from the brief, with reasons

1. **`ThankYouScreen.jsx` is the gradient-backdrop variant**, not a verbatim
   guardian-shelter copy — the original imports `guardian_shelter_bg.png`,
   an asset of another game. Follows the goal-juggler precedent; markup and
   flow identical.
2. **`SlotBookingModal.jsx`/`api.js` identity strings renamed** ("Guardian
   Shelter" → "Wealth Merge" in remarks) beyond the two listed api.js edits —
   leaving another game's name in CRM remarks would misattribute leads; same
   treatment every sibling game applied.
3. **Re-acquire freeze is 1.5 s** (brief floor: ≥ 600 ms) — matches the
   shipped goal-juggler pattern the brief says to copy, with the 3-2-1 count.
4. **Added displacement-based velocity reconciliation** (not in the spec's
   physics list) — required to make the spec's own "at rest, speed < 20 px/s"
   overflow rule reachable in tall stacks; see the bug note above.

## [2026-07-31] Revamp: email field removed, animated how-to-play, asset sheet

**G1 — email field removed.** `src/LeadCaptureModal.jsx`: deleted `EMAIL_RE`, the
`email` `useState`, the whole "Email Field" `sl-lead-field` block, the
`errs.email` validation branch, and both `sessionStorage` touches of
`lastSubmittedEmail`. Dropped `email` from the `submitToLMS({...})` call and from
both `onSubmitted({...})` payloads. `api.js` untouched — `submitToLMS` already
sends `email_id: email || ''`, so the LMS payload shape is unchanged. Name +
Mobile + T&C unchanged. Grep for `email` outside `src/kit/` and `src/api.js`
returns zero hits.

**G2 — `HowToPlayScreen` rebuilt as animation-first.** `src/Screens.jsx`:
- Deleted all three numbered instruction paragraphs and the `+3 MERGE!` floating
  text that the old demo drew inside the jar.
- The old demo was a 170 px DOM box showing a single drop and one merge. Replaced
  with a 300×230 inline-SVG jar on a module-level `TUT_CSS` timeline (6.4 s):
  the finger drags along the mouth with the game's real dashed drop guide under
  it, releases; the token falls, bounces and settles touching an identical twin;
  both vanish into a gold burst ring and the next tier pops out at the contact
  point — and because that result is itself a twin of its neighbour, a **second**
  merge fires 1.4 s later inside the chain window, with three ascending mint
  chevrons standing in for the multiplier. The cascade, which is the actual
  scoring engine, is now shown rather than described.
- The jar is drawn as real glass with the always-visible dashed red danger line
  pulsing across the mouth, so the overflow rule needs no sentence.
- The 8-tier ladder strip is kept as pure shapes; its `>` separators were dropped
  so the whole screen is wordless apart from the three labels.
- Remaining text: the "How to Play" heading, three icon-led labels (`DRAG AND
  DROP`, `SAME TIERS MERGE`, `STAY BELOW LINE`), and the Play button.
- Container switched from `overflowY: auto` to `overflow: hidden`; measured stack
  is ~510 px so it fits 360×640 without scrolling. Added a
  `prefers-reduced-motion` kill switch, which this screen previously lacked.

**G3 — `wealth-merge/asset-from-here.md`.** 12 Nano Banana prompts on a
"blown-glass apothecary jar in a bioluminescent night" motif — translucent glass
spheres with the emblem suspended *inside* them, everything lit from within
rather than by a lamp, meniscus curves and caustic rings, soft edges throughout.
Includes a single eight-token ladder sheet so the tier progression stays
consistent, plus the jar, the corpus token, the merge burst, the chain glyph, the
danger line, the drop guide, two HUD pieces and both result illustrations.

**Not changed:** gameplay, balance, `physics.js`, the tier table, merge or chain
rules, the overflow grace window, HUD layout, `ResultsScreen`, `HomeScreen`,
canvas artwork, `data.js`, `api.js`, `src/kit/`.

**Build:** `pnpm install && pnpm build` — exit 0, `✓ built in 2.54s`
(`dist/assets/index-OfumB4RS.js 425.37 kB │ gzip: 141.22 kB`).

---

## 2026-08-03 — premium asset ladder, colour system, merge rewards

**The defect.** Review: *"The assets and colour combinations are too basic…
ensure each merge stage communicates increasing financial value or wealth
growth."* The old tier table failed that last point outright. Its hues were a
rainbow with no rank order — gold, gold, amber, orange, **green**, **blue**,
orange, gold — so tier 5 (green SIP jar) read as *lower* value than tier 4
(orange piggy), tier 6 (blue) sat above green for no reason a player could
name, and tier 7 reused the same orange as tier 4. Size was the ONLY channel
that climbed, and in a packed jar size alone is ambiguous. Every sprite was
also the same object: one radial-gradient sphere plus a white emblem, so a
one-rupee coin and a Retirement Corpus were the same manufactured thing at two
scales. Glow existed on tier 8 only; nothing else escalated.

**The tier ladder (new).** Four material bands, two tiers each, in the rank
order every loyalty programme and card tier has already taught the audience —
**bronze → gold → platinum → diamond** — mapped onto a monotone financial
life: loose change → savings → habit → asset → compounding → protected →
life goal → freedom. The emblem order was also corrected: "Piggy Bank" now
sits *below* "Gold Reserve" (it was above it), because a child's savings pot
outranking a bullion reserve was the same ranking failure in silhouette form.

| # | Tier | Band | Body | Luminance | glow | pips | facets | motes | Communicates |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rupee Coin | copper | `#A25A2C` | 0.152 | 0 | 1 | 0 | 0 | Loose change |
| 2 | Coin Stack | copper | `#C4821B` | 0.278 | 3 | 2 | 4 | 0 | You started saving |
| 3 | Piggy Bank | gold | `#E3A82A` | 0.445 | 6 | 3 | 6 | 0 | Saving is a habit |
| 4 | Gold Reserve | gold | `#FFC845` | 0.630 | 10 | 4 | 9 | 0 | You own an asset |
| 5 | SIP Growth | platinum | `#C9D8E6` | 0.672 | 15 | 5 | 11 | 0 | Money that compounds |
| 6 | Protection Plan | platinum | `#DCE8F4` | 0.795 | 21 | 6 | 13 | 1 | Your wealth is insured |
| 7 | Family Home | radiant | `#F7EBDA` | 0.843 | 27 | 7 | 14 | 2 | A life goal, funded |
| 8 | Retirement Corpus | radiant | `#FFFDF0` | 0.978 | 34 | 8 | 16 | 3 | Financial freedom |

Six independent channels climb together, and none of them ever goes backwards:

- **radius** 12 → 96 (unchanged — physics and pacing are untouched).
- **body luminance** 0.152 → 0.978. Value is carried by *lightness*, not hue,
  so the ladder still ranks in greyscale and for colour-blind players.
- **glow** 0 → 34 px. The base metals throw no light at all; the top of the
  ladder is a lamp. This is the strongest single "worth more" cue and it
  previously existed on one tier.
- **pips** 1 → 8 rim studs. A literal countable rank that survives down to a
  12 px token — the one channel that gives an exact answer, not an impression.
- **facets** 0 → 16 brushed/polished streaks. Detail density = craft = cost.
  A copper coin is a plain blank; a corpus is machined.
- **motes** 0 → 3 orbiting lights. Tiers 1–5 are inert objects; 6–8 are
  animated. Money that is *working* versus money that is sitting.

Plus two categorical breaks that make the band boundaries unmistakable:
the emblem ink flips from stamped white to **engraved deep navy** at the gold
band (this also fixed a real contrast bug — a white emblem on `#FFC845` was
1.5:1), and a **gem inlay** appears only at tiers 6–8, which is where the brand
colours enter: brand blue `#1E6BE0` for Protection, warm amber `#FF8A3D` for
the Home, white-gold for the Corpus.

**Colour system.** Three exclusive jobs so no colour ever means two things:
VALUE is the metal ladder above; DANGER is red and nothing else is red (the
overflow line, its countdown, its alarm wash); the PLAYER'S OWN TOUCH is pure
white (aim guide, ghost landing ring). Green was removed from the tokens
entirely — it now appears only as the score-bar fill, where "progress" is what
it means. Backdrop gained a cool bloom at the jar mouth and a warm gold bloom
centred on the jar *floor* (not the screen edge, which only muddied the navy),
so the scene has a vertical temperature gradient pulling the eye down toward
the money, plus a vignette that turns the unavoidable 3:4-field letterboxing
into a frame.

**Assets.** All sprite drawing moved out of the 44 kB component into
`src/sprites.js`, driven entirely by the per-tier art tokens in `data.js` — so
"make tier 6 read as worth more than tier 5" is now a data change, not a code
change. Token construction: lit sphere → polished wedges or brushed grain →
recessed bezel plate → gem inlay → radiant corona → bevel crescents → rim
studs → rim → engraved emblem → gloss. The jar was rebuilt from two flat rails
into one glass vessel: single silhouette path with rounded lower corners, a
thickened base, rim light, two specular streaks that fade at both ends, a
meniscus curve and caustic rings — following `asset-from-here.md`'s
`wmg-jar`. The `NEXT` socket became the frosted rounded-square well from
`wmg-hud-next`; the danger line is now drawn twice (wide coral halo under a
bright core, round dash caps) per `wmg-danger-line`. Still zero binary assets.

**Merge animation, rewards, progression.**

- **Shockwave ring** at every merge contact point: a fixed pool of 10, no
  allocation in the hot loop, expanding on ease-out cubic. Radius, thickness
  and duration all scale with the created tier, and a second inner ring is
  added from tier 4 up, so the *reward* obeys the same ranking contract the
  tokens do. Gem tiers throw their gem colour.
- **Pop depth scales with tier** (`popSquash` 0.16 + 0.028/tier): a Retirement
  Corpus lands with visibly more weight than a coin stack.
- **The float text names the rung** — `SIP GROWTH +15`, not `+15` — so the
  payout teaches the ladder. Tiers 1–2 keep the bare number because during a
  cascade they fire several times a second. The duplicate `CHAIN x` float was
  *deleted*: the HUD chain chip already carries it and the second float per
  merge was the clutter.
- **New-tier beat.** The first time a tier is ever created in a run it gets an
  extra white ring, a power-up sting and a `NEW TIER UNLOCKED` banner naming
  what it means ("Family Home — A life goal, funded"). Tracked in the
  component; `physics.js` untouched.
- **The banner wears the tier's colours** instead of always being the same gold
  card, so the reward escalates visually with the ladder.
- **Wealth-ladder rail** (new, top-left HUD): eight rungs, dim until created,
  the newest lit, ringed and popped. The only thing on screen that answers
  "how far up am I?" without a merge happening, and it teaches the ladder's
  order before the player has climbed it.
- Results screen prints the best tier in that tier's own colour with its glow;
  the How-to-Play ladder strip now shows the glow ramp too.

**Balance: unchanged.** Radii, the triangular score table (1/3/6/10/15/21/28/36),
the 300-point target, chain multipliers, gravity, damping, the overflow grace
window and the droppable-tier weights are all byte-identical. Only tiers 3 and 4
swapped *emblems and labels*; their radii and scores stayed put, so merge
pacing is exactly as balanced before. Play-test survival times confirm it:
55/43/60/62 s before, 56/55/50/55 s after.

**New guard.** `wealth-merge/scripts/tier-ladder.mjs` asserts the ranking
contract — strict monotonicity on radius, body luminance and pips, non-decreasing
glow/facets/motes/score, gems confined to tiers 6–8, and every emblem at 3:1 or
better contrast against its own body. It caught two real defects while the
ladder was being built: white emblems at 2.1:1 on the gold band, and engraved
detail that vanished because the etch colour was contrasted against the body
instead of against the ink (the shield and the home rendered as solid navy blobs).

**Verification.**

```
$ node scripts/tier-ladder.mjs
 1  Rupee Coin           copper     #A25A2C  L=0.152  r= 12  glow= 0  pips=1  facets= 0  alive=0  score= 1
 2  Coin Stack           copper     #C4821B  L=0.278  r= 16  glow= 3  pips=2  facets= 4  alive=0  score= 3
 3  Piggy Bank           gold       #E3A82A  L=0.445  r= 22  glow= 6  pips=3  facets= 6  alive=0  score= 6
 4  Gold Reserve         gold       #FFC845  L=0.630  r= 30  glow=10  pips=4  facets= 9  alive=0  score=10
 5  SIP Growth           platinum   #C9D8E6  L=0.672  r= 40  glow=15  pips=5  facets=11  alive=0  score=15
 6  Protection Plan      platinum   #DCE8F4  L=0.795  r= 54  glow=21  pips=6  facets=13  alive=1  score=21  gem #1E6BE0
 7  Family Home          radiant    #F7EBDA  L=0.843  r= 72  glow=27  pips=7  facets=14  alive=2  score=28  gem #FF8A3D
 8  Retirement Corpus    radiant    #FFFDF0  L=0.978  r= 96  glow=34  pips=8  facets=16  alive=3  score=36  gem #FFE38A

OK — 8 tiers, ladder monotone on radius, body luminance, pips, glow, facets, motion.

$ npx vite build
+ 525 modules transformed.
dist/index.html                 0.85 kB | gzip:   0.46 kB
dist/assets/index-bneSBdfR.css 33.60 kB | gzip:   6.87 kB
dist/assets/index-BOq8RH3u.js 433.35 kB | gzip: 144.03 kB
+ built in 4.07s

$ node scripts/play-test.mjs wealth-merge --all-sizes
=== wealth-merge @ iPhone SE   320x568 - ok ===   painted 100.0%   ended 56s   retry ok
=== wealth-merge @ iPhone 12   390x844 - ok ===   painted 100.0%   ended 55s   retry ok
=== wealth-merge @ Pixel 7     412x915 - ok ===   painted 100.0%   ended 50s   retry ok
=== wealth-merge @ chrome open 412x700 - ok ===   painted 100.0%   ended 55s   retry ok
(zero console errors, zero page errors at every size)
```

**Bundle:** gzip JS 141.22 kB → **144.03 kB** (+2.81 kB, +2.0%); CSS 6.87 kB
unchanged. No binary assets added — the whole ladder is still programmatic
canvas.

**Not changed:** `physics.js`, screen flow, LMS/lead-capture (still Name +
Mobile only, no email), compliance copy, `src/kit/`, `shared/`, any other game.

**Known limitation:** the 360×480 playfield is 3:4 and phones are ~1:2, so the
jar is width-limited and there is letterboxing above and below it at every
tested size. The vignette now frames that band instead of leaving it dead, but
genuinely filling the screen needs a taller `field.H` + `floorY`, which changes
stacking room and therefore difficulty — out of scope for an art pass, and it
would invalidate the "balance unchanged" claim above.

# Why This Portfolio Reads As Low Quality — Root-Cause Research Brief

**Date:** 2026-08-22
**Scope:** 35 built titles in this repo, benchmarked against playable-ad-tier mobile production values.
**Verdict up front:** the gap is **not** game feel, **not** engine choice, and **not** code quality. It is that **the portfolio contains almost no art.**

---

## 1. The measurement that explains the review feedback

I inventoried every game's `src/` tree — lines of code, canvas primitive calls, and shipped image assets.

| Metric | Portfolio total |
|---|---|
| Built games | 35 (+2 Phaser titles) |
| Lines of game code | ~186,000 |
| **Image files shipped, whole portfolio** | **17** |
| **Total art bytes, whole portfolio** | **~570 KB** |
| Of which one file (`smart-match-3d/ambient_game_bg.png`) | 567 KB |
| **Art bytes in the other 34 games combined** | **~4 KB** |
| `ctx.drawImage` call sites, all games | 87 |
| `ctx.fillRect` + `ctx.arc` call sites, all games | 592 |

Twenty-nine of thirty-five games ship **zero** image files. Every character, hazard, background, tile, and effect is composed at runtime from `fillRect`, `arc`, `roundRect`, and `createLinearGradient`.

This is the root cause, and it is a single cause. Rounded rectangles with gradient fills and a glow are what a game looks like when a programmer draws it. No amount of tuning makes a `ctx.arc` circle read as a character. The reviewer's language — *"design is too simple and basic"*, *"assets and colour combinations are not good"*, *"everything is not good, totally change it"* — is a consistent, accurate description of procedurally-drawn primitives.

**The corollary is good news.** The mechanics, the loop code, the physics, and the juice layer are already built and reviewed. The remediation is overwhelmingly an *art-and-audio production* problem, not a *rewrite the games* problem. Bajaj's own feedback supports this: only 3 of 18 titles were told to change the concept.

### 1a. The same finding, on the audio side

`shared/game-kit/audio.js` produces every sound in the portfolio from `AudioContext.createOscillator()`. There is not one sampled asset anywhere. Synthesised square/sine beeps are the audio equivalent of `ctx.arc` — they read as a prototype regardless of how well-timed they are. Game-feel literature is blunt that audio carries a disproportionate share of perceived impact; Vlambeer's *The Art of Screenshake* treats sound as one of the first and cheapest wins in its 30-tweak sequence ([Game Developer](https://www.gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games), [talk video](https://www.youtube.com/watch?v=AJdEqssNZ-U)).

### 1b. What is *not* broken

`shared/game-kit/effects.js` already implements, correctly and with a device budget:

- pooled particles (no per-burst allocation — the right call for mid-range Android GC)
- screen shake with decay, non-stacking (strongest request wins)
- **hit-stop** (`addHitStop` / `isFrozen`) — the single most-cited game-feel technique
- floating score text, preserved under `prefers-reduced-motion`
- squash-and-stretch helper driven by `outElastic`
- a proper easing set: `outQuad`, `outCubic`, `outQuint`, `inOutCubic`, `outBack`, `outElastic`
- frame-rate-independent `damp()` instead of the naive `a += (b-a)*0.1`

Measured against the canonical checklists — *Juice It Or Lose It* (Jonasson & Purho, Nordic Game Jam 2012: tweening, squash/stretch, particles, screen shake, sound layering — [GDC Vault](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose), [talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg)) and *The Art of Screenshake* — this kit covers roughly 80% of the technique list. **The juice is wired to shapes instead of sprites, so it reads as flat.** Same code, real sprites, and the perceived quality jump is large and cheap.

---

## 2. Art direction — the system that has to exist before any asset is generated

### 2.1 Why the portfolio "looks like 18 unrelated games"

There is a `docs/GAME_DESIGN_SYSTEM.md` v1.0.0 defining tokens, and games do broadly use `#00529B` / `#00A3E0` / `#FFB800`. But a token list is not art direction. Missing:

- **A rendering doctrine.** No stated answer to "is this game flat-vector, or shaded-cartoon, or pixel?" Each game improvised. Consistent tokens across inconsistent rendering still reads as unrelated games.
- **A silhouette rule.** Every object is a rounded rect or circle, so nothing is distinguishable at a glance.
- **A value structure.** Everything is mid-value saturated blue on dark navy. The reviewer's *"colours are too dull"* on `smart-recall` is a value-contrast complaint, not a hue complaint.
- **A character.** No mascot, no antagonist design, no consistent protagonist. The green virus was mandated by review precisely because the portfolio had nothing recurring.

### 2.2 What the benchmark actually does

Whiteout Survival's presentation is repeatedly described in terms of **value contrast as the core art idea** — the warm orange furnace glow against the blinding white blizzard — with distinct, polished hero silhouettes and a UI notably cleaner than genre peers, running well on mid-range Android via scalable settings ([Pocketgaming review](https://pocket-gaming.org/2026/02/09/whiteout-survival-review-a-deep-dive-into-the-frozen-frontier/), [Skich](https://skich.app/games/whiteout-survival)). The transferable lesson is not "look snowy." It is:

1. **One high-contrast value idea per game**, stated in a sentence, that drives every asset.
2. **Silhouette-first character design** — readable at 32 px in one colour.
3. **UI restraint** — the game reads, the chrome recedes.

### 2.3 The doctrine this portfolio should adopt

**Shaded flat vector with a single warm key light.** Not gradient-glass, not pixel art, not full painterly. Rationale:

- It is what Higgsfield generation plus vector cleanup produces most reliably and most consistently across 35 titles.
- It survives WebP compression at small sizes without banding (gradient-glass does not).
- It scales from a 32 px HUD icon to a 1024 px key art without a redraw.
- It is *distinguishable from* the existing `bajaj-game-store`, whose 33 titles are a mix of stock-Angular UI and clip-art — a real differentiator when Bajaj compares portfolios side by side.

Locked in `docs/BAJAJ_ARCADE_STYLE_GUIDE.md`.

---

## 3. Asset pipeline — concrete targets

### 3.1 Authoring resolution

Design at **1x = 390×844 CSS px** (the mobile-first portrait frame). Author raster art at **3x** and downscale; never upscale.

| Asset class | Author size (3x) | Ship sizes | Format |
|---|---|---|---|
| HUD / life-goal icon | 144×144 | SVG only | SVG |
| Gameplay sprite (tile, pickup, hazard) | 384×384 | 1x/2x WebP in atlas | WebP |
| Character (idle/action frames) | 768×768 | 1x/2x WebP in atlas | WebP |
| Background / parallax layer | 1170×2532 | 1x/2x WebP | WebP |
| Key art / end-card | 1170×2532 | 1x WebP | WebP |
| Logo, UI chrome, buttons | vector | SVG | SVG |

**Rule: anything that is a flat shape stays SVG.** SVG icons in this style land at 0.8–1.5 KB each (measured against the existing `shared/assets/*.svg`), beat raster at every DPR, and recolour from CSS tokens. Only shaded/textured art becomes WebP.

### 3.2 Atlasing

Per-game atlas, one sheet, generated at build time.

- **Max sheet 2048×2048.** Above that, mid-range mobile GPUs and iOS Safari start failing allocations ([Android game texture guidance](https://developer.android.com/games/optimize/textures)).
- **MaxRects packing** — best density for the mixed sprite/icon/prop sizes these games have.
- **2 px padding + edge extrude.** 0 px padding bleeds visibly under linear filtering; 1 px is the floor, 2 px is correct for HD art. Extrusion duplicates edge pixels so sprites drawn at non-integer positions don't sample their neighbours.
- Sources: [TexturePacker texture settings](https://www.codeandweb.com/texturepacker/documentation/texture-settings), [mobile atlas guide](https://ilovesprites.com/blog/texture-atlas-mobile-godot-cocos-guide).

### 3.3 Compression budget

| Budget | Target | Hard cap |
|---|---|---|
| Total game payload (JS + CSS + art + audio), gzipped | **≤ 1.8 MB** | 2.5 MB |
| Art (atlas + backgrounds), per game | **≤ 700 KB** | 1.0 MB |
| Audio, per game | **≤ 250 KB** | 400 KB |
| Time-to-first-interaction, 4G mid-range Android | **≤ 3 s** | 5 s |

WebP quality 82 for backgrounds, 88 for sprite atlases (alpha edges are where artefacts show). Lossy-PNG via pngquant only where WebP alpha proves problematic. Brotli on the server for JS/CSS.

The 567 KB PNG in `smart-match-3d` is a single un-optimised background — a WebP re-encode at q82 takes it to roughly 90–120 KB with no perceptible loss. That one file is currently 99% of the portfolio's art weight, which is a fair summary of the situation.

### 3.4 Character animation — the licensed-art decision

Given the approved budget covers licensed art and audio:

- **Rive** for character and UI animation. Vector, tiny files, a WASM web runtime, skeletal rigging with bones/mesh deform and IK, and a renderer built for high frame rates ([Rive game UI](https://rive.app/game-ui), [Lottie vs Rive](https://www.motiontheagency.com/blog/lottie-vs-rive)). It is explicitly less deep than Spine for hardcore character work, but it covers walk cycles, reactions and all UI motion — which is the entire requirement here — at a fraction of the payload.
- **Spine** only if a title needs genuinely complex character work. It is the deeper 2D skeletal tool ([Spine/Rive runtime comparison thread](https://en.esotericsoftware.com/forum/d/16118-character-animation-runtimes-spine-and-rive)). For 35 browser-delivered mini-games, it is over-tooled.
- **Recommendation: Rive for the 3–4 titles with a real character; sprite-sheet frames for everything else.** Do not add a second animation runtime for one game.

---

## 4. Game feel — what to keep, what to add

The kit covers the fundamentals. The remaining gaps, in impact order:

1. **Sampled audio.** Replace oscillator synthesis with a licensed SFX set. One shared `sfx.webm` sprite sheet per game (~40–80 KB), Web Audio buffer playback. Biggest perceived-quality gain per KB in the whole plan.
2. **Anticipation frames.** The kit has reaction (squash on impact) but no anticipation (wind-up before action). 60–100 ms of pre-action scale/rotation is what separates "responsive" from "alive."
3. **Layered impact.** Right now one impact = one particle burst. Real impact = flash frame (1–2 frames of white silhouette) + burst + shake + hit-stop + sound, on staggered timings. All five primitives already exist in the kit; they are just not called together.
4. **Trails and permanence.** *Screenshake* is explicit about permanence — shells, scorch marks, debris that persists. Cheap in a pooled system, and it makes a screen feel played-in rather than reset.
5. **Input latency.** Four titles still bind time-critical actions to `onTap` rather than `pointerdown`, costing 60–150 ms. In a reaction game that is the difference between "tight" and "laggy." Fix during the UI pass.
6. **Camera.** Most titles have a static camera. Dynamic framing — lead the player, ease toward the action — is a Vlambeer staple and costs a few lines given `damp()` already exists.

---

## 5. Physics tuning

Symptoms in the feedback (*"physics is not good"* on `coverage-archer`, *"virus dies too easily"* on `secure-journey`) trace to three recurring causes:

- **No sub-stepping.** Fast bodies tunnel. Several titles already got swept-collision fixes in the 2026-08-03 pass (`wealth-carrom`, `slide-to-safety`, `cover-drive`); the rest need the same treatment as a standard.
- **Linear difficulty.** Constant spawn rate and constant speed. Tension needs a sawtooth: ramp, spike, brief relief, ramp higher.
- **Uncalibrated restitution/friction.** Values were chosen to look right in isolation rather than tuned against a reference feel. Every physics title needs a tuning pass with the reference game open side by side — reference-parity is the pass mark, per the review.

---

## 6. First 30 seconds — hook design

The review's "strip all how-to-play text" rule is the correct instinct and matches the playable-ad literature exactly.

- The **first 3 seconds** decide engagement; unclear instruction is the single biggest hook-killer, and a playable has no room for explainers ([Segwise playable ads guide](https://segwise.ai/blog/understanding-playable-ads-guide), [AppAgent](https://appagent.com/blog/what-are-playable-ads/)).
- The core loop should be **completable in 10–15 s**, with the hook landing inside 15–20 s ([Innovecs](https://www.innovecsgames.com/blog/playable-ads-development/)).
- **Show, don't explain.** Make the interactive element brighter — glow, bounce, scale pulse — so the eye finds it without a caption.
- Playable-acquired users retain 30–40% better than non-interactive formats ([AppSamurai hybrid-casual playbook](https://appsamurai.com/blog/hybrid-casual-games-ua-playbook-how-to-acquire-and-retain-users/)) — the mechanism being self-evidence, which is exactly what Bajaj is asking for.

**Portfolio standard, replacing the how-to-play modal:**

1. Game opens **already in motion** — no start-screen wall. One live, non-scoring demo beat.
2. **One glowing affordance** on screen. Nothing else is interactive.
3. First input succeeds regardless of accuracy (assisted first attempt).
4. Full juice payload on that first success — the sequence from §4.3.
5. Difficulty engages only from the second interaction.
6. Zero words. A ghost hand/arrow animation, at most, that fades after the first input.

---

## 7. Web delivery stack — honest trade-offs

Current state: 35 titles on **raw Canvas 2D + React 18 + Vite**, 2 titles (`coverage-archer`, `tightrope-protection`) on **Phaser 3.87 + React 19**. That split is itself a small liability — two rendering models, two React majors, one shared kit.

| Option | Bundle | Verdict for this project |
|---|---|---|
| **Canvas 2D + game-kit (current)** | ~45 KB kit + React | **Keep for ~30 titles.** The games are simple enough that a renderer buys nothing. Zero migration cost, zero bundle cost, kit already handles loop/juice/input/DPR. |
| **PixiJS v8** | ~150 KB gzipped core, tree-shakeable; roughly a third of Phaser's weight ([comparison](https://generalistprogrammer.com/comparisons/phaser-vs-pixijs)) | **Adopt selectively.** Worth it only where a title pushes many sprites or needs batching/filters — realistically `secure-journey`, `guardian-arena`, `life-rush`. WebGPU-first with WebGL fallback. |
| **Phaser 3/4** | ~1.2 MB, Phaser 4 "Caladan" shipped April 2026 with a rewritten renderer and the familiar API ([2026 engine roundup](https://codersera.com/blog/top-javascript-game-engines-and-libraries/)) | **Do not expand.** Two titles already use it; leave them. It bundles physics/tilemaps/scenes this portfolio doesn't need, at ~25× the kit's weight. |
| **Cocos Creator** | Compact web builds, WASM physics with 5–9× gains | **No.** A full editor-based pipeline for 35 mini-games is a workflow rewrite, not an art fix. |
| **Unity WebGL** | 50–100 MB asset ceiling for "smooth"; iOS Safari enforces a ~300–500 MB WebGL heap limit and is the top crash cause; needs Brotli, audio gated behind user interaction, WebGL 1.0 fallback for older iPhones ([Unity→WebGL porting guide](https://ilogos.biz/unity-to-webgl-porting-guide/), [iOS Safari crash analysis](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios)) | **Disqualified.** Two orders of magnitude over budget for a page on `bajajlifeinsurance.com`, with the worst mobile-Safari story of any option. |

**Recommendation: no engine migration.** Spend the entire budget on art, audio, and animation. Engine choice is not what Bajaj rejected — and swapping engines would burn the remediation window while changing nothing the reviewer can see.

---

## 8. Compliance flags — route before resubmission

Advertisement content by Indian insurers now sits under the **IRDAI (Protection of Policyholders' Interests, Operations and Allied Matters of Insurers) Regulations, 2024**, plus the *Master Circular on Operations and Allied Matters of Insurers* (19 June 2024) and the *Master Circular on Protection of Interest of Policyholders* (5 September 2024). Advertisements must be fair, true and not misleading, with disclosures **clear, conspicuous and legible**; the rules explicitly extend to *interactive* digital content; and each insurer must route advertisements through a board-approved advertisement committee or designated senior officer. IRDAI has separately barred advertising unit-linked policies as investment products ([TaxGuru summary](https://taxguru.in/corporate-law/irdai-pphi-operations-allied-matters-insurers-regulations-2024-advertising.html), [Mondaq analysis](https://www.mondaq.com/india/advertising-marketing-branding/1518396/looking-ahead-the-future-of-insurance-advertising-norms-in-india), [Business Standard on ULIP ads](https://www.business-standard.com/amp/finance/personal-finance/irdai-bars-unit-linked-policies-from-being-advertised-as-investment-product-124062100482_1.html)).

**These are legal-review items, not build blockers — but they must clear before resubmission:**

| # | Item | Where it bites |
|---|---|---|
| 1 | **Any in-game text implying returns, growth or guaranteed outcomes** | `wealth-drop`, `spiral-sprint`, `sip-stack`, `wealth-merge`, `portfolio-fit` — all use market/compounding framing. "Wealth grows" copy in a game is arguably an ad claim. |
| 2 | **ULIP framing as investment** | `spiral-sprint` (market cycles), `wealth-drop` (ULIP volatility), `sip-stack` (SIP discipline). Explicitly restricted. Reframe as protection/discipline, not returns. |
| 3 | **Score-to-outcome insight boxes** | The `GAME_DESIGN_SYSTEM.md` game-over pattern includes a "Financial Goal Insight Box: educational takeaway linking score to financial planning." Linking a game score to a financial recommendation is the highest-risk pattern in the portfolio. Recommend cutting it entirely. |
| 4 | **"Claim Certificate" CTA** | Same modal spec. The word *claim* in an insurance context is loaded. Rename. |
| 5 | **Lead-capture consent copy** | Every game routes to a Name+Mobile form and slot booking. Consent language, purpose limitation, and DPDP Act alignment need legal sign-off once, centrally — not per game. |
| 6 | **The green-virus antagonist** | Depicting *risk* as a pathogen is fine as an abstraction; depicting it in a way that reads as a specific illness or as making health claims is not. Keep the virus abstract and stylised — no medical realism. |
| 7 | **Brand: Bajaj logo lockup, colours, tone in game context** | Standard brand-guardian review. The style guide fixes the system; brand still signs it off. |

---

## Sources

- Jonasson & Purho, *Juice It Or Lose It* — [GDC Vault](https://www.gdcvault.com/play/1016487/Juice-It-or-Lose), [talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg)
- Nijman (Vlambeer), *The Art of Screenshake* — [talk](https://www.youtube.com/watch?v=AJdEqssNZ-U), [Game Developer writeup](https://www.gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)
- [Squeezing more juice out of your game design — Game Developer](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- [TexturePacker — texture atlas settings](https://www.codeandweb.com/texturepacker/documentation/texture-settings)
- [Texture atlases for mobile games — practical guide](https://ilovesprites.com/blog/texture-atlas-mobile-godot-cocos-guide)
- [Android Developers — Textures](https://developer.android.com/games/optimize/textures)
- [Phaser vs PixiJS (2026)](https://generalistprogrammer.com/comparisons/phaser-vs-pixijs)
- [Top JavaScript game engines & libraries (2026)](https://codersera.com/blog/top-javascript-game-engines-and-libraries/)
- [Unity → WebGL porting guide (2026)](https://ilogos.biz/unity-to-webgl-porting-guide/)
- [Fixing Unity WebGL crashes on iOS Safari](https://bugnet.io/blog/how-to-fix-unity-webgl-build-crashing-on-safari-ios)
- [Unity Manual — Web browser compatibility](https://docs.unity3d.com/6000.4/Documentation/Manual/webgl-browsercompatibility.html)
- [Rive for game UI](https://rive.app/game-ui) · [Lottie vs Rive](https://www.motiontheagency.com/blog/lottie-vs-rive) · [Spine & Rive runtimes](https://en.esotericsoftware.com/forum/d/16118-character-animation-runtimes-spine-and-rive)
- [Playable ads guide 2026 — Segwise](https://segwise.ai/blog/understanding-playable-ads-guide) · [AppAgent](https://appagent.com/blog/what-are-playable-ads/) · [Innovecs](https://www.innovecsgames.com/blog/playable-ads-development/) · [AppSamurai hybrid-casual UA playbook](https://appsamurai.com/blog/hybrid-casual-games-ua-playbook-how-to-acquire-and-retain-users/)
- Whiteout Survival presentation — [Pocketgaming review](https://pocket-gaming.org/2026/02/09/whiteout-survival-review-a-deep-dive-into-the-frozen-frontier/) · [Skich](https://skich.app/games/whiteout-survival)
- IRDAI — [PPHI Regulations 2024 advertising summary](https://taxguru.in/corporate-law/irdai-pphi-operations-allied-matters-insurers-regulations-2024-advertising.html) · [Mondaq: future of insurance advertising norms](https://www.mondaq.com/india/advertising-marketing-branding/1518396/looking-ahead-the-future-of-insurance-advertising-norms-in-india) · [ULIP advertising restriction](https://www.business-standard.com/amp/finance/personal-finance/irdai-bars-unit-linked-policies-from-being-advertised-as-investment-product-124062100482_1.html)

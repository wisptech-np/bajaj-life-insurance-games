// WealthMergeGame.jsx — Suika-style drop-and-merge wealth collector.
//
// Drop wealth tokens into a glass jar; two identical tokens merge into the
// next tier at their contact point, cascading up an 8-tier ladder from a
// single rupee coin to the glowing Retirement Corpus. Drag horizontally to
// aim, release to drop. The danger line near the jar's mouth is the tension
// engine: a resting token above it starts a visible 2 s countdown that a
// last-second merge-out can cancel.
//
// Structure mirrors GoalJugglerGame.jsx: one canvas component whose mutable
// state lives in refs (a 120 Hz physics tick must not re-render React),
// module-level pure draw functions, offscreen-prerendered backdrop and tier
// sprites rebuilt only on resize, and every tunable read from data.js.
//
// This component contains NO rules. src/physics.js owns gravity, collision,
// merging, chains, the overflow countdown, the auto-drop and the win/lose
// tests; this file decides only what the simulation looks and sounds like.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, TIERS } from './data.js';
import { buildSprites } from './sprites.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { effectBudget, fitCanvas, haptic } from './kit/device.js';
import {
  aimAt,
  beginPause,
  clamp,
  createWorld,
  dangerLineY,
  endPause,
  expire,
  isFrozen,
  releaseDrop,
  statsOf,
  stepWorld,
} from './physics.js';

/* ─── Tier sprites ───────────────────────────────────────────
   Built in src/sprites.js from the per-tier art tokens in data.js. Each tier
   is pre-rendered once per resize into an offscreen canvas at device
   resolution and blitted, so the hot loop never rebuilds a gradient. */

/* ─── Backdrop ───────────────────────────────────────────── */

function makeBackdrop(cw, ch, dpr, view, cfg) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(cw * dpr));
  cv.height = Math.max(1, Math.round(ch * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = c.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, cw, ch);

  // Two blooms set the vertical temperature gradient of the whole scene: cool
  // blue at the mouth where empty jar is, warm gold at the floor where the
  // money piles up. The player's eye is pulled downward, toward value.
  const cool = c.createRadialGradient(cw * 0.5, ch * 0.16, 10, cw * 0.5, ch * 0.16, cw * 0.85);
  cool.addColorStop(0, COLORS.bloomCool);
  cool.addColorStop(1, 'rgba(30,107,224,0)');
  c.fillStyle = cool;
  c.fillRect(0, 0, cw, ch);
  // The warm bloom is centred on the jar FLOOR, not the bottom of the screen —
  // it has to look like light coming off the pile of money, and a wash across
  // the whole lower edge only turned the navy muddy.
  const floorPx = view.oy + cfg.field.floorY * view.k;
  const wrm = c.createRadialGradient(cw * 0.5, floorPx, 8, cw * 0.5, floorPx, cw * 0.78);
  wrm.addColorStop(0, COLORS.bloomWarm);
  wrm.addColorStop(1, 'rgba(176,123,18,0)');
  c.fillStyle = wrm;
  c.fillRect(0, 0, cw, ch);

  // Vignette. The playfield is 3:4 and the phone is not, so there is always
  // letterboxing above and below the jar; darkening the edges turns that dead
  // band into a frame instead of an unfinished screen.
  const vig = c.createRadialGradient(cw * 0.5, ch * 0.5, Math.min(cw, ch) * 0.34, cw * 0.5, ch * 0.5, Math.max(cw, ch) * 0.78);
  vig.addColorStop(0, 'rgba(3,7,18,0)');
  vig.addColorStop(1, 'rgba(3,7,18,0.62)');
  c.fillStyle = vig;
  c.fillRect(0, 0, cw, ch);

  // Ambient mote field.
  c.fillStyle = 'rgba(255,255,255,0.20)';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137.5) % 360) / 360 * cw;
    const y = ((i * 89.3) % 300) / 300 * ch;
    c.globalAlpha = 0.06 + ((i * 61) % 17) / 17 * 0.16;
    c.beginPath();
    c.arc(x, y, 0.7 + ((i * 31) % 5) * 0.28, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Into logical space for the jar itself.
  c.translate(view.ox, view.oy);
  c.scale(view.k, view.k);
  const f = cfg.field;
  const midX = (f.wallLeft + f.wallRight) / 2;

  // Soft well behind the jar.
  const well = c.createRadialGradient(midX, (f.jarTopY + f.floorY) / 2, 40, midX, (f.jarTopY + f.floorY) / 2, 320);
  well.addColorStop(0, 'rgba(38,102,196,0.28)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(-view.ox / view.k, -view.oy / view.k, cw / view.k, ch / view.k);

  // Three caustic rings low in the jar, as if light were passing through it.
  c.strokeStyle = 'rgba(150,200,255,0.07)';
  for (let i = 0; i < 3; i++) {
    c.lineWidth = 1.4 - i * 0.3;
    c.beginPath();
    c.ellipse(midX, f.floorY - 6, 60 + i * 52, 12 + i * 8, 0, 0, Math.PI * 2);
    c.stroke();
  }

  /* --- The jar: a real glass vessel, not two rails -----------------------
     Rounded lower corners, a thickened base, a rim light down both walls and
     a meniscus where the wall meets the floor. Drawn as a single path so the
     silhouette is one object. */
  const R = 26; // corner radius of the jar's lower corners
  const oL = f.wallLeft - 7;
  const oR = f.wallRight + 7;
  const oB = f.floorY + 9;
  const jarPath = new Path2D();
  jarPath.moveTo(oL, f.jarTopY - 14);
  jarPath.lineTo(oL, oB - R);
  jarPath.quadraticCurveTo(oL, oB, oL + R, oB);
  jarPath.lineTo(oR - R, oB);
  jarPath.quadraticCurveTo(oR, oB, oR, oB - R);
  jarPath.lineTo(oR, f.jarTopY - 14);

  // Interior tint: nearly clear at the mouth, warmer and denser at the floor.
  const glass = c.createLinearGradient(0, f.jarTopY, 0, f.floorY);
  glass.addColorStop(0, 'rgba(120,170,240,0.03)');
  glass.addColorStop(0.7, 'rgba(120,170,240,0.07)');
  glass.addColorStop(1, 'rgba(176,123,18,0.10)');
  c.save();
  c.fillStyle = glass;
  c.fill(jarPath);
  c.restore();

  // Wall body, then the bright inner rim light on top of it.
  c.strokeStyle = COLORS.jarWall;
  c.lineWidth = 5;
  c.stroke(jarPath);
  c.strokeStyle = COLORS.jarWallLit;
  c.lineWidth = 1.6;
  c.stroke(jarPath);

  // Two specular streaks hugging the left wall — the tell that this is glass.
  // Both fade out at each end (a stroke with a gradient along its own length),
  // because a flat-alpha line reads as a stray scratch, not a highlight.
  for (const [dx, w, a, y0, y1] of [
    [3.5, 3.0, 0.30, f.jarTopY + 18, f.floorY - 90],
    [8.5, 1.4, 0.16, f.jarTopY + 40, f.floorY - 150],
  ]) {
    const spec = c.createLinearGradient(0, y0, 0, y1);
    spec.addColorStop(0, 'rgba(230,244,255,0)');
    spec.addColorStop(0.22, `rgba(230,244,255,${a})`);
    spec.addColorStop(0.7, `rgba(230,244,255,${a * 0.7})`);
    spec.addColorStop(1, 'rgba(230,244,255,0)');
    c.strokeStyle = spec;
    c.lineCap = 'round';
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(f.wallLeft + dx, y0);
    c.lineTo(f.wallLeft + dx, y1);
    c.stroke();
  }

  // Flared mouth lips.
  c.strokeStyle = COLORS.jarWallLit;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(oL - 7, f.jarTopY - 16);
  c.lineTo(oL + 1, f.jarTopY - 11);
  c.moveTo(oR + 7, f.jarTopY - 16);
  c.lineTo(oR - 1, f.jarTopY - 11);
  c.stroke();

  // Meniscus: the curve where the glass wall meets its own floor.
  c.strokeStyle = 'rgba(200,228,255,0.28)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(f.wallLeft, f.floorY - 16);
  c.quadraticCurveTo(f.wallLeft + 2, f.floorY - 1, f.wallLeft + 18, f.floorY - 1);
  c.lineTo(f.wallRight - 18, f.floorY - 1);
  c.quadraticCurveTo(f.wallRight - 2, f.floorY - 1, f.wallRight, f.floorY - 16);
  c.stroke();

  // Thickened base slab under the floor line.
  const slab = c.createLinearGradient(0, f.floorY, 0, oB);
  slab.addColorStop(0, 'rgba(190,220,255,0.42)');
  slab.addColorStop(1, 'rgba(60,100,170,0.14)');
  c.fillStyle = slab;
  c.fillRect(f.wallLeft, f.floorY, f.wallRight - f.wallLeft, 9);
  c.fillStyle = 'rgba(8,18,40,0.5)';
  c.fillRect(oL, oB, oR - oL, 4);

  return cv;
}

/* ─── Component ──────────────────────────────────────────── */

export default function WealthMergeGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [chain, setChain] = useState(0);
  const [dangerOn, setDangerOn] = useState(false);
  // -1 idle, 3/2/1 frozen countdown, 0 = GO (live input lock)
  const [reacquire, setReacquire] = useState(-1);
  /** Highest tier index the player has ever created this run — drives the
      always-visible wealth-ladder rail, which is the progression display. */
  const [reached, setReached] = useState(-1);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      dpr: 1,
      view: { k: 1, ox: 0, oy: 0, cw: 0, ch: 0 },
      world: null,
      sprites: null,
      backdrop: null,

      scoreShown: 0,
      shownScore: -1,
      shownChain: 0,
      shownDanger: false,
      shownCount: -1,
      bannerSeq: 0,
      heartClock: 0,

      /* Merge shockwave rings. Fixed pool, never allocated in the hot loop —
         same discipline as the kit's particle pool. */
      rings: Array.from({ length: 10 }, () => ({
        alive: false, x: 0, y: 0, r0: 0, life: 0, maxLife: 1, w: 2, color: '#fff', dbl: false,
      })),
      ringCursor: 0,

      /** Highest tier index created so far; -1 before the first merge. */
      reached: -1,

      ended: false,
      effects: null,
      audio: null,
      shadows: true,
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.audio) return;
    s.audio.unlock();
    const next = s.audio.toggleMute();
    setMuted(next);
    if (!next) s.audio.click();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const s = stateRef.current;
    const ctx = canvas.getContext('2d');
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;

    const F = cfg.field;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const cw = Math.max(280, wrap.clientWidth || 380);
      const ch = Math.max(420, wrap.clientHeight || 600);
      if (s.backdrop && cw === s.view.cw && ch === s.view.ch) return;

      s.dpr = fitCanvas(canvas, cw, ch, 2);
      // Reserve headroom for the DOM HUD row so the held piece at dropY can
      // never sit underneath the score/time pills on a short screen.
      const topPad = 56;
      const k = Math.min(cw / F.W, (ch - topPad) / F.H);
      s.view = {
        k,
        ox: (cw - F.W * k) / 2,
        oy: topPad + (ch - topPad - F.H * k) / 2,
        cw,
        ch,
      };
      s.backdrop = makeBackdrop(cw, ch, s.dpr, s.view, cfg);
      s.sprites = buildSprites(k * s.dpr);
    };
    fit();

    s.world = createWorld(cfg, TIERS, Math.random);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- helpers --------------------------------------------------------- */
    const showBanner = (kind, title, sub, tier) => {
      s.bannerSeq += 1;
      setBanner({ id: s.bannerSeq, kind, title, sub, tier });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /** Fire a shockwave ring. Size, thickness and duration all scale with the
        created tier, so the reward reads bigger the higher up the ladder the
        merge landed — the same ranking contract as the tokens themselves. */
    const emitRing = (x, y, tierIdx, colorOverride) => {
      const R = cfg.fx.ring;
      const t = TIERS[tierIdx];
      const ring = s.rings[s.ringCursor];
      s.ringCursor = (s.ringCursor + 1) % s.rings.length;
      ring.alive = true;
      ring.x = x;
      ring.y = y;
      ring.r0 = t.radius;
      ring.maxLife = R.life + R.lifePerTier * tierIdx;
      ring.life = ring.maxLife;
      ring.w = R.width + R.widthPerTier * tierIdx;
      ring.color = colorOverride || t.colorLt;
      ring.dbl = tierIdx >= R.doubleRingTier;
    };

    const updateRings = (dt) => {
      for (let i = 0; i < s.rings.length; i++) {
        const r = s.rings[i];
        if (!r.alive) continue;
        r.life -= dt;
        if (r.life <= 0) r.alive = false;
      }
    };

    const drawRings = () => {
      const spread = cfg.fx.ring.spread;
      for (let i = 0; i < s.rings.length; i++) {
        const r = s.rings[i];
        if (!r.alive) continue;
        // Ease-out expansion: fast punch, slow dissolve.
        const t = 1 - r.life / r.maxLife;
        const e = 1 - (1 - t) * (1 - t) * (1 - t);
        const rad = r.r0 * (1 + (spread - 1) * e);
        ctx.save();
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.w * (1 - e * 0.75);
        ctx.globalAlpha = (1 - t) * 0.85;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        if (r.dbl) {
          ctx.globalAlpha *= 0.5;
          ctx.lineWidth *= 0.6;
          ctx.beginPath();
          ctx.arc(r.x, r.y, rad * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    /* --- run lifecycle --------------------------------------------------- */
    const endRun = () => {
      if (s.ended) return;
      const world = s.world;
      s.ended = true;
      setOver(true);
      setDangerOn(false);

      const cause = world.endCause;
      const stats = { ...statsOf(world), cause };
      const f = cfg.field;
      const bx = (f.wallLeft + f.wallRight) / 2;
      const by = f.jarTopY + (f.floorY - f.jarTopY) * 0.4;

      if (world.won) {
        audio.victory();
        haptic('success');
        emitRing(bx, by, TIERS.length - 1, COLORS.goldLt);
        emitRing(bx, by, TIERS.length - 1, '#FFFFFF');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 24, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(
          bx, Math.max(40, by - 60),
          cause === 'corpus' ? 'RETIREMENT CORPUS!' : 'GOAL REACHED',
          COLORS.goldLt, 19,
        );
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.mergeShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(36, by - 50),
          cause === 'overflow' ? 'THE JAR OVERFLOWED' : 'SHORT OF TARGET',
          COLORS.dangerLt, 17,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (world.won ? winRef.current : loseRef.current)?.(stats, cause);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------
       One persistent object; the sim's callbacks fire from inside stepWorld
       and must not allocate. */
    const events = {
      onDrop: (token, auto) => {
        audio.tick();
        haptic('light');
        if (auto) {
          fx.floatText(token.x, token.y - token.r - 10, 'AUTO DROP', COLORS.orangeLt, 12);
        }
      },

      onPieceReady: () => {
        // Deliberately silent: a tick every 0.4s would be noise.
      },

      onLand: (token, impact) => {
        if (impact > 300) audio.tick();
        fx.burst({
          x: token.x, y: token.y + token.r * 0.7, count: cfg.fx.dropParticles,
          color: 'rgba(200,220,255,0.9)', speed: 60 + Math.min(impact, 500) * 0.15,
          spread: Math.PI * 0.9, angle: -Math.PI / 2, size: 2, life: 0.3,
          gravity: 300, drag: 0.9,
        });
      },

      onMerge: (newTier, x, y, points, depth) => {
        const t = TIERS[newTier];
        const big = newTier >= cfg.fx.shakeMinTier;
        // First time this tier has ever existed in the run: the progression
        // beat. This is what turns "another merge" into "I climbed a rung".
        const firstTime = newTier > s.reached;
        if (firstTime) {
          s.reached = newTier;
          setReached(newTier);
        }

        // Pop pitch rises one semitone per chain step, offset by tier.
        audio.combo(t.pitch + depth);
        haptic(big ? 'medium' : 'light');

        // The shockwave: tier-coloured, tier-sized. A gem tier throws its gem
        // colour instead of its metal, so protection reads blue and the home
        // reads amber even in the split second the ring is on screen.
        emitRing(x, y, newTier, t.gem || t.colorLt);

        fx.burst({
          x, y, count: big ? cfg.fx.bigMergeParticles : cfg.fx.mergeParticles,
          color: t.colorLt, speed: 150 + newTier * 24, spread: Math.PI * 2,
          size: 2.6 + newTier * 0.3, life: 0.55 + newTier * 0.05, gravity: 320, drag: 0.92,
        });
        if (t.gem) {
          // Second, slower burst in the gem colour for the top of the ladder.
          fx.burst({
            x, y, count: Math.round(cfg.fx.mergeParticles * 0.7), color: t.gem,
            speed: 90 + newTier * 16, spread: Math.PI * 2, size: 3.2,
            life: 0.8, gravity: 180, drag: 0.9,
          });
        }

        // The reward NAMES the rung: "+15" teaches nothing, "SIP GROWTH +15"
        // teaches the ladder while it pays out. The two cheapest tiers get the
        // bare number — during a cascade they fire several times a second and
        // the names would just pile into an unreadable stack. The chain
        // multiplier is deliberately NOT floated: the HUD chain chip already
        // shows it, and a second float per merge was the clutter.
        fx.floatText(
          clamp(x, 52, F.W - 52), Math.max(28, y - t.radius - 10),
          newTier >= 2 ? `${t.label.toUpperCase()}  +${points}` : `+${points}`,
          t.gem || t.colorLt, Math.min(21, 11 + newTier + depth),
        );

        // Screen shake and hit-stop stay reserved for tier-6+ merges.
        if (big) {
          fx.addShake(cfg.fx.mergeShake);
          fx.addHitStop(budget.hitStopSeconds);
        }
        if (firstTime && newTier >= 2) {
          // A new rung gets a second white ring and its meaning spelled out,
          // whether or not it was big enough for the shake.
          emitRing(x, y, newTier, '#FFFFFF');
          showBanner('new', t.label, t.sub, newTier);
          audio.powerUp();
        } else if (big) {
          audio.powerUp();
          showBanner('big', t.label, `+${points} points`, newTier);
        }
      },
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      updateRings(dt);
      if (fx.isFrozen()) return;

      const world = s.world;
      s.time += dt;
      s.scoreShown = damp(s.scoreShown, world.score, BALANCE.scoring.counterLerpPerSecond, dt);

      if (s.ended) return;

      stepWorld(world, cfg, dt, events);

      // Overflow heartbeat: an alarm pulse while the countdown runs.
      if (world.dangerActive && !world.over) {
        s.heartClock += dt;
        if (s.heartClock >= 0.42) {
          s.heartClock = 0;
          audio.hit();
          haptic('light');
        }
      } else {
        s.heartClock = 0.3; // first beat lands quickly when danger starts
      }

      if (world.over) endRun();
    };

    /* --- drawing helpers -------------------------------------------------- */
    const drawToken = (world, t) => {
      const tier = TIERS[t.tier];
      const sp = s.sprites[t.tier];
      const size = (sp.r + sp.pad) * 2;

      ctx.save();
      ctx.translate(t.x, t.y);

      // Squash-and-stretch (merge pop) and jelly wobble (landing). The pop
      // depth scales with tier, so a Retirement Corpus lands with visibly more
      // weight than a coin stack — motion is one of the ranking channels.
      let sx = 1;
      let sy = 1;
      if (t.squash > 0) {
        const q = fx.squash(1 - t.squash, cfg.fx.popSquash + cfg.fx.popSquashPerTier * t.tier);
        sx *= q.sx;
        sy *= q.sy;
      }
      if (t.wobble > 0) {
        const w = Math.sin(s.time * 26 + t.id) * 0.08 * t.wobble;
        sx *= 1 + w;
        sy *= 1 - w;
      }
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);

      // Glow is a monotone ramp across the ladder: the base metals throw none,
      // the top of the ladder is a lamp. A merge flashes the glow on top of
      // whatever the tier already carries.
      if (s.shadows) {
        const idle = tier.glowPx > 0
          ? tier.glowPx * (tier.alive > 0 ? 0.86 + 0.14 * Math.sin(s.time * 3 + t.id) : 1)
          : 0;
        const flash = t.squash > 0 ? (14 + tier.glowPx * 0.6) * t.squash : 0;
        const blur = idle + flash;
        if (blur > 0.5) {
          ctx.shadowColor = tier.glow;
          ctx.shadowBlur = blur;
        }
      }

      ctx.drawImage(sp.cv, -size / 2, -size / 2, size, size);
      ctx.shadowBlur = 0;

      // Orbiting light motes on the top tiers: money that is working, not
      // money that is sitting. Nothing below tier 6 moves on its own.
      if (tier.alive > 0) {
        const orbitR = sp.r * 1.12;
        for (let i = 0; i < tier.alive; i++) {
          const a = s.time * cfg.fx.orbitSpeed + (i / tier.alive) * Math.PI * 2 + t.id;
          const mx = Math.cos(a) * orbitR;
          const my = Math.sin(a) * orbitR * 0.42;
          // Behind the token on the far half of the orbit.
          ctx.globalAlpha = Math.sin(a) < 0 ? 0.35 : 0.95;
          ctx.fillStyle = tier.gem || COLORS.goldLt;
          ctx.beginPath();
          ctx.arc(mx, my, sp.r * 0.055 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    const drawAimGuide = (world) => {
      if (world.pieceTier < 0 && world.pieceTimer > 0.12) return;
      const tierIdx = world.pieceTier >= 0 ? world.pieceTier : world.nextTier;
      const r = TIERS[tierIdx].radius;
      const x = world.pieceX;

      // Landing preview: first contact below the aim column.
      let landY = F.floorY - r;
      const tokens = world.tokens;
      for (let i = 0; i < tokens.length; i++) {
        const o = tokens[i];
        if (!o.active) continue;
        const dx = o.x - x;
        const reach = o.r + r;
        if (Math.abs(dx) >= reach) continue;
        const y = o.y - Math.sqrt(reach * reach - dx * dx);
        if (y < landY) landY = y;
      }

      ctx.save();
      ctx.strokeStyle = COLORS.guide;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(x, F.dropY + r + 4);
      ctx.lineTo(x, landY - r + 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Ghost landing ring.
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, landY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawHeldPiece = (world) => {
      if (world.pieceTier < 0) return;
      const t = TIERS[world.pieceTier];
      const sp = s.sprites[world.pieceTier];
      const size = (sp.r + sp.pad) * 2;
      const bob = Math.sin(s.time * 2.4) * 2;
      const y = F.dropY + bob;

      ctx.save();
      ctx.translate(world.pieceX, y);
      if (s.shadows) {
        ctx.shadowColor = t.glow;
        ctx.shadowBlur = 12;
      }
      ctx.drawImage(sp.cv, -size / 2, -size / 2, size, size);
      ctx.shadowBlur = 0;

      // Anti-stall telegraph: the auto-drop ring closes over the last 40%.
      const frac = world.holdTime / cfg.drop.autoDropSeconds;
      if (frac > 0.6) {
        ctx.strokeStyle = COLORS.orangeLt;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, t.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
      }
      ctx.restore();
    };

    /** A frosted socket the next token drops into, per the art-direction
        sheet's `wmg-hud-next`: rounded square, luminous rim, concave floor. */
    const drawNextPreview = (world) => {
      const px = F.W - 40;
      const py = 40;
      const half = 21;
      ctx.save();
      ctx.beginPath();
      const rr = 8;
      ctx.moveTo(px - half + rr, py - half);
      ctx.arcTo(px + half, py - half, px + half, py + half, rr);
      ctx.arcTo(px + half, py + half, px - half, py + half, rr);
      ctx.arcTo(px - half, py + half, px - half, py - half, rr);
      ctx.arcTo(px - half, py - half, px + half, py - half, rr);
      ctx.closePath();
      const well = ctx.createLinearGradient(0, py - half, 0, py + half);
      well.addColorStop(0, 'rgba(95,168,255,0.05)');
      well.addColorStop(1, 'rgba(95,168,255,0.16)');
      ctx.fillStyle = well;
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,220,255,0.34)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const sp = s.sprites[world.nextTier];
      const drawR = 14;
      const scale = drawR / sp.r;
      const size = (sp.r + sp.pad) * 2 * scale;
      const nt = TIERS[world.nextTier];
      if (s.shadows && nt.glowPx > 0) {
        ctx.shadowColor = nt.glow;
        ctx.shadowBlur = Math.min(10, nt.glowPx);
      }
      ctx.drawImage(sp.cv, px - size / 2, py - size / 2, size, size);
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `900 7px 'Poppins', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEXT', px, py + 30);
      ctx.restore();
    };

    const drawDangerLine = (world) => {
      const y = dangerLineY(cfg);
      const active = world.dangerActive && !s.ended;
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 12);

      ctx.save();
      if (active) {
        // Alarm band above the line.
        const band = ctx.createLinearGradient(0, F.jarTopY, 0, y);
        band.addColorStop(0, `rgba(239,68,68,${0.10 + pulse * 0.16})`);
        band.addColorStop(1, 'rgba(239,68,68,0.02)');
        ctx.fillStyle = band;
        ctx.fillRect(F.wallLeft, F.jarTopY, F.wallRight - F.wallLeft, y - F.jarTopY);
      }

      // Drawn twice: a wide soft coral halo under a narrow bright core, with
      // round dash caps, so the line reads as a beam of light suspended in the
      // jar rather than a painted stroke.
      ctx.lineCap = 'round';
      ctx.setLineDash([7, 6]);
      for (const [col, w, al] of [
        [COLORS.dangerLt, active ? 7 : 4, active ? 0.16 + pulse * 0.18 : 0.10],
        [active ? COLORS.danger : 'rgba(255,139,139,0.4)', active ? 2.6 : 1.4,
          active ? 0.55 + pulse * 0.45 : 0.8],
      ]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.globalAlpha = al;
        ctx.beginPath();
        ctx.moveTo(F.wallLeft, y);
        ctx.lineTo(F.wallRight, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;

      ctx.font = `900 8px 'Poppins', system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      if (active) {
        const left = Math.max(0, cfg.overflow.graceSeconds - world.dangerTime);
        ctx.fillStyle = COLORS.dangerLt;
        ctx.textAlign = 'center';
        ctx.font = `900 15px 'Poppins', system-ui, sans-serif`;
        ctx.fillText(`MERGE OUT! ${left.toFixed(1)}s`, (F.wallLeft + F.wallRight) / 2, y - 6);
      } else {
        ctx.fillStyle = 'rgba(255,139,139,0.5)';
        ctx.fillText('LIMIT', F.wallLeft + 4, y - 3);
      }
      ctx.restore();
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const world = s.world;
      const view = s.view;
      if (!world || !s.backdrop || !s.sprites) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, view.cw, view.ch);
      ctx.drawImage(s.backdrop, 0, 0, view.cw, view.ch);

      // Logical space, camera shake inside it.
      ctx.save();
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.k, view.k);
      fx.beginCamera(ctx);

      drawAimGuide(world);

      const tokens = world.tokens;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].active) drawToken(world, tokens[i]);
      }

      drawRings();
      drawDangerLine(world);
      drawHeldPiece(world);
      drawNextPreview(world);

      fx.draw(ctx);
      fx.endCamera(ctx);
      ctx.restore();

      /* --- HUD via DOM refs --------------------------------------------- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.targetScore) * 100, 0, 100)}%`;
        }
      }
      if (world.chainDepth !== s.shownChain) {
        s.shownChain = world.chainDepth;
        setChain(world.chainDepth);
      }
      if (world.dangerActive !== s.shownDanger) {
        s.shownDanger = world.dangerActive;
        setDangerOn(world.dangerActive);
      }
      // Re-acquire countdown: 3/2/1 while frozen, then GO for the live lock.
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.hud.reacquireFreezeSeconds / 3)))
        : (world.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
        aimAt(s.world, cfg, p.x);
      },
      onMove: (p) => {
        if (s.ended) return;
        aimAt(s.world, cfg, p.x);
      },
      onUp: (p) => {
        if (s.ended) return;
        aimAt(s.world, cfg, p.x);
        releaseDrop(s.world, cfg, events, false);
      },
    }, {
      transform: () => ({ scale: s.view.k, offsetX: s.view.ox, offsetY: s.view.oy }),
    });

    /* --- loop -------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The session clock holds through the re-acquire countdown too, so a
      // player coming back from a notification never loses time to the count.
      shouldTickClock: () => !s.ended && !(s.world && isFrozen(s.world)),
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        if (s.ended) return;
        expire(s.world, cfg);
        endRun();
      },
      /* Auto-pause from the kit (visibilitychange). The kit is immutable, so
         the anti-pause-scum rule lives in physics.js and is driven from here:
         going away freezes the world, coming back starts a visible countdown
         with the session clock held. See physics.js beginPause/endPause. */
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (s.ended || !s.world) return;
        if (isPaused) beginPause(s.world);
        else endPause(s.world, cfg);
      },
    });
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
      s.world = null;
      s.backdrop = null;
      s.sprites = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const chainMult = chain > 0
    ? cfg.chain.multipliers[Math.min(chain - 1, cfg.chain.multipliers.length - 1)]
    : 1;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="wm-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Target </span>
              {cfg.targetScore.toLocaleString()}
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'wmPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Wealth ladder rail ----------------------------------------
            The progression display: eight rungs, dim until the player has
            created that tier, the newest one lit and ringed. It is the only
            thing on screen that answers "how far up am I?" without a merge
            happening, and it teaches the ladder's order before the player has
            climbed it. */}
        <div style={styles.ladderWrap} aria-hidden="true">
          {TIERS.map((t, i) => {
            const got = i <= reached;
            const newest = i === reached;
            return (
              <span
                key={t.key}
                className={newest ? 'wm-rung' : undefined}
                style={{
                  width: 6 + i * 1.9,
                  height: 6 + i * 1.9,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: got
                    ? `radial-gradient(circle at 32% 28%, ${t.colorLt} 0%, ${t.color} 46%, ${t.colorDeep} 100%)`
                    : 'rgba(255,255,255,0.10)',
                  border: got ? 'none' : '1px solid rgba(255,255,255,0.16)',
                  boxSizing: 'border-box',
                  boxShadow: newest ? `0 0 10px ${t.glow}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Chain chip ------------------------------------------------ */}
        {chain >= 2 && !over && (
          <div style={styles.chainWrap}>
            <div className="wm-chain" style={styles.chainChip}>
              CHAIN x{chainMult}
            </div>
          </div>
        )}

        {/* Overflow warning chip ------------------------------------- */}
        {dangerOn && !over && (
          <div style={styles.dangerWrap}>
            <div className="wm-danger" style={styles.dangerChip}>
              JAR NEARLY FULL — MERGE OUT!
            </div>
          </div>
        )}

        {/* Reward banner ---------------------------------------------
            Wears the colours of the tier it is announcing, so the reward
            escalates with the ladder instead of always being the same gold
            card. A first-ever tier also gets the "NEW TIER" eyebrow. */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="wm-banner">
            <div style={{
              ...styles.banner,
              background: `linear-gradient(180deg, ${TIERS[banner.tier ?? 0].colorLt}, ${TIERS[banner.tier ?? 0].color})`,
              boxShadow: `0 14px 34px rgba(0,0,0,0.45), 0 0 26px ${TIERS[banner.tier ?? 0].glow}`,
            }}>
              {banner.kind === 'new' && (
                <span style={styles.bannerEyebrow}>New tier unlocked</span>
              )}
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="wm-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Drag</strong> to aim ·{' '}
              <strong style={{ color: COLORS.orangeLt }}>release</strong> to drop ·
              match two to merge
            </div>
          </div>
        )}

        {/* Re-acquire countdown --------------------------------------
            Shown after the game auto-pauses (app switch, screen lock). The
            world and the session clock are both held while 3-2-1 runs, then
            GO covers the brief live input lock. See physics.js. */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="wm-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your jar' : 'Play on'}
            </div>
          </div>
        )}

        {/* Auto-pause veil ------------------------------------------- */}
        {paused && !over && (
          <div style={styles.pauseVeil}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Paused</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
              Your timer is safe. Come back and keep compounding.
            </div>
          </div>
        )}

        {/* Mute ------------------------------------------------------- */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={styles.muteBtn}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M11 5 6 9H2v6h4l5 4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes wmIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes wmPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes wmBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes wmHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes wmChain { 0% { transform: scale(0.7); } 55% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes wmDanger { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
@keyframes wmCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
@keyframes wmRung { 0% { transform: scale(0.5); } 60% { transform: scale(1.35); } 100% { transform: scale(1); } }
.wm-rung   { animation: wmRung 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-count  { animation: wmCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-stage  { animation: wmIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-banner { animation: wmBanner 1.5s ease-out both; }
.wm-hint   { animation: wmHint 1.6s ease-in-out infinite; }
.wm-chain  { animation: wmChain 260ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-danger { animation: wmDanger 0.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wm-stage, .wm-banner, .wm-hint, .wm-chain, .wm-danger, .wm-count, .wm-rung {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
  }
}
`;

const glass = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: 430,
    margin: '0 auto',
    display: 'flex',
    padding: 10,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 420,
    borderRadius: 20,
    overflow: 'hidden',
    background: COLORS.bgDark,
    border: '1.5px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
    touchAction: 'none',
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
    padding: '5px 11px',
    minWidth: 72,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 19,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  progressPill: {
    ...glass,
    borderRadius: 12,
    padding: '5px 12px 6px',
    flex: 1,
    maxWidth: 150,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  progressText: {
    fontSize: 10,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    marginTop: 4,
    height: 4,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 180ms linear',
  },
  ladderWrap: {
    position: 'absolute',
    top: 56,
    left: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 9px',
    borderRadius: 999,
    background: 'rgba(11,18,33,0.44)',
    border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    pointerEvents: 'none',
    zIndex: 4,
  },
  chainWrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 10,
    display: 'flex',
    justifyContent: 'flex-end',
    pointerEvents: 'none',
    zIndex: 4,
  },
  chainChip: {
    ...glass,
    borderRadius: 999,
    padding: '4px 13px',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: COLORS.goldLt,
    borderColor: 'rgba(255,200,69,0.5)',
    textTransform: 'uppercase',
  },
  dangerWrap: {
    position: 'absolute',
    top: 86,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  dangerChip: {
    ...glass,
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: COLORS.dangerLt,
    borderColor: 'rgba(239,68,68,0.55)',
    textTransform: 'uppercase',
  },
  bannerWrap: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 22px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
    background: 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))',
  },
  bannerEyebrow: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(11,18,33,0.62)',
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#0B1221', letterSpacing: '-0.02em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(11,18,33,0.8)',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 64,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    borderRadius: 999,
    padding: '9px 16px',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  reacquireVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Deliberately light: the player has to SEE the jar to re-acquire it.
    background: 'rgba(11,18,33,0.42)',
    pointerEvents: 'none',
    zIndex: 8,
  },
  reacquireCount: {
    fontSize: 68,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    letterSpacing: '-0.04em',
    textShadow: '0 4px 24px rgba(0,0,0,0.7)',
    fontVariantNumeric: 'tabular-nums',
  },
  reacquireLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(11,18,33,0.84)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 8,
  },
  muteBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(11,18,33,0.6)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};

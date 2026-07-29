// SipStackGame.jsx — "SIP Stack": Ketchapp-Stack-style timing tower.
//
// A SIP slab slides above the tower on a LINEAR back-and-forth track. TAP to
// drop it: the overlap with the block below is kept, the overhang shears off
// and tumbles away. The shrinking footprint IS the health bar. 30 layers =
// the Retirement Corpus summit.
//
// Fairness contract
// -----------------
// * The drop is judged at the pointerdown timestamp: the kit input calls
//   onDown synchronously inside the DOM pointerdown handler, and the slab
//   position is extrapolated from the last physics tick to that instant, so
//   input latency never eats a perfect. Never judged on click/pointerup.
// * Exactly one drop is accepted per slab, and input is locked for 200ms
//   after each placement (spawn animation).
// * Anti-pause-scum: the kit auto-pauses on visibilitychange. On resume the
//   world stays frozen behind a visible 3-2-1 re-acquire countdown AND the
//   moving slab's phase + direction are re-randomised, so pausing to line up
//   a drop yields zero aiming information.
import React, { useEffect, useRef, useState } from 'react';
import {
  createGameLoop,
  createInput,
  createEffects,
  createAudio,
  fitCanvas,
  haptic,
  damp,
  Easing,
} from './kit/index.js';
import { COLORS } from './data.js';

/* ---------------------------------------------------------------- helpers */

/** Linear ping-pong advance along [minX, maxX]. Returns the new x and dir. */
function advancePingPong(x, dir, dist, minX, maxX) {
  if (maxX - minX < 2) return { x: minX, dir: 1 };
  let nx = x + dir * dist;
  let nd = dir;
  for (let k = 0; k < 6; k++) {
    if (nx > maxX) {
      nx = maxX - (nx - maxX);
      nd = -1;
    } else if (nx < minX) {
      nx = minX + (minX - nx);
      nd = 1;
    } else {
      break;
    }
  }
  if (nx < minX) nx = minX;
  if (nx > maxX) nx = maxX;
  return { x: nx, dir: nd };
}

/** Traverse seconds for a given 1-based layer number. Steps between blocks only. */
function traverseFor(layerNum, cfg) {
  let t = cfg.speedSteps[0].traverseSeconds;
  for (const step of cfg.speedSteps) {
    if (layerNum >= step.fromLayer) t = step.traverseSeconds;
  }
  return t;
}

function hueFor(layer, cfg) {
  return Math.max(cfg.slabHueEnd, cfg.slabHueStart - layer * cfg.hueDriftPerBlock);
}

function readBest(cfg) {
  try {
    return Number(localStorage.getItem(cfg.bestScoreKey)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(cfg, value) {
  try {
    localStorage.setItem(cfg.bestScoreKey, String(value));
  } catch {
    /* storage unavailable — best-run delta just resets each visit */
  }
}

const CONFETTI_COLORS = ['#FFC845', '#FF8A3D', '#1E6BE0', '#28A745', '#FFFFFF', '#F26522'];

/* -------------------------------------------------------------- component */

export default function SipStackGame({ config: cfg, onWin, onLose }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scoreElRef = useRef(null);
  const layerElRef = useRef(null);
  const stateRef = useRef(null);

  const [paused, setPaused] = useState(false);
  const [reacquire, setReacquire] = useState(-1); // -1 idle, 3/2/1 frozen count, 0 = GO
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [streakUi, setStreakUi] = useState(0);
  const [bestUi] = useState(() => readBest(cfg));

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  const hintRef = useRef(true);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const fx = createEffects();
    const audio = createAudio();

    /* --- view / logical space ------------------------------------------- */
    const view = { k: 1, dpr: 1, LW: cfg.logicalWidth, LH: 780 };

    const fit = () => {
      const cssW = Math.max(1, wrap.clientWidth);
      const cssH = Math.max(1, wrap.clientHeight);
      view.dpr = fitCanvas(canvas, cssW, cssH, 2);
      view.k = cssW / cfg.logicalWidth;
      view.LH = cssH / view.k;
      s.baseY = view.LH - cfg.baseMarginBottom;
      s.bgDirty = true;
    };

    /* --- world ----------------------------------------------------------- */
    const bh = cfg.blockHeight;
    const s = {
      state: 'play', // play | winAnim | loseAnim
      ended: false,
      baseY: 600,
      originalW: cfg.logicalWidth * cfg.startWidthFrac,
      tower: [], // [{x, w, hue, label}] — index = row (0 = base)
      placed: 0,
      moving: null, // {active, x, dir, speed, w, minX, maxX, spawnT}
      entrySide: Math.random() < 0.5 ? 0 : 1, // randomised first side, alternates after
      dropArmed: false,
      inputLock: 0, // spawn lock
      resumeLock: 0, // post-freeze live lock (taps refused, world running)
      freezeLeft: 0, // re-acquire freeze (world + slab frozen)
      pausedMid: false,
      lastTickWall: performance.now(),

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      shownLayer: -1,
      shownCount: -2,
      shownStreak: -1,
      shownBanner: null,
      perfects: 0,
      streak: 0,

      camY: 0,
      camFrom: 0,
      camTo: 0,
      camT: 1,
      pulseT: 0,
      pulseX: 0,
      pulseY: 0,

      bgDirty: true,
      bgHue: 222,
      bgHueShown: 222,
      bgBuiltHue: -999,
      bgGrad: null,
      paintCache: new Map(),

      chunks: [],
      rings: [],
      winT: 0,
      winFrom: null,
      winTo: null,
      confettiAcc: 0,
      bannerLeft: 0,
      bannerText: null,
      lowDetail: false,
      endTimer: null,
    };
    stateRef.current = s;

    for (let i = 0; i < 8; i++) {
      s.chunks.push({ alive: false, x: 0, y: 0, w: 0, hue: 0, vx: 0, vy: 0, rot: 0, vrot: 0 });
      s.rings.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, r1: 60, intensity: 1 });
    }

    fit();

    // Base slab: centred, 50% of screen width. Row 0.
    s.tower.push({
      x: (view.LW - s.originalW) / 2,
      w: s.originalW,
      hue: hueFor(0, cfg),
      label: null,
    });

    /* --- world ops -------------------------------------------------------- */

    const rowTopY = (row) => s.baseY - (row + 1) * bh;

    function spawnMoving() {
      const top = s.tower[s.tower.length - 1];
      const w = top.w;
      const minX = top.x - w;
      const maxX = top.x + top.w;
      const layerNum = s.placed + 1;
      const range = maxX - minX; // tower width + slab width → swept extent = tower + 2×slab
      const speed = range / traverseFor(layerNum, cfg);
      s.entrySide = 1 - s.entrySide; // alternate entry side per block
      const dir = s.entrySide === 0 ? 1 : -1;
      let x = dir === 1 ? minX : maxX;
      // Random phase into the run so the rhythm can never be memorised.
      const adv = advancePingPong(x, dir, Math.random() * cfg.spawnPhaseMaxFrac * range, minX, maxX);
      s.moving = { active: true, x: adv.x, dir: adv.dir, speed, w, minX, maxX, spawnT: 0 };
      s.inputLock = cfg.spawnLockSeconds; // 200ms lock during spawn animation
      s.dropArmed = true;
    }

    function spawnChunk(x, y, w, hue, side) {
      let c = null;
      for (const cand of s.chunks) {
        if (!cand.alive) {
          c = cand;
          break;
        }
      }
      if (!c) c = s.chunks[0];
      c.alive = true;
      c.x = x;
      c.y = y;
      c.w = Math.max(4, w);
      c.hue = hue;
      c.vx = side * cfg.chunkKickVx * (0.5 + Math.random() * 0.9);
      c.vy = -30 - Math.random() * 40;
      c.rot = 0;
      c.vrot = side * (0.8 + Math.random() * cfg.chunkSpinMax);
    }

    function flashRing(x, y, intensity) {
      let r = null;
      for (const cand of s.rings) {
        if (!cand.alive) {
          r = cand;
          break;
        }
      }
      if (!r) r = s.rings[0];
      r.alive = true;
      r.x = x;
      r.y = y;
      r.maxLife = 0.45;
      r.life = r.maxLife;
      r.r1 = 54 + Math.min(8, intensity) * 7;
      r.intensity = intensity;
    }

    function retargetCamera() {
      const n = s.placed;
      const target = Math.max(0, (n + 2) * bh - s.baseY + view.LH * cfg.cameraTopMarginFrac);
      s.camFrom = s.camY;
      s.camTo = target;
      s.camT = 0; // 250ms lerp — camera rises one block-height per placement
    }

    function showBanner(text) {
      s.bannerText = text;
      s.bannerLeft = cfg.milestoneBannerSeconds;
    }

    function endRun(won) {
      if (s.ended) return;
      s.ended = true;
      const prevBest = readBest(cfg);
      const best = Math.max(prevBest, s.score);
      writeBest(cfg, best);
      const stats = {
        score: s.score,
        layers: s.placed,
        targetLayers: cfg.targetLayers,
        perfects: s.perfects,
        prevBest,
        best,
      };
      (won ? onWinRef.current : onLoseRef.current)?.(stats);
    }

    function beginWin() {
      s.state = 'winAnim';
      s.winT = 0;
      const rows = s.tower.length;
      const towerH = rows * bh + 70;
      const zf = Math.min(1, (view.LH - 170) / towerH);
      const towerMidY = s.baseY - (rows * bh) / 2;
      s.winFrom = { sc: 1, ox: 0, oy: s.camY };
      s.winTo = {
        sc: zf,
        ox: (view.LW / 2) * (1 - zf),
        oy: view.LH * 0.52 - towerMidY * zf,
      };
      audio.victory();
      haptic('success');
      s.endTimer = setTimeout(() => endRun(true), cfg.winHoldSeconds * 1000);
    }

    function beginLose(slabX, slabW, row) {
      s.state = 'loseAnim';
      spawnChunk(slabX, rowTopY(row), slabW, hueFor(row, cfg), s.moving ? s.moving.dir : 1);
      fx.addShake(cfg.loseShake);
      audio.failure();
      haptic('failure');
      s.endTimer = setTimeout(() => endRun(false), cfg.loseHoldSeconds * 1000);
    }

    /** The single accepted drop for the current slab, judged at judgedX. */
    function dropAt(judgedX) {
      const m = s.moving;
      const top = s.tower[s.tower.length - 1];
      const row = s.tower.length; // row this slab lands on
      m.active = false;
      s.dropArmed = false; // exactly one drop per slab

      const lo = Math.max(judgedX, top.x);
      const hi = Math.min(judgedX + m.w, top.x + top.w);
      const overlap = hi - lo;

      if (overlap < cfg.minKeepWidthPx) {
        // Total miss (or sliver < 8px): the run ends here.
        beginLose(judgedX, m.w, row);
        return;
      }

      const offset = Math.abs(judgedX - top.x);
      const perfectWin = Math.max(cfg.perfectWindowPx, cfg.perfectWindowFrac * m.w);
      const yTop = rowTopY(row);
      const layerNum = row;
      const hue = hueFor(layerNum, cfg);
      const label = layerNum % 6 === 0 ? cfg.milestones[layerNum] || null : null;

      let newX;
      let newW;
      let gained;

      if (offset <= perfectWin) {
        // PERFECT — snap to alignment, no trim.
        s.streak += 1;
        s.perfects += 1;
        newX = top.x;
        newW = m.w;
        if (s.streak >= cfg.regrowFromStreak) {
          // Streak regrowth: skilled play visibly undoes past mistakes.
          const grown = Math.min(s.originalW, newW + cfg.regrowFrac * s.originalW);
          const cx = top.x + top.w / 2;
          newX = cx - grown / 2;
          newW = grown;
        }
        gained = cfg.scorePerBlock + cfg.scorePerPerfect;
        flashRing(top.x + top.w / 2, yTop + cfg.slabDepth, s.streak);
        audio.combo(s.streak); // note rises one pitch step per consecutive perfect
        fx.burst({
          x: top.x + top.w / 2,
          y: yTop + bh / 2,
          count: 8 + Math.min(8, s.streak * 2),
          color: '#FFFFFF',
          speed: 110,
          gravity: 60,
          size: 2.5,
          life: 0.5,
        });
        fx.floatText(
          top.x + top.w / 2,
          yTop - 14,
          s.streak >= 2 ? `PERFECT ×${s.streak}  +${gained}` : `PERFECT  +${gained}`,
          COLORS.gold,
          15 + Math.min(6, s.streak),
        );
        haptic('light');
      } else {
        // Trim: the overlap survives, the overhang shears off with a thud.
        s.streak = 0; // pitch ladder resets on any trim
        newX = lo;
        newW = overlap;
        gained = cfg.scorePerBlock;
        if (judgedX < top.x) {
          spawnChunk(judgedX, yTop, top.x - judgedX, hue, -1);
        } else {
          spawnChunk(top.x + top.w, yTop, judgedX + m.w - (top.x + top.w), hue, 1);
        }
        const shearX = judgedX < top.x ? lo : hi;
        fx.burst({
          x: shearX,
          y: yTop + bh / 2,
          count: 10,
          color: `hsl(${hue}, 70%, 74%)`,
          speed: 130,
          gravity: 500,
          size: 2.5,
          life: 0.55,
        });
        audio.hit();
        fx.addShake(2.5);
        fx.floatText(newX + newW / 2, yTop - 12, `+${gained}`, '#FFFFFF', 15);
        haptic('light');
      }

      s.score += gained;
      s.tower.push({ x: newX, w: newW, hue, label });
      s.placed = s.tower.length - 1;

      // Presentation: camera rise, hue drift, 1.05× pulse.
      retargetCamera();
      s.bgHue = 222 - s.placed * cfg.hueDriftPerBlock;
      s.pulseT = cfg.pulseSeconds;
      s.pulseX = newX + newW / 2;
      s.pulseY = yTop + bh / 2;

      if (label) {
        showBanner(label);
        audio.powerUp();
        fx.burst({
          x: newX + newW / 2,
          y: yTop,
          count: 14,
          color: COLORS.gold,
          speed: 150,
          gravity: 260,
          size: 3,
          life: 0.7,
        });
      }

      if (s.placed >= cfg.targetLayers) {
        beginWin();
      } else {
        spawnMoving();
      }
    }

    /* --- update ----------------------------------------------------------- */

    const update = (dt) => {
      fx.update(dt);

      // Score counter lerps so the number feels alive.
      s.scoreShown = damp(s.scoreShown, s.score, 8, dt);

      if (s.bannerLeft > 0) {
        s.bannerLeft -= dt;
        if (s.bannerLeft <= 0) s.bannerText = null;
      }

      // Re-acquire freeze: the world (and the slab) stays completely still
      // behind the countdown. Nothing below runs.
      if (s.freezeLeft > 0) {
        s.freezeLeft -= dt;
        if (s.freezeLeft <= 0) {
          s.freezeLeft = 0;
          s.resumeLock = cfg.reacquireLockSeconds;
        }
        return;
      }
      if (s.resumeLock > 0) s.resumeLock = Math.max(0, s.resumeLock - dt);
      if (s.inputLock > 0) s.inputLock = Math.max(0, s.inputLock - dt);

      // Camera lerp (250ms per placement).
      if (s.camT < cfg.cameraLerpSeconds) {
        s.camT = Math.min(cfg.cameraLerpSeconds, s.camT + dt);
        const t = Easing.outCubic(s.camT / cfg.cameraLerpSeconds);
        s.camY = s.camFrom + (s.camTo - s.camFrom) * t;
      }
      if (s.pulseT > 0) s.pulseT = Math.max(0, s.pulseT - dt);

      // Background hue drifts smoothly toward the per-layer target.
      s.bgHueShown = damp(s.bgHueShown, s.bgHue, 6, dt);
      if (Math.abs(s.bgHueShown - s.bgBuiltHue) > 0.5) s.bgDirty = true;

      // Moving slab — LINEAR back-and-forth, speed constant during a slide.
      const m = s.moving;
      if (s.state === 'play' && m && m.active) {
        if (m.spawnT < cfg.spawnLockSeconds) m.spawnT += dt;
        const adv = advancePingPong(m.x, m.dir, m.speed * dt, m.minX, m.maxX);
        m.x = adv.x;
        m.dir = adv.dir;
      }
      s.lastTickWall = performance.now();

      // Sheared chunks: gravity + rotation, culled below the view.
      for (const c of s.chunks) {
        if (!c.alive) continue;
        c.vy += 1500 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vrot * dt;
        if (c.y + s.camY > view.LH + 160) c.alive = false;
      }

      // Perfect rings.
      for (const r of s.rings) {
        if (!r.alive) continue;
        r.life -= dt;
        if (r.life <= 0) r.alive = false;
      }

      // Win choreography: zoom out to the whole tower + confetti rain.
      if (s.state === 'winAnim') {
        s.winT += dt;
        s.confettiAcc += dt;
        while (s.confettiAcc > 0.11) {
          s.confettiAcc -= 0.11;
          const rows = s.tower.length;
          fx.burst({
            x: view.LW * (0.12 + Math.random() * 0.76),
            y: s.baseY - Math.random() * rows * bh,
            count: 8,
            color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
            speed: 150,
            spread: Math.PI * 2,
            gravity: 260,
            size: 3,
            life: 0.9,
          });
        }
      }
    };

    /* --- render ----------------------------------------------------------- */

    function getPaint(w, hue) {
      const key = ((hue | 0) << 12) | (Math.round(w) & 0xfff);
      let p = s.paintCache.get(key);
      if (!p) {
        const gTop = ctx.createLinearGradient(0, 0, Math.max(1, w), 0);
        gTop.addColorStop(0, `hsl(${hue}, 58%, 64%)`);
        gTop.addColorStop(1, `hsl(${hue}, 60%, 50%)`);
        const gFront = ctx.createLinearGradient(0, 0, 0, bh);
        gFront.addColorStop(0, `hsl(${hue}, 62%, 47%)`);
        gFront.addColorStop(1, `hsl(${hue}, 66%, 33%)`);
        p = { gTop, gFront, side: `hsl(${hue}, 62%, 25%)` };
        if (s.paintCache.size > 96) s.paintCache.clear();
        s.paintCache.set(key, p);
      }
      return p;
    }

    /** Pseudo-3D slab drawn in local space with origin at (x, yTop). */
    function drawSlab(x, yTop, w, hue, label, withShadow) {
      const d = cfg.slabDepth;
      const sh = cfg.slabShear;
      const p = getPaint(w, hue);
      ctx.save();
      ctx.translate(x, yTop);
      if (withShadow && !s.lowDetail) {
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
      }
      // Front face
      ctx.fillStyle = p.gFront;
      ctx.fillRect(0, d, w, bh - d);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // Right side face
      ctx.fillStyle = p.side;
      ctx.beginPath();
      ctx.moveTo(w, d);
      ctx.lineTo(w + sh, 0);
      ctx.lineTo(w + sh, bh - d);
      ctx.lineTo(w, bh);
      ctx.closePath();
      ctx.fill();
      // Top face
      ctx.fillStyle = p.gTop;
      ctx.beginPath();
      ctx.moveTo(0, d);
      ctx.lineTo(sh, 0);
      ctx.lineTo(w + sh, 0);
      ctx.lineTo(w, d);
      ctx.closePath();
      ctx.fill();
      // Crisp top edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, d);
      ctx.lineTo(w, d);
      ctx.stroke();
      // Milestone label on the block face
      if (label) {
        const stripeW = Math.min(w - 6, 104);
        if (stripeW > 42) {
          ctx.fillStyle = 'rgba(242,101,34,0.92)';
          const sx = (w - stripeW) / 2;
          ctx.beginPath();
          ctx.moveTo(sx + 4, d + 3);
          ctx.lineTo(sx + stripeW - 4, d + 3);
          ctx.quadraticCurveTo(sx + stripeW, d + 3, sx + stripeW, d + 7);
          ctx.lineTo(sx + stripeW, bh - 7);
          ctx.quadraticCurveTo(sx + stripeW, bh - 3, sx + stripeW - 4, bh - 3);
          ctx.lineTo(sx + 4, bh - 3);
          ctx.quadraticCurveTo(sx, bh - 3, sx, bh - 7);
          ctx.lineTo(sx, d + 7);
          ctx.quadraticCurveTo(sx, d + 3, sx + 4, d + 3);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = "800 9px 'Poppins', system-ui, sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label.toUpperCase(), w / 2, d + (bh - d) / 2 + 0.5);
        }
      }
      ctx.restore();
    }

    const render = () => {
      const LW = view.LW;
      const LH = view.LH;
      ctx.setTransform(view.dpr * view.k, 0, 0, view.dpr * view.k, 0, 0);

      // Background: continuous gradient, hue drifting with the tower.
      if (s.bgDirty || !s.bgGrad) {
        const h = s.bgHueShown;
        const g = ctx.createLinearGradient(0, 0, 0, LH);
        g.addColorStop(0, `hsl(${h}, 56%, 6%)`);
        g.addColorStop(0.55, `hsl(${h}, 50%, 14%)`);
        g.addColorStop(1, `hsl(${h}, 52%, 8%)`);
        s.bgGrad = g;
        s.bgBuiltHue = h;
        s.bgDirty = false;
      }
      ctx.fillStyle = s.bgGrad;
      ctx.fillRect(0, 0, LW, LH);

      fx.beginCamera(ctx); // screen shake

      // Camera transform (play: translate; win: blended zoom-out).
      let sc = 1;
      let ox = 0;
      let oy = s.camY;
      if (s.state === 'winAnim' && s.winFrom && s.winTo) {
        const t = Easing.inOutCubic(Math.min(1, s.winT / cfg.winZoomSeconds));
        sc = s.winFrom.sc + (s.winTo.sc - s.winFrom.sc) * t;
        ox = s.winFrom.ox + (s.winTo.ox - s.winFrom.ox) * t;
        oy = s.winFrom.oy + (s.winTo.oy - s.winFrom.oy) * t;
      }
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);

      // Placement pulse (1.05× around the new block).
      if (s.pulseT > 0) {
        const pt = s.pulseT / cfg.pulseSeconds;
        const p = 1 + (cfg.pulseScale - 1) * Easing.outQuad(pt);
        ctx.translate(s.pulseX, s.pulseY);
        ctx.scale(p, p);
        ctx.translate(-s.pulseX, -s.pulseY);
      }

      // Ground plinth + soft contact shadow.
      const base = s.tower[0];
      const plinthY = s.baseY;
      if (plinthY + oy < LH + 60) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath();
        ctx.ellipse(base.x + base.w / 2 + 6, plinthY + 20, base.w * 0.72, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(10,22,48,0.95)';
        ctx.fillRect(base.x - 18, plinthY, base.w + 36, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(base.x - 18, plinthY, base.w + 36, 2);
      }

      // Tower — bottom to top, culled outside the view.
      for (let i = 0; i < s.tower.length; i++) {
        const b = s.tower[i];
        const yTop = rowTopY(i);
        const screenY = yTop * sc + oy;
        if (screenY > LH + 80 || screenY < -80) continue;
        drawSlab(b.x, yTop, b.w, b.hue, b.label, i === s.tower.length - 1);
      }

      // Sheared chunks tumbling away.
      for (const c of s.chunks) {
        if (!c.alive) continue;
        ctx.save();
        ctx.translate(c.x + c.w / 2, c.y + bh / 2);
        ctx.rotate(c.rot);
        ctx.translate(-(c.x + c.w / 2), -(c.y + bh / 2));
        ctx.globalAlpha = 0.95;
        drawSlab(c.x, c.y, c.w, c.hue, null, false);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Moving slab (drawn frozen during the re-acquire countdown).
      const m = s.moving;
      if (m && m.active) {
        const row = s.tower.length;
        const yTop = rowTopY(row);
        const st = Math.min(1, m.spawnT / cfg.spawnLockSeconds);
        const scale = 0.94 + 0.06 * Easing.outBack(st);
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.45 * st;
        ctx.translate(m.x + m.w / 2, yTop + bh / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(m.x + m.w / 2), -(yTop + bh / 2));
        const nextLabel = (s.placed + 1) % 6 === 0 ? cfg.milestones[s.placed + 1] || null : null;
        drawSlab(m.x, yTop, m.w, hueFor(s.placed + 1, cfg), nextLabel, true);
        ctx.restore();
      }

      // Perfect ring flashes — brighter and larger with each streak step.
      for (const r of s.rings) {
        if (!r.alive) continue;
        const t = 1 - r.life / r.maxLife;
        const radius = 10 + (r.r1 - 10) * Easing.outCubic(t);
        const alpha = (1 - t) * Math.min(1, 0.55 + r.intensity * 0.12);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5 - 3.5 * t;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (r.intensity >= 3) {
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = COLORS.gold;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(r.x, r.y, radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      fx.draw(ctx); // particles + floating score text (world space)

      ctx.restore();
      fx.endCamera(ctx);

      // Top fade under the HUD.
      ctx.fillStyle = 'rgba(11,18,33,0.28)';
      ctx.fillRect(0, 0, LW, 54);

      /* --- HUD straight to the DOM (no per-frame React renders) ---------- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = String(shown);
      }
      if (s.placed !== s.shownLayer) {
        s.shownLayer = s.placed;
        if (layerElRef.current) layerElRef.current.textContent = `${s.placed} / ${cfg.targetLayers}`;
      }
      // Re-acquire countdown: 3/2/1 while frozen, GO during the live lock.
      const count = s.freezeLeft > 0
        ? Math.max(1, Math.ceil(s.freezeLeft / (cfg.reacquireFreezeSeconds / 3)))
        : (s.resumeLock > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
      if (s.streak !== s.shownStreak) {
        s.shownStreak = s.streak;
        setStreakUi(s.streak);
      }
      if (s.bannerText !== s.shownBanner) {
        s.shownBanner = s.bannerText;
        setBanner(s.bannerText);
      }
    };

    /* --- input ------------------------------------------------------------ */

    const input = createInput(canvas, {
      // Judged on pointerdown, never click: this handler runs synchronously
      // inside the DOM pointerdown event. The slab position is extrapolated
      // from the last physics tick to this exact instant so the judgment
      // matches what the thumb saw, not the next animation frame.
      onDown: () => {
        audio.unlock();
        if (s.ended || s.state !== 'play') return;
        if (s.freezeLeft > 0 || s.resumeLock > 0 || s.inputLock > 0) return;
        const m = s.moving;
        if (!m || !m.active || !s.dropArmed) return;
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }

        let extra = (performance.now() - s.lastTickWall) / 1000;
        if (!Number.isFinite(extra) || extra < 0) extra = 0;
        if (extra > 0.05) extra = 0.05;
        const adv = advancePingPong(m.x, m.dir, m.speed * extra, m.minX, m.maxX);
        m.x = adv.x;
        m.dir = adv.dir;
        dropAt(adv.x);
      },
    });

    /* --- loop -------------------------------------------------------------- */

    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      // Untimed: the speed ramp itself bounds the session (~60–100s).
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (s.ended || s.state !== 'play') return;
        if (isPaused) {
          s.pausedMid = true;
        } else if (s.pausedMid) {
          s.pausedMid = false;
          // MANDATORY anti-pause-scum: hold the world behind a visible 3-2-1
          // re-acquire countdown AND re-randomise the slab's phase/direction
          // so pausing yields zero aiming information.
          s.freezeLeft = cfg.reacquireFreezeSeconds;
          const m = s.moving;
          if (m && m.active) {
            m.dir = Math.random() < 0.5 ? -1 : 1;
            m.x = m.minX + Math.random() * (m.maxX - m.minX);
          }
        }
      },
      onSlow: () => {
        s.lowDetail = true;
        fx.refreshBudget();
      },
    });

    spawnMoving();
    loop.start();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      if (s.endTimer) clearTimeout(s.endTimer);
      fx.reset();
      audio.destroy();
      stateRef.current = null;
    };
    // Mount-once: App remounts with key={gameKey} for instant restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={wrapRef} style={styles.stage}>
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ---------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Layers</span>
            <span ref={layerElRef} style={styles.pillValue}>0 / {cfg.targetLayers}</span>
          </div>
          {bestUi > 0 && (
            <div style={{ ...styles.pill, opacity: 0.8 }}>
              <span style={styles.pillLabel}>Best</span>
              <span style={styles.pillValue}>{bestUi}</span>
            </div>
          )}
        </div>

        {/* Milestone banner --------------------------------------------- */}
        {banner && (
          <div key={banner} className="ss-banner" style={styles.banner}>
            <span style={styles.bannerStar} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFC845">
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z" />
              </svg>
            </span>
            {banner} secured!
          </div>
        )}

        {/* Perfect streak chip ------------------------------------------ */}
        {streakUi >= 2 && !paused && reacquire < 0 && (
          <div key={streakUi} className="ss-streak" style={styles.streakChip}>
            PERFECT ×{streakUi}
          </div>
        )}

        {/* Tap hint ------------------------------------------------------ */}
        {hint && !paused && (
          <div style={styles.hintWrap}>
            <div className="ss-hint" style={styles.hint}>TAP TO DROP THE SIP SLAB</div>
          </div>
        )}

        {/* Re-acquire countdown (anti-pause-scum) ------------------------ */}
        {reacquire >= 0 && !paused && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="ss-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your slab' : 'Stack on'}
            </div>
          </div>
        )}

        {/* Auto-pause veil ----------------------------------------------- */}
        {paused && (
          <div style={styles.pauseVeil}>
            <div style={styles.pauseTitle}>Paused</div>
            <div style={styles.pauseSub}>Your tower is waiting</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ styles */

const CSS = `
@keyframes ssCountPop {
  0% { transform: scale(1.7); opacity: 0; }
  35% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.94); opacity: 0.95; }
}
.ss-count { animation: ssCountPop 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes ssBannerIn {
  0% { transform: translate(-50%, -14px); opacity: 0; }
  16% { transform: translate(-50%, 0); opacity: 1; }
  84% { transform: translate(-50%, 0); opacity: 1; }
  100% { transform: translate(-50%, -10px); opacity: 0; }
}
.ss-banner { animation: ssBannerIn 1.8s ease-out both; }
@keyframes ssStreakPop {
  0% { transform: translateX(-50%) scale(1.35); }
  100% { transform: translateX(-50%) scale(1); }
}
.ss-streak { animation: ssStreakPop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes ssHintPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.06); opacity: 1; }
}
.ss-hint { animation: ssHintPulse 1.4s ease-in-out infinite; }
`;

const glass = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  stage: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    height: '100%',
    overflow: 'hidden',
    touchAction: 'manipulation',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    touchAction: 'none',
  },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 5,
  },
  pill: {
    ...glass,
    borderRadius: 999,
    padding: '7px 14px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 7,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
  pillValue: {
    fontSize: 15,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  banner: {
    position: 'absolute',
    top: 58,
    left: '50%',
    transform: 'translateX(-50%)',
    ...glass,
    background: 'rgba(242,101,34,0.24)',
    border: '1px solid rgba(255,200,69,0.45)',
    borderRadius: 999,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 900,
    color: '#FFE1B0',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    pointerEvents: 'none',
    zIndex: 6,
  },
  bannerStar: { display: 'inline-flex', alignItems: 'center' },
  streakChip: {
    position: 'absolute',
    top: 96,
    left: '50%',
    transform: 'translateX(-50%)',
    ...glass,
    background: 'rgba(40,167,69,0.22)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: '#C9F5D4',
    pointerEvents: 'none',
    zIndex: 6,
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    borderRadius: 999,
    padding: '10px 18px',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.22em',
    color: 'rgba(255,255,255,0.92)',
  },
  reacquireVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Light on purpose: the player must SEE the (re-randomised) slab to
    // re-acquire it — this dims rather than hides.
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
    zIndex: 9,
  },
  pauseTitle: {
    fontSize: 30,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  pauseSub: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
};

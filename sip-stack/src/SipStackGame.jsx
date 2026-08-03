// SipStackGame.jsx — "SIP Stack": a timing tower where the tower is a corpus.
//
// A SIP slab slides above the tower on a linear back-and-forth track. TAP to
// drop it: the overlap with the block below is kept, the overhang shears off
// and tumbles away. The shrinking footprint IS the health bar AND the size of
// every future instalment. 40 layers = the Retirement Corpus summit.
//
// Geometry contract
// -----------------
// Every polygon drawn here comes from stack.js slabFaces(), and every drop is
// judged on the same [x, x + w] footprint. scripts/balance.mjs asserts the two
// bounding boxes are identical at every width the game can produce. Before that
// contract existed the slab was drawn 10 logical px wider than it collided, so
// a drop that visibly landed on the block was scored as hanging off it.
//
// Fairness contract
// -----------------
// * The drop is judged at the pointerdown timestamp: the kit input calls
//   onDown synchronously inside the DOM pointerdown handler, and the slab
//   phase is extrapolated from the last physics tick to that instant, so input
//   latency never eats a perfect. Never judged on click/pointerup.
// * Exactly one drop is accepted per slab, and input is locked for 200ms
//   after each placement (spawn animation).
// * Anti-pause-scum: the kit auto-pauses on visibilitychange. On resume the
//   world stays frozen behind a visible 3-2-1 re-acquire countdown AND the
//   moving slab's phase is re-randomised, so pausing to line up a drop yields
//   zero aiming information.
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
import {
  slabFaces,
  trackFor,
  crossSecondsFor,
  advancePhase,
  slabXAt,
  resolveDrop,
  regrow,
  contributionFor,
  growCorpus,
  layerValue,
  maturityOf,
  weakestRow,
} from './stack.js';

/* ---------------------------------------------------------------- helpers */

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
  const growthElRef = useRef(null);
  const layerElRef = useRef(null);
  const railFillRef = useRef(null);
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

  // Milestone ticks on the progression rail — one per goal, placed by layer.
  const milestoneRows = Object.keys(cfg.milestones).map(Number).sort((a, b) => a - b);

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
      tower: [], // [{x, w, label, contribution}] — index = row (0 = foundation)
      layers: 0, // placed SIP layers; survives the collapse the tower does not
      moving: null, // {active, phase, cross, minX, maxX, w, spawnT}
      dropArmed: false,
      inputLock: 0, // spawn lock
      resumeLock: 0, // post-freeze live lock (taps refused, world running)
      freezeLeft: 0, // re-acquire freeze (world + slab frozen)
      pausedMid: false,
      lastTickWall: performance.now(),

      corpus: 0, // future value of every SIP already in the tower
      contributed: 0, // what was actually paid in
      corpusShown: 0,
      shownScore: -1,
      shownGrowth: '',
      shownLayer: -1,
      shownCount: -2,
      shownStreak: -1,
      shownBanner: null,
      perfects: 0,
      streak: 0,
      firstContribution: 0,

      camY: 0,
      camFrom: 0,
      camTo: 0,
      camT: 1,
      pulseT: 0,
      pulseX: 0,
      pulseY: 0,
      waveT: 0, // gold "everything you own just grew" sweep

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

    for (let i = 0; i < 10; i++) {
      s.chunks.push({ alive: false, x: 0, y: 0, w: 0, hue: 0, vx: 0, vy: 0, rot: 0, vrot: 0 });
      s.rings.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, r1: 60, intensity: 1 });
    }

    fit();

    // Star field, built once. p is the parallax rate: distant stars drift least.
    s.stars = [];
    for (let i = 0; i < 46; i++) {
      s.stars.push({
        x: Math.random() * cfg.logicalWidth,
        y: Math.random() * view.LH,
        r: Math.random() < 0.7 ? 1 : 1.6,
        a: 0.16 + Math.random() * 0.36,
        p: 0.12 + Math.random() * 0.3,
      });
    }

    // Foundation slab: centred. Row 0 — not itself a SIP, the ground you build on.
    s.tower.push({ x: (view.LW - s.originalW) / 2, w: s.originalW, label: null, contribution: 0 });

    /* --- colour ----------------------------------------------------------
       A block's hue is a function of its AGE, not its index: it is placed brand
       blue and ripens toward gold as more SIPs land on top of it. The tower
       therefore matures visibly from the base up while you play, which is what
       compounding looks like from the outside. Quantised so the gradient cache
       stays small. */
    const hueForRow = (row) => {
      const m = maturityOf(s.layers - row, cfg);
      const raw = cfg.slabHueStart + (cfg.slabHueMature - cfg.slabHueStart) * m;
      return Math.round(raw / 4) * 4;
    };

    /* --- world ops -------------------------------------------------------- */

    const rowTopY = (row) => s.baseY - (row + 1) * bh;

    function spawnMoving() {
      const top = s.tower[s.tower.length - 1];
      const w = top.w;
      const layerNum = s.layers + 1;
      const track = trackFor(top.x, top.w, w, view.LW, cfg.trackEdgePx);
      const cross = crossSecondsFor(track.maxX - track.minX, layerNum, cfg);
      s.moving = {
        active: true,
        // Random phase AND direction: the rhythm can never be memorised.
        phase: Math.random() * 2 * cfg.spawnPhaseMaxFrac + (Math.random() < 0.5 ? 0 : 1),
        cross,
        minX: track.minX,
        maxX: track.maxX,
        w,
        spawnT: 0,
      };
      s.inputLock = cfg.spawnLockSeconds;
      s.dropArmed = true;
    }

    function spawnChunk(x, y, w, hue, side, vy0) {
      let c = s.chunks.find((cand) => !cand.alive);
      if (!c) {
        if (s.chunks.length >= 40) c = s.chunks[0];
        else {
          c = {};
          s.chunks.push(c);
        }
      }
      c.alive = true;
      c.x = x;
      c.y = y;
      c.w = Math.max(4, w);
      c.hue = hue;
      c.vx = side * cfg.chunkKickVx * (0.5 + Math.random() * 0.9);
      c.vy = vy0 === undefined ? -30 - Math.random() * 40 : vy0;
      c.rot = 0;
      c.vrot = side * (0.8 + Math.random() * cfg.chunkSpinMax);
    }

    function flashRing(x, y, intensity) {
      const r = s.rings.find((cand) => !cand.alive) || s.rings[0];
      r.alive = true;
      r.x = x;
      r.y = y;
      r.maxLife = 0.45;
      r.life = r.maxLife;
      r.r1 = 54 + Math.min(8, intensity) * 7;
      r.intensity = intensity;
    }

    function retargetCamera() {
      const target = Math.max(0, (s.layers + 2) * bh - s.baseY + view.LH * cfg.cameraTopMarginFrac);
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
      const score = Math.round(s.corpus);
      const prevBest = readBest(cfg);
      const best = Math.max(prevBest, score);
      writeBest(cfg, best);
      (won ? onWinRef.current : onLoseRef.current)?.({
        score,
        layers: s.layers,
        targetLayers: cfg.targetLayers,
        perfects: s.perfects,
        contributed: Math.round(s.contributed),
        // The compounding claim, in the player's own numbers: what their FIRST
        // instalment is worth now versus what their last one added.
        firstLayerValue: Math.round(layerValue(s.firstContribution, Math.max(0, s.layers - 1), cfg)),
        firstLayerPaid: Math.round(s.firstContribution),
        lastLayerValue: Math.round(s.tower.length > 1 ? s.tower[s.tower.length - 1].contribution : 0),
        prevBest,
        best,
      });
    }

    function beginWin() {
      s.state = 'winAnim';
      s.winT = 0;
      const rows = s.tower.length;
      const towerH = rows * bh + 70;
      const zf = Math.min(1, (view.LH - 190) / towerH);
      const towerMidY = s.baseY - (rows * bh) / 2;
      s.winFrom = { sc: 1, ox: 0, oy: s.camY };
      s.winTo = {
        sc: zf,
        ox: (view.LW / 2) * (1 - zf),
        oy: view.LH * 0.54 - towerMidY * zf,
      };
      audio.victory();
      haptic('success');
      s.endTimer = setTimeout(() => endRun(true), cfg.winHoldSeconds * 1000);
    }

    /**
     * The run ends, and the tower ends with it. The missed slab falls past, then
     * the tower shears at its narrowest recent layer and everything above it
     * goes over the side — the weak layer you let through is the one that brings
     * the corpus down.
     */
    function beginLose(slabX, slabW, row) {
      s.state = 'loseAnim';
      s.dropArmed = false;
      if (s.moving) s.moving.active = false;
      spawnChunk(slabX, rowTopY(row), slabW, hueForRow(row), Math.random() < 0.5 ? -1 : 1, -40);

      if (s.tower.length > 2) {
        const wr = weakestRow(s.tower, cfg.collapseScanRows);
        const doomed = s.tower.splice(wr);
        for (let i = 0; i < doomed.length; i++) {
          const b = doomed[i];
          spawnChunk(b.x, rowTopY(wr + i), b.w, hueForRow(wr + i), i % 2 === 0 ? 1 : -1, -60 - i * 18);
        }
        // Ride the camera down to the wreckage so the player sees what is left,
        // rather than staring at the empty sky the tower used to occupy.
        s.camFrom = s.camY;
        s.camTo = Math.max(0, (s.tower.length + 1) * bh - s.baseY + view.LH * cfg.cameraTopMarginFrac);
        s.camT = 0;
      }
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

      const drop = resolveDrop(top, judgedX, m.w, cfg);
      if (drop.outcome === 'miss') {
        beginLose(judgedX, m.w, row);
        return;
      }

      const yTop = rowTopY(row);
      const layerNum = row;
      const label = layerNum % cfg.milestoneEvery === 0 ? cfg.milestones[layerNum] || null : null;

      let { x: newX, w: newW } = drop;
      const perfect = drop.outcome === 'perfect';

      if (perfect) {
        s.streak += 1;
        s.perfects += 1;
        const g = regrow(newX, newW, s.originalW, s.streak, cfg);
        newX = g.x;
        newW = g.w;
      } else {
        s.streak = 0; // pitch ladder resets on any trim
        spawnChunk(drop.shear.x, yTop, drop.shear.w, hueForRow(layerNum), drop.shear.side);
      }

      // The SIP itself: a sloppy layer is a smaller instalment for the rest of
      // the run, not merely a thinner block.
      const contribution = contributionFor(newW, s.originalW, perfect, cfg);
      const growthGain = s.corpus * cfg.growthPerLayer;
      s.corpus = growCorpus(s.corpus, contribution, cfg);
      s.contributed += contribution;
      s.layers = layerNum;
      if (layerNum === 1) s.firstContribution = contribution;
      s.tower.push({ x: newX, w: newW, label, contribution });

      /* --- feedback ---------------------------------------------------- */
      if (perfect) {
        flashRing(top.x + top.w / 2, yTop + cfg.slabDepth, s.streak);
        audio.combo(s.streak); // note rises one pitch step per consecutive perfect
        fx.burst({
          x: newX + newW / 2,
          y: yTop + bh / 2,
          count: 8 + Math.min(8, s.streak * 2),
          color: '#FFFFFF',
          speed: 110,
          gravity: 60,
          size: 2.5,
          life: 0.5,
        });
        fx.floatText(newX + newW / 2, yTop - 14, `PERFECT +${contribution}`, COLORS.gold, 14);
        haptic('light');
      } else {
        const shearX = drop.shear.side < 0 ? newX : newX + newW;
        fx.burst({
          x: shearX,
          y: yTop + bh / 2,
          count: 10,
          color: `hsl(${hueForRow(layerNum)}, 70%, 74%)`,
          speed: 130,
          gravity: 500,
          size: 2.5,
          life: 0.55,
        });
        audio.hit();
        fx.addShake(2.5);
        fx.floatText(newX + newW / 2, yTop - 12, `+${contribution}`, '#FFFFFF', 14);
        haptic('light');
      }

      // Growth is the point, so it gets its own number: early on this is 0 and
      // the instalment is everything; by the summit it dwarfs the instalment.
      if (growthGain >= 1) {
        const gutter = s.tower[0].x / 2;
        fx.floatText(gutter, yTop + 34, `growth +${Math.round(growthGain)}`, COLORS.gold, 12);
      }

      // Presentation: camera rise, growth wave, hue drift, pulse.
      retargetCamera();
      s.waveT = cfg.growthWaveSeconds;
      s.bgHue = 222 - s.layers * cfg.bgHueDriftPerBlock;
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

      if (s.layers >= cfg.targetLayers) beginWin();
      else spawnMoving();
    }

    /* --- update ----------------------------------------------------------- */

    const update = (dt) => {
      fx.update(dt);
      s.corpusShown = damp(s.corpusShown, s.corpus, 8, dt);

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

      if (s.camT < cfg.cameraLerpSeconds) {
        s.camT = Math.min(cfg.cameraLerpSeconds, s.camT + dt);
        const t = Easing.outCubic(s.camT / cfg.cameraLerpSeconds);
        s.camY = s.camFrom + (s.camTo - s.camFrom) * t;
      }
      if (s.pulseT > 0) s.pulseT = Math.max(0, s.pulseT - dt);
      if (s.waveT > 0) s.waveT = Math.max(0, s.waveT - dt);

      s.bgHueShown = damp(s.bgHueShown, s.bgHue, 6, dt);
      if (Math.abs(s.bgHueShown - s.bgBuiltHue) > 0.5) s.bgDirty = true;

      // Moving slab — position is a pure function of phase, so the pointerdown
      // extrapolation below lands exactly where the renderer put it.
      const m = s.moving;
      if (s.state === 'play' && m && m.active) {
        if (m.spawnT < cfg.spawnLockSeconds) m.spawnT += dt;
        m.phase = advancePhase(m.phase, dt, m.cross);
      }
      s.lastTickWall = performance.now();

      for (const c of s.chunks) {
        if (!c.alive) continue;
        c.vy += 1500 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vrot * dt;
        if (c.y + s.camY > view.LH + 200) c.alive = false;
      }

      for (const r of s.rings) {
        if (!r.alive) continue;
        r.life -= dt;
        if (r.life <= 0) r.alive = false;
      }

      if (s.state === 'winAnim') {
        s.winT += dt;
        s.confettiAcc += dt;
        while (s.confettiAcc > 0.11) {
          s.confettiAcc -= 0.11;
          fx.burst({
            x: view.LW * (0.12 + Math.random() * 0.76),
            y: s.baseY - Math.random() * s.tower.length * bh,
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
        gTop.addColorStop(0, `hsl(${hue}, 62%, 66%)`);
        gTop.addColorStop(1, `hsl(${hue}, 64%, 54%)`);
        const gFront = ctx.createLinearGradient(0, 0, 0, bh);
        gFront.addColorStop(0, `hsl(${hue}, 64%, 48%)`);
        gFront.addColorStop(1, `hsl(${hue}, 68%, 32%)`);
        p = { gTop, gFront, side: `hsl(${hue}, 64%, 24%)` };
        if (s.paintCache.size > 160) s.paintCache.clear();
        s.paintCache.set(key, p);
      }
      return p;
    }

    const tracePoly = (pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    };

    /**
     * One slab, drawn from stack.js slabFaces() — the same vertices the balance
     * gate measures against the collision box. Nothing here may add width.
     */
    function drawSlab(x, yTop, w, hue, label, withShadow, maturity) {
      const f = slabFaces(w, bh, cfg.slabDepth, cfg.slabShear);
      const p = getPaint(w, hue);
      const d = Math.min(cfg.slabDepth, bh * 0.5);
      ctx.save();
      ctx.translate(x, yTop);

      if (withShadow && !s.lowDetail) {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
      }
      ctx.fillStyle = p.gFront;
      tracePoly(f.front);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = p.side;
      tracePoly(f.side);
      ctx.fill();

      ctx.fillStyle = p.gTop;
      tracePoly(f.top);
      ctx.fill();

      // Crisp front edge of the landing surface.
      ctx.strokeStyle = 'rgba(255,255,255,0.30)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, d);
      ctx.lineTo(w - Math.min(cfg.slabShear, w * 0.5), d);
      ctx.stroke();

      // Compounded layers carry a gold seam that brightens as they mature —
      // the block you placed twenty SIPs ago is visibly not the block you just
      // placed, which is the entire difference between a corpus and a pile.
      if (maturity > 0.02) {
        ctx.strokeStyle = `rgba(255,200,69,${(0.15 + 0.6 * maturity).toFixed(3)})`;
        ctx.lineWidth = 1 + 1.4 * maturity;
        ctx.beginPath();
        ctx.moveTo(1, bh - 2);
        ctx.lineTo(w - Math.min(cfg.slabShear, w * 0.5) - 1, bh - 2);
        ctx.stroke();
      }

      if (label) {
        const stripeW = Math.min(w - 8, 104);
        if (stripeW > 42) {
          const sx = (w - Math.min(cfg.slabShear, w * 0.5) - stripeW) / 2;
          const sy = d + 3;
          const shh = bh - d - 6;
          const r = 4;
          ctx.fillStyle = 'rgba(242,101,34,0.94)';
          // Hand-rolled: ctx.roundRect only exists from Safari 16.4, and a throw
          // in the render loop is a black canvas, not a missing corner radius.
          ctx.beginPath();
          ctx.moveTo(sx + r, sy);
          ctx.lineTo(sx + stripeW - r, sy);
          ctx.quadraticCurveTo(sx + stripeW, sy, sx + stripeW, sy + r);
          ctx.lineTo(sx + stripeW, sy + shh - r);
          ctx.quadraticCurveTo(sx + stripeW, sy + shh, sx + stripeW - r, sy + shh);
          ctx.lineTo(sx + r, sy + shh);
          ctx.quadraticCurveTo(sx, sy + shh, sx, sy + shh - r);
          ctx.lineTo(sx, sy + r);
          ctx.quadraticCurveTo(sx, sy, sx + r, sy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = "800 9px 'Poppins', system-ui, sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label.toUpperCase(), sx + stripeW / 2, d + (bh - d) / 2 + 0.5);
        }
      }
      ctx.restore();
    }

    /**
     * The drop guide: what the footprint rule is about to do, drawn before it
     * happens. The kept strip is lit on the landing surface, the overhang is
     * struck through in orange, and the centre line goes gold inside the perfect
     * window. It is drawn from the same footprints the drop is judged on, so it
     * cannot promise something the rules will not honour.
     */
    function drawGuide(top, m, mx) {
      const surfaceY = rowTopY(s.tower.length - 1);
      const d = Math.min(cfg.slabDepth, bh * 0.5);
      const lo = Math.max(mx, top.x);
      const hi = Math.min(mx + m.w, top.x + top.w);

      if (hi - lo > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.fillRect(lo, surfaceY, hi - lo, d);
      }
      // Overhang, marked on the moving slab's own row.
      const slabY = rowTopY(s.tower.length);
      ctx.fillStyle = 'rgba(242,101,34,0.42)';
      if (mx < top.x) ctx.fillRect(mx, slabY + bh - 4, Math.min(top.x, mx + m.w) - mx, 4);
      if (mx + m.w > top.x + top.w) {
        const from = Math.max(mx, top.x + top.w);
        ctx.fillRect(from, slabY + bh - 4, mx + m.w - from, 4);
      }

      // Centre line: the alignment cue, gold when the drop would be perfect.
      const window = Math.max(cfg.perfectWindowPx, cfg.perfectWindowFrac * m.w);
      const on = Math.abs(mx - top.x) <= window;
      ctx.save();
      ctx.strokeStyle = on ? 'rgba(255,200,69,0.95)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = on ? 2 : 1;
      ctx.setLineDash(on ? [] : [3, 5]);
      const cx = top.x + top.w / 2;
      ctx.beginPath();
      ctx.moveTo(cx, slabY + bh);
      ctx.lineTo(cx, surfaceY + d);
      ctx.stroke();
      ctx.restore();
    }

    const render = () => {
      const LW = view.LW;
      const LH = view.LH;
      ctx.setTransform(view.dpr * view.k, 0, 0, view.dpr * view.k, 0, 0);

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

      // Parallax star field, drawn in screen space and wrapped, so the sky the
      // tower has yet to fill reads as sky rather than as dead layout.
      if (!s.lowDetail) {
        for (let i = 0; i < s.stars.length; i++) {
          const st = s.stars[i];
          const y = (st.y + s.camY * st.p) % LH;
          ctx.globalAlpha = st.a;
          ctx.fillStyle = '#CFE3FF';
          ctx.fillRect(st.x, y < 0 ? y + LH : y, st.r, st.r);
        }
        ctx.globalAlpha = 1;
      }

      fx.beginCamera(ctx); // screen shake

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

      if (s.pulseT > 0) {
        const p = 1 + (cfg.pulseScale - 1) * Easing.outQuad(s.pulseT / cfg.pulseSeconds);
        ctx.translate(s.pulseX, s.pulseY);
        ctx.scale(p, p);
        ctx.translate(-s.pulseX, -s.pulseY);
      }

      // The goal ladder: every milestone drawn at the height you will reach it,
      // so the empty sky above a short tower is the climb ahead rather than
      // wasted screen. You pass through each rung as you place its layer.
      const ground = s.tower[0];
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let k = 0; k < milestoneRows.length; k++) {
        const M = milestoneRows[k];
        // Skip the rung you are about to land on: its line sits exactly where
        // the moving slab is drawn, and the label fights the milestone band.
        if (M <= s.layers + 1) continue;
        const y = rowTopY(M);
        const screenY = y * sc + oy;
        if (screenY < -20 || screenY > LH + 20) continue;
        const near = M - s.layers <= cfg.milestoneEvery;
        ctx.globalAlpha = near ? 0.6 : 0.28;
        ctx.strokeStyle = near ? 'rgba(255,200,69,0.9)' : 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(ground.x - 34, y);
        ctx.lineTo(ground.x + ground.w + 34, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = near ? 'rgba(255,200,69,0.95)' : 'rgba(255,255,255,0.75)';
        ctx.font = "800 8px 'Poppins', system-ui, sans-serif";
        ctx.fillText(`${cfg.milestones[M].toUpperCase()}  ·  L${M}`, ground.x + ground.w / 2, y - 5);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Ground plinth + soft contact shadow.
      const base = s.tower[0];
      if (base && s.baseY + oy < LH + 60) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath();
        ctx.ellipse(base.x + base.w / 2, s.baseY + 20, base.w * 0.85, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(10,22,48,0.95)';
        ctx.fillRect(base.x - 20, s.baseY, base.w + 40, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(base.x - 20, s.baseY, base.w + 40, 2);
      }

      // Tower — bottom to top, culled outside the view.
      for (let i = 0; i < s.tower.length; i++) {
        const b = s.tower[i];
        const yTop = rowTopY(i);
        const screenY = yTop * sc + oy;
        if (screenY > LH + 80 || screenY < -80) continue;
        drawSlab(b.x, yTop, b.w, hueForRow(i), b.label, i === s.tower.length - 1,
          maturityOf(s.layers - i, cfg));
      }

      // Growth wave: on every placement a gold band washes DOWN the tower —
      // everything already invested just grew, and you can see which part.
      if (s.waveT > 0 && s.tower.length > 1) {
        const t = 1 - s.waveT / cfg.growthWaveSeconds;
        const fromY = rowTopY(s.tower.length - 1);
        const toY = s.baseY;
        const y = fromY + (toY - fromY) * Easing.outCubic(t);
        const a = (1 - t) * 0.55;
        ctx.save();
        ctx.globalAlpha = a;
        const g = ctx.createLinearGradient(0, y - 22, 0, y + 8);
        g.addColorStop(0, 'rgba(255,200,69,0)');
        g.addColorStop(0.7, 'rgba(255,200,69,0.9)');
        g.addColorStop(1, 'rgba(255,200,69,0)');
        ctx.fillStyle = g;
        ctx.fillRect(base.x - 26, y - 22, base.w + 52, 30);
        ctx.restore();
      }

      // Sheared and toppling debris.
      for (const c of s.chunks) {
        if (!c.alive) continue;
        ctx.save();
        ctx.translate(c.x + c.w / 2, c.y + bh / 2);
        ctx.rotate(c.rot);
        ctx.translate(-(c.x + c.w / 2), -(c.y + bh / 2));
        ctx.globalAlpha = 0.95;
        drawSlab(c.x, c.y, c.w, c.hue, null, false, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Moving slab + its landing guide.
      const m = s.moving;
      if (m && m.active) {
        const top = s.tower[s.tower.length - 1];
        const mx = slabXAt(m.phase, m.minX, m.maxX);
        const yTop = rowTopY(s.tower.length);
        const st = Math.min(1, m.spawnT / cfg.spawnLockSeconds);
        if (st >= 1) drawGuide(top, m, mx);
        const scale = 0.94 + 0.06 * Easing.outBack(st);
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * st;
        ctx.translate(mx + m.w / 2, yTop + bh / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(mx + m.w / 2), -(yTop + bh / 2));
        const next = s.layers + 1;
        const nextLabel = next % cfg.milestoneEvery === 0 ? cfg.milestones[next] || null : null;
        drawSlab(mx, yTop, m.w, cfg.slabHueStart, nextLabel, true, 0);
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

      // Top scrim so the HUD always reads over a tall tower.
      const scrim = ctx.createLinearGradient(0, 0, 0, 92);
      scrim.addColorStop(0, 'rgba(6,12,26,0.78)');
      scrim.addColorStop(1, 'rgba(6,12,26,0)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, LW, 92);

      /* --- HUD straight to the DOM (no per-frame React renders) ---------- */
      const shown = Math.round(s.corpusShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString('en-IN');
        const mult = s.contributed > 0 ? `x${(s.corpus / s.contributed).toFixed(2)}` : 'x1.00';
        if (mult !== s.shownGrowth) {
          s.shownGrowth = mult;
          if (growthElRef.current) growthElRef.current.textContent = mult;
        }
      }
      if (s.layers !== s.shownLayer) {
        s.shownLayer = s.layers;
        if (layerElRef.current) layerElRef.current.textContent = `${s.layers} / ${cfg.targetLayers}`;
        if (railFillRef.current) {
          railFillRef.current.style.height = `${(s.layers / cfg.targetLayers) * 100}%`;
        }
      }
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
      // inside the DOM pointerdown event. The slab phase is extrapolated from
      // the last physics tick to this exact instant so the judgment matches
      // what the thumb saw, not the next animation frame.
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
        m.phase = advancePhase(m.phase, extra, m.cross);
        dropAt(slabXAt(m.phase, m.minX, m.maxX));
      },
    });

    /* --- loop -------------------------------------------------------------- */

    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      // Untimed: the speed ramp itself bounds the session (~45–70s).
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (s.ended || s.state !== 'play') return;
        if (isPaused) {
          s.pausedMid = true;
        } else if (s.pausedMid) {
          s.pausedMid = false;
          // MANDATORY anti-pause-scum: hold the world behind a visible 3-2-1
          // re-acquire countdown AND re-randomise the slab's phase so pausing
          // yields zero aiming information.
          s.freezeLeft = cfg.reacquireFreezeSeconds;
          if (s.moving && s.moving.active) s.moving.phase = Math.random() * 2;
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
          <div style={styles.corpusBlock}>
            <span style={styles.hudLabel}>Corpus</span>
            <div style={styles.corpusRow}>
              <span ref={scoreElRef} style={styles.corpusValue}>0</span>
              <span ref={growthElRef} style={styles.growthChip}>x1.00</span>
            </div>
          </div>
          <div style={styles.hudRight}>
            <div style={styles.pill}>
              <span style={styles.pillLabel}>Layers</span>
              <span ref={layerElRef} style={styles.pillValue}>0 / {cfg.targetLayers}</span>
            </div>
            {bestUi > 0 && (
              <div style={styles.bestChip}>Best {bestUi.toLocaleString('en-IN')}</div>
            )}
          </div>
        </div>

        {/* Progression rail — goals up the right edge -------------------- */}
        <div style={styles.rail} aria-hidden="true">
          <div style={styles.railTrack}>
            <div ref={railFillRef} style={styles.railFill} />
            {milestoneRows.map((row) => (
              <div key={row} style={{ ...styles.railDot, bottom: `calc(${(row / cfg.targetLayers) * 100}% - 4px)` }} />
            ))}
          </div>
          <div style={styles.railCap}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFC845">
              <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z" />
            </svg>
          </div>
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
            PERFECT x{streakUi}
          </div>
        )}

        {/* Tap hint ------------------------------------------------------ */}
        {hint && !paused && (
          <div style={styles.hintWrap}>
            <div className="ss-hint" style={styles.hint}>TAP TO INVEST THIS SIP</div>
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
            <div style={styles.pauseSub}>Your corpus is waiting</div>
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
  0% { transform: scale(1.35); }
  100% { transform: scale(1); }
}
.ss-streak { transform-origin: left center; }
.ss-streak { animation: ssStreakPop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes ssHintPulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.06); opacity: 1; }
}
.ss-hint { animation: ssHintPulse 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-count, .ss-banner, .ss-streak, .ss-hint { animation: none !important; }
}
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
    right: 34,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 5,
  },
  corpusBlock: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  hudLabel: {
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  corpusRow: { display: 'flex', alignItems: 'baseline', gap: 6 },
  corpusValue: {
    fontSize: 27,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 2px 10px rgba(0,0,0,0.6)',
  },
  growthChip: {
    fontSize: 10.5,
    fontWeight: 900,
    color: '#FFC845',
    background: 'rgba(255,200,69,0.14)',
    border: '1px solid rgba(255,200,69,0.34)',
    borderRadius: 999,
    padding: '2px 7px',
    letterSpacing: '0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  hudRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 },
  pill: {
    ...glass,
    borderRadius: 999,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  pillLabel: {
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
  pillValue: {
    fontSize: 14,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
  },
  bestChip: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,200,69,0.85)',
  },
  rail: {
    position: 'absolute',
    right: 10,
    top: 74,
    bottom: 30,
    width: 14,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  railCap: { order: -1, marginBottom: 4, opacity: 0.9 },
  railTrack: {
    position: 'relative',
    flex: 1,
    width: 5,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'visible',
  },
  railFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '0%',
    borderRadius: 999,
    // Fixed two-stop gradient: a percentage-height element re-scales its own
    // gradient, so a three-stop ramp showed the whole spectrum in a 4px sliver.
    background: 'linear-gradient(180deg, #FFC845 0%, #F26522 100%)',
    transition: 'height 0.25s ease-out',
  },
  railDot: {
    position: 'absolute',
    left: -2.5,
    width: 9,
    height: 9,
    borderRadius: 999,
    background: 'rgba(11,18,33,0.9)',
    border: '1.5px solid rgba(255,255,255,0.45)',
  },
  banner: {
    position: 'absolute',
    top: 62,
    left: '50%',
    transform: 'translateX(-50%)',
    ...glass,
    background: 'rgba(242,101,34,0.24)',
    border: '1px solid rgba(255,200,69,0.45)',
    borderRadius: 999,
    padding: '8px 16px',
    fontSize: 12.5,
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
    top: 74,
    left: 12,
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
    bottom: 30,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    borderRadius: 999,
    padding: '10px 18px',
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: '0.2em',
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

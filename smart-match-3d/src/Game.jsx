// Game.jsx — Smart Match 3D core engine.
// A scattered, layered pile of life-goal tokens rendered on an HTML5 canvas.
// Tap an uncovered token to send it to a 7-slot tray; three identical tokens
// auto-merge with particles + synth SFX. Clear all 20 triplets inside 2:00.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME_CONFIG, GOALS, GOAL_BY_ID, tokenDataUri } from './data.js';

/* ─────────────────────────────────────────────────────────────
   Web Audio synth SFX (no audio files, lazy AudioContext)
   ───────────────────────────────────────────────────────────── */
let audioCtx = null;
function getCtx() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone({ freq = 440, to = null, dur = 0.15, type = 'sine', vol = 0.14, delay = 0 }) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SFX = {
  tap: () => tone({ freq: 1000, dur: 0.05, type: 'sine', vol: 0.08 }),
  place: () => tone({ freq: 420, to: 560, dur: 0.09, type: 'triangle', vol: 0.12 }),
  merge: (combo = 1) => {
    const base = 1 + Math.min(combo - 1, 4) * 0.12;
    tone({ freq: 400 * base, dur: 0.09, type: 'sine', vol: 0.15 });
    tone({ freq: 600 * base, dur: 0.1, type: 'sine', vol: 0.15, delay: 0.07 });
    tone({ freq: 800 * base, dur: 0.16, type: 'sine', vol: 0.16, delay: 0.14 });
  },
  booster: () => {
    tone({ freq: 523, dur: 0.14, type: 'triangle', vol: 0.13 });
    tone({ freq: 659, dur: 0.14, type: 'triangle', vol: 0.13, delay: 0.05 });
    tone({ freq: 784, dur: 0.2, type: 'triangle', vol: 0.13, delay: 0.1 });
  },
  danger: () => tone({ freq: 220, to: 180, dur: 0.12, type: 'square', vol: 0.05 }),
  lose: () => {
    tone({ freq: 200, to: 100, dur: 0.4, type: 'sawtooth', vol: 0.14 });
    tone({ freq: 150, to: 70, dur: 0.55, type: 'sawtooth', vol: 0.1, delay: 0.18 });
  },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.15, delay: i * 0.11 }),
    );
  },
  tick: () => tone({ freq: 1400, dur: 0.03, type: 'sine', vol: 0.05 }),
};

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate layered scatter positions inside the board rect. */
function generatePositions(count, rect, S) {
  const layerShare = [0.3, 0.25, 0.2, 0.15, 0.1];
  const counts = [];
  let assigned = 0;
  for (let i = 0; i < layerShare.length; i++) {
    const n = i === layerShare.length - 1 ? count - assigned : Math.round(count * layerShare[i]);
    counts.push(n);
    assigned += n;
  }
  const positions = [];
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  for (let z = 0; z < counts.length; z++) {
    // Higher layers cluster toward the centre — a rounded 3D-ish mound.
    const spreadX = (rect.w / 2 - S / 2) * (1 - z * 0.13);
    const spreadY = (rect.h / 2 - S / 2) * (1 - z * 0.13);
    const placed = [];
    for (let i = 0; i < counts[z]; i++) {
      let best = null;
      let bestDist = -1;
      // Poisson-ish sampling: keep the candidate furthest from same-layer neighbours.
      for (let attempt = 0; attempt < 14; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const x = cx + Math.cos(a) * r * spreadX;
        const y = cy + Math.sin(a) * r * spreadY;
        let d = Infinity;
        for (let k = 0; k < placed.length; k++) {
          const dx = placed[k].x - x;
          const dy = placed[k].y - y;
          d = Math.min(d, dx * dx + dy * dy);
        }
        if (d > bestDist) {
          bestDist = d;
          best = { x, y };
        }
      }
      placed.push(best);
      positions.push({ x: best.x, y: best.y, z, rot: rand(-0.16, 0.16) });
    }
  }
  return shuffleArr(positions);
}

/* ─────────────────────────────────────────────────────────────
   Sprite atlas — rasterize the inline-SVG tokens to offscreen
   canvases (bright + dimmed variants) for crisp 60fps blitting.
   ───────────────────────────────────────────────────────────── */
function loadSprites(px) {
  const jobs = GOALS.map(
    (goal) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const bright = document.createElement('canvas');
          bright.width = px;
          bright.height = px;
          const bc = bright.getContext('2d');
          bc.drawImage(img, 0, 0, px, px);

          const dim = document.createElement('canvas');
          dim.width = px;
          dim.height = px;
          const dc = dim.getContext('2d');
          dc.drawImage(img, 0, 0, px, px);
          dc.globalCompositeOperation = 'source-atop';
          dc.fillStyle = 'rgba(4, 12, 32, 0.62)';
          dc.fillRect(0, 0, px, px);
          resolve([goal.id, { bright, dim }]);
        };
        img.onerror = reject;
        img.src = tokenDataUri(goal);
      }),
  );
  return Promise.all(jobs).then((entries) => Object.fromEntries(entries));
}

/* ─────────────────────────────────────────────────────────────
   Icons for booster buttons (inline SVG, UI chrome — not sprites)
   ───────────────────────────────────────────────────────────── */
const UndoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
  </svg>
);
const ShuffleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </svg>
);
const MagnetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 15a6 6 0 0 0 12 0V4h-4v11a2 2 0 0 1-4 0V4H6z" />
    <path d="M6 8h4M14 8h4" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function SmartMatchGame({ config = GAME_CONFIG, onWin, onLose }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const endedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState({ score: 0, time: config.duration, matches: 0 });
  const boostersRef = useRef({ ...config.boosters });
  const [boosters, setBoosters] = useState({ ...config.boosters });

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  /* ── one-time world setup ───────────────────────────────── */
  useEffect(() => {
    let disposed = false;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const st = {
      ctx,
      W: 0,
      H: 0,
      dpr: 1,
      S: 54, // token draw size (CSS px)
      sprites: null,
      tokens: [], // every token, all states
      tray: [], // tokens currently occupying tray order (fly | tray | merge)
      trayRect: { x: 0, y: 0, w: 0, h: 0, slot: 0 },
      boardRect: { x: 0, y: 0, w: 0, h: 0 },
      particles: [],
      floats: [],
      pendingPulls: 0, // magnet tokens scheduled but not yet in the tray
      shake: { t: 0, dur: 0, power: 0 },
      time: config.duration,
      score: 0,
      matches: 0,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      peakTray: 0,
      lastWhole: config.duration,
      phase: 'play', // play | win | lose
      phaseT: 0,
      hudDirty: true,
    };
    stateRef.current = st;

    function layout() {
      const rectW = wrap.clientWidth;
      const rectH = wrap.clientHeight;
      st.dpr = Math.min(window.devicePixelRatio || 1, 3);
      st.W = rectW;
      st.H = rectH;
      canvas.width = Math.round(rectW * st.dpr);
      canvas.height = Math.round(rectH * st.dpr);
      st.S = clamp(rectW / 6.6, 46, 62);

      const trayH = st.S + 26;
      const trayW = Math.min(rectW - 16, config.traySize * (st.S + 4) + 20);
      st.trayRect = {
        x: (rectW - trayW) / 2,
        y: rectH - trayH - 10,
        w: trayW,
        h: trayH,
        slot: (trayW - 16) / config.traySize,
      };
      st.boardRect = {
        x: 10,
        y: 12,
        w: rectW - 20,
        h: st.trayRect.y - 34,
      };
    }

    function buildBoard() {
      // 20 triplets from 11 goals — every goal appears at least once.
      const typeList = [];
      for (let i = 0; i < config.totalTriplets; i++) {
        typeList.push(GOALS[i % GOALS.length].id);
      }
      const tokenTypes = shuffleArr(typeList.flatMap((t) => [t, t, t]));
      const positions = generatePositions(tokenTypes.length, st.boardRect, st.S);
      st.tokens = tokenTypes.map((type, i) => ({
        id: i,
        type,
        state: 'board', // board | fly | tray | merge | return | gone
        x: positions[i].x,
        y: positions[i].y,
        z: positions[i].z,
        rot: positions[i].rot,
        homeX: positions[i].x,
        homeY: positions[i].y,
        homeZ: positions[i].z,
        homeRot: positions[i].rot,
        covered: false,
        scale: 0,
        spawnT: Math.random() * 0.35, // staggered spawn pop-in
        animT: 0,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
        mergeT: 0,
      }));
      recomputeCovered(st);
    }

    layout();
    const px = Math.round(st.S * st.dpr * 1.1);
    loadSprites(clamp(px, 96, 256)).then((sprites) => {
      if (disposed) return;
      st.sprites = sprites;
      buildBoard();
      setReady(true);
    });

    const onResize = () => {
      const oldBoard = { ...st.boardRect };
      layout();
      // Re-map board token coordinates proportionally into the new rect.
      if (oldBoard.w > 0 && oldBoard.h > 0) {
        for (const t of st.tokens) {
          if (t.state !== 'board') continue;
          t.x = st.boardRect.x + ((t.x - oldBoard.x) / oldBoard.w) * st.boardRect.w;
          t.y = st.boardRect.y + ((t.y - oldBoard.y) / oldBoard.h) * st.boardRect.h;
          t.homeX = t.x;
          t.homeY = t.y;
        }
        reflowTray(st); // slot centres moved with the new tray rect
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── shared mutations ───────────────────────────────────── */

  function recomputeCovered(st) {
    const S = st.S;
    const thresh = S * 0.62;
    const boardTokens = st.tokens.filter((t) => t.state === 'board' || t.state === 'return');
    for (const t of boardTokens) {
      t.covered = false;
      for (const u of boardTokens) {
        if (u === t || u.z <= t.z) continue;
        if (Math.abs(u.x - t.x) < thresh && Math.abs(u.y - t.y) < thresh) {
          t.covered = true;
          break;
        }
      }
    }
  }

  function trayOccupancy(st) {
    // merging tokens are vacating their slots — they do not count.
    return st.tray.filter((t) => t.state !== 'merge').length;
  }

  function slotCenter(st, index) {
    const { x, y, slot } = st.trayRect;
    return { x: x + 8 + slot * index + slot / 2, y: y + st.trayRect.h / 2 + 2 };
  }

  function reflowTray(st) {
    st.tray.forEach((t, i) => {
      const c = slotCenter(st, i);
      t.toX = c.x;
      t.toY = c.y;
    });
  }

  function spawnBurst(st, x, y, goal, n = 14, speed = 210) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(speed * 0.35, speed);
      st.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        size: rand(2.5, 6),
        color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? goal.glow : goal.hi,
        t: 0,
        life: rand(0.45, 0.85),
      });
    }
  }

  function addFloat(st, x, y, text, color = '#FFFFFF', size = 17) {
    st.floats.push({ x, y, text, color, size, t: 0, life: 1.0 });
  }

  function shakeScreen(st, power = 7, dur = 0.3) {
    st.shake = { t: 0, dur, power };
  }

  function endGame(st, didWin) {
    if (endedRef.current) return;
    endedRef.current = true;
    st.phase = didWin ? 'win' : 'lose';
    st.phaseT = 0;
    if (didWin) {
      const timeBonus = Math.round(st.time) * config.timeBonusPerSec;
      const trayBonus = Math.max(0, config.traySize - st.peakTray) * config.trayEffBonus;
      st.score += timeBonus + trayBonus;
      st.finalBreakdown = { timeBonus, trayBonus };
      SFX.win();
      // celebration bursts across the board
      for (let i = 0; i < 5; i++) {
        const g = GOALS[Math.floor(Math.random() * GOALS.length)];
        spawnBurst(st, rand(st.W * 0.2, st.W * 0.8), rand(st.H * 0.2, st.H * 0.55), g, 16, 260);
      }
      addFloat(st, st.W / 2, st.H * 0.4, 'ALL GOALS SECURED!', '#7CFC9A', 24);
      if (timeBonus > 0) addFloat(st, st.W / 2, st.H * 0.4 + 30, `Time bonus +${timeBonus}`, '#FFD97A', 15);
      if (trayBonus > 0) addFloat(st, st.W / 2, st.H * 0.4 + 54, `Tray bonus +${trayBonus}`, '#9BD3FF', 15);
    } else {
      SFX.lose();
      shakeScreen(st, 10, 0.4);
    }
    st.hudDirty = true;
    const stats = () => ({
      score: st.score,
      matches: st.matches,
      totalTriplets: config.totalTriplets,
      bestCombo: st.bestCombo,
      timeLeft: Math.max(0, Math.round(st.time)),
      timeTaken: config.duration - Math.max(0, Math.round(st.time)),
    });
    setTimeout(() => {
      if (didWin) onWinRef.current?.(stats());
      else onLoseRef.current?.(stats());
    }, didWin ? 1400 : 1000);
  }

  function checkMergeOnLand(st, landed) {
    const same = st.tray.filter((t) => t.state === 'tray' && t.type === landed.type);
    if (same.length >= 3) {
      const trio = same.slice(0, 3);
      const goal = GOAL_BY_ID[landed.type];
      st.combo = st.comboTimer > 0 ? st.combo + 1 : 1;
      st.comboTimer = config.comboWindow;
      st.bestCombo = Math.max(st.bestCombo, st.combo);
      const gained = config.matchScore + config.comboBonus * (st.combo - 1);
      st.score += gained;
      st.matches += 1;
      SFX.merge(st.combo);
      const mid = trio[1];
      spawnBurst(st, mid.x, mid.y - st.S * 0.2, goal, 16);
      addFloat(st, mid.x, mid.y - st.S * 0.85, `+${gained}`, '#FFD97A', 19);
      addFloat(st, mid.x, mid.y - st.S * 1.35, `${goal.label} goal secured!`, goal.glow, 12);
      if (st.combo > 1) addFloat(st, mid.x, mid.y - st.S * 1.75, `Combo x${st.combo}`, '#FF9D5C', 13);
      trio.forEach((t, i) => {
        t.state = 'merge';
        t.mergeT = -i * 0.05; // slight cascade
      });
      st.hudDirty = true;
      return true;
    }
    return false;
  }

  function resolveTrayAfterLanding(st, landed) {
    const merged = checkMergeOnLand(st, landed);
    if (!merged) {
      const occupied = trayOccupancy(st);
      st.peakTray = Math.max(st.peakTray, occupied);
      const inbound = st.tray.filter((t) => t.state === 'fly').length;
      if (occupied >= config.traySize && inbound === 0) {
        addFloat(st, st.W / 2, st.trayRect.y - 26, 'TRAY FULL!', '#FF7B6E', 22);
        endGame(st, false);
      } else if (occupied >= config.traySize - 1) {
        SFX.danger();
        shakeScreen(st, 4, 0.25);
      }
    } else {
      st.peakTray = Math.max(st.peakTray, trayOccupancy(st) + 3); // trio occupied slots pre-merge
    }
    st.hudDirty = true;
    // Win: every token merged.
    if (st.matches >= config.totalTriplets) endGame(st, true);
  }

  function sendToTray(st, token) {
    token.state = 'fly';
    token.animT = 0;
    token.fromX = token.x;
    token.fromY = token.y;
    // insert after the last token of the same type for satisfying grouping
    let insertAt = st.tray.length;
    for (let i = st.tray.length - 1; i >= 0; i--) {
      if (st.tray[i].type === token.type && st.tray[i].state !== 'merge') {
        insertAt = i + 1;
        break;
      }
    }
    st.tray.splice(insertAt, 0, token);
    reflowTray(st);
    recomputeCovered(st);
  }

  /* ── input ──────────────────────────────────────────────── */
  const handlePointer = useCallback((e) => {
    const st = stateRef.current;
    if (!st || !st.sprites || st.phase !== 'play') return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    if (trayOccupancy(st) + st.pendingPulls >= GAME_CONFIG.traySize) return;

    const half = st.S / 2 + 3;
    // top-most first: sort candidates by z desc
    let hit = null;
    for (const t of st.tokens) {
      if (t.state !== 'board' || t.covered) continue;
      if (Math.abs(t.x - px) <= half && Math.abs(t.y - py) <= half) {
        if (!hit || t.z > hit.z) hit = t;
      }
    }
    if (!hit) return;
    SFX.tap();
    sendToTray(st, hit);
  }, []);

  /* ── boosters ───────────────────────────────────────────── */
  function spendBooster(key) {
    boostersRef.current = { ...boostersRef.current, [key]: boostersRef.current[key] - 1 };
    setBoosters(boostersRef.current);
  }

  const useUndo = useCallback(() => {
    const st = stateRef.current;
    if (!st || st.phase !== 'play' || boostersRef.current.undo <= 0) return;
    // last settled tray token goes back to its home spot on the board
    let idx = -1;
    for (let i = st.tray.length - 1; i >= 0; i--) {
      if (st.tray[i].state === 'tray') {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    const token = st.tray[idx];
    st.tray.splice(idx, 1);
    token.state = 'return';
    token.animT = 0;
    token.fromX = token.x;
    token.fromY = token.y;
    token.toX = token.homeX;
    token.toY = token.homeY;
    reflowTray(st);
    st.hudDirty = true;
    SFX.booster();
    addFloat(st, token.homeX, token.homeY - st.S, 'Undo!', '#9BD3FF', 14);
    spendBooster('undo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useShuffle = useCallback(() => {
    const st = stateRef.current;
    if (!st || st.phase !== 'play' || boostersRef.current.shuffle <= 0) return;
    const boardTokens = st.tokens.filter((t) => t.state === 'board');
    if (boardTokens.length < 2) return;
    const positions = generatePositions(boardTokens.length, st.boardRect, st.S);
    boardTokens.forEach((t, i) => {
      t.state = 'return'; // reuse the glide animation
      t.animT = 0;
      t.fromX = t.x;
      t.fromY = t.y;
      t.toX = positions[i].x;
      t.toY = positions[i].y;
      t.homeX = positions[i].x;
      t.homeY = positions[i].y;
      t.z = positions[i].z;
      t.homeZ = positions[i].z;
      t.rot = positions[i].rot;
      t.homeRot = positions[i].rot;
    });
    SFX.booster();
    addFloat(st, st.W / 2, st.boardRect.y + st.boardRect.h / 2, 'Shuffled!', '#FFD97A', 18);
    spendBooster('shuffle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMagnet = useCallback(() => {
    const st = stateRef.current;
    if (!st || st.phase !== 'play' || boostersRef.current.magnet <= 0) return;
    // Prefer completing a type already in the tray; else pull a fresh triple.
    const counts = {};
    for (const t of st.tray) if (t.state === 'tray') counts[t.type] = (counts[t.type] || 0) + 1;
    const boardByType = {};
    for (const t of st.tokens) {
      if (t.state === 'board') (boardByType[t.type] = boardByType[t.type] || []).push(t);
    }
    const occupancy = trayOccupancy(st);
    let pick = null;
    let need = 0;
    const trayTypes = Object.keys(counts).sort((a, c) => counts[c] - counts[a]);
    for (const type of trayTypes) {
      const missing = 3 - counts[type];
      if (missing > 0 && (boardByType[type] || []).length >= missing && occupancy + missing <= config.traySize) {
        pick = type;
        need = missing;
        break;
      }
    }
    if (!pick) {
      for (const type of Object.keys(boardByType)) {
        if (boardByType[type].length >= 3 && occupancy + 3 <= config.traySize) {
          pick = type;
          need = 3;
          break;
        }
      }
    }
    if (!pick) return; // nothing safely pullable — keep the booster
    SFX.booster();
    const goal = GOAL_BY_ID[pick];
    // prefer uncovered/topmost tokens; deepest last
    const candidates = boardByType[pick].sort((x, y) => y.z - x.z).slice(0, need);
    st.pendingPulls += candidates.length;
    candidates.forEach((t, i) => {
      setTimeout(() => {
        const cur = stateRef.current;
        if (!cur) return;
        cur.pendingPulls = Math.max(0, cur.pendingPulls - 1);
        if (t.state === 'board' && cur.phase === 'play') {
          sendToTray(cur, t);
        }
      }, i * 130);
    });
    addFloat(st, st.W / 2, st.trayRect.y - 30, `Magnet: ${goal.label}!`, goal.glow, 15);
    spendBooster('magnet');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── main loop ──────────────────────────────────────────── */
  useEffect(() => {
    if (!ready) return;
    const st = stateRef.current;
    let last = performance.now();

    const step = (now) => {
      rafRef.current = requestAnimationFrame(step);
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);

      /* — update — */
      if (st.phase === 'play') {
        st.time -= dt;
        if (st.time <= 0) {
          st.time = 0;
          addFloat(st, st.W / 2, st.H * 0.4, "TIME'S UP!", '#FF7B6E', 24);
          endGame(st, false);
        }
        const whole = Math.ceil(st.time);
        if (whole !== st.lastWhole) {
          st.lastWhole = whole;
          st.hudDirty = true;
          if (whole <= 10 && whole > 0) SFX.tick();
        }
        if (st.comboTimer > 0) st.comboTimer -= dt;
      } else {
        st.phaseT += dt;
      }

      // tokens
      for (const t of st.tokens) {
        if (t.state === 'gone') continue;
        if (t.spawnT < 1) {
          t.spawnT = Math.min(1, t.spawnT + dt * 2.6);
          t.scale = easeOutBack(clamp(t.spawnT, 0, 1));
        }
        if (t.state === 'fly') {
          t.animT += dt / 0.34;
          const k = clamp(t.animT, 0, 1);
          const e = easeInOut(k);
          // arc: lift up then swoop into the slot
          const mx = (t.fromX + t.toX) / 2;
          const my = Math.min(t.fromY, t.toY) - 70;
          const a = 1 - e;
          t.x = a * a * t.fromX + 2 * a * e * mx + e * e * t.toX;
          t.y = a * a * t.fromY + 2 * a * e * my + e * e * t.toY;
          t.rot = t.homeRot * (1 - e);
          t.scale = 1 + Math.sin(e * Math.PI) * 0.18;
          if (k >= 1) {
            t.state = 'tray';
            t.x = t.toX;
            t.y = t.toY;
            t.rot = 0;
            t.scale = 1;
            SFX.place();
            resolveTrayAfterLanding(st, t);
          }
        } else if (t.state === 'tray') {
          // glide toward (possibly reflowed) slot
          t.x += (t.toX - t.x) * Math.min(1, dt * 14);
          t.y += (t.toY - t.y) * Math.min(1, dt * 14);
        } else if (t.state === 'merge') {
          t.mergeT += dt / 0.3;
          if (t.mergeT >= 1) {
            t.state = 'gone';
            const i = st.tray.indexOf(t);
            if (i >= 0) st.tray.splice(i, 1);
            reflowTray(st);
          }
        } else if (t.state === 'return') {
          t.animT += dt / 0.4;
          const k = clamp(t.animT, 0, 1);
          const e = easeInOut(k);
          t.x = t.fromX + (t.toX - t.fromX) * e;
          t.y = t.fromY + (t.toY - t.fromY) * e;
          if (k >= 1) {
            t.state = 'board';
            t.x = t.toX;
            t.y = t.toY;
            t.rot = t.homeRot;
            recomputeCovered(st);
          }
        }
      }

      // particles
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.t += dt;
        if (p.t >= p.life) {
          st.particles.splice(i, 1);
          continue;
        }
        p.vy += 420 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      // floats
      for (let i = st.floats.length - 1; i >= 0; i--) {
        const f = st.floats[i];
        f.t += dt;
        if (f.t >= f.life) st.floats.splice(i, 1);
      }
      // shake
      if (st.shake.t < st.shake.dur) st.shake.t += dt;

      /* — draw — */
      const { ctx, W, H, S, dpr } = st;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (st.shake.t < st.shake.dur) {
        const decay = 1 - st.shake.t / st.shake.dur;
        ctx.translate(
          (Math.random() - 0.5) * 2 * st.shake.power * decay,
          (Math.random() - 0.5) * 2 * st.shake.power * decay,
        );
      }

      // board plate
      const br = st.boardRect;
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      roundRect(ctx, br.x, br.y, br.w, br.h + 14, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      roundRect(ctx, br.x + 0.5, br.y + 0.5, br.w - 1, br.h + 13, 24);
      ctx.stroke();

      // tray
      drawTray(ctx, st);

      // board tokens sorted by z (deep → top), then flying/merging on top
      const drawList = [];
      for (const t of st.tokens) if (t.state !== 'gone') drawList.push(t);
      drawList.sort((a, b) => {
        const layer = (t) =>
          t.state === 'board' ? t.z : t.state === 'return' ? 10 : t.state === 'tray' ? 20 : 30;
        return layer(a) - layer(b);
      });
      for (const t of drawList) drawToken(ctx, st, t);

      // particles
      for (const p of st.particles) {
        const k = 1 - p.t / p.life;
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // floating texts
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of st.floats) {
        const k = f.t / f.life;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = `900 ${f.size}px Poppins, sans-serif`;
        ctx.fillStyle = f.color;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 6;
        ctx.fillText(f.text, f.x, f.y - k * 34);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // end-phase vignette
      if (st.phase !== 'play') {
        ctx.fillStyle =
          st.phase === 'win' ? 'rgba(10, 40, 20, ' + Math.min(0.35, st.phaseT) + ')' : 'rgba(40, 8, 8, ' + Math.min(0.4, st.phaseT) + ')';
        ctx.fillRect(0, 0, W, H);
      }

      /* — HUD sync (cheap) — */
      if (st.hudDirty) {
        st.hudDirty = false;
        setHud({ score: st.score, time: Math.max(0, Math.ceil(st.time)), matches: st.matches });
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ── canvas draw helpers ────────────────────────────────── */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTray(ctx, st) {
    const tr = st.trayRect;
    const occ = trayOccupancy(st);
    const danger = occ >= GAME_CONFIG.traySize - 1 && st.phase === 'play';
    ctx.fillStyle = 'rgba(6, 16, 40, 0.66)';
    roundRect(ctx, tr.x, tr.y, tr.w, tr.h, 20);
    ctx.fill();
    const pulse = danger ? 0.45 + 0.35 * Math.sin(performance.now() / 130) : 0;
    ctx.strokeStyle = danger
      ? `rgba(239, 68, 68, ${0.55 + pulse * 0.4})`
      : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = danger ? 2.5 : 1.5;
    roundRect(ctx, tr.x + 1, tr.y + 1, tr.w - 2, tr.h - 2, 19);
    ctx.stroke();
    // slots
    for (let i = 0; i < GAME_CONFIG.traySize; i++) {
      const c = slotCenter(st, i);
      const s = tr.slot - 8;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRect(ctx, c.x - s / 2, c.y - s / 2, s, s, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      roundRect(ctx, c.x - s / 2 + 0.5, c.y - s / 2 + 0.5, s - 1, s - 1, 12);
      ctx.stroke();
    }
  }

  function drawToken(ctx, st, t) {
    const sprite = st.sprites?.[t.type];
    if (!sprite) return;
    let size = st.S * (t.scale || 1);
    let alpha = 1;
    if (t.state === 'merge') {
      const k = clamp(t.mergeT, 0, 1);
      size = st.S * (1 + 0.45 * Math.sin(k * Math.PI));
      alpha = 1 - k * k;
    }
    if (t.state === 'tray' || t.state === 'fly' || t.state === 'merge') {
      size *= (st.trayRect.slot - 10) / st.S; // fit slot
      if (t.state === 'fly') size = Math.max(size, st.S * 0.8 * (t.scale || 1));
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(t.x, t.y);
    if (t.rot) ctx.rotate(t.rot);
    const img = t.state === 'board' && t.covered ? sprite.dim : sprite.bright;
    // subtle glow on tappable top-layer tokens
    if (t.state === 'board' && !t.covered && st.phase === 'play') {
      ctx.shadowColor = 'rgba(150, 200, 255, 0.35)';
      ctx.shadowBlur = 10;
    }
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  /* ── HUD ────────────────────────────────────────────────── */
  const mm = Math.floor(hud.time / 60);
  const ss = String(hud.time % 60).padStart(2, '0');
  const timeFrac = hud.time / config.duration;
  const barClass = timeFrac < 0.15 ? 'danger' : timeFrac < 0.35 ? 'warn' : '';

  const boosterDefs = useMemo(
    () => [
      { key: 'undo', label: 'Undo', icon: <UndoIcon />, fn: useUndo },
      { key: 'shuffle', label: 'Shuffle', icon: <ShuffleIcon />, fn: useShuffle },
      { key: 'magnet', label: 'Magnet', icon: <MagnetIcon />, fn: useMagnet },
    ],
    [useUndo, useShuffle, useMagnet],
  );

  return (
    <div className="sm3-game-root">
      <div className="sm3-hud">
        <div className="sm3-chip">
          <span className="sm3-chip-label">Score</span>
          <span className="sm3-chip-value">{hud.score.toLocaleString()}</span>
        </div>
        <div className="sm3-chip">
          <span className="sm3-chip-label">Goals</span>
          <span className="sm3-chip-value">
            {hud.matches}/{config.totalTriplets}
          </span>
        </div>
        <div className="sm3-chip">
          <span className="sm3-chip-label">Time</span>
          <span className={`sm3-chip-value${hud.time <= 15 ? ' danger' : ''}`}>
            {mm}:{ss}
          </span>
        </div>
      </div>
      <div className="sm3-timerbar">
        <div
          className={`sm3-timerbar-fill ${barClass}`}
          style={{ width: `${timeFrac * 100}%` }}
        />
      </div>

      <div className="sm3-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} onPointerDown={handlePointer} />
        {!ready && (
          <div className="sm3-loading">
            <span className="spinner" style={{ width: 22, height: 22 }} />
            Matching goals…
          </div>
        )}
      </div>

      <div className="sm3-boosters">
        {boosterDefs.map((b) => (
          <button
            key={b.key}
            type="button"
            className="sm3-booster-btn"
            onClick={b.fn}
            disabled={!ready || boosters[b.key] <= 0}
            aria-label={`${b.label} booster`}
          >
            {b.icon}
            <span className="sm3-booster-badge">{boosters[b.key]}</span>
            <span className="sm3-booster-label">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

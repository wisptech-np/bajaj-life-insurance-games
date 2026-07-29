// GuardianArenaGame.jsx — Archero-style arena survivor, one rule at the core:
// the guardian auto-fires at the nearest virus blob ONLY while standing still.
// Any joystick input stops the firing, so the whole game is stutter-stepping —
// slide 200–400 ms, plant your feet, let the shield speak, repeat.
//
// Structure mirrors GoalJugglerGame.jsx: mutable state in refs (a 120 Hz sim
// must never re-render React), module-level pure draw functions, an offscreen
// prerendered backdrop rebuilt only on resize, all tunables in data.js, and
// all rules in src/sim.js (this file decides only looks and sounds).
//
// Anti pause-scum (repo-wide rule): the kit loop auto-pauses on visibility
// change; on resume sim.js keeps the world frozen behind the visible 3-2-1
// (freezeLeft) with the session clock held via shouldTickClock, then refuses
// input for one more live beat. See sim.js beginPause/endPause.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import { createSfx } from './sfx.js';
import {
  applyUpgrade,
  beginPause,
  clamp,
  createWorld,
  endPause,
  expireSession,
  isFrozen,
  statsOf,
  stepWorld,
} from './sim.js';

/* ─── Module-level geometry (built once, scaled at draw time) ── */

/** Virus spike ring, unit radius body, spikes reaching 1.32. */
function buildSpikes() {
  const p = new Path2D();
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 0.17;
    p.moveTo(Math.cos(a - w) * 0.92, Math.sin(a - w) * 0.92);
    p.lineTo(Math.cos(a) * 1.32, Math.sin(a) * 1.32);
    p.lineTo(Math.cos(a + w) * 0.92, Math.sin(a + w) * 0.92);
    p.closePath();
  }
  return p;
}

/** Shield emblem, unit scale, centred. */
function buildShield() {
  const p = new Path2D();
  p.moveTo(0, -0.58);
  p.lineTo(0.46, -0.38);
  p.lineTo(0.46, 0.06);
  p.bezierCurveTo(0.46, 0.34, 0.24, 0.5, 0, 0.62);
  p.bezierCurveTo(-0.24, 0.5, -0.46, 0.34, -0.46, 0.06);
  p.lineTo(-0.46, -0.38);
  p.closePath();
  return p;
}

const SPIKES = buildSpikes();
const SHIELD = buildShield();
const DASH_SPAWN = [4, 5];
const DASH_NONE = [];

/* ─── Offscreen backdrop ─────────────────────────────────── */

function makeBackdrop(cfg, scale, dpr) {
  const A = cfg.arena;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(A.width * scale * dpr));
  cv.height = Math.max(1, Math.round(A.height * scale * dpr));
  const c = cv.getContext('2d');
  c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);

  const g = c.createLinearGradient(0, 0, 0, A.height);
  g.addColorStop(0, '#0d1730');
  g.addColorStop(0.5, COLORS.bgMid);
  g.addColorStop(1, '#080f1f');
  c.fillStyle = g;
  c.fillRect(0, 0, A.width, A.height);

  // Soft arena well so the fight reads as lit from the centre.
  const well = c.createRadialGradient(A.width / 2, A.height * 0.46, 40, A.width / 2, A.height * 0.46, A.height * 0.62);
  well.addColorStop(0, 'rgba(30,107,224,0.16)');
  well.addColorStop(1, 'rgba(30,107,224,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, A.width, A.height);

  // Floor grid.
  c.strokeStyle = 'rgba(127,192,255,0.06)';
  c.lineWidth = 1;
  for (let x = 40; x < A.width; x += 40) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, A.height); c.stroke();
  }
  for (let y = 40; y < A.height; y += 40) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(A.width, y); c.stroke();
  }

  // Wall ring: the play boundary the guardian is clamped to.
  const P = A.wallPad;
  c.strokeStyle = 'rgba(127,192,255,0.28)';
  c.lineWidth = 2;
  c.strokeRect(P - 4, P - 4, A.width - 2 * (P - 4), A.height - 2 * (P - 4));
  c.strokeStyle = 'rgba(127,192,255,0.10)';
  c.lineWidth = 6;
  c.strokeRect(P - 9, P - 9, A.width - 2 * (P - 9), A.height - 2 * (P - 9));

  // Corner hazard ticks — a quiet reminder that corners attract fire.
  c.strokeStyle = 'rgba(255,139,139,0.20)';
  c.lineWidth = 1.5;
  const cz = A.cornerZonePx;
  const corners = [[P, P, 1, 1], [A.width - P, P, -1, 1], [P, A.height - P, 1, -1], [A.width - P, A.height - P, -1, -1]];
  for (const [cx, cy, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(cx + sx * cz, cy);
    c.quadraticCurveTo(cx + sx * cz * 0.55, cy + sy * cz * 0.55, cx, cy + sy * cz);
    c.stroke();
  }

  // Edge vignette.
  const vg = c.createRadialGradient(A.width / 2, A.height / 2, A.height * 0.34, A.width / 2, A.height / 2, A.height * 0.72);
  vg.addColorStop(0, 'rgba(2,6,23,0)');
  vg.addColorStop(1, 'rgba(2,6,23,0.55)');
  c.fillStyle = vg;
  c.fillRect(0, 0, A.width, A.height);

  return cv;
}

/** Per-archetype body paints anchored at the origin (no per-frame gradients). */
function buildPaints(ctx, cfg) {
  const mk = (r, lt, mid, deep) => {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.12, 0, 0, r);
    g.addColorStop(0, lt);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, deep);
    return g;
  };
  const E = cfg.enemies;
  return {
    chaser: mk(E.chaser.radius, '#8DF08F', COLORS.virus, '#1D8F2C'),
    mini: mk(E.mini.radius, '#8DF08F', COLORS.virus, '#1D8F2C'),
    shooter: mk(E.shooter.radius, '#B9F0A8', '#63D14E', '#237A1F'),
    splitter: mk(E.splitter.radius, '#7CE9A2', '#35C46A', '#136D31'),
    boss: mk(E.boss.radius, '#6FDF6F', '#2FA63B', '#0E5C1D'),
    player: mk(cfg.player.radius, '#7FC0FF', COLORS.blueBright, '#00246B'),
    vignette: (() => {
      const A = cfg.arena;
      const v = ctx.createRadialGradient(A.width / 2, A.height / 2, A.height * 0.3, A.width / 2, A.height / 2, A.height * 0.66);
      v.addColorStop(0, 'rgba(239,68,68,0)');
      v.addColorStop(1, 'rgba(239,68,68,0.55)');
      return v;
    })(),
  };
}

/* ─── Entity draw functions (programmatic — no emoji, no images) ── */

function drawEnemy(ctx, e, cfg, paints, time, shadows) {
  ctx.save();
  ctx.translate(e.x, e.y);

  const spawning = e.spawnLeft > 0;
  if (spawning) {
    const k = 1 - e.spawnLeft / (cfg.enemies.spawnInSeconds * (e.isBoss ? 1.5 : 1));
    ctx.globalAlpha = 0.25 + 0.5 * k;
    ctx.scale(0.35 + 0.65 * k, 0.35 + 0.65 * k);
    // Materialise ring — the "not dangerous yet" telegraph.
    ctx.setLineDash(DASH_SPAWN);
    ctx.strokeStyle = 'rgba(94,224,122,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash(DASH_NONE);
  }

  // Organic wobble.
  const wob = 1 + 0.045 * Math.sin(time * 5.4 + e.seed);
  ctx.scale(wob, 2 - wob);

  if (shadows && !spawning) {
    ctx.shadowColor = 'rgba(73,226,75,0.65)';
    ctx.shadowBlur = e.isBoss ? 22 : 12;
  }

  const paint = paints[e.type] || paints.chaser;

  // Spike ring then body.
  ctx.fillStyle = e.type === 'splitter' ? '#2AA958' : '#2FBF3F';
  ctx.save();
  ctx.scale(e.radius, e.radius);
  ctx.fill(SPIKES);
  ctx.restore();

  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Core(s): shooters read orange (ranged threat), splitters carry twins.
  if (e.type === 'shooter') {
    ctx.fillStyle = '#173F14';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.orangeBright;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'splitter') {
    ctx.fillStyle = COLORS.virusDeep;
    ctx.beginPath();
    ctx.arc(-e.radius * 0.3, -e.radius * 0.1, e.radius * 0.28, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.3, e.radius * 0.14, e.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'boss') {
    ctx.fillStyle = COLORS.virusDeep;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,69,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.68, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = COLORS.virusDeep;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  // Specular glint.
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(-e.radius * 0.35, -e.radius * 0.42, e.radius * 0.22, e.radius * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // Damage flash.
  if (e.flashLeft > 0) {
    ctx.globalAlpha = (e.flashLeft / cfg.fx.enemyFlashSeconds) * 0.85;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Wind-up telegraph: pulsing orange ring, held >= 400 ms before any shot.
  if (e.windup > 0) {
    const pulse = 0.55 + 0.45 * Math.sin(time * 16);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = COLORS.orangeBright;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Boss fan telegraph lines toward the player during the wind-up.
  if (e.type === 'boss' && e.windup > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 16);
    ctx.strokeStyle = COLORS.orangeBright;
    ctx.lineWidth = 2;
    const B = cfg.enemies.boss;
    const aim = e.fanAim || 0;
    for (let s = 0; s < B.fanShots; s++) {
      const a = aim + (s - (B.fanShots - 1) / 2) * (B.fanSpreadRad / (B.fanShots - 1));
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a) * (e.radius + 8), e.y + Math.sin(a) * (e.radius + 8));
      ctx.lineTo(e.x + Math.cos(a) * (e.radius + 96), e.y + Math.sin(a) * (e.radius + 96));
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, world, cfg, paints, time, shadows) {
  const p = world.player;
  // I-frame flicker: skip alternate 55 ms windows.
  if (p.iframeLeft > 0 && Math.floor(time * 18) % 2 === 0) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, cfg.player.radius * 0.95, cfg.player.radius * 0.85, cfg.player.radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  if (shadows) {
    ctx.shadowColor = 'rgba(30,107,224,0.8)';
    ctx.shadowBlur = 16;
  }

  // Slight stretch along the move direction sells the dash.
  if (p.moving) {
    ctx.rotate(p.faceAngle);
    ctx.scale(1.08, 0.94);
    ctx.rotate(-p.faceAngle);
  }

  ctx.fillStyle = paints.player;
  ctx.beginPath();
  ctx.arc(0, 0, cfg.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rim.
  ctx.strokeStyle = 'rgba(191,224,255,0.75)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, cfg.player.radius - 0.8, 0, Math.PI * 2);
  ctx.stroke();

  // Muzzle wedge showing the facing.
  ctx.save();
  ctx.rotate(p.faceAngle);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(cfg.player.radius + 5, 0);
  ctx.lineTo(cfg.player.radius - 3, -4);
  ctx.lineTo(cfg.player.radius - 3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Glowing shield emblem, breathing while the guardian holds ground to fire.
  const firing = !p.moving && p.settleLeft <= 0;
  const breathe = firing ? 1 + 0.08 * Math.sin(time * 9) : 1;
  ctx.save();
  ctx.scale(cfg.player.radius * 0.78 * breathe, cfg.player.radius * 0.78 * breathe);
  if (shadows) {
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = firing ? 8 : 4;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill(SHIELD);
  ctx.restore();
  ctx.fillStyle = COLORS.blue;
  ctx.save();
  ctx.scale(cfg.player.radius * 0.5, cfg.player.radius * 0.5);
  ctx.fill(SHIELD);
  ctx.restore();

  ctx.restore();
}

/** Target-lock reticle: four rotating brackets on the nearest enemy. */
function drawReticle(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(time * GAME_CONFIG.fx.reticleSpinPerSec);
  ctx.strokeStyle = COLORS.orangeBright;
  ctx.lineWidth = 2;
  const r = e.radius + 9;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.arc(0, 0, r, -0.42, 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBolt(ctx, b, cfg, shadows) {
  ctx.save();
  const a = Math.atan2(b.vy, b.vx);
  ctx.translate(b.x, b.y);
  ctx.rotate(a);
  if (shadows) {
    ctx.shadowColor = 'rgba(127,192,255,0.9)';
    ctx.shadowBlur = 10;
  }
  // Trail.
  ctx.strokeStyle = 'rgba(127,192,255,0.5)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-4, 0);
  ctx.stroke();
  // Head.
  ctx.fillStyle = '#DFF0FF';
  ctx.beginPath();
  ctx.arc(0, 0, cfg.fire.boltRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.blueBright;
  ctx.beginPath();
  ctx.arc(-1.5, 0, cfg.fire.boltRadius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemyProj(ctx, pr, time, shadows) {
  ctx.save();
  ctx.translate(pr.x, pr.y);
  if (shadows) {
    ctx.shadowColor = 'rgba(73,226,75,0.9)';
    ctx.shadowBlur = 10;
  }
  const pulse = 1 + 0.12 * Math.sin(time * 18);
  ctx.fillStyle = COLORS.virus;
  ctx.beginPath();
  ctx.arc(0, 0, pr.radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.virusDeep;
  ctx.beginPath();
  ctx.arc(0, 0, pr.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, pr.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawJoystick(ctx, joy, cfg) {
  if (!joy.active) return;
  const J = cfg.joystick;
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joy.ox, joy.oy, J.maxRadiusPx * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(joy.ox, joy.oy, J.maxRadiusPx * 0.7, 0, Math.PI * 2);
  ctx.fill();
  const d = Math.min(Math.hypot(joy.dx, joy.dy), J.maxRadiusPx);
  const a = Math.atan2(joy.dy, joy.dx);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = COLORS.blueLt;
  ctx.beginPath();
  ctx.arc(joy.ox + Math.cos(a) * d, joy.oy + Math.sin(a) * d, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBossBar(ctx, boss, cfg) {
  const A = cfg.arena;
  const w = A.width - 88;
  const x = 44;
  const y = 30;
  ctx.save();
  ctx.fillStyle = 'rgba(2,6,23,0.6)';
  ctx.fillRect(x - 2, y - 2, w + 4, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x, y, w, 6);
  const frac = clamp(boss.hp / boss.maxHp, 0, 1);
  ctx.fillStyle = frac > 0.4 ? COLORS.orangeBright : COLORS.danger;
  ctx.fillRect(x, y, w * frac, 6);
  ctx.font = "900 9px 'Poppins', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('MINI-BOSS', A.width / 2, y - 4);
  ctx.restore();
}

/* ─── Upgrade card icons (inline SVG, vector only) ────────── */

function UpgradeIcon({ id }) {
  const common = { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (id) {
    case 'multishot':
      return (
        <svg {...common}>
          <path d="M12 20V7M12 7l-3 3M12 7l3 3" />
          <path d="M5 20V10M5 10l-2 2M5 10l2 2" opacity="0.7" />
          <path d="M19 20V10M19 10l-2 2M19 10l2 2" opacity="0.7" />
        </svg>
      );
    case 'ricochet':
      return (
        <svg {...common}>
          <path d="M3 19 10 9l4 4 6-9" />
          <path d="M20 4h-4M20 4v4" />
          <circle cx="10" cy="9" r="1.4" fill="#fff" stroke="none" />
          <circle cx="14" cy="13" r="1.4" fill="#fff" stroke="none" />
        </svg>
      );
    case 'pierce':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5" opacity="0.7" />
          <path d="M2 12h20M22 12l-3-3M22 12l-3 3" />
        </svg>
      );
    case 'firerate':
      return (
        <svg {...common}>
          <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );
    case 'damage':
      return (
        <svg {...common}>
          <path d="M12 21V5M12 5 6 11M12 5l6 6" />
          <path d="M5 3h14" opacity="0.7" />
        </svg>
      );
    case 'maxhp':
      return (
        <svg {...common}>
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" fill="rgba(255,255,255,0.2)" />
          <path d="M12 8v6M9 11h6" />
        </svg>
      );
    case 'heal':
      return (
        <svg {...common}>
          <path d="M12 21S4 15.5 4 9.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.5 12 21 12 21z" fill="rgba(255,255,255,0.2)" />
          <path d="M12 9v5M9.5 11.5h5" />
        </svg>
      );
    case 'speed':
      return (
        <svg {...common}>
          <path d="M4 5l7 7-7 7" />
          <path d="M12 5l7 7-7 7" opacity="0.7" />
        </svg>
      );
    default:
      return null;
  }
}

/* ─── Component ──────────────────────────────────────────── */

export default function GuardianArenaGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scoreElRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const hintRef = useRef(true);
  const worldRef = useRef(null);
  const applyPickRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [hp, setHp] = useState(cfg.player.maxHp);
  const [maxHp, setMaxHp] = useState(cfg.player.maxHp);
  const [waveLabel, setWaveLabel] = useState('');
  const [banner, setBanner] = useState(null);
  const [upgradeChoices, setUpgradeChoices] = useState(null); // array of ids or null
  // -1 idle, 3/2/1 frozen countdown, 0 = GO (live input lock)
  const [reacquire, setReacquire] = useState(-1);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      dpr: 1,
      view: { scale: 1, ox: 0, oy: 0, w: 0, h: 0 },
      backdrop: null,
      paints: null,
      world: null,
      joy: { active: false, ox: 0, oy: 0, dx: 0, dy: 0 },
      scoreShown: 0,
      shownScore: -1,
      shownHp: cfg.player.maxHp,
      shownMaxHp: cfg.player.maxHp,
      shownCount: -1,
      bannerSeq: 0,
      ended: false,
      effects: null,
      sfx: null,
      shadows: true,
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.sfx) return;
    s.sfx.unlock();
    const next = s.sfx.toggleMute();
    setMuted(next);
    if (!next) s.sfx.click();
  }, []);

  const pickUpgrade = useCallback((id) => {
    applyPickRef.current?.(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const s = stateRef.current;
    const ctx = canvas.getContext('2d');
    const tier = detectTier();
    const budget = effectBudget();
    const fx = createEffects();
    const sfx = createSfx();
    s.effects = fx;
    s.sfx = sfx;
    s.shadows = budget.shadows && tier !== 'low';

    const A = cfg.arena;

    /* --- canvas sizing / letterboxing ----------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (s.view.w === w && s.view.h === h && s.backdrop) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      const scale = Math.min(w / A.width, h / A.height);
      s.view = { scale, ox: (w - A.width * scale) / 2, oy: (h - A.height * scale) / 2, w, h };
      s.backdrop = makeBackdrop(cfg, scale, s.dpr);
      s.paints = buildPaints(ctx, cfg);
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- banner helper ---------------------------------------------------- */
    const showBanner = (kind, title, sub) => {
      s.bannerSeq += 1;
      setBanner({ id: s.bannerSeq, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- end of run ------------------------------------------------------- */
    let loop = null;
    const endRun = (won) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);
      setUpgradeChoices(null);
      const world = s.world;
      const stats = {
        ...statsOf(world),
        timeLeft: Math.max(0, Math.ceil(loop?.getRemaining() ?? 0)),
      };
      const bx = A.width / 2;
      const by = A.height * 0.42;
      if (won) {
        sfx.victory();
        haptic('success');
        fx.burst({ x: bx, y: by, count: 26, color: COLORS.gold, speed: 320, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 380, drag: 0.93 });
        fx.burst({ x: bx, y: by - 24, count: 20, color: COLORS.blueLt, speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 340, drag: 0.94 });
        fx.floatText(bx, by - 60, world.endCause === 'boss' ? 'THREAT NEUTRALISED' : 'FAMILY COVERED', COLORS.goldLt, 18);
      } else {
        sfx.failure();
        haptic('failure');
        fx.addShake(cfg.fx.hurtShake * 1.3);
        fx.burst({ x: world.player.x, y: world.player.y, count: 22, color: COLORS.danger, speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 520, drag: 0.9 });
        fx.floatText(bx, by - 48, 'COVER BREACHED', COLORS.dangerLt, 17);
      }
      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.fx.endBeatMs);
    };

    /* --- sim events (one persistent object, no allocation in callbacks) --- */
    const events = {
      onSpawn: (e) => {
        if (e.isBoss) return;
        fx.burst({
          x: e.x, y: e.y, count: cfg.fx.spawnParticles, color: COLORS.greenLt,
          speed: 90, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 60, drag: 0.9,
        });
      },
      onFire: (x, y, angle) => {
        sfx.shoot();
        fx.burst({
          x: x + Math.cos(angle) * (cfg.player.radius + 6),
          y: y + Math.sin(angle) * (cfg.player.radius + 6),
          count: 3, color: COLORS.blueLt, speed: 120, spread: 0.7, angle,
          size: 2, life: 0.18, gravity: 0, drag: 0.86,
        });
      },
      onEnemyHit: (e, dmg, x, y) => {
        sfx.hitEnemy();
        fx.burst({
          x, y, count: cfg.fx.hitParticles, color: '#CFF5D2', speed: 140,
          spread: Math.PI * 2, size: 2.2, life: 0.3, gravity: 220, drag: 0.9,
        });
        if (e.hp > 0) {
          fx.floatText(e.x, e.y - e.radius - 8, `${Math.round(dmg * 10) / 10}`, '#FFFFFF', cfg.fx.dmgTextSize);
        }
      },
      onEnemyKilled: (e) => {
        sfx.kill();
        haptic('light');
        fx.addHitStop(cfg.fx.hitStopSeconds);      // 50 ms freeze-frame
        fx.addShake(cfg.fx.killShake);             // 3–4 px kick
        fx.burst({
          x: e.x, y: e.y, count: e.isBoss ? 30 : cfg.fx.deathParticles, color: COLORS.virus,
          speed: e.isBoss ? 300 : 210, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 420, drag: 0.9,
        });
        fx.burst({
          x: e.x, y: e.y, count: 6, color: COLORS.virusDeep, speed: 140,
          spread: Math.PI * 2, size: 2.4, life: 0.5, gravity: 380, drag: 0.9,
        });
        fx.floatText(
          clamp(e.x, 30, A.width - 30), Math.max(26, e.y - e.radius - 14),
          `+${e.score}`, COLORS.goldLt, 14,
        );
      },
      onRicochet: (x, y) => {
        sfx.ricochet();
        fx.burst({ x, y, count: 4, color: COLORS.blueLt, speed: 130, spread: Math.PI * 2, size: 1.8, life: 0.22, gravity: 0, drag: 0.88 });
      },
      onWindup: () => sfx.windup(),
      onEnemyShot: () => sfx.tick(),
      onPlayerHit: (hpLeft) => {
        sfx.hurt();
        haptic('failure');
        fx.addShake(cfg.fx.hurtShake);
        const p = s.world.player;
        fx.burst({ x: p.x, y: p.y, count: 12, color: COLORS.danger, speed: 220, spread: Math.PI * 2, size: 3, life: 0.5, gravity: 320, drag: 0.9 });
        if (hpLeft > 0) fx.floatText(p.x, p.y - 26, 'COVER HIT', COLORS.dangerLt, 13);
      },
      onWaveStart: (index, label) => {
        setWaveLabel(`${label} · ${index + 1}/${cfg.waves.length}`);
        if (!cfg.waves[index].boss) {
          if (index > 0) sfx.wave();
          showBanner('wave', label, index === 0 ? 'Stand still to fire' : 'Threats incoming');
        }
      },
      onWaveCleared: (index, bonus) => {
        sfx.wave();
        fx.floatText(A.width / 2, A.height * 0.4, `WAVE CLEAR +${bonus}`, COLORS.goldLt, 17);
        showBanner('clear', `${cfg.waves[index].label} clear`, `+${bonus} bonus — pick a rider`);
      },
      onUpgradeOffer: (choices) => {
        setUpgradeChoices(choices.slice());
      },
      onUpgradePicked: () => {
        sfx.upgrade();
        haptic('success');
        setUpgradeChoices(null);
        const p = s.world.player;
        fx.burst({ x: p.x, y: p.y, count: 14, color: COLORS.gold, speed: 180, spread: Math.PI * 2, size: 2.6, life: 0.6, gravity: 140, drag: 0.92 });
      },
      onBossSpawn: () => {
        sfx.boss();
        haptic('medium');
        showBanner('boss', 'Mini-boss', 'Layered cover pays off now');
      },
      onWin: () => endRun(true),
      onLose: () => endRun(false),
    };

    /* --- world ------------------------------------------------------------ */
    s.world = createWorld(cfg, Math.random);
    worldRef.current = s.world;
    events.onWaveStart(0, cfg.waves[0].label);

    applyPickRef.current = (id) => {
      if (s.ended || !s.world?.upgradeOpen) return;
      sfx.unlock();
      applyUpgrade(s.world, cfg, id, events);
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;      // 50 ms hit-stop holds the sim, not the draw
      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.world.score, 8, dt);
      if (s.ended) return;
      stepWorld(s.world, cfg, dt, events);
    };

    /* --- render ----------------------------------------------------------- */
    const render = () => {
      const world = s.world;
      const view = s.view;
      if (!world || !s.backdrop || !s.paints) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, view.w, view.h);

      ctx.save();
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.scale, view.scale);

      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, A.width, A.height);

      const time = s.time;
      const es = world.enemies;

      // Enemies (spawning ones first so live ones draw on top).
      for (let i = 0; i < es.length; i++) {
        const e = es[i];
        if (e.alive && e.spawnLeft > 0) drawEnemy(ctx, e, cfg, s.paints, time, s.shadows);
      }
      for (let i = 0; i < es.length; i++) {
        const e = es[i];
        if (e.alive && e.spawnLeft <= 0 && !e.isBoss) drawEnemy(ctx, e, cfg, s.paints, time, s.shadows);
      }
      for (let i = 0; i < es.length; i++) {
        const e = es[i];
        if (e.alive && e.spawnLeft <= 0 && e.isBoss) drawEnemy(ctx, e, cfg, s.paints, time, s.shadows);
      }

      // Target-lock reticle.
      if (!s.ended && world.targetId >= 0) {
        const t = es[world.targetId];
        if (t.alive) drawReticle(ctx, t, time);
      }

      // Enemy projectiles, then guardian bolts on top.
      for (let i = 0; i < world.projs.length; i++) {
        const pr = world.projs[i];
        if (pr.alive) drawEnemyProj(ctx, pr, time, s.shadows);
      }
      for (let i = 0; i < world.bolts.length; i++) {
        const b = world.bolts[i];
        if (b.alive) drawBolt(ctx, b, cfg, s.shadows);
      }

      if (!s.ended || world.won) drawPlayer(ctx, world, cfg, s.paints, time, s.shadows);

      // Boss HP bar.
      if (world.bossId >= 0) {
        const boss = es[world.bossId];
        if (boss.alive && boss.isBoss) drawBossBar(ctx, boss, cfg);
      }

      drawJoystick(ctx, s.joy, cfg);

      fx.draw(ctx);
      fx.endCamera(ctx);

      // Red hurt vignette.
      if (world.player.hurtLeft > 0) {
        ctx.globalAlpha = (world.player.hurtLeft / cfg.player.hurtVignetteSeconds) * 0.85;
        ctx.fillStyle = s.paints.vignette;
        ctx.fillRect(0, 0, A.width, A.height);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      /* --- HUD writes (DOM for the per-frame score; React for rare state) - */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (world.player.hp !== s.shownHp) {
        s.shownHp = world.player.hp;
        setHp(Math.max(0, world.player.hp));
      }
      if (world.player.maxHp !== s.shownMaxHp) {
        s.shownMaxHp = world.player.maxHp;
        setMaxHp(world.player.maxHp);
      }
      // Re-acquire countdown: 3 / 2 / 1 while frozen, then GO for the live lock.
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.reacquire.freezeSeconds / 3)))
        : (world.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input: floating virtual joystick --------------------------------- */
    const setStick = (p) => {
      const joy = s.joy;
      joy.dx = p.x - joy.ox;
      joy.dy = p.y - joy.oy;
      const J = cfg.joystick;
      const d = Math.hypot(joy.dx, joy.dy);
      const input = s.world.input;
      if (d <= J.deadZonePx) {
        input.mx = 0; input.my = 0; input.mag = 0;
      } else {
        input.mx = joy.dx / d;
        input.my = joy.dy / d;
        input.mag = clamp((d - J.deadZonePx) / (J.maxRadiusPx - J.deadZonePx), 0, 1);
      }
    };

    const input = createInput(canvas, {
      onDown: (p) => {
        sfx.unlock();
        if (s.ended) return;
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
        const joy = s.joy;
        joy.active = true;
        joy.ox = clamp(p.x, 0, A.width);
        joy.oy = clamp(p.y, 0, A.height);
        joy.dx = 0; joy.dy = 0;
        s.world.input.mx = 0; s.world.input.my = 0; s.world.input.mag = 0;
      },
      onMove: (p) => {
        if (!s.joy.active || s.ended) return;
        setStick(p);
      },
      onUp: () => {
        s.joy.active = false;
        const input2 = s.world.input;
        input2.mx = 0; input2.my = 0; input2.mag = 0;
      },
    }, {
      transform: () => ({ scale: s.view.scale, offsetX: s.view.ox, offsetY: s.view.oy }),
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The clock holds during the upgrade pick, the re-acquire countdown, and
      // after the run ends — session time is gameplay time only.
      shouldTickClock: () => !s.ended && !s.world.upgradeOpen && !isFrozen(s.world),
      onTick: (remaining) => setTimeLeft(remaining),
      // Clock ran out with the guardian standing: all four waves survived.
      onExpire: () => {
        if (!s.ended) expireSession(s.world, cfg, events);
      },
      /* Kit auto-pause (visibilitychange). The kit copy is immutable, so the
         anti-pause-scum rule lives in sim.js and is driven from here: going
         away freezes the world; coming back starts the visible 3-2-1 with the
         clock held before anything moves again. */
      onPause: (isPaused) => {
        setPaused(isPaused);
        sfx.setPaused(isPaused);
        if (s.ended || !s.world) return;
        if (isPaused) {
          beginPause(s.world);
          // Drop the stick so a held drag does not sprint on resume.
          s.joy.active = false;
          const input2 = s.world.input;
          input2.mx = 0; input2.my = 0; input2.mag = 0;
        } else {
          endPause(s.world, cfg);
        }
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
      sfx.destroy();
      applyPickRef.current = null;
      worldRef.current = null;
      s.effects = null;
      s.sfx = null;
      s.world = null;
      s.backdrop = null;
      s.paints = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const choiceDefs = upgradeChoices
    ? upgradeChoices.map((id) => cfg.upgrades.find((u) => u.id === id)).filter(Boolean)
    : null;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="gua-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.hpWrap}>
            {Array.from({ length: maxHp }).map((_, i) => (
              <span
                key={i}
                className={i < hp ? 'gua-hp' : undefined}
                style={{
                  ...styles.hpPip,
                  background: i < hp
                    ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)'
                    : 'rgba(255,255,255,0.10)',
                  boxShadow: i < hp ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                  opacity: i < hp ? 1 : 0.45,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke={i < hp ? '#fff' : 'rgba(255,255,255,0.5)'}
                  strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                </svg>
              </span>
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeBright : '#fff',
              animation: lowTime ? 'guaPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.waveWrap}>
          <div style={styles.wavePill}>{waveLabel}</div>
        </div>

        {/* Banner ----------------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="gua-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'boss'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'clear'
                  ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                  : 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint --------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="gua-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeBright }}>Hold &amp; drag</strong> to move ·{' '}
              <strong style={{ color: COLORS.orangeBright }}>stand still</strong> to auto-fire
            </div>
          </div>
        )}

        {/* Upgrade pick (pick 1 of 3 riders — world + clock held) ------- */}
        {choiceDefs && !over && (
          <div style={styles.upgradeVeil}>
            <div style={styles.upgradeTitle}>Add a rider to your cover</div>
            <div style={styles.upgradeSub}>Every layer of protection compounds</div>
            <div style={styles.cardCol}>
              {choiceDefs.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  className="gua-card"
                  style={{ ...styles.card, animationDelay: `${i * 70}ms` }}
                  onClick={() => pickUpgrade(u.id)}
                >
                  <span style={{
                    ...styles.cardIcon,
                    background: u.offense
                      ? 'linear-gradient(180deg, #FF8A3D, #F26522)'
                      : 'linear-gradient(180deg, #1E6BE0, #003DA6)',
                  }}>
                    <UpgradeIcon id={u.icon} />
                  </span>
                  <span style={styles.cardText}>
                    <span style={styles.cardName}>{u.name}</span>
                    <span style={styles.cardBlurb}>{u.blurb}</span>
                  </span>
                  <span style={styles.cardChevron} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.6" strokeLinecap="round">
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Re-acquire countdown (anti pause-scum) ----------------------
            The world and the session clock stay frozen while 3-2-1 runs,
            then GO covers the brief input lock. See sim.js. */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="gua-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your footing' : 'Fight on'}
            </div>
          </div>
        )}

        {/* Auto-pause veil --------------------------------------------- */}
        {paused && !over && (
          <div style={styles.pauseVeil}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Paused</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
              Your timer is safe. Come back and hold the arena.
            </div>
          </div>
        )}

        {/* Mute -------------------------------------------------------- */}
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
@keyframes guaIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes guaPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes guaBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes guaHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes guaHp { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes guaCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
@keyframes guaCard { from { opacity: 0; transform: translateY(18px) scale(0.94); } to { opacity: 1; transform: none; } }
.gua-count  { animation: guaCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.gua-stage  { animation: guaIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.gua-banner { animation: guaBanner 1.4s ease-out both; }
.gua-hint   { animation: guaHint 1.6s ease-in-out infinite; }
.gua-hp     { animation: guaHp 2.4s ease-in-out infinite; }
.gua-card   { animation: guaCard 320ms cubic-bezier(0.22,1,0.36,1) both; }
.gua-card:active { transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .gua-stage, .gua-banner, .gua-hint, .gua-hp, .gua-count, .gua-card {
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
    minWidth: 74,
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
  hpWrap: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    paddingTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hpPip: {
    width: 21,
    height: 21,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 260ms ease, opacity 260ms ease, box-shadow 260ms ease',
  },
  waveWrap: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  wavePill: {
    ...glass,
    borderRadius: 999,
    padding: '4px 14px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
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
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
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
  upgradeVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '20px 16px',
    background: 'rgba(11,18,33,0.78)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 7,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.02em',
    textAlign: 'center',
  },
  upgradeSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  cardCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    maxWidth: 330,
  },
  card: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: '12px 14px',
    minHeight: 74,
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    background: 'rgba(255,255,255,0.07)',
    transition: 'transform 120ms ease',
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 5px 12px rgba(0,0,0,0.35)',
  },
  cardText: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  cardName: { fontSize: 15, fontWeight: 900, letterSpacing: '-0.01em' },
  cardBlurb: { fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.72)', lineHeight: 1.35 },
  cardChevron: { flexShrink: 0, display: 'inline-flex' },
  reacquireVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Deliberately light: the player must SEE the arena to re-acquire it.
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

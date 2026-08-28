// GuardianShelterGame.jsx — Preemptive risk protection physics gameplay.
// 2D physics engine: gravity, AABB/circle collisions, stacking, bouncing acid storm.
import React, { useRef, useEffect, useState } from 'react';
import { COLORS, GAME_CONFIG, SHIELD_TYPES, MEMBER_TYPES, LEVELS } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { haptic } from './kit/device.js';
import guardianBgImg from './guardian_shelter_bg.webp';
import dadImg from './family_dad.webp';
import momImg from './family_mom.webp';
import kidImg from './family_kid.webp';
import grandpaImg from './family_grandpa.webp';

// Backing-store scale for the canvas. Capped at 2 because a 3x phone would
// otherwise fill 2.09M pixels per frame for no visible gain on a 400px-wide
// playfield — a measurable cost on mid-range Android.
const RENDER_DPR = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

// Placement drop animation: fall to the predicted rest spot, then squash-settle.
const DROP_FALL = 0.22;      // seconds, ease-out travel from release point
const DROP_SETTLE = 0.16;    // seconds, squash/rebound after contact
const PRE_STORM_SECONDS = 1.2; // "storm incoming" beat once the last shield lands

// Sprite draw box, in units of the member hit radius. The baked rim-light pads
// the cached canvas by RIM_PAD_RATIO on every side, so the box is larger than
// the visible character by exactly that padding.
const RIM_PAD_RATIO = 0.09;
const SPRITE_BOX_R = 6.2;

// A platform's support surface is the top edge of the rectangle that actually
// gets drawn (roundRect is centred on p.y), so family members and shields both
// stand on the same line.
const platformTop = (p) => p.y - p.h / 2;

// The family art ships as JPEG (no alpha), so the backdrop has to be keyed out
// at load time. Flood filling in from the frame border — rather than deleting
// every pixel that merely resembles the backdrop colour — keeps dark hair,
// pupils and navy clothing intact instead of punching holes through them, which
// matters a lot once a rim light is traced around the silhouette.
// Returns the bounding box of what survived, so the sprite can be anchored by
// its feet rather than by a guess.
function keyOutBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const bgR = d[0];
  const bgG = d[1];
  const bgB = d[2];
  const tolSq = 52 * 52;

  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;

  const push = (i) => {
    if (seen[i]) return;
    const o = i * 4;
    const dr = d[o] - bgR;
    const dg = d[o + 1] - bgG;
    const db = d[o + 2] - bgB;
    if (dr * dr + dg * dg + db * db >= tolSq) return;
    seen[i] = 1;
    stack[sp++] = i;
  };

  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

  while (sp > 0) {
    const i = stack[--sp];
    d[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  ctx.putImageData(img, 0, 0);

  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let i = 0, n = w * h; i < n; i++) {
    if (d[i * 4 + 3] === 0) continue;
    const x = i % w;
    const y = (i / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return maxY < 0 ? null : { minX, maxX, minY, maxY };
}

// Bakes a gold rim-light plus a dark contact halo around the cut-out sprite ONCE
// at load time. Doing this per-frame with ctx.filter costs several ms on
// mid-range Android; the sprites never change, so it belongs in the cache.
// The returned canvas carries where the character's feet and centre line sit
// inside it, as fractions, for anchoring at draw time.
function addRimLight(src, bbox) {
  const pad = Math.round(Math.max(src.width, src.height) * RIM_PAD_RATIO);
  const out = document.createElement('canvas');
  out.width = src.width + pad * 2;
  out.height = src.height + pad * 2;
  const octx = out.getContext('2d');
  if (typeof octx.filter === 'string') {
    // Dark halo first (widest) so the gold rim reads on light backgrounds too.
    octx.filter = `drop-shadow(0 0 ${pad}px rgba(2,10,26,0.95))`;
    octx.drawImage(src, pad, pad);
    octx.filter = `drop-shadow(0 0 ${pad * 0.38}px #FFC845) drop-shadow(0 0 ${pad * 0.38}px #FFC845)`;
    octx.drawImage(src, pad, pad);
    octx.filter = 'none';
  }
  octx.drawImage(src, pad, pad);

  out.contentBottom = bbox ? (bbox.maxY + 1 + pad) / out.height : 0.9;
  out.contentCenterX = bbox ? ((bbox.minX + bbox.maxX) / 2 + pad) / out.width : 0.5;
  return out;
}

/* ─── Web Audio API Sound Synthesizer ───────────────── */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    if (type === 'shield_drop') {
      // Heavy thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'acid_bounce') {
      // High-pitched bounce
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'hit') {
      // Sad descending buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'win') {
      // Happy major triad arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.15);
      });
    } else if (type === 'lose') {
      // Descending minor chord
      const notes = [311.13, 293.66, 261.63]; // Eb4, D4, C4
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } else if (type === 'click') {
      // Quick clean interface click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.warn("Synth audio error:", e);
  }
}

export default function GuardianShelterGame({ onWin, onLose }) {
  const canvasRef = useRef(null);

  // Character and Background Image Refs
  const bgImageRef = useRef(null);
  const dadImageRef = useRef(null);
  const momImageRef = useRef(null);
  const kidImageRef = useRef(null);
  const grandpaImageRef = useRef(null);

  useEffect(() => {
    // Load background
    const bg = new Image();
    bg.src = guardianBgImg;
    bg.onload = () => {
      bgImageRef.current = bg;
    };

    const cleanCharacterImage = (imgSrc, refObj) => {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);

        try {
          refObj.current = addRimLight(canvas, keyOutBackground(canvas));
        } catch (e) {
          console.error("Failed to clean character image background", e);
          refObj.current = img;
        }
      };
    };

    cleanCharacterImage(dadImg, dadImageRef);
    cleanCharacterImage(momImg, momImageRef);
    cleanCharacterImage(kidImg, kidImageRef);
    cleanCharacterImage(grandpaImg, grandpaImageRef);
  }, []);
  
  // React State for HUD & Screen UI
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.sessionSeconds);
  // placement | incoming | storm | failed | cleared | gameover
  const [gameState, setGameState] = useState('placement');
  // Auto-pause when the tab/app loses focus, so the session clock cannot drain
  // while the player is away.
  const [paused, setPaused] = useState(false);
  const loopRef = useRef(null);
  
  // Game Loop Refs
  const stateRef = useRef({
    gameState: 'placement',
    currentLevelIdx: 0,
    score: 0,
    timeLeft: GAME_CONFIG.sessionSeconds,
    shields: [],       // placed shields { x, y, w, h, type, settled, drop }
    acidDrops: [],     // active acid drops { x, y, vx, vy, bounces, life }
    particles: [],     // cosmetic particles { x, y, vx, vy, color, size, life, maxLife }
    family: [],        // family members { type, x, y, r, status }
    emitter: { x: -20, y: GAME_CONFIG.emitterY, vx: 0, active: false, timer: 0, passes: 1 },
    dragState: null,   // { type, x, y, restY, index } (index is tray index)
    incomingT: 0,      // pre-storm countdown, ticked by the loop so it pauses too
    lastTime: 0,
    roundWon: false,
    soundMuted: false,
    trayShields: [],   // remaining shield types; ref-only, read by the draw loop
  });

  const level = LEVELS[levelIdx];

  // Initialize Level
  useEffect(() => {
    initLevel(levelIdx);
  }, [levelIdx]);

  // Single loop owns both gameplay and the session clock. Previously these were
  // separate (rAF + setInterval), which let the countdown keep draining while
  // the tab was backgrounded and rAF was halted — the player could return to a
  // lost game they never saw play out.
  useEffect(() => {
    const loop = createGameLoop({
      sessionSeconds: GAME_CONFIG.sessionSeconds,

      // This physics was written and tuned to run once per frame with a clamped
      // delta (ground friction at v.vx *= 0.95 is per-call, not dt-scaled).
      // Driving it at a fixed 120 Hz doubles the call rate and silently changes
      // the feel, so it stays on variable stepping until it is re-tuned.
      stepMode: 'variable',

      update: (dt) => updatePhysics(dt),
      render: () => drawGame(),

      // Matches the original countdown, which held while a round-complete or
      // game-over panel was on screen.
      shouldTickClock: () => {
        const gs = stateRef.current.gameState;
        return gs !== 'cleared' && gs !== 'gameover';
      },

      onTick: (remaining) => {
        stateRef.current.timeLeft = remaining;
        setTimeLeft(remaining);
      },

      onExpire: () => {
        const gs = stateRef.current.gameState;
        if (gs === 'cleared' || gs === 'gameover') return;
        triggerGameOver(false);
      },

      onPause: (isPaused) => setPaused(isPaused),
    });

    loopRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, []);

  const initLevel = (idx) => {
    const lvl = LEVELS[idx];
    const ref = stateRef.current;
    ref.shields = [];
    ref.acidDrops = [];
    ref.particles = [];
    ref.dragState = null;
    ref.emitter = {
      x: -30,
      y: GAME_CONFIG.emitterY,
      vx: lvl.storm.speed,
      active: false,
      timer: 0,
      passes: lvl.storm.passes
    };
    
    ref.incomingT = 0;

    // Set up family members
    ref.family = lvl.members.map((m) => {
      const typeInfo = MEMBER_TYPES[m.type];
      let y = GAME_CONFIG.groundY - typeInfo.r;
      if (m.on !== 'ground' && lvl.platforms[m.on]) {
        y = platformTop(lvl.platforms[m.on]) - typeInfo.r;
      }
      return {
        type: m.type,
        x: m.x,
        y: y,
        r: typeInfo.r,
        status: 'safe',
      };
    });

    // Tray lives only on the ref: the canvas redraws it every frame, so it never
    // needs to force a React render.
    ref.trayShields = [...lvl.shields];
    setGameState('placement');
    ref.gameState = 'placement';
  };

  // Keep a shield's footprint inside the playfield so the ghost preview can
  // never show a position the shield is not allowed to occupy.
  const clampX = (x, w) => Math.max(w / 2, Math.min(GAME_CONFIG.fieldWidth - w / 2, x));

  // Where a shield of this footprint comes to rest if released at x: the ground,
  // a platform top, or the top of an already-placed shield — whichever is
  // highest. Both the drag ghost and the placed shield are positioned from this
  // one function, so the preview and the final position cannot disagree.
  const restYFor = (x, w, h) => {
    const ref = stateRef.current;
    const lvl = LEVELS[ref.currentLevelIdx];
    const overlaps = (ox, ow) => Math.abs(x - ox) < (w + ow) / 2;

    let surface = GAME_CONFIG.groundY;
    lvl.platforms.forEach((p) => {
      if (overlaps(p.x, p.w)) surface = Math.min(surface, platformTop(p));
    });
    // Character Hitbox for Shield Stacking
    ref.family.forEach((m) => {
      if (overlaps(m.x, m.r * 2)) {
        surface = Math.min(surface, m.y - m.r);
      }
    });
    ref.shields.forEach((s) => {
      if (overlaps(s.x, s.w)) surface = Math.min(surface, s.y - s.h / 2);
    });
    return surface - h / 2;
  };

  const spawnParticles = (x, y, color, count, speedScale = 1) => {
    const ref = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (5 + Math.random() * 55) * speedScale;
      ref.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
      });
    }
  };

  const spawnDust = (x, y, width) => {
    const ref = stateRef.current;
    const count = Math.floor(width / 7);
    for (let i = 0; i < count; i++) {
      const px = x + (Math.random() - 0.5) * width;
      ref.particles.push({
        x: px,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: -5 - Math.random() * 15,
        color: 'rgba(255, 255, 255, 0.28)',
        size: 3 + Math.random() * 5,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }
  };

  // 2D Physics Updates
  const updatePhysics = (dt) => {
    const ref = stateRef.current;
    const lvl = LEVELS[ref.currentLevelIdx];
    if (ref.gameState === 'gameover') return;

    // 1. Advance the placement drop animation. Shields are placed directly at the
    //    resting spot the ghost previewed (restYFor), so this is purely cosmetic —
    //    collision geometry is already correct on the frame of release.
    ref.shields.forEach((s) => {
      if (!s.drop) return;
      s.drop.t += dt;
      if (!s.drop.landed && s.drop.t >= DROP_FALL) {
        s.drop.landed = true;
        if (!ref.soundMuted) playSound('shield_drop');
        spawnDust(s.x, s.y + s.h / 2, s.w);
      }
      if (s.drop.t >= DROP_FALL + DROP_SETTLE) s.drop = null;
    });

    // 1b. Pre-storm beat. Ticked here rather than on a timer so it pauses with
    //     the rest of the game when the tab loses focus.
    if (ref.gameState === 'incoming') {
      ref.incomingT -= dt;
      if (ref.incomingT <= 0) beginStorm();
    }

    // 2. Storm sweep & Spawning
    if (ref.emitter.active) {
      ref.emitter.x += ref.emitter.vx * dt;
      ref.emitter.timer += dt;

      if (ref.emitter.timer >= lvl.storm.spawnEvery) {
        // Spawn acid rain particle
        const vx = (Math.random() - 0.5) * 50 + lvl.storm.drift;
        const vy = 60 + Math.random() * 50;
        ref.acidDrops.push({
          x: ref.emitter.x,
          y: ref.emitter.y,
          vx,
          vy,
          bounces: 0,
          life: GAME_CONFIG.acidLifeSeconds,
        });
        ref.emitter.timer = 0;
      }

      // Check boundaries of sweep
      if (ref.emitter.vx > 0 && ref.emitter.x > GAME_CONFIG.fieldWidth + 20) {
        if (ref.emitter.passes > 1) {
          ref.emitter.vx = -lvl.storm.speed;
          ref.emitter.passes -= 1;
        } else {
          ref.emitter.active = false;
        }
      } else if (ref.emitter.vx < 0 && ref.emitter.x < -20) {
        if (ref.emitter.passes > 1) {
          ref.emitter.vx = lvl.storm.speed;
          ref.emitter.passes -= 1;
        } else {
          ref.emitter.active = false;
        }
      }
    }

    // 3. Update active acid drops & collisions
    ref.acidDrops.forEach((v, vIdx) => {
      v.vy += GAME_CONFIG.gravity * dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.life -= dt;

      let bounced = false;

      // Left/Right Wall Bounces
      if (v.x - GAME_CONFIG.acidRadius < 0) {
        v.x = GAME_CONFIG.acidRadius;
        v.vx = -v.vx * GAME_CONFIG.acidRestitution;
        bounced = true;
      } else if (v.x + GAME_CONFIG.acidRadius > GAME_CONFIG.fieldWidth) {
        v.x = GAME_CONFIG.fieldWidth - GAME_CONFIG.acidRadius;
        v.vx = -v.vx * GAME_CONFIG.acidRestitution;
        bounced = true;
      }

      // Ground Bounce
      if (v.y + GAME_CONFIG.acidRadius >= GAME_CONFIG.groundY) {
        v.y = GAME_CONFIG.groundY - GAME_CONFIG.acidRadius;
        v.vy = -v.vy * GAME_CONFIG.acidRestitution;
        v.vx *= 0.95; // Ground friction
        v.bounces += 1;
        bounced = true;
      }

      // Platform Bounces (Circle vs AABB)
      lvl.platforms.forEach((p) => {
        if (resolveCircleAABB(v, p)) {
          v.bounces += 1;
          bounced = true;
        }
      });

      // Shield Bounces
      ref.shields.forEach((s) => {
        if (s.settled) {
          if (s.type === 'umbrella') {
            // Umbrella dome (Circle top half)
            const domeCenterX = s.x;
            const domeCenterY = s.y - s.h/2 + SHIELD_TYPES.umbrella.domeR;
            const rSum = GAME_CONFIG.acidRadius + SHIELD_TYPES.umbrella.domeR;
            const dx = v.x - domeCenterX;
            const dy = v.y - domeCenterY;
            const distSq = dx*dx + dy*dy;

            if (distSq < rSum*rSum) {
              const dist = Math.sqrt(distSq);
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);
              v.x = domeCenterX + nx * rSum;
              v.y = domeCenterY + ny * rSum;
              const vn = v.vx * nx + v.vy * ny;
              if (vn < 0) {
                v.vx = v.vx - (1 + GAME_CONFIG.acidRestitution) * vn * nx;
                v.vy = v.vy - (1 + GAME_CONFIG.acidRestitution) * vn * ny;
              }
              // Push droplet horizontally and vertically away from the center to clear character underneath
              v.vx += nx * 140;
              v.vy = Math.min(v.vy, -150);
              v.bounces += 1;
              bounced = true;
            } else {
              // Stem check (AABB bottom half) - Narrow collision box
              const stem = {
                x: s.x,
                y: s.y + 16,
                w: 12,
                h: s.h - SHIELD_TYPES.umbrella.domeR
              };
              if (resolveCircleAABB(v, stem)) {
                v.bounces += 1;
                bounced = true;
              }
            }
          } else {
            // Crate or Barrel (Standard AABB)
            if (resolveCircleAABB(v, s)) {
              v.bounces += 1;
              bounced = true;
            }
          }
        }
      });

      // Play sound on bounce
      if (bounced && !ref.soundMuted) {
        playSound('acid_bounce');
        spawnParticles(v.x, v.y, COLORS.acid, 3, 0.4);
      }

      // Family Member Hits (Circle vs Circle)
      ref.family.forEach((m) => {
        if (m.status === 'safe') {
          const dx = v.x - m.x;
          const dy = v.y - m.y;
          const distSq = dx*dx + dy*dy;
          const rSum = GAME_CONFIG.acidRadius + m.r;
          if (distSq < rSum * rSum) {
            m.status = 'hit';
            if (!ref.soundMuted) playSound('hit');
            spawnParticles(m.x, m.y, '#EF4444', 15, 1.2);
            // Remove drop on direct impact
            v.life = 0;
          }
        }
      });
    });

    // Remove expired or fallen acid drops
    ref.acidDrops = ref.acidDrops.filter(v => v.life > 0 && v.bounces < GAME_CONFIG.acidMaxBounces && v.y < GAME_CONFIG.fieldHeight);

    // 4. Update particles
    ref.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    ref.particles = ref.particles.filter(p => p.life > 0);

    // 5. Check Storm Completion
    if (ref.gameState === 'storm' && !ref.emitter.active && ref.acidDrops.length === 0) {
      const hit = ref.family.some(m => m.status === 'hit');
      if (hit) {
        ref.gameState = 'failed';
        setGameState('failed');
        if (!ref.soundMuted) playSound('lose');
      } else {
        // Complete Round!
        ref.gameState = 'cleared';
        setGameState('cleared');
        if (!ref.soundMuted) playSound('win');

        // Calculate score. The storm only starts once the tray is empty, so
        // every shield is always spent — members saved is the whole round score.
        const savedCount = ref.family.filter(m => m.status === 'safe').length;
        ref.score += savedCount * GAME_CONFIG.scorePerMemberSaved;
        setScore(ref.score);
      }
    }
  };

  // Helper to resolve circle vs static AABB collision
  const resolveCircleAABB = (circle, aabb) => {
    const minX = aabb.x - aabb.w/2;
    const maxX = aabb.x + aabb.w/2;
    const minY = aabb.y - aabb.h/2;
    const maxY = aabb.y + aabb.h/2;

    const cx = Math.max(minX, Math.min(circle.x, maxX));
    const cy = Math.max(minY, Math.min(circle.y, maxY));

    const dx = circle.x - cx;
    const dy = circle.y - cy;
    const distSq = dx*dx + dy*dy;
    const r = GAME_CONFIG.acidRadius;

    if (distSq < r*r) {
      const dist = Math.sqrt(distSq);
      let nx = 0;
      let ny = -1;
      
      if (dist > 0) {
        nx = dx / dist;
        ny = dy / dist;
      } else {
        // Center is inside box. Push vertically.
        if (circle.y < aabb.y) {
          ny = -1;
        } else {
          ny = 1;
        }
      }

      const pen = r - dist;
      circle.x += nx * pen;
      circle.y += ny * pen;

      const vn = circle.vx * nx + circle.vy * ny;
      if (vn < 0) {
        circle.vx = circle.vx - (1 + GAME_CONFIG.acidRestitution) * vn * nx;
        circle.vy = circle.vy - (1 + GAME_CONFIG.acidRestitution) * vn * ny;
      }
      return true;
    }
    return false;
  };

  // Programmatic Canvas Drawing
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ref = stateRef.current;
    const lvl = LEVELS[ref.currentLevelIdx];

    // Map the logical 400x580 playfield onto the full backing store. Without
    // this the drawing lands in the top-left corner of a DPR-scaled canvas and
    // the whole game renders at 1/dpr scale on every retina phone.
    const renderScale = canvas.width / GAME_CONFIG.fieldWidth;
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    // Clear Screen & Draw Deep Blue Sky Gradient or Background Image
    ctx.clearRect(0, 0, GAME_CONFIG.fieldWidth, GAME_CONFIG.fieldHeight);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, GAME_CONFIG.fieldWidth, GAME_CONFIG.fieldHeight);
      // Scrim. The source art is bright enough that the family sprites used to
      // disappear into it; knocking the backdrop down is what makes them pop.
      ctx.fillStyle = 'rgba(3, 12, 32, 0.5)';
      ctx.fillRect(0, 0, GAME_CONFIG.fieldWidth, GAME_CONFIG.fieldHeight);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.fieldHeight);
      bgGrad.addColorStop(0, COLORS.bgTop);
      bgGrad.addColorStop(0.7, COLORS.bgMid);
      bgGrad.addColorStop(1, '#001b38');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, GAME_CONFIG.fieldWidth, GAME_CONFIG.fieldHeight);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < GAME_CONFIG.fieldWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_CONFIG.fieldHeight);
        ctx.stroke();
      }
      for (let y = 0; y < GAME_CONFIG.fieldHeight; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_CONFIG.fieldWidth, y);
        ctx.stroke();
      }
    }

    // Draw Platforms
    lvl.platforms.forEach((p) => {
      // Glow
      ctx.shadowColor = 'rgba(30,107,224,0.45)';
      ctx.shadowBlur = 10;
      // Glass border
      ctx.fillStyle = 'rgba(0, 50, 120, 0.4)';
      ctx.strokeStyle = '#1E6BE0';
      ctx.lineWidth = 2.5;
      
      ctx.beginPath();
      ctx.roundRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    });

    // Draw Ground
    const groundGrad = ctx.createLinearGradient(0, GAME_CONFIG.groundY, 0, GAME_CONFIG.fieldHeight);
    groundGrad.addColorStop(0, '#0a2a5a');
    groundGrad.addColorStop(1, '#021028');
    ctx.fillStyle = groundGrad;
    ctx.strokeStyle = '#005BAC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.rect(0, GAME_CONFIG.groundY, GAME_CONFIG.fieldWidth, GAME_CONFIG.fieldHeight - GAME_CONFIG.groundY);
    ctx.fill();
    ctx.stroke();

    // Draw Family Members. After the ground so their contact shadow and floor
    // ring land on top of it rather than being sliced in half by it.
    const nowSec = performance.now() / 1000;
    ref.family.forEach((m) => {
      drawFamilyMember(ctx, m, nowSec);
    });

    // Draw Placed Shields (with their drop-in animation, if still running)
    ref.shields.forEach((s) => {
      const d = s.drop;
      if (!d) {
        drawShield(ctx, s);
        return;
      }
      ctx.save();
      if (d.t < DROP_FALL) {
        // Ease-out travel from the exact point the finger let go.
        const k = d.t / DROP_FALL;
        const e = 1 - Math.pow(1 - k, 3);
        ctx.translate(0, (d.fromY - s.y) * (1 - e));
        drawShield(ctx, s);
      } else {
        // Squash on contact, springing back to true. Anchored at the base so the
        // footprint never leaves the resting spot.
        const k = Math.min(1, (d.t - DROP_FALL) / DROP_SETTLE);
        const q = (1 - k) * (1 - k);
        const baseY = s.y + s.h / 2;
        ctx.translate(s.x, baseY);
        ctx.scale(1 + 0.18 * q, 1 - 0.18 * q);
        ctx.translate(-s.x, -baseY);
        drawShield(ctx, s);
      }
      ctx.restore();
    });

    // Ghost preview while dragging. The dashed footprint sits at the position
    // restYFor() will actually place the shield, so what you see is where it lands.
    if (ref.dragState) {
      const drag = ref.dragState;
      const typeInfo = SHIELD_TYPES[drag.type];

      // Dashed plumb line from the carried piece down to the landing footprint
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(drag.x, drag.y);
      ctx.lineTo(drag.x, drag.restY);
      ctx.stroke();

      // Landing footprint — exactly w x h at the resting centre
      ctx.strokeStyle = 'rgba(255, 200, 69, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(drag.x - typeInfo.w / 2, drag.restY - typeInfo.h / 2, typeInfo.w, typeInfo.h, 10);
      ctx.stroke();

      // Semitransparent preview piece resting in the footprint
      ctx.save();
      ctx.globalAlpha = 0.3;
      drawShield(ctx, { x: drag.x, y: drag.restY, w: typeInfo.w, h: typeInfo.h, type: drag.type });
      ctx.restore();

      // The piece the finger is actually carrying
      ctx.save();
      ctx.globalAlpha = 0.92;
      drawShield(ctx, { x: drag.x, y: drag.y, w: typeInfo.w, h: typeInfo.h, type: drag.type });
      ctx.restore();
    }

    // Draw Acid Rain Drops
    ref.acidDrops.forEach((v) => {
      const angle = Math.atan2(v.vy, v.vx) - Math.PI / 2;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(angle);

      const r = GAME_CONFIG.acidRadius;

      // Glowing aura
      ctx.shadowColor = COLORS.acid;
      ctx.shadowBlur = 12;

      // Gradient fill (light neon green to dark green)
      const grad = ctx.createLinearGradient(0, -r * 1.6, 0, r);
      grad.addColorStop(0, '#A3F9B9');
      grad.addColorStop(0.5, COLORS.acid);
      grad.addColorStop(1, COLORS.acidDeep);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, -r * 1.6);
      ctx.bezierCurveTo(r * 1.2, -r * 0.6, r * 1.2, r, 0, r);
      ctx.bezierCurveTo(-r * 1.2, r, -r * 1.2, -r * 0.6, 0, -r * 1.6);
      ctx.closePath();
      ctx.fill();

      // Tiny highlight gloss inside drop
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Draw Emitter (Storm Cloud)
    if (ref.emitter.active) {
      // Lightning arcs occasionally
      if (Math.random() < 0.15) {
        ctx.strokeStyle = 'rgba(73, 226, 75, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ref.emitter.x, ref.emitter.y);
        ctx.lineTo(ref.emitter.x + (Math.random() - 0.5) * 40, ref.emitter.y + 40);
        ctx.stroke();
      }

      // Emitter cloud puff
      const cloudGrad = ctx.createRadialGradient(ref.emitter.x, ref.emitter.y, 5, ref.emitter.x, ref.emitter.y, 35);
      cloudGrad.addColorStop(0, '#334155');
      cloudGrad.addColorStop(0.8, '#1e293b');
      cloudGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.arc(ref.emitter.x, ref.emitter.y, 35, 0, Math.PI*2);
      ctx.fill();

      // Inner glowing core of cloud
      ctx.fillStyle = COLORS.acid;
      ctx.beginPath();
      ctx.arc(ref.emitter.x, ref.emitter.y, 6, 0, Math.PI*2);
      ctx.fill();
    }

    // Draw Particles
    ref.particles.forEach((p) => {
      const pct = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = pct;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pct, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // reset

    // Draw Placement Tray (at the bottom)
    if (ref.gameState === 'placement') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(16, GAME_CONFIG.trayY, GAME_CONFIG.fieldWidth - 32, 86, 18);
      ctx.fill();
      ctx.stroke();

      // No tray label. The review's portfolio-wide rule is that no game carries
      // "how to play" text on the play screen — that is what the How to Play
      // screen is for, and it now demonstrates this exact drag.

      // Buttons
      const count = ref.trayShields.length;
      ref.trayShields.forEach((type, idx) => {
        const x = GAME_CONFIG.fieldWidth / 2 + (idx - (count - 1) / 2) * 80;
        const y = GAME_CONFIG.trayY + 50;

        // Premium Button styling with glowing pulsing rings
        const timeFactor = Date.now() / 1000;
        const pulse = 24 + Math.sin(timeFactor * 5) * 1.5;

        ctx.save();
        ctx.shadowColor = 'rgba(30, 107, 224, 0.5)';
        ctx.shadowBlur = 8 + Math.sin(timeFactor * 5) * 3;

        const slotGrad = ctx.createRadialGradient(x, y, 2, x, y, 24);
        slotGrad.addColorStop(0, 'rgba(30, 107, 224, 0.25)');
        slotGrad.addColorStop(0.8, 'rgba(15, 23, 42, 0.9)');
        slotGrad.addColorStop(1, 'rgba(30, 107, 224, 0.4)');

        ctx.fillStyle = slotGrad;
        ctx.strokeStyle = '#1E6BE0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Extra pulsing outer ring
        ctx.strokeStyle = 'rgba(30, 107, 224, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Mini preview inside button
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(0.5, 0.5);
        const typeInfo = SHIELD_TYPES[type];
        drawShield(ctx, { x: 0, y: 0, w: typeInfo.w, h: typeInfo.h, type, settled: true });
        ctx.restore();
      });
    }
  };

  const drawShield = (ctx, s) => {
    ctx.save();
    if (s.type === 'umbrella') {
      // Umbrella Canopy (Glossy curve)
      const domeR = SHIELD_TYPES.umbrella.domeR;
      const cx = s.x;
      const cy = s.y - s.h/2 + domeR; // dome center

      // Handle Stick
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, cy);
      ctx.lineTo(s.x, s.y + s.h/2 - 6);
      ctx.arc(s.x + 6, s.y + s.h/2 - 6, 6, Math.PI, Math.PI/2, true); // Hook
      ctx.stroke();

      // Tip spike
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.rect(s.x - 2, s.y - s.h/2 - 5, 4, 7);
      ctx.fill();

      // Dome Gradient
      const canopyGrad = ctx.createLinearGradient(cx - domeR, cy, cx + domeR, cy);
      canopyGrad.addColorStop(0, '#1E6BE0');
      canopyGrad.addColorStop(0.4, '#3B8DD4');
      canopyGrad.addColorStop(0.8, '#003DA6');
      canopyGrad.addColorStop(1, '#001B5A');
      ctx.fillStyle = canopyGrad;

      // Draw scalloped canopy path dynamically
      ctx.beginPath();
      ctx.arc(cx, cy + 5, domeR, Math.PI, 0); // main arc
      // 3 bottom scallops curving inwards dynamically
      const wScallop = (2 * domeR) / 3;
      ctx.quadraticCurveTo(s.x + domeR - wScallop / 2, cy - 2, s.x + domeR - wScallop, cy + 5);
      ctx.quadraticCurveTo(s.x, cy - 2, s.x - domeR + wScallop, cy + 5);
      ctx.quadraticCurveTo(s.x - domeR + wScallop / 2, cy - 2, s.x - domeR, cy + 5);
      ctx.fill();

      // Top highlighted rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy + 5, domeR, Math.PI, 0);
      ctx.stroke();
    } 
    else if (s.type === 'crate') {
      // Wood box Crate
      const left = s.x - s.w/2;
      const top = s.y - s.h/2;

      // Base Gradient
      const woodGrad = ctx.createLinearGradient(left, top, left + s.w, top + s.h);
      woodGrad.addColorStop(0, '#FF8A3D');
      woodGrad.addColorStop(1, '#F26522');
      ctx.fillStyle = woodGrad;
      ctx.strokeStyle = '#A83B08';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.roundRect(left, top, s.w, s.h, 6);
      ctx.fill();
      ctx.stroke();

      // Inside panel
      ctx.fillStyle = '#C2470F';
      ctx.beginPath();
      ctx.roundRect(left + 5, top + 5, s.w - 10, s.h - 10, 3);
      ctx.fill();

      // X Planks
      ctx.strokeStyle = '#A83B08';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(left + 8, top + 8);
      ctx.lineTo(left + s.w - 8, top + s.h - 8);
      ctx.moveTo(left + s.w - 8, top + 8);
      ctx.lineTo(left + 8, top + s.h - 8);
      ctx.stroke();

      // Gloss shimmer line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(left + 2, top + 2);
      ctx.lineTo(left + 24, top + 2);
      ctx.lineTo(left + 2, top + 24);
      ctx.closePath();
      ctx.fill();
    } 
    else if (s.type === 'barrel') {
      // Metal/wood oil Barrel
      const left = s.x - s.w/2;
      const top = s.y - s.h/2;

      // Body Gradient (Metallic cylinder)
      const barrelGrad = ctx.createLinearGradient(left, top, left + s.w, top);
      barrelGrad.addColorStop(0, '#112240');
      barrelGrad.addColorStop(0.3, '#1E6BE0');
      barrelGrad.addColorStop(0.7, '#0A3D91');
      barrelGrad.addColorStop(1, '#021028');
      ctx.fillStyle = barrelGrad;
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(left, top, s.w, s.h, 8);
      ctx.fill();
      ctx.stroke();

      // Metal bands
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(left, top + s.h * 0.28);
      ctx.lineTo(left + s.w, top + s.h * 0.28);
      ctx.moveTo(left, top + s.h * 0.72);
      ctx.lineTo(left + s.w, top + s.h * 0.72);
      ctx.stroke();

      // Highlight/Reflection stripe
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(left + s.w * 0.2, top, s.w * 0.15, s.h);
    }
    ctx.restore();
  };

  const drawFamilyMember = (ctx, m, tSec = 0) => {
    ctx.save();
    const typeInfo = MEMBER_TYPES[m.type];
    const safe = m.status === 'safe';
    const stormOn = stateRef.current.emitter.active;

    // Idle breathing bob draws the eye to the people you are protecting; it
    // switches to a nervous shake once the storm is actually running.
    let offX = 0;
    let offY = 0;
    let breathe = 1;
    if (safe) {
      if (stormOn) {
        offX = (Math.random() - 0.5) * 1.4;
        offY = (Math.random() - 0.5) * 0.6;
      } else {
        const phase = m.x * 0.05;
        offY = Math.sin(tSec * 1.9 + phase) * 2.2;
        breathe = 1 + Math.sin(tSec * 2.3 + phase) * 0.035;
      }
    }

    const cx = m.x + offX;
    const cy = m.y + offY;

    // Retrieve image ref
    let imgRef = null;
    if (m.type === 'dad') imgRef = dadImageRef.current;
    else if (m.type === 'mom') imgRef = momImageRef.current;
    else if (m.type === 'kid') imgRef = kidImageRef.current;
    else if (m.type === 'grandpa') imgRef = grandpaImageRef.current;

    if (imgRef) {
      const box = m.r * SPRITE_BOX_R;
      const feetY = m.y + m.r;      // the surface they stand on
      const torsoY = feetY - box * 0.42;

      // 1. Darken the playfield directly behind the character so the sprite has
      //    something to read against no matter what the background art does.
      const poolR = box * 0.62;
      const pool = ctx.createRadialGradient(m.x, torsoY, poolR * 0.15, m.x, torsoY, poolR);
      pool.addColorStop(0, 'rgba(2, 10, 26, 0.8)');
      pool.addColorStop(0.55, 'rgba(2, 10, 26, 0.48)');
      pool.addColorStop(1, 'rgba(2, 10, 26, 0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(m.x, torsoY, poolR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Contact shadow so they sit on the ground instead of floating.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(m.x, feetY, box * 0.24, box * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Pulsing floor ring — the "cover these" cue, kept at their feet so it
      //    frames the character instead of cutting across it.
      const pulse = safe ? 1 + Math.sin(tSec * 2.6 + m.x * 0.05) * 0.07 : 1;
      ctx.strokeStyle = safe ? 'rgba(255, 200, 69, 0.7)' : 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(m.x, feetY, box * 0.3 * pulse, box * 0.085 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Character sprite, anchored by the feet (see keyOutBackground for how
      //    contentBottom/contentCenterX are measured) so the legs are never
      //    buried in the ground. The cached canvas already carries the baked
      //    rim light, so there is no per-frame filter cost.
      ctx.save();
      ctx.translate(cx, feetY);
      ctx.scale(1, breathe);
      ctx.translate(-cx, -feetY);
      ctx.globalAlpha = safe ? 1 : 0.5;
      ctx.drawImage(
        imgRef,
        cx - box * (imgRef.contentCenterX ?? 0.5),
        cy + m.r - box * (imgRef.contentBottom ?? 0.9),
        box,
        box
      );
      ctx.restore();

      // If hit, mark them clearly
      if (!safe) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        const k = box * 0.16;
        ctx.beginPath();
        ctx.moveTo(cx - k, torsoY - k); ctx.lineTo(cx + k, torsoY + k);
        ctx.moveTo(cx + k, torsoY - k); ctx.lineTo(cx - k, torsoY + k);
        ctx.stroke();
      }
    } else {
      // Fallback to original vector code
      if (m.status === 'hit') {
        // Melted/hit look
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.arc(cx, cy, m.r, 0, Math.PI * 2);
        ctx.fill();
        
        // X eyes
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx - 1, cy - 1);
        ctx.moveTo(cx - 1, cy - 5); ctx.lineTo(cx - 5, cy - 1);
        ctx.moveTo(cx + 1, cy - 5); ctx.lineTo(cx + 5, cy - 1);
        ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx + 1, cy - 1);
        ctx.stroke();

        // Sad mouth
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 3, Math.PI, 0, false);
        ctx.stroke();
      } else {
        // Glow
        ctx.shadowColor = 'rgba(255,255,255,0.1)';
        ctx.shadowBlur = 8;

        // 1. Body Coat
        ctx.fillStyle = typeInfo.body;
        ctx.beginPath();
        ctx.arc(cx, cy + m.r/2, m.r, Math.PI, 0); // half circle body
        ctx.fill();

        // Accent collar / tie
        ctx.fillStyle = typeInfo.accent;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + m.r/2);
        ctx.lineTo(cx + 4, cy + m.r/2);
        ctx.lineTo(cx, cy + m.r/2 + 8);
        ctx.closePath();
        ctx.fill();

        // 2. Head
        ctx.fillStyle = typeInfo.skin;
        ctx.beginPath();
        ctx.arc(cx, cy - m.r/4, m.r * 0.72, 0, Math.PI * 2);
        ctx.fill();

        // 3. Hair details
        ctx.fillStyle = m.type === 'grandpa' ? '#E2E8F0' : '#475569';
        if (m.type === 'grandpa') {
          // Balding hair ring
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.arc(cx, cy - m.r/4, m.r * 0.75, Math.PI * 0.9, Math.PI * 0.1, true);
          ctx.stroke();
        } else if (m.type === 'mom') {
          // Long hair shape
          ctx.beginPath();
          ctx.arc(cx, cy - m.r/4, m.r * 0.78, Math.PI * 1.1, Math.PI * 1.9);
          ctx.lineTo(cx + m.r * 0.78, cy + m.r * 0.3);
          ctx.lineTo(cx - m.r * 0.78, cy + m.r * 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          // Standard cap/hair
          ctx.beginPath();
          ctx.arc(cx, cy - m.r/3, m.r * 0.6, Math.PI, 0);
          ctx.fill();
        }

        // 4. Face Expressions
        const isScared = stateRef.current.emitter.active;
        
        // Eyes
        ctx.fillStyle = '#0F172A';
        if (isScared) {
          // Wide circle eyes
          ctx.beginPath();
          ctx.arc(cx - 4, cy - m.r/4 - 1, 2, 0, Math.PI*2);
          ctx.arc(cx + 4, cy - m.r/4 - 1, 2, 0, Math.PI*2);
          ctx.fill();
        } else {
          // Happy dots
          ctx.beginPath();
          ctx.arc(cx - 3, cy - m.r/4, 1.5, 0, Math.PI*2);
          ctx.arc(cx + 3, cy - m.r/4, 1.5, 0, Math.PI*2);
          ctx.fill();
        }

        // Glasses for grandpa
        if (m.type === 'grandpa') {
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx - 4, cy - m.r/4, 3.5, 0, Math.PI*2);
          ctx.arc(cx + 4, cy - m.r/4, 3.5, 0, Math.PI*2);
          ctx.stroke();
        }

        // Mouth
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (isScared) {
          // Scared wavy line
          ctx.moveTo(cx - 3, cy + 3);
          ctx.quadraticCurveTo(cx, cy + 1, cx + 3, cy + 3);
        } else {
          // Big smile
          ctx.arc(cx, cy, 4, 0, Math.PI, false);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Coordinates Mapping for Drag-and-Drop
  const getLogicalCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * GAME_CONFIG.fieldWidth;
    const y = ((clientY - rect.top) / rect.height) * GAME_CONFIG.fieldHeight;
    
    return {
      x: Math.max(0, Math.min(GAME_CONFIG.fieldWidth, x)),
      y: Math.max(0, Math.min(GAME_CONFIG.fieldHeight, y))
    };
  };

  // Drag Handlers
  const handlePointerDown = (e) => {
    const ref = stateRef.current;
    if (gameState !== 'placement') return;
    const coords = getLogicalCoords(e);
    
    // Check if clicked in tray buttons
    const count = ref.trayShields.length;
    let clickedIdx = -1;

    for (let idx = 0; idx < count; idx++) {
      const btnX = GAME_CONFIG.fieldWidth / 2 + (idx - (count - 1) / 2) * 80;
      const btnY = GAME_CONFIG.trayY + 50;
      
      const dx = coords.x - btnX;
      const dy = coords.y - btnY;
      // Hit radius is larger than the drawn 24px slot so the touch target clears
      // 44 css px even on a 360-wide screen.
      if (dx*dx + dy*dy < 28*28) {
        clickedIdx = idx;
        break;
      }
    }

    if (clickedIdx !== -1) {
      // Start Dragging
      const type = ref.trayShields[clickedIdx];
      ref.dragState = { type, x: 0, y: 0, restY: 0, index: clickedIdx };
      updateDrag(coords);
      if (!ref.soundMuted) playSound('click');
    }
  };

  // Single source of truth for the carried position and the landing spot, so
  // pointerdown and pointermove can never place the ghost differently.
  const updateDrag = (coords) => {
    const drag = stateRef.current.dragState;
    const typeInfo = SHIELD_TYPES[drag.type];
    drag.x = clampX(coords.x, typeInfo.w);
    drag.restY = restYFor(drag.x, typeInfo.w, typeInfo.h);
    // Piece floats above the finger so it is not hidden by the hand, and never
    // below its own landing spot (so the plumb line always points down).
    drag.y = Math.min(drag.restY, Math.max(80, coords.y - 34));
  };

  const handlePointerMove = (e) => {
    const ref = stateRef.current;
    if (gameState !== 'placement' || !ref.dragState) return;
    updateDrag(getLogicalCoords(e));
  };

  const handlePointerUp = () => {
    const ref = stateRef.current;
    if (gameState !== 'placement' || !ref.dragState) return;

    const drag = ref.dragState;
    const typeInfo = SHIELD_TYPES[drag.type];

    // Placed straight onto the previewed resting spot; drop.fromY replays the
    // travel from the release point purely as animation.
    ref.shields.push({
      x: drag.x,
      y: drag.restY,
      w: typeInfo.w,
      h: typeInfo.h,
      type: drag.type,
      settled: true,
      drop: { fromY: drag.y, t: 0, landed: false },
    });

    // Remove from tray list
    ref.trayShields = ref.trayShields.filter((_, i) => i !== drag.index);
    ref.dragState = null;

    // Last shield placed -> short "storm incoming" beat, then the storm runs
    // itself. There is no manual start.
    if (ref.trayShields.length === 0) {
      ref.incomingT = PRE_STORM_SECONDS;
      ref.gameState = 'incoming';
      setGameState('incoming');
      haptic('light');
    }
  };

  // Start Storm Emitter Sweep. Ref-only (no props/state closure) because it is
  // called from the game loop, whose callbacks are captured on first render.
  const beginStorm = () => {
    const ref = stateRef.current;
    const lvl = LEVELS[ref.currentLevelIdx];

    ref.incomingT = 0;
    ref.gameState = 'storm';
    setGameState('storm');
    ref.emitter.active = true;
    ref.emitter.x = -30;
    ref.emitter.vx = lvl.storm.speed;
    ref.emitter.passes = lvl.storm.passes;
    ref.emitter.timer = 0;
    if (!ref.soundMuted) playSound('click');
  };

  const nextLevel = () => {
    if (levelIdx < GAME_CONFIG.totalRounds - 1) {
      stateRef.current.currentLevelIdx = levelIdx + 1;
      setLevelIdx(levelIdx + 1);
    } else {
      // Clear final round -> Win Game
      triggerGameOver(true);
    }
  };

  const retryLevel = () => {
    initLevel(levelIdx);
    if (!stateRef.current.soundMuted) playSound('click');
  };

  const triggerGameOver = (didWin) => {
    const ref = stateRef.current;
    ref.gameState = 'gameover';
    setGameState('gameover');

    // Freeze the session clock so the HUD does not keep counting down behind
    // the results screen.
    loopRef.current?.setPaused(true);

    let finalScore = ref.score;
    if (didWin) {
      // Apply time bonus
      const timeBonus = Math.floor(ref.timeLeft * GAME_CONFIG.timeBonusPerSecond);
      finalScore += timeBonus;
      ref.score = finalScore;
      setScore(finalScore);
      if (!ref.soundMuted) playSound('win');
      haptic('success');
      onWin({ score: finalScore });
    } else {
      if (!ref.soundMuted) playSound('lose');
      haptic('failure');
      onLose({ score: finalScore });
    }
  };

  const toggleSound = () => {
    stateRef.current.soundMuted = !stateRef.current.soundMuted;
    // Force a tiny interaction sound to activate context
    if (!stateRef.current.soundMuted) {
      playSound('click');
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 0',
      boxSizing: 'border-box'
    }}>
      {/* HUD Header */}
      <div style={{
        width: 'calc(100% - 20px)',
        height: 64,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        borderRadius: 16,
        padding: '0 18px',
        boxSizing: 'border-box',
        marginBottom: 12,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}>
        {/* Level and Storm Warn */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Round {levelIdx + 1} of {GAME_CONFIG.totalRounds}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginTop: 1 }}>
            {level.name}
          </div>
        </div>

        {/* Timer Countdown */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#FF8A3D', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Time Remaining
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
            {timeLeft}s
          </div>
        </div>

        {/* Score Counter */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#1E6BE0', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Total Score
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#28A745', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Canvas Wrap — edge to edge. Width is only pulled in when the viewport
          is too short to fit the 400x580 field below the HUD, so the playfield
          uses the whole screen width on every normal phone. */}
      <div
        style={{
          position: 'relative',
          width: 'min(100%, calc((100vh - 120px) * 400 / 580))',
          aspectRatio: '400/580',
          overflow: 'hidden',
          background: '#051a3a',
          touchAction: 'none' // Prevent pull-to-refresh
        }}
      >
        <canvas
          ref={canvasRef}
          width={400 * RENDER_DPR}
          height={580 * RENDER_DPR}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />

        {/* Auto-pause veil. Shown whenever the tab/app loses focus so the
            player understands why the game stopped, and returns to the exact
            state they left rather than a drained clock. */}
        {paused && gameState !== 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'rgba(5, 26, 58, 0.82)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 5,
            }}
          >
            <div style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">⏸</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Paused</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 240 }}>
              Your timer is safe. Tap anywhere to keep protecting your family.
            </div>
          </div>
        )}

        {/* Audio Mute toggle absolute inside Canvas */}
        <button
          onClick={toggleSound}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15
          }}
          aria-label="Toggle Sound"
        >
          {stateRef.current.soundMuted ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v6a3 3 0 0 0 3 3h1.586l4.707 4.707A1 1 0 0 0 20 22V4a1 1 0 0 0-1.707-.707L13.586 8H12a3 3 0 0 0-3 3z"></path>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          )}
        </button>

        {/* Pre-storm beat. The storm starts itself once the last shield lands,
            so this ~1.2s sweep is the warning the player gets. */}
        {gameState === 'incoming' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 12,
            overflow: 'hidden',
          }}>
            <div className="gs-storm-sweep" />
            <div className="gs-storm-alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>STORM INCOMING</span>
              <div className="gs-storm-fuse" />
            </div>
          </div>
        )}

        {/* Storm Banner Warning overlay */}
        {gameState === 'storm' && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.9)',
              color: '#fff',
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: '0.15em',
              padding: '6px 16px',
              borderRadius: 20,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
              animation: 'blink 1.2s infinite'
            }}>
              WARNING: ACID RAIN ACTIVE
            </div>
          </div>
        )}

        {/* Level Cleared Overlay */}
        {gameState === 'cleared' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.8)',
            zIndex: 20
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: 22,
              padding: '24px 28px',
              width: '85%',
              maxWidth: 320,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#28A745', textTransform: 'uppercase', marginBottom: 12 }}>
                Shelter Secure!
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4, margin: '0 0 20px 0' }}>
                All family members survived the storm. Your preemptive protection worked!
              </p>
              
              {/* Scoring breakdown */}
              <div style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 24,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
                  <span>Saved Members:</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{level.members.length} x 100</span>
                </div>
              </div>

              <button
                onClick={nextLevel}
                style={{
                  width: '100%',
                  height: 48,
                  border: 'none',
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, #1E6BE0 0%, #003DA6 100%)',
                  boxShadow: '0 4px 15px rgba(30, 107, 224, 0.4)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {levelIdx < GAME_CONFIG.totalRounds - 1 ? 'Next Round' : 'Finish Game'}
              </button>
            </div>
          </div>
        )}

        {/* Level Failed Overlay */}
        {gameState === 'failed' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.8)',
            zIndex: 20
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1.5px solid rgba(255,255,255,0.1)',
              borderRadius: 22,
              padding: '24px 28px',
              width: '85%',
              maxWidth: 320,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#EF4444', textTransform: 'uppercase', marginBottom: 12 }}>
                Shelter Failed
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4, margin: '0 0 24px 0' }}>
                A family member was hit by acid rain! Adjust your shield placement and try again.
              </p>

              <button
                onClick={retryLevel}
                style={{
                  width: '100%',
                  height: 48,
                  border: 'none',
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
                  boxShadow: '0 4px 15px rgba(242, 101, 34, 0.4)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                Retry Round
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

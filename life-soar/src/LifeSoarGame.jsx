import React, { useEffect, useRef, useState } from 'react';
import canyonBgImg from './canyon_bg.webp';
import gliderImg from './hang_glider.webp';
import virusImg from './assets/virus.webp';

// Decode the virus once and reuse the element; a new Image per frame is the
// classic way to turn a smooth canvas game into a stuttering one.
const VIRUS_SPRITE = typeof Image !== 'undefined' ? Object.assign(new Image(), { src: virusImg }) : null;
import { WORLD, FLIGHT, RAMP, LAYOUT, MILESTONES, SCORING } from './data.js';

// Derived from data.js — do not tune here, tune in data.js.
const WORLD_M_TO_PX = WORLD.metresToPx;
const MAX_DISTANCE = WORLD.maxDistanceM;
const WORLD_WIDTH = MAX_DISTANCE * WORLD_M_TO_PX;
const DURATION_SECONDS = WORLD.durationSeconds;

// Forward-speed multiplier for the difficulty ramp (1.0 at the start of the run).
const rampAt = (elapsedSec) =>
  RAMP.start + (RAMP.end - RAMP.start) * Math.min(1, elapsedSec / RAMP.seconds);

// Synth SFX Player (Web Audio API)
const playSynthSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'shield') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(349.23, now); // F4
      osc.frequency.setValueAtTime(523.25, now + 0.1); // C5
      osc.frequency.setValueAtTime(698.46, now + 0.2); // F5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.45);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'shield_break') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'milestone') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'win') {
      osc.type = 'sine';
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      });
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'lose') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.6);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
  }
};

export default function LifeSoarGame({ onWin, onLose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // React-accessible HUD States
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [hasShield, setHasShield] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [pressed, setPressed] = useState(false);   // touch-down visual feedback

  // Keep mutables inside refs for the canvas loop
  const stateRef = useRef({
    diveHeld: false,       // finger is physically down
    diveBufferUntil: 0,    // input buffer — a flick still dives until this ms
    x: WORLD.startX,
    y: 320,
    vx: FLIGHT.cruiseSpeed,
    vy: 0,
    coinsCollected: 0,
    hasShield: false,
    distanceM: 0,
    timeLeft: DURATION_SECONDS,
    gameOver: false,
    win: false,
    milestones: MILESTONES.map((m) => ({ ...m, unlocked: false })),
    particles: [], // sparks, dust
    cameraX: 0,
    screenShake: 0,
    lastTime: 0,
    elapsed: 0,            // seconds since the run started
    outOfBounds: 0,        // seconds spent clipping a wall (coyote time)
    coyoteFlash: 0,        // 0..1 danger vignette
    // procedural entities
    coins: [],
    shields: [],
    hazards: [],
  });

  // Height generator for undulating ceiling & floor
  const getCeilingY = (x, height) => {
    return Math.sin(x / 400) * 35 + Math.cos(x / 250) * 15 + 70;
  };

  const getFloorY = (x, height) => {
    return height - (Math.sin(x / 300) * 45 + Math.cos(x / 180) * 20 + 90);
  };

  // Load generated images
  const canyonBgRef = useRef(null);
  const gliderImgRef = useRef(null);

  useEffect(() => {
    const bg = new Image();
    bg.src = canyonBgImg;
    bg.onload = () => {
      canyonBgRef.current = bg;
    };
    const gld = new Image();
    gld.src = gliderImg;
    gld.onload = () => {
      // Create offscreen canvas to remove the solid white/black background
      const canvas = document.createElement('canvas');
      canvas.width = gld.width;
      canvas.height = gld.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(gld, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Get chroma key from top-left pixel (0,0)
        const rBg = data[0];
        const gBg = data[1];
        const bBg = data[2];
        const tolerance = 45;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const dist = Math.sqrt(
            (r - rBg) ** 2 +
            (g - gBg) ** 2 +
            (b - bBg) ** 2
          );

          // Clear pixels that match key color, or are close to pure white/pure black
          if (dist < tolerance || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) {
            data[i + 3] = 0; // Alpha = 0 (Transparent)
          }
        }
        ctx.putImageData(imgData, 0, 0);
        gliderImgRef.current = canvas; // Store transparent canvas as the glider drawable
      } catch (e) {
        console.error("Failed to make glider transparent, falling back to original", e);
        gliderImgRef.current = gld;
      }
    };
  }, []);

  // Generate game layout once
  useEffect(() => {
    const state = stateRef.current;
    const coinsList = [];
    const shieldsList = [];
    const hazardsList = [];

    // Pre-generate coins and shields in gaps between spikes, with spacing
    const baseHeight = 660;
    let slot = 0;
    for (let x = 400; x < WORLD_WIDTH - 500; x += LAYOUT.pickupSpacingPx, slot++) {
      // Don't place right on milestones to prevent overlapping
      const nearestMilestone = state.milestones.find(
        (m) => Math.abs(m.m * WORLD_M_TO_PX - x) < LAYOUT.milestoneClearancePx
      );
      if (nearestMilestone) continue;

      const cyCeiling = getCeilingY(x, baseHeight);
      const fyFloor = getFloorY(x, baseHeight);
      const centerY = (cyCeiling + fyFloor) / 2; // ~320px

      if (slot % LAYOUT.shieldEveryNPickups === 0) {
        shieldsList.push({ x, y: centerY + Math.sin(x) * 40, radius: 12, collected: false });
      } else {
        // Spawn small 3-coin cluster safely inside the navigable zone (around centerY)
        const count = 3;
        const pattern = slot % 3; // 0: wave, 1: diagonal, 2: straight horizontal

        for (let i = 0; i < count; i++) {
          const cx = x + i * 35;
          let cy = centerY;
          if (pattern === 0) {
            cy = centerY - Math.sin((i / (count - 1)) * Math.PI) * 55;
          } else if (pattern === 1) {
            cy = centerY - 50 + i * 35;
          } else {
            cy = centerY;
          }
          coinsList.push({ x: cx, y: cy, radius: 10, collected: false });
        }
      }
    }

    // Pre-generate static ceiling/floor spikes & floating hazards
    let hSlot = 0;
    for (let x = 500; x < WORLD_WIDTH - 300; x += LAYOUT.hazardSpacingPx, hSlot++) {
      const cyCeiling = getCeilingY(x, baseHeight);
      const fyFloor = getFloorY(x, baseHeight);
      const centerY = (cyCeiling + fyFloor) / 2;

      // Bobbing floating risk blob
      if (hSlot % LAYOUT.floatHazardEveryN === 0) {
        hazardsList.push({
          type: 'float',
          x,
          baseY: centerY,
          y: centerY,
          bobSpeed: 1.8 + (hSlot % 3) * 0.6, // rad/s
          bobRange: 50 + (hSlot % 2) * 20,
          radius: 14,
          angle: hSlot,
        });
      } else {
        // Ceiling spike
        hazardsList.push({
          type: 'ceiling_spike',
          x,
          y: 0, // dynamic ceiling attachment
          width: 32,
          height: 50,
        });
        // Floor spike
        hazardsList.push({
          type: 'floor_spike',
          x: x + LAYOUT.spikeOffsetPx,
          y: 0, // dynamic floor attachment
          width: 32,
          height: 50,
        });
      }
    }

    state.coins = coinsList;
    state.shields = shieldsList;
    state.hazards = hazardsList;
  }, []);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let skyGrad = null;
    let skyGradH = 0;

    // Handle high DPI screens
    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 430;
      const height = rect?.height || 660;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start timer countdown
    const timerInterval = setInterval(() => {
      const state = stateRef.current;
      if (state.gameOver) return;

      state.timeLeft -= 1;
      setTimeLeft(state.timeLeft);

      if (state.timeLeft <= 0) {
        triggerEnd(false);
      }
    }, 1000);

    const triggerEnd = (didWin) => {
      const state = stateRef.current;
      if (state.gameOver) return;
      state.gameOver = true;
      state.win = didWin;

      // Calculate final score
      const distanceScore = state.distanceM;
      const coinScore = state.coinsCollected * SCORING.perCoin;
      const stageScore = state.milestones.filter(m => m.unlocked).length * SCORING.perMilestone;
      const totalScore = Math.floor(distanceScore + coinScore + stageScore);

      playSynthSound(didWin ? 'win' : 'lose');

      setTimeout(() => {
        if (didWin) {
          onWin({ score: totalScore, distance: state.distanceM, coins: state.coinsCollected });
        } else {
          onLose({ score: totalScore, distance: state.distanceM, coins: state.coinsCollected });
        }
      }, 1000);
    };

    // Frame update
    const update = (timestamp) => {
      const state = stateRef.current;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      if (!state.lastTime) state.lastTime = timestamp;
      // Delta-time, clamped so a backgrounded tab or a dropped frame can't
      // teleport the glider through a wall.
      const dt = Math.min((timestamp - state.lastTime) / 1000, 1 / 20);
      state.lastTime = timestamp;

      // Input buffer: a flick-tap keeps diving for FLIGHT.inputBufferMs even if
      // the finger is already back up, so a slightly-early tap still counts.
      const isDiving = state.diveHeld || timestamp < state.diveBufferUntil;

      if (!state.gameOver) {
        state.elapsed += dt;

        // Difficulty ramp — only forward speed scales, so handling feel is constant.
        const ramp = rampAt(state.elapsed);
        const minSpeed = FLIGHT.minSpeed * ramp;
        const cruiseSpeed = FLIGHT.cruiseSpeed * ramp;
        const maxSpeed = FLIGHT.maxSpeed * ramp;
        const inGrace = state.elapsed < WORLD.graceSeconds;

        // --- 1. GLIDER PHYSICS (all px/s and px/s², scaled by dt) ---
        if (inGrace && !isDiving) {
          state.vy = 0;
          state.vx = cruiseSpeed;
          const cyCeiling = getCeilingY(state.x, height);
          const fyFloor = getFloorY(state.x, height);
          state.y = (cyCeiling + fyFloor) / 2; // lock to center
        } else {
          // Gravity
          state.vy += FLIGHT.gravity * dt;

          if (isDiving) {
            // Hold to Dive
            state.vy += FLIGHT.diveAccelY * dt;
            state.vx = Math.min(state.vx + FLIGHT.diveAccelX * dt, maxSpeed);

            // Spawn dive trail particles
            if (Math.random() < 18 * dt) {
              state.particles.push({
                x: state.x - 15,
                y: state.y + (Math.random() - 0.5) * 8,
                vx: -state.vx * 0.4 + (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 120,
                color: 'rgba(242, 105, 34, 0.65)',
                size: 3 + Math.random() * 4,
                life: 1.0,
                decay: 3.0
              });
            }
          } else {
            // Release to lift (convert speed into lift)
            const excessSpeed = Math.max(0, state.vx - minSpeed);
            const lift = FLIGHT.cruiseLift + excessSpeed * FLIGHT.liftPerExcessSpeed;
            state.vy -= lift * dt;

            // Drag decelerates glider back to baseline speed
            state.vx = Math.max(state.vx - FLIGHT.dragX * dt, minSpeed);

            // Spawn wind trail particles
            if (Math.random() < 12 * dt) {
              state.particles.push({
                x: state.x - 15,
                y: state.y + (Math.random() - 0.5) * 6,
                vx: -state.vx * 0.5,
                vy: state.vy * 0.2,
                color: 'rgba(255, 255, 255, 0.45)',
                size: 2 + Math.random() * 3,
                life: 0.8,
                decay: 2.4
              });
            }
          }
        }

        // Clamp velocities
        state.vy = Math.max(-FLIGHT.maxRiseSpeed, Math.min(state.vy, FLIGHT.maxFallSpeed));
        state.vx = Math.max(minSpeed, Math.min(state.vx, maxSpeed));

        // Update Position
        state.x += state.vx * dt;
        state.y += state.vy * dt;

        // Map world X to distance in meters
        state.distanceM = Math.floor(state.x / WORLD_M_TO_PX);
        setDistance(state.distanceM);

        // Win check
        if (state.distanceM >= MAX_DISTANCE) {
          state.distanceM = MAX_DISTANCE;
          triggerEnd(true);
        }

        // --- 2. COLLISION WITH CANYON BOUNDS (with coyote time) ---
        state.coyoteFlash = Math.max(0, state.coyoteFlash - dt * 4);
        if (!inGrace) {
          const cy = getCeilingY(state.x, height);
          const fy = getFloorY(state.x, height);
          const gliderRadius = FLIGHT.gliderRadius;
          const outTop = state.y - gliderRadius < cy;
          const outBottom = state.y + gliderRadius > fy;

          if (outTop || outBottom) {
            if (state.hasShield) {
              state.outOfBounds = 0;
              // Shield protects from 1 crash
              state.hasShield = false;
              setHasShield(false);
              playSynthSound('shield_break');
              state.screenShake = 16;
              
              // Push player away from boundary
              if (outTop) {
                state.y = cy + gliderRadius + 5;
                state.vy = 120;
              } else {
                state.y = fy - gliderRadius - 5;
                state.vy = -180;
              }

              // Create blast particles
              for (let i = 0; i < 15; i++) {
                state.particles.push({
                  x: state.x,
                  y: state.y,
                  vx: (Math.random() - 0.5) * 480,
                  vy: (Math.random() - 0.5) * 480,
                  color: 'rgba(59, 141, 212, 0.8)',
                  size: 4 + Math.random() * 5,
                  life: 1.0,
                  decay: 2.4
                });
              }
            } else {
              // Coyote time — scrape along the rock for a beat before it kills.
              // Inward momentum is killed so the glider grinds instead of burying.
              state.outOfBounds += dt;
              state.coyoteFlash = 1;
              if (outTop) {
                state.y = cy + gliderRadius * 0.9;
                if (state.vy < 0) state.vy = 0;
              } else {
                state.y = fy - gliderRadius * 0.9;
                if (state.vy > 0) state.vy = 0;
              }
              // Scrape sparks so the near-miss is legible
              if (Math.random() < 30 * dt) {
                state.particles.push({
                  x: state.x,
                  y: state.y,
                  vx: -state.vx * 0.5,
                  vy: (outTop ? 1 : -1) * (60 + Math.random() * 120),
                  color: 'rgba(255, 170, 60, 0.9)',
                  size: 2 + Math.random() * 3,
                  life: 1.0,
                  decay: 4.0
                });
              }

              if (state.outOfBounds >= FLIGHT.coyoteMs / 1000) {
                // Crash!
                state.screenShake = 22;
                playSynthSound('hit');
                // Create explosion particles
                for (let i = 0; i < 20; i++) {
                  state.particles.push({
                    x: state.x,
                    y: state.y,
                    vx: (Math.random() - 0.5) * 600,
                    vy: (Math.random() - 0.5) * 600,
                    color: 'rgba(239, 68, 68, 0.85)',
                    size: 5 + Math.random() * 6,
                    life: 1.0,
                    decay: 1.8
                  });
                }
                triggerEnd(false);
              }
            }
          } else {
            // Recover the coyote budget at 2x, so repeated scraping still punishes.
            state.outOfBounds = Math.max(0, state.outOfBounds - dt * 2);
          }
        }

        // --- 3. ENTITY INTERACTIONS ---
        const gliderRadius = FLIGHT.gliderRadius;
        // Coin collection
        state.coins.forEach(c => {
          if (!c.collected && Math.hypot(state.x - c.x, state.y - c.y) < c.radius + gliderRadius) {
            c.collected = true;
            state.coinsCollected += 1;
            setCoins(state.coinsCollected);
            playSynthSound('coin');
            // Coin spark particles
            for (let i = 0; i < 6; i++) {
              state.particles.push({
                x: c.x,
                y: c.y,
                vx: (Math.random() - 0.5) * 240,
                vy: (Math.random() - 0.5) * 240,
                color: '#FACC15',
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 4.8
              });
            }
          }
        });

        // Shield collection
        state.shields.forEach(s => {
          if (!s.collected && Math.hypot(state.x - s.x, state.y - s.y) < s.radius + gliderRadius) {
            s.collected = true;
            if (!state.hasShield) {
              state.hasShield = true;
              setHasShield(true);
              playSynthSound('shield');
            }
            // Blue spark particles
            for (let i = 0; i < 10; i++) {
              state.particles.push({
                x: s.x,
                y: s.y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                color: '#3B8DD4',
                size: 2.5 + Math.random() * 3.5,
                life: 1.0,
                decay: 4.2
              });
            }
          }
        });

        // Hazard Collision (disabled during the opening grace period)
        state.hazards.forEach(h => {
          // Bobbing hazards animate even in grace so the scene reads as alive
          if (h.type === 'float') {
            h.angle += h.bobSpeed * dt;
            h.y = h.baseY + Math.sin(h.angle) * h.bobRange;
          }
          if (inGrace) return;

          const hx = h.x;
          let collided = false;

          if (h.type === 'float') {
            collided = Math.hypot(state.x - hx, state.y - h.y) < (h.radius || 15) + gliderRadius;
          } else {
            // Real triangle test: the spike narrows toward its tip, so clipping
            // the outer edge is survivable instead of a flat radius kill-box.
            const halfW = h.width / 2 + gliderRadius * 0.55;
            const dx = Math.abs(state.x - hx);
            if (dx < halfW) {
              const reach = h.height * (1 - dx / halfW);
              if (h.type === 'ceiling_spike') {
                collided = state.y - gliderRadius < getCeilingY(hx, height) + reach;
              } else {
                collided = state.y + gliderRadius > getFloorY(hx, height) - reach;
              }
            }
          }

          if (collided) {
            // Remove hazard to avoid multi-hitting
            state.hazards = state.hazards.filter(item => item !== h);

            if (state.hasShield) {
              state.hasShield = false;
              setHasShield(false);
              playSynthSound('shield_break');
              state.screenShake = 14;
              for (let i = 0; i < 12; i++) {
                state.particles.push({
                  x: state.x,
                  y: state.y,
                  vx: (Math.random() - 0.5) * 420,
                  vy: (Math.random() - 0.5) * 420,
                  color: 'rgba(59, 141, 212, 0.75)',
                  size: 3 + Math.random() * 4,
                  life: 1.0,
                  decay: 3.6
                });
              }
            } else {
              // Crash
              state.screenShake = 22;
              playSynthSound('hit');
              for (let i = 0; i < 18; i++) {
                state.particles.push({
                  x: state.x,
                  y: state.y,
                  vx: (Math.random() - 0.5) * 540,
                  vy: (Math.random() - 0.5) * 540,
                  color: 'rgba(220, 38, 38, 0.85)',
                  size: 4.5 + Math.random() * 5.5,
                  life: 1.0,
                  decay: 2.4
                });
              }
              triggerEnd(false);
            }
          }
        });

        // --- 4. MILESTONES DETECTION ---
        state.milestones.forEach(m => {
          const mX = m.m * WORLD_M_TO_PX;
          if (!m.unlocked && state.x >= mX) {
            m.unlocked = true;
            setActiveMilestone(m);
            playSynthSound('milestone');
            
            // Clear milestone banner after 3 seconds
            setTimeout(() => {
              setActiveMilestone(prev => prev && prev.m === m.m ? null : prev);
            }, 3000);

            // Celebration sparks
            for (let i = 0; i < 25; i++) {
              state.particles.push({
                x: state.x,
                y: state.y,
                vx: -120 + Math.random() * 360,
                vy: -180 + Math.random() * 360,
                color: m.color,
                size: 3 + Math.random() * 4,
                life: 1.2,
                decay: 2.4
              });
            }
          }
        });

        // --- 5. CAMERA & SHAKE SCROLL ---
        state.cameraX = state.x - WORLD.cameraLeadPx;
        state.screenShake = state.screenShake > 0.1
          ? state.screenShake * Math.pow(0.88, dt * 60)
          : 0;
      }

      // Update Particles
      state.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
      });
      state.particles = state.particles.filter(p => p.life > 0);

      // --- 6. RENDER SCENE ---
      ctx.clearRect(0, 0, width, height);

      // Apply screen shake
      ctx.save();
      if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
      }

      // Parallax Day-Sky Gradient (cached — no per-frame allocation)
      if (!skyGrad || skyGradH !== height) {
        skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#040d21');   // Deep space blue
        skyGrad.addColorStop(0.4, '#0e2b5e'); // Midnight blue
        skyGrad.addColorStop(0.8, '#1e5ca1'); // Sky blue
        skyGrad.addColorStop(1, '#ff9e59');   // Horizon warm glow
        skyGradH = height;
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw Sun
      ctx.beginPath();
      ctx.arc(width * 0.75, height * 0.35, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 230, 180, 0.45)';
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#ffbb77';
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Draw background image
      if (canyonBgRef.current) {
        const bg = canyonBgRef.current;
        const bgWidth = height * (bg.width / bg.height);
        const bgScrollX = (state.cameraX * 0.3) % bgWidth;
        ctx.save();
        ctx.globalAlpha = 0.85; // nicely blends with the sky gradient and sun
        ctx.drawImage(bg, -bgScrollX, 0, bgWidth, height);
        ctx.drawImage(bg, -bgScrollX + bgWidth, 0, bgWidth, height);
        ctx.restore();
      } else {
        // Fallback: Parallax Background Rock Layer 1 (Slowest)
        ctx.fillStyle = 'rgba(10, 31, 74, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let px = 0; px <= width; px += 40) {
          const worldX = px + state.cameraX * 0.2;
          const py = height - 180 + Math.sin(worldX / 500) * 45 + Math.cos(worldX / 300) * 15;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(width, height);
        ctx.fill();

        // Parallax Background Rock Layer 2 (Mid-speed)
        ctx.fillStyle = 'rgba(16, 48, 107, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let px = 0; px <= width; px += 30) {
          const worldX = px + state.cameraX * 0.5;
          const py = height - 130 + Math.sin(worldX / 300) * 35 + Math.cos(worldX / 160) * 10;
          ctx.lineTo(px, py);
        }
        ctx.lineTo(width, height);
        ctx.fill();
      }

      // Draw Milestone Flags / Markers in background
      state.milestones.forEach(m => {
        const mX = m.m * WORLD_M_TO_PX - state.cameraX;
        if (mX > -100 && mX < width + 100) {
          // Dotted line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(mX, 0);
          ctx.lineTo(mX, height);
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // Milestone ground sign
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(mX - 45, height - 70, 90, 20);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 9px Poppins';
          ctx.textAlign = 'center';
          ctx.fillText(`${m.name} ${m.m}m`, mX, height - 56);
        }
      });

      // Draw Collectibles (Coins & Shields)
      state.coins.forEach(c => {
        const cx = c.x - state.cameraX;
        if (cx > -c.radius && cx < width + c.radius && !c.collected) {
          // Draw Gold Coin
          ctx.beginPath();
          ctx.arc(cx, c.y, c.radius, 0, Math.PI * 2);
          const coinGrad = ctx.createRadialGradient(cx - 3, c.y - 3, 2, cx, c.y, c.radius);
          coinGrad.addColorStop(0, '#FFE875');
          coinGrad.addColorStop(0.7, '#FACC15');
          coinGrad.addColorStop(1, '#CA8A04');
          ctx.fillStyle = coinGrad;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Inner rim
          ctx.beginPath();
          ctx.arc(cx, c.y, c.radius - 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rupee Symbol ₹
          ctx.fillStyle = '#854D0E';
          ctx.font = 'bold 11px Poppins';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₹', cx, c.y + 0.5);
        }
      });

      state.shields.forEach(s => {
        const sx = s.x - state.cameraX;
        if (sx > -s.radius && sx < width + s.radius && !s.collected) {
          // Draw Blue Shield Token
          ctx.beginPath();
          ctx.moveTo(sx, s.y - s.radius);
          ctx.lineTo(sx + s.radius * 0.9, s.y - s.radius * 0.5);
          ctx.lineTo(sx + s.radius * 0.8, s.y + s.radius * 0.4);
          ctx.quadraticCurveTo(sx, s.y + s.radius * 1.1, sx - s.radius * 0.8, s.y + s.radius * 0.4);
          ctx.lineTo(sx - s.radius * 0.9, s.y - s.radius * 0.5);
          ctx.closePath();

          const shieldGrad = ctx.createLinearGradient(sx, s.y - s.radius, sx, s.y + s.radius);
          shieldGrad.addColorStop(0, '#60A5FA');
          shieldGrad.addColorStop(1, '#2563EB');
          ctx.fillStyle = shieldGrad;
          ctx.strokeStyle = '#93C5FD';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.7)';
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Inner cross
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, s.y - s.radius * 0.4);
          ctx.lineTo(sx, s.y + s.radius * 0.4);
          ctx.moveTo(sx - s.radius * 0.4, s.y);
          ctx.lineTo(sx + s.radius * 0.4, s.y);
          ctx.stroke();
        }
      });

      // Draw Hazards (Ceiling Spikes, Floor Spikes, Bobbing Viruses)
      state.hazards.forEach(h => {
        const hx = h.x - state.cameraX;
        if (hx > -50 && hx < width + 50) {
          if (h.type === 'ceiling_spike') {
            const topY = getCeilingY(h.x, height);
            ctx.beginPath();
            ctx.moveTo(hx - h.width / 2, topY - 2);
            ctx.lineTo(hx + h.width / 2, topY - 2);
            ctx.lineTo(hx, topY + h.height);
            ctx.closePath();

            // Dark red gradient for hazards
            const grad = ctx.createLinearGradient(hx, topY, hx, topY + h.height);
            grad.addColorStop(0, '#B91C1C');
            grad.addColorStop(1, '#7F1D1D');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
          } else if (h.type === 'floor_spike') {
            const botY = getFloorY(h.x, height);
            ctx.beginPath();
            ctx.moveTo(hx - h.width / 2, botY + 2);
            ctx.lineTo(hx + h.width / 2, botY + 2);
            ctx.lineTo(hx, botY - h.height);
            ctx.closePath();

            const grad = ctx.createLinearGradient(hx, botY, hx, botY - h.height);
            grad.addColorStop(0, '#B91C1C');
            grad.addColorStop(1, '#7F1D1D');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
          } else if (h.type === 'float') {
            // The risk antagonist, and the one thing the style guide fixes across
            // the whole portfolio: it is always the green virus. Drawn from the
            // shared painting, with the arc-and-spokes version kept underneath
            // for the frame before the image decodes.
            const r = h.radius;
            if (VIRUS_SPRITE && VIRUS_SPRITE.complete && VIRUS_SPRITE.naturalWidth) {
              const d = r * 2.6;
              ctx.save();
              ctx.translate(hx, h.y);
              // Slow spin, so it reads as alive rather than pasted on.
              ctx.rotate(Math.sin(state.elapsed * 1.6 + h.x) * 0.18);
              ctx.shadowBlur = 12;
              ctx.shadowColor = 'rgba(22, 163, 74, 0.45)';
              ctx.drawImage(VIRUS_SPRITE, -d / 2, -d / 2, d, d);
              ctx.restore();
              ctx.shadowBlur = 0;
            } else {
              // Bobbing Green Virus
              ctx.beginPath();
              ctx.arc(hx, h.y, h.radius, 0, Math.PI * 2);
              const virusGrad = ctx.createRadialGradient(hx - 3, h.y - 3, 2, hx, h.y, h.radius);
              virusGrad.addColorStop(0, '#4ADE80');
              virusGrad.addColorStop(0.7, '#16A34A');
              virusGrad.addColorStop(1, '#14532D');
              ctx.fillStyle = virusGrad;
              ctx.strokeStyle = '#22C55E';
              ctx.lineWidth = 1.5;
              ctx.shadowBlur = 10;
              ctx.shadowColor = 'rgba(22, 163, 74, 0.4)';
              ctx.fill();
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Spikes on the virus blob
              const numSpikes = 8;
              ctx.strokeStyle = '#22C55E';
              ctx.lineWidth = 2.5;
              for (let i = 0; i < numSpikes; i++) {
                const ang = (i / numSpikes) * Math.PI * 2 + state.elapsed * 3;
                const sx1 = hx + Math.cos(ang) * h.radius;
                const sy1 = h.y + Math.sin(ang) * h.radius;
                const sx2 = hx + Math.cos(ang) * (h.radius + 6);
                const sy2 = h.y + Math.sin(ang) * (h.radius + 6);
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx2, sy2);
                ctx.stroke();

                // Spike cap
                ctx.beginPath();
                ctx.arc(sx2, sy2, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#EF4444'; // Red spiky tips
                ctx.fill();
              }
            }
          }
        }
      });

      // Draw undulating ceiling & floor (Canyon Walls)
      ctx.fillStyle = '#0a172e';
      ctx.strokeStyle = 'rgba(59, 141, 212, 0.4)';
      ctx.lineWidth = 3;

      // Draw Ceiling
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      for (let px = -10; px <= width + 10; px += 20) {
        const worldX = px + state.cameraX;
        const cy = getCeilingY(worldX, height);
        ctx.lineTo(px, cy);
      }
      ctx.lineTo(width + 10, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Floor
      ctx.beginPath();
      ctx.moveTo(-10, height + 10);
      for (let px = -10; px <= width + 10; px += 20) {
        const worldX = px + state.cameraX;
        const fy = getFloorY(worldX, height);
        ctx.lineTo(px, fy);
      }
      ctx.lineTo(width + 10, height + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Particles
      state.particles.forEach(p => {
        const px = p.x - state.cameraX;
        if (px > -p.size && px < width + p.size) {
          ctx.beginPath();
          ctx.arc(px, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1.0; // reset

      // --- Draw Glider (Player) ---
      const playerScreenX = state.x - state.cameraX;
      if (!state.gameOver) {
        ctx.save();
        ctx.translate(playerScreenX, state.y);

        // Rotation based on movement vector
        const angle = Math.atan2(state.vy, state.vx) * 0.85;
        ctx.rotate(angle);

        // Glow shield overlay
        if (state.hasShield) {
          ctx.beginPath();
          ctx.arc(0, -4, 25, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#60A5FA';
          ctx.stroke();
          ctx.fillStyle = 'rgba(96, 165, 250, 0.15)';
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }

        // Draw Glider (use loaded generated image or vector fallback)
        if (gliderImgRef.current) {
          // Draw generated hang glider sprite centered at (0, -4).
          // The dimensions are scaled to preserve detail but fit the gameplay collision circle.
          ctx.drawImage(gliderImgRef.current, -26, -20, 52, 34);
        } else {
          // Fallback: Draw Glider Structure (Hang glider triangle shape)
          // Main wing
          ctx.beginPath();
          ctx.moveTo(-22, 6);
          ctx.lineTo(0, -16);
          ctx.lineTo(22, 6);
          ctx.lineTo(0, 0);
          ctx.closePath();

          const gliderGrad = ctx.createLinearGradient(0, -16, 0, 6);
          gliderGrad.addColorStop(0, '#60A5FA'); // Light blue
          gliderGrad.addColorStop(1, '#005BAC'); // Deep brand blue
          ctx.fillStyle = gliderGrad;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();

          // Control bar & pilot
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-10, 4);
          ctx.lineTo(0, 12);
          ctx.lineTo(10, 4);
          ctx.stroke();

          // Pilot body (head and backpack)
          ctx.beginPath();
          ctx.arc(0, 7, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#F59E0B'; // Orange helmet
          ctx.fill();
        }

        ctx.restore();
      }

      ctx.restore(); // restore screen shake translation

      // Coyote-time danger vignette — you are scraping the rock, pull away NOW.
      if (state.coyoteFlash > 0) {
        ctx.save();
        ctx.globalAlpha = state.coyoteFlash * 0.9;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        ctx.restore();
      }

      // Keep animation running
      if (!state.gameOver) {
        animationId = requestAnimationFrame(update);
      }
    };

    animationId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [onWin, onLose]);

  // Pointer events cover mouse + touch + pen with one path, and pointer capture
  // means sliding the thumb off the play area never drops the hold.
  const handleStartDive = (e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    const s = stateRef.current;
    s.diveHeld = true;
    // Input buffer: even a flick that releases instantly dives for this long.
    s.diveBufferUntil = performance.now() + FLIGHT.inputBufferMs;
    setPressed(true);
  };

  const handleEndDive = (e) => {
    e.preventDefault();
    stateRef.current.diveHeld = false;
    setPressed(false);
  };

  // Safe percentage calculation for milestone display
  const progressPercent = Math.min(100, (distance / MAX_DISTANCE) * 100);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 430,
        aspectRatio: '430/660',
        margin: 'auto',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 20,
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Full-bleed input zone — the whole play area is the button, so a thumb
          anywhere in portrait works one-handed. Sits under the HUD (z 10). */}
      <div
        onPointerDown={handleStartDive}
        onPointerUp={handleEndDive}
        onPointerCancel={handleEndDive}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        aria-label="Hold to dive, release to soar"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          cursor: 'pointer',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          background: pressed
            ? 'radial-gradient(ellipse at 50% 100%, rgba(242,101,34,0.30) 0%, rgba(242,101,34,0.10) 40%, transparent 72%)'
            : 'transparent',
          transition: 'background 90ms linear',
        }}
      >
        {/* Touch-down feedback bar — full width, 56px tall, ≥44px target */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            letterSpacing: '0.3em',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            color: pressed ? '#fff' : 'rgba(255,255,255,0.55)',
            background: pressed
              ? 'linear-gradient(0deg, rgba(242,101,34,0.70) 0%, rgba(242,101,34,0.05) 100%)'
              : 'linear-gradient(0deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)',
            borderTop: pressed
              ? '2px solid rgba(255,180,120,0.95)'
              : '2px solid rgba(255,255,255,0.16)',
            transform: pressed ? 'translateY(0)' : 'translateY(2px)',
            transition: 'background 90ms linear, color 90ms linear, transform 90ms linear',
            textShadow: '0 2px 6px rgba(0,0,0,0.7)',
          }}
        >
          {/* State, not instruction. "Hold anywhere" told the player how to
              play mid-run, which the review asked every title to drop. */}
          <span>{pressed ? 'Diving' : 'Gliding'}</span>
        </div>
      </div>

      {/* --- HUD OVERLAYS (Glassmorphic) --- */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {/* Left Info: Distance & Progress */}
        <div
          className="ls-chip"
          style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 100,
          }}
        >
          <span className="hud-label">DISTANCE</span>
          <span className="ls-num" style={{ fontSize: 18, color: '#fff' }}>
            {distance} <span style={{ fontSize: 11, fontWeight: 'normal', color: 'rgba(255,255,255,0.7)' }}>meters</span>
          </span>
          {/* Progress bar */}
          <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: '#3B8DD4', borderRadius: 2 }} />
          </div>
        </div>

        {/* Right Info: Shield / Coins / Time */}
        <div
          className="ls-chip"
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Coins */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="hud-label">WEALTH</span>
            <span className="ls-num" style={{ fontSize: 18, color: '#FACC15', display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 13 }}>₹</span>{coins}
            </span>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' }} />

          {/* Shield Status */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="hud-label">SHIELD</span>
            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center' }}>
              {hasShield ? (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  backgroundColor: '#3B8DD4', border: '1.5px solid #fff',
                  boxShadow: '0 0 8px #60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)', border: '1.5px dashed rgba(255,255,255,0.4)'
                }} />
              )}
            </div>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' }} />

          {/* Time Remaining */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="hud-label">TIME</span>
            <span className="ls-num" style={{ fontSize: 18, color: timeLeft < 15 ? '#EF4444' : '#fff' }}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* --- MILESTONE COMPACT TOAST --- */}
      {activeMilestone && (
        <div
          style={{
            position: 'absolute',
            top: 78,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: 270,
            background: 'rgba(5, 20, 48, 0.9)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            backdropFilter: 'blur(12px) saturate(140%)',
            border: `1.5px solid ${activeMilestone.color}`,
            borderRadius: 14,
            padding: '8px 12px',
            textAlign: 'center',
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.3), 0 0 8px ${activeMilestone.color}44`,
            animation: 'ls-rise 250ms cubic-bezier(.2, .8, .2, 1) both',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <div style={{
            display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
            backgroundColor: `${activeMilestone.color}22`, color: activeMilestone.color,
            fontSize: 8, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2
          }}>
            Stage Cleared
          </div>
          <h3 style={{ margin: '0 0 2px 0', fontSize: 13, fontWeight: 800, color: '#fff' }}>
            {activeMilestone.name} <span style={{ fontWeight: 'normal', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>({activeMilestone.m}m)</span>
          </h3>
          <p style={{ margin: 0, fontSize: 9.5, color: '#93C5FD', fontWeight: 500, lineHeight: 1.25 }}>
            💡 {activeMilestone.tip}
          </p>
        </div>
      )}

      {/* Tap Instruction Indicator (shows through the opening grace period) */}
      {distance < 80 && (
        <div
          style={{
            position: 'absolute',
            bottom: '26%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div className="tap-ring">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ transform: 'rotate(-30deg)' }}>
              <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
            </svg>
          </div>
          <span className="tap-hint-label" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
            Hold to Dive · Release to Soar
          </span>
        </div>
      )}
    </div>
  );
}

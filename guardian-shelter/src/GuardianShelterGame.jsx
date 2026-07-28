// GuardianShelterGame.jsx — Preemptive risk protection physics gameplay.
// 2D physics engine: gravity, AABB/circle collisions, stacking, bouncing virus storm.
import React, { useRef, useEffect, useState } from 'react';
import { COLORS, GAME_CONFIG, SHIELD_TYPES, MEMBER_TYPES, LEVELS } from './data.js';

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
    } else if (type === 'virus_bounce') {
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
  
  // React State for HUD & Screen UI
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.sessionSeconds);
  const [gameState, setGameState] = useState('placement'); // placement | storm | failed | cleared | gameover
  const [trayShields, setTrayShields] = useState([]);
  const [placedCount, setPlacedCount] = useState(0);
  
  // Game Loop Refs
  const stateRef = useRef({
    gameState: 'placement',
    currentLevelIdx: 0,
    score: 0,
    timeLeft: GAME_CONFIG.sessionSeconds,
    shields: [],       // placed shields { x, y, vx, vy, w, h, type, settled }
    viruses: [],       // active viruses { x, y, vx, vy, bounces, life }
    particles: [],     // cosmetic particles { x, y, vx, vy, color, size, life, maxLife }
    family: [],        // family members { type, x, y, r, status }
    emitter: { x: -20, y: GAME_CONFIG.emitterY, vx: 0, active: false, timer: 0, passes: 1 },
    dragState: null,   // { type, x, y, index } (index is tray index)
    lastTime: 0,
    roundWon: false,
    soundMuted: false,
  });

  const level = LEVELS[levelIdx];

  // Initialize Level
  useEffect(() => {
    initLevel(levelIdx);
  }, [levelIdx]);

  // Global Session Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (stateRef.current.gameState !== 'cleared' && stateRef.current.gameState !== 'gameover') {
        stateRef.current.timeLeft = Math.max(0, stateRef.current.timeLeft - 1);
        setTimeLeft(stateRef.current.timeLeft);
        if (stateRef.current.timeLeft <= 0) {
          triggerGameOver(false);
          clearInterval(timer);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Main Animation Game Loop
  useEffect(() => {
    let animFrame;
    const loop = (timestamp) => {
      if (!stateRef.current.lastTime) stateRef.current.lastTime = timestamp;
      const dt = Math.min((timestamp - stateRef.current.lastTime) / 1000, 0.03); // Cap lag frames
      stateRef.current.lastTime = timestamp;

      updatePhysics(dt);
      drawGame();

      animFrame = requestAnimationFrame(loop);
    };
    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const initLevel = (idx) => {
    const lvl = LEVELS[idx];
    const ref = stateRef.current;
    ref.shields = [];
    ref.viruses = [];
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
    
    // Set up family members
    ref.family = lvl.members.map((m) => {
      const typeInfo = MEMBER_TYPES[m.type];
      let y = GAME_CONFIG.groundY - typeInfo.r;
      if (m.on !== 'ground' && lvl.platforms[m.on]) {
        y = lvl.platforms[m.on].y - typeInfo.r;
      }
      return {
        type: m.type,
        x: m.x,
        y: y,
        r: typeInfo.r,
        status: 'safe',
      };
    });

    setTrayShields([...lvl.shields]);
    setPlacedCount(0);
    setGameState('placement');
    ref.gameState = 'placement';
  };

  // Stacking AABB Helper
  const AABBIntersect = (boxA, boxB) => {
    const leftA = boxA.x - boxA.w/2;
    const rightA = boxA.x + boxA.w/2;
    const topA = boxA.y - boxA.h/2;
    const bottomA = boxA.y + boxA.h/2;

    const leftB = boxB.x - boxB.w/2;
    const rightB = boxB.x + boxB.w/2;
    const topB = boxB.y - boxB.h/2;
    const bottomB = boxB.y + boxB.h/2;

    return !(rightA <= leftB || leftA >= rightB || bottomA <= topB || topA >= bottomB);
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

    // 1. Update falling shields
    ref.shields.forEach((s) => {
      if (!s.settled) {
        s.vy += GAME_CONFIG.gravity * dt;
        s.y += s.vy * dt;

        // Ground check
        if (s.y + s.h/2 >= GAME_CONFIG.groundY) {
          s.y = GAME_CONFIG.groundY - s.h/2;
          s.vy = 0;
          s.settled = true;
          if (!ref.soundMuted) playSound('shield_drop');
          spawnDust(s.x, GAME_CONFIG.groundY, s.w);
        }

        // Platform checks
        lvl.platforms.forEach((p) => {
          if (!s.settled && AABBIntersect(s, p)) {
            // Settle on top
            s.y = p.y - s.h/2;
            s.vy = 0;
            s.settled = true;
            if (!ref.soundMuted) playSound('shield_drop');
            spawnDust(s.x, p.y, s.w);
          }
        });

        // Other settled shields check
        ref.shields.forEach((other) => {
          if (other !== s && other.settled && !s.settled && AABBIntersect(s, other)) {
            s.y = other.y - other.h/2 - s.h/2;
            s.vy = 0;
            s.settled = true;
            if (!ref.soundMuted) playSound('shield_drop');
            spawnDust(s.x, other.y - other.h/2, s.w);
          }
        });
      }
    });

    // 2. Storm sweep & Spawning
    if (ref.emitter.active) {
      ref.emitter.x += ref.emitter.vx * dt;
      ref.emitter.timer += dt;

      if (ref.emitter.timer >= lvl.storm.spawnEvery) {
        // Spawn virus particle
        const vx = (Math.random() - 0.5) * 50 + lvl.storm.drift;
        const vy = 60 + Math.random() * 50;
        ref.viruses.push({
          x: ref.emitter.x,
          y: ref.emitter.y,
          vx,
          vy,
          bounces: 0,
          life: GAME_CONFIG.virusLifeSeconds,
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

    // 3. Update active viruses & collisions
    ref.viruses.forEach((v, vIdx) => {
      v.vy += GAME_CONFIG.gravity * dt;
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.life -= dt;

      let bounced = false;

      // Left/Right Wall Bounces
      if (v.x - GAME_CONFIG.virusRadius < 0) {
        v.x = GAME_CONFIG.virusRadius;
        v.vx = -v.vx * GAME_CONFIG.virusRestitution;
        bounced = true;
      } else if (v.x + GAME_CONFIG.virusRadius > GAME_CONFIG.fieldWidth) {
        v.x = GAME_CONFIG.fieldWidth - GAME_CONFIG.virusRadius;
        v.vx = -v.vx * GAME_CONFIG.virusRestitution;
        bounced = true;
      }

      // Ground Bounce
      if (v.y + GAME_CONFIG.virusRadius >= GAME_CONFIG.groundY) {
        v.y = GAME_CONFIG.groundY - GAME_CONFIG.virusRadius;
        v.vy = -v.vy * GAME_CONFIG.virusRestitution;
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
            const rSum = GAME_CONFIG.virusRadius + SHIELD_TYPES.umbrella.domeR;
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
                v.vx = v.vx - (1 + GAME_CONFIG.virusRestitution) * vn * nx;
                v.vy = v.vy - (1 + GAME_CONFIG.virusRestitution) * vn * ny;
              }
              v.bounces += 1;
              bounced = true;
            } else {
              // Stem check (AABB bottom half)
              const stem = {
                x: s.x,
                y: s.y + 16,
                w: s.w,
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
        playSound('virus_bounce');
        spawnParticles(v.x, v.y, '#49E24B', 3, 0.4);
      }

      // Family Member Hits (Circle vs Circle)
      ref.family.forEach((m) => {
        if (m.status === 'safe') {
          const dx = v.x - m.x;
          const dy = v.y - m.y;
          const distSq = dx*dx + dy*dy;
          const rSum = GAME_CONFIG.virusRadius + m.r;
          if (distSq < rSum * rSum) {
            m.status = 'infected';
            if (!ref.soundMuted) playSound('hit');
            spawnParticles(m.x, m.y, '#EF4444', 15, 1.2);
            // Remove virus on direct impact
            v.life = 0;
          }
        }
      });
    });

    // Remove expired or fallen viruses
    ref.viruses = ref.viruses.filter(v => v.life > 0 && v.bounces < GAME_CONFIG.virusMaxBounces && v.y < GAME_CONFIG.fieldHeight);

    // 4. Update particles
    ref.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    ref.particles = ref.particles.filter(p => p.life > 0);

    // 5. Check Storm Completion
    if (ref.gameState === 'storm' && !ref.emitter.active && ref.viruses.length === 0) {
      const infected = ref.family.some(m => m.status === 'infected');
      if (infected) {
        ref.gameState = 'failed';
        setGameState('failed');
        if (!ref.soundMuted) playSound('lose');
      } else {
        // Complete Round!
        ref.gameState = 'cleared';
        setGameState('cleared');
        if (!ref.soundMuted) playSound('win');

        // Calculate score
        const savedCount = ref.family.filter(m => m.status === 'safe').length;
        const unusedCount = trayShields.length;
        const added = (savedCount * GAME_CONFIG.scorePerMemberSaved) + (unusedCount * GAME_CONFIG.scorePerUnusedShield);
        ref.score += added;
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
    const r = GAME_CONFIG.virusRadius;

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
        circle.vx = circle.vx - (1 + GAME_CONFIG.virusRestitution) * vn * nx;
        circle.vy = circle.vy - (1 + GAME_CONFIG.virusRestitution) * vn * ny;
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

    // Clear Screen & Draw Deep Blue Sky Gradient
    ctx.clearRect(0, 0, GAME_CONFIG.fieldWidth, GAME_CONFIG.fieldHeight);
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

    // Draw Placed Shields
    ref.shields.forEach((s) => {
      drawShield(ctx, s);
    });

    // Draw Ghost Preview + Alignment Line when dragging
    if (ref.dragState) {
      const typeInfo = SHIELD_TYPES[ref.dragState.type];
      
      // Dashed vertical plumb line
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ref.dragState.x, ref.dragState.y);
      ctx.lineTo(ref.dragState.x, GAME_CONFIG.groundY);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Translucent Preview Shape
      ctx.save();
      ctx.globalAlpha = 0.55;
      drawShield(ctx, {
        x: ref.dragState.x,
        y: ref.dragState.y,
        w: typeInfo.w,
        h: typeInfo.h,
        type: ref.dragState.type,
        settled: false
      });
      ctx.restore();
    }

    // Draw Family Members
    ref.family.forEach((m) => {
      drawFamilyMember(ctx, m);
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

    // Draw Viruses
    ref.viruses.forEach((v) => {
      ctx.save();
      // Glowing aura
      ctx.shadowColor = '#49E24B';
      ctx.shadowBlur = 12;

      ctx.fillStyle = '#49E24B';
      ctx.beginPath();
      ctx.arc(v.x, v.y, GAME_CONFIG.virusRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Spikes (PROGRAMMATIC drawing, no emojis!)
      ctx.strokeStyle = '#49E24B';
      ctx.lineWidth = 2.5;
      const spikes = 10;
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const startR = GAME_CONFIG.virusRadius - 2;
        const endR = GAME_CONFIG.virusRadius + 4;
        ctx.beginPath();
        ctx.moveTo(v.x + Math.cos(angle) * startR, v.y + Math.sin(angle) * startR);
        ctx.lineTo(v.x + Math.cos(angle) * endR, v.y + Math.sin(angle) * endR);
        ctx.stroke();
      }

      // Inner Core
      ctx.fillStyle = '#0E5C1D';
      ctx.beginPath();
      ctx.arc(v.x, v.y, GAME_CONFIG.virusRadius - 4, 0, Math.PI * 2);
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
      ctx.fillStyle = '#49E24B';
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

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 9px Poppins';
      ctx.textAlign = 'center';
      ctx.fillText("DRAG SHIELDS ONTO STAGE TO SHELTER FAMILY", GAME_CONFIG.fieldWidth / 2, GAME_CONFIG.trayY + 18);

      // Buttons
      const count = trayShields.length;
      trayShields.forEach((type, idx) => {
        const x = GAME_CONFIG.fieldWidth / 2 + (idx - (count - 1) / 2) * 80;
        const y = GAME_CONFIG.trayY + 50;

        // Button background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fill();
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
      ctx.moveTo(s.x, s.y);
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

      // Draw scalloped canopy path
      ctx.beginPath();
      ctx.arc(cx, cy + 5, domeR, Math.PI, 0); // main arc
      // 3 bottom scallops curving inwards
      ctx.quadraticCurveTo(s.x + 24, cy - 2, s.x + 12, cy + 5);
      ctx.quadraticCurveTo(s.x, cy - 2, s.x - 12, cy + 5);
      ctx.quadraticCurveTo(s.x - 24, cy - 2, s.x - 37, cy + 5);
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

  const drawFamilyMember = (ctx, m) => {
    ctx.save();
    const typeInfo = MEMBER_TYPES[m.type];

    // Nervous animation offset when storm is active
    let shakeX = 0;
    let shakeY = 0;
    if (stateRef.current.emitter.active && m.status === 'safe') {
      shakeX = (Math.random() - 0.5) * 1.2;
      shakeY = (Math.random() - 0.5) * 0.5;
    }

    const cx = m.x + shakeX;
    const cy = m.y + shakeY;

    if (m.status === 'infected') {
      // Sick/infected look
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
    if (gameState !== 'placement') return;
    const coords = getLogicalCoords(e);
    
    // Check if clicked in tray buttons
    const count = trayShields.length;
    let clickedIdx = -1;

    for (let idx = 0; idx < count; idx++) {
      const btnX = GAME_CONFIG.fieldWidth / 2 + (idx - (count - 1) / 2) * 80;
      const btnY = GAME_CONFIG.trayY + 50;
      
      const dx = coords.x - btnX;
      const dy = coords.y - btnY;
      if (dx*dx + dy*dy < 24*24) {
        clickedIdx = idx;
        break;
      }
    }

    if (clickedIdx !== -1) {
      // Start Dragging
      const type = trayShields[clickedIdx];
      stateRef.current.dragState = {
        type,
        x: coords.x,
        y: coords.y - 40, // Offset to prevent finger covering it
        index: clickedIdx
      };
      if (!stateRef.current.soundMuted) playSound('click');
    }
  };

  const handlePointerMove = (e) => {
    const ref = stateRef.current;
    if (gameState !== 'placement' || !ref.dragState) return;
    const coords = getLogicalCoords(e);

    // Keep dragging coordinates (with offset so piece floats above finger)
    ref.dragState.x = coords.x;
    ref.dragState.y = Math.max(90, Math.min(coords.y - 30, GAME_CONFIG.groundY - 30));
  };

  const handlePointerUp = (e) => {
    const ref = stateRef.current;
    if (gameState !== 'placement' || !ref.dragState) return;

    const drag = ref.dragState;
    const typeInfo = SHIELD_TYPES[drag.type];

    // Place the shield!
    const newShield = {
      x: drag.x,
      y: drag.y,
      vx: 0,
      vy: 0,
      w: typeInfo.w,
      h: typeInfo.h,
      type: drag.type,
      settled: false
    };

    ref.shields.push(newShield);
    
    // Remove from tray list
    const updatedTray = [...trayShields];
    updatedTray.splice(drag.index, 1);
    setTrayShields(updatedTray);
    setPlacedCount(prev => prev + 1);

    ref.dragState = null;
  };

  // Start Storm Emitter Sweep
  const triggerStorm = () => {
    const ref = stateRef.current;
    if (gameState !== 'placement') return;
    if (ref.shields.length === 0) return; // Must place at least one shield

    ref.gameState = 'storm';
    setGameState('storm');
    ref.emitter.active = true;
    ref.emitter.x = -30;
    ref.emitter.vx = level.storm.speed;
    ref.emitter.passes = level.storm.passes;
    ref.emitter.timer = 0;
    if (!ref.soundMuted) playSound('click');
  };

  // Undo Last Placed Shield
  const handleUndo = () => {
    const ref = stateRef.current;
    if (gameState !== 'placement' || ref.shields.length === 0) return;

    const last = ref.shields.pop();
    setTrayShields(prev => [...prev, last.type]);
    setPlacedCount(prev => Math.max(0, prev - 1));
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

    let finalScore = ref.score;
    if (didWin) {
      // Apply time bonus
      const timeBonus = Math.floor(ref.timeLeft * GAME_CONFIG.timeBonusPerSecond);
      finalScore += timeBonus;
      ref.score = finalScore;
      setScore(finalScore);
      if (!ref.soundMuted) playSound('win');
      onWin({ score: finalScore });
    } else {
      if (!ref.soundMuted) playSound('lose');
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
      padding: '10px 14px',
      boxSizing: 'border-box'
    }}>
      {/* HUD Header */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        height: 60,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: '0 16px',
        boxSizing: 'border-box',
        marginBottom: 10,
        backdropFilter: 'blur(10px)'
      }}>
        {/* Level and Storm Warn */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.1em' }}>
            Round {levelIdx + 1} of {GAME_CONFIG.totalRounds}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>
            {level.name}
          </div>
        </div>

        {/* Timer Countdown */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#FF8A3D', letterSpacing: '0.12em' }}>
            TIME REMAINING
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {timeLeft}s
          </div>
        </div>

        {/* Score Counter */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: '#1E6BE0', letterSpacing: '0.12em' }}>
            TOTAL SCORE
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#28A745', fontVariantNumeric: 'tabular-nums' }}>
            {score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Canvas Wrap */}
      <div 
        ref={canvasRef => {
          if (canvasRef) {
            // Adjust bounds to preserve ratio
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          aspectRatio: '400/580',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          background: '#051a3a',
          border: '1.5px solid rgba(255, 255, 255, 0.1)',
          touchAction: 'none' // Prevent pull-to-refresh
        }}
      >
        <canvas
          ref={canvasRef}
          width={400 * (window.devicePixelRatio || 1)}
          height={580 * (window.devicePixelRatio || 1)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />

        {/* Audio Mute toggle absolute inside Canvas */}
        <button
          onClick={toggleSound}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v6a3 3 0 0 0 3 3h1.586l4.707 4.707A1 1 0 0 0 20 22V4a1 1 0 0 0-1.707-.707L13.586 8H12a3 3 0 0 0-3 3z"></path>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          )}
        </button>

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
              WARNING: VIRUS STORM ACTIVE
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
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1' }}>
                  <span>Unused Shields:</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{trayShields.length} x 50</span>
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
                A family member was infected! Adjust your shield placement and try again.
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

      {/* Control Buttons (Below Canvas) */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        gap: 12,
        marginTop: 14,
        boxSizing: 'border-box'
      }}>
        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={gameState !== 'placement' || placedCount === 0}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 12,
            background: placedCount === 0 || gameState !== 'placement' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            color: placedCount === 0 || gameState !== 'placement' ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 15,
            fontWeight: 800,
            textTransform: 'uppercase',
            cursor: placedCount === 0 || gameState !== 'placement' ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Undo
        </button>

        {/* Start Storm Button */}
        <button
          onClick={triggerStorm}
          disabled={gameState !== 'placement' || placedCount === 0}
          style={{
            flex: 2,
            height: 50,
            border: 'none',
            borderRadius: 12,
            background: placedCount === 0 || gameState !== 'placement'
              ? 'rgba(239, 68, 68, 0.2)' 
              : 'linear-gradient(180deg, #EF4444 0%, #C2470F 100%)',
            boxShadow: placedCount === 0 || gameState !== 'placement'
              ? 'none' 
              : '0 4px 15px rgba(239, 68, 68, 0.4)',
            color: placedCount === 0 || gameState !== 'placement' ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 15,
            fontWeight: 900,
            textTransform: 'uppercase',
            cursor: placedCount === 0 || gameState !== 'placement' ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Start Storm
        </button>
      </div>
    </div>
  );
}

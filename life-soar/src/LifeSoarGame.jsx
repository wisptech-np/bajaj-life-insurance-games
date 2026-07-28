import React, { useEffect, useRef, useState } from 'react';

// Game Configuration
const WORLD_M_TO_PX = 12; // 1m = 12 pixels
const MAX_DISTANCE = 2000; // 2000m
const WORLD_WIDTH = MAX_DISTANCE * WORLD_M_TO_PX; // 24000px
const DURATION_SECONDS = 105;

const MILESTONES = [
  { m: 200, name: 'Graduation', unlocked: false, color: '#3B8DD4', tip: 'Start building emergency funds!' },
  { m: 500, name: 'First Job', unlocked: false, color: '#22C55E', tip: 'Invest early to compound wealth!' },
  { m: 900, name: 'Marriage', unlocked: false, color: '#FF8533', tip: 'Get joint cover for your partner!' },
  { m: 1400, name: 'Home Purchase', unlocked: false, color: '#EC4899', tip: 'Secure your mortgage with Term Insurance!' },
  { m: 2000, name: 'Retirement', unlocked: false, color: '#FACC15', tip: 'Enjoy guaranteed lifelong pension!' }
];

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

  // Keep mutables inside refs for 60fps canvas loop
  const stateRef = useRef({
    isDiving: false,
    x: 100,
    y: 250,
    vx: 6,
    vy: 0,
    coinsCollected: 0,
    hasShield: false,
    distanceM: 0,
    timeLeft: DURATION_SECONDS,
    gameOver: false,
    win: false,
    milestones: JSON.parse(JSON.stringify(MILESTONES)),
    particles: [], // sparks, dust
    cameraX: 0,
    screenShake: 0,
    lastTime: 0,
    elapsedTime: 0,
    // procedural entities
    coins: [],
    shields: [],
    hazards: [],
    stageBanners: [],
  });

  // Height generator for undulating ceiling & floor
  const getCeilingY = (x, height) => {
    return Math.sin(x / 400) * 35 + Math.cos(x / 250) * 15 + 70;
  };

  const getFloorY = (x, height) => {
    return height - (Math.sin(x / 300) * 45 + Math.cos(x / 180) * 20 + 90);
  };

  // Generate game layout once
  useEffect(() => {
    const state = stateRef.current;
    const coinsList = [];
    const shieldsList = [];
    const hazardsList = [];

    // Pre-generate coins in waves and arcs
    for (let x = 300; x < WORLD_WIDTH - 500; x += 150) {
      // Don't place right on milestones to prevent overlapping
      const nearestMilestone = state.milestones.find(m => Math.abs(m.m * WORLD_M_TO_PX - x) < 300);
      if (nearestMilestone) continue;

      // Arc shape
      const arcType = Math.floor((x / 150) % 3);
      const count = 4;
      for (let i = 0; i < count; i++) {
        const cx = x + i * 25;
        let cy = 250;
        if (arcType === 0) {
          // Sine arc
          cy = 220 + Math.sin((i / (count - 1)) * Math.PI) * -60;
        } else if (arcType === 1) {
          // Bottom arc
          cy = 280 + Math.sin((i / (count - 1)) * Math.PI) * 60;
        } else {
          // Diagonal
          cy = 200 + i * 20;
        }
        coinsList.push({ x: cx, y: cy, radius: 10, collected: false });
      }
    }

    // Pre-generate shields every ~1500px
    for (let x = 800; x < WORLD_WIDTH - 600; x += 1400) {
      shieldsList.push({ x, y: 220 + Math.sin(x) * 40, radius: 12, collected: false });
    }

    // Pre-generate static ceiling/floor spikes & floating hazards
    for (let x = 500; x < WORLD_WIDTH - 300; x += 380) {
      // Bobbing floating virus
      if (x % 760 === 0) {
        hazardsList.push({
          type: 'float',
          x,
          baseY: 250,
          y: 250,
          bobSpeed: 0.03 + (x % 3) * 0.01,
          bobRange: 50 + (x % 2) * 20,
          radius: 14,
          angle: x
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
          x: x + 190,
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
      const coinScore = state.coinsCollected * 25;
      const stageScore = state.milestones.filter(m => m.unlocked).length * 300;
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
      const delta = timestamp - state.lastTime;
      state.lastTime = timestamp;

      if (!state.gameOver) {
        // --- 1. GLIDER PHYSICS ---
        // Gravity
        state.vy += 0.13;

        if (state.isDiving) {
          // Hold to Dive
          state.vy += 0.28; // gain down momentum
          state.vx = Math.min(state.vx + 0.16, 11); // gain horizontal speed
          
          // Spawn dive trail particles
          if (Math.random() < 0.3) {
            state.particles.push({
              x: state.x - 15,
              y: state.y + (Math.random() - 0.5) * 8,
              vx: -state.vx * 0.4 + (Math.random() - 0.5),
              vy: (Math.random() - 0.5) * 2,
              color: 'rgba(242, 105, 34, 0.65)',
              size: 3 + Math.random() * 4,
              life: 1.0,
              decay: 0.05
            });
          }
        } else {
          // Release to lift (Convert speed to lift)
          const excessSpeed = Math.max(0, state.vx - 5);
          const lift = excessSpeed * 0.26;
          state.vy -= lift;
          
          // Drag decelerates glider back to baseline speed
          state.vx = Math.max(state.vx - 0.06, 4.8);

          // Spawn wind trail particles
          if (Math.random() < 0.2) {
            state.particles.push({
              x: state.x - 15,
              y: state.y + (Math.random() - 0.5) * 6,
              vx: -state.vx * 0.5,
              vy: state.vy * 0.2,
              color: 'rgba(255, 255, 255, 0.45)',
              size: 2 + Math.random() * 3,
              life: 0.8,
              decay: 0.04
            });
          }
        }

        // Clamp velocities
        state.vy = Math.max(-6, Math.min(state.vy, 7));
        state.vx = Math.max(4.8, Math.min(state.vx, 11));

        // Update Position
        state.x += state.vx;
        state.y += state.vy;

        // Map world X to distance in meters
        state.distanceM = Math.floor(state.x / WORLD_M_TO_PX);
        setDistance(state.distanceM);

        // Win check
        if (state.distanceM >= MAX_DISTANCE) {
          state.distanceM = MAX_DISTANCE;
          triggerEnd(true);
        }

        // --- 2. COLLISION WITH CANYON BOUNDS ---
        const cy = getCeilingY(state.x, height);
        const fy = getFloorY(state.x, height);
        const gliderRadius = 14;

        if (state.y - gliderRadius < cy || state.y + gliderRadius > fy) {
          // Collision!
          if (state.hasShield) {
            // Shield protects from 1 crash
            state.hasShield = false;
            setHasShield(false);
            playSynthSound('shield_break');
            state.screenShake = 16;
            
            // Push player away from boundary
            if (state.y - gliderRadius < cy) {
              state.y = cy + gliderRadius + 5;
              state.vy = 2;
            } else {
              state.y = fy - gliderRadius - 5;
              state.vy = -3;
            }

            // Create blast particles
            for (let i = 0; i < 15; i++) {
              state.particles.push({
                x: state.x,
                y: state.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: 'rgba(59, 141, 212, 0.8)',
                size: 4 + Math.random() * 5,
                life: 1.0,
                decay: 0.04
              });
            }
          } else {
            // Crash!
            state.screenShake = 22;
            playSynthSound('hit');
            // Create explosion particles
            for (let i = 0; i < 20; i++) {
              state.particles.push({
                x: state.x,
                y: state.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: 'rgba(239, 68, 68, 0.85)',
                size: 5 + Math.random() * 6,
                life: 1.0,
                decay: 0.03
              });
            }
            triggerEnd(false);
          }
        }

        // --- 3. ENTITY INTERACTIONS ---
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
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: '#FACC15',
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 0.08
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
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: '#3B8DD4',
                size: 2.5 + Math.random() * 3.5,
                life: 1.0,
                decay: 0.07
              });
            }
          }
        });

        // Hazard Collision
        state.hazards.forEach(h => {
          // Compute dynamic coordinate for spikes
          let hx = h.x;
          let hy = h.y;
          let hr = h.radius || 15;

          if (h.type === 'ceiling_spike') {
            hy = getCeilingY(hx, height);
          } else if (h.type === 'floor_spike') {
            hy = getFloorY(hx, height);
          } else if (h.type === 'float') {
            h.angle += h.bobSpeed;
            h.y = h.baseY + Math.sin(h.angle) * h.bobRange;
            hy = h.y;
          }

          // Simple distance check for float, or bbox/line for spikes
          let collided = false;
          if (h.type === 'float') {
            collided = Math.hypot(state.x - hx, state.y - hy) < hr + gliderRadius;
          } else {
            // Triangle approximation spike collision
            const distToSpikeTip = Math.hypot(state.x - hx, state.y - hy);
            collided = distToSpikeTip < gliderRadius + 18;
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
                  vx: (Math.random() - 0.5) * 7,
                  vy: (Math.random() - 0.5) * 7,
                  color: 'rgba(59, 141, 212, 0.75)',
                  size: 3 + Math.random() * 4,
                  life: 1.0,
                  decay: 0.06
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
                  vx: (Math.random() - 0.5) * 9,
                  vy: (Math.random() - 0.5) * 9,
                  color: 'rgba(220, 38, 38, 0.85)',
                  size: 4.5 + Math.random() * 5.5,
                  life: 1.0,
                  decay: 0.04
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
                vx: -2 + Math.random() * 6,
                vy: -3 + Math.random() * 6,
                color: m.color,
                size: 3 + Math.random() * 4,
                life: 1.2,
                decay: 0.04
              });
            }
          }
        });

        // --- 5. CAMERA & SHAKE SCROLL ---
        // Camera centers glider horizontally (offset by 120px)
        state.cameraX = state.x - 120;
        if (state.screenShake > 0.1) {
          state.screenShake *= 0.88;
        } else {
          state.screenShake = 0;
        }
      }

      // Update Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
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

      // Parallax Day-Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#040d21');   // Deep space blue
      skyGrad.addColorStop(0.4, '#0e2b5e'); // Midnight blue
      skyGrad.addColorStop(0.8, '#1e5ca1'); // Sky blue
      skyGrad.addColorStop(1, '#ff9e59');   // Horizon warm glow
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

      // Parallax Background Rock Layer 1 (Slowest)
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
              const ang = (i / numSpikes) * Math.PI * 2 + state.elapsedTime * 0.05;
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

        // Draw Glider Structure (Hang glider triangle shape)
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

        ctx.restore();
      }

      ctx.restore(); // restore screen shake translation

      // Increment elapsed frames
      state.elapsedTime += 1;

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

  // Handle touch/mouse diving input
  const handleStartDive = (e) => {
    e.preventDefault();
    stateRef.current.isDiving = true;
  };

  const handleEndDive = (e) => {
    e.preventDefault();
    stateRef.current.isDiving = false;
  };

  // Safe percentage calculation for milestone display
  const progressPercent = Math.min(100, (distance / MAX_DISTANCE) * 100);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxWidth: 430,
        margin: '0 auto',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleStartDive}
        onMouseUp={handleEndDive}
        onMouseLeave={handleEndDive}
        onTouchStart={handleStartDive}
        onTouchEnd={handleEndDive}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
      />

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

      {/* --- MILESTONE POPUP BANNER --- */}
      {activeMilestone && (
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%',
            maxWidth: 320,
            background: 'rgba(5, 26, 58, 0.85)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            backdropFilter: 'blur(20px) saturate(160%)',
            border: `2px solid ${activeMilestone.color}`,
            borderRadius: 18,
            padding: '16px 14px',
            textAlign: 'center',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px ${activeMilestone.color}55`,
            animation: 'ls-rise 300ms cubic-bezier(.2, .8, .2, 1) both',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <div style={{
            display: 'inline-flex', padding: '4px 10px', borderRadius: 999,
            backgroundColor: `${activeMilestone.color}33`, color: activeMilestone.color,
            fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6
          }}>
            Stage Cleared
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 22, fontWeight: 900, color: '#fff' }}>
            {activeMilestone.name}
          </h3>
          <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            Reached at {activeMilestone.m}m!
          </p>
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', margin: '0 12px 8px 12px' }} />
          <p style={{ margin: 0, fontSize: 11, fontStyle: 'italic', color: '#60A5FA', fontWeight: 600 }}>
            💡 {activeMilestone.tip}
          </p>
        </div>
      )}

      {/* Tap Instruction Indicator (Shows only at the start) */}
      {distance < 10 && (
        <div
          style={{
            position: 'absolute',
            bottom: '22%',
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

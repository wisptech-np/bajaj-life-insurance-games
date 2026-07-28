// SecureJourney.jsx — Core gameplay component.
// 3-lane auto-runner crowd shooter: player runs along a bridge, auto-firing bolts at waves of incoming virus blobs.
// Health shield pickups restore health and stack firing power.
// Clean canvas draw with no emojis, synth sounds, and full integration.
import React, { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG, BRAND } from './data';

// Web Audio API Synthesizer for SFX
class SoundSynth {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
  playLaser() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {
      // ignore context issues
    }
  }
  playHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // ignore context issues
    }
  }
  playExplode() {
    try {
      this.init();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.22;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.22);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      noise.stop(this.ctx.currentTime + 0.22);
    } catch (e) {
      // ignore
    }
  }
  playShield() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [293.66, 349.23, 440.00, 587.33]; // D minor arpeggio ascending
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.08, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.04 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.15);
      });
    } catch (e) {
      // ignore
    }
  }
  playHurt() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(45, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {
      // ignore
    }
  }
  playBossRoar() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(90, now);
      osc1.frequency.linearRampToValueAtTime(45, now + 0.55);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(95, now);
      osc2.frequency.linearRampToValueAtTime(50, now + 0.55);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.55);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } catch (e) {
      // ignore
    }
  }
  playWin() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major chord arpeggio
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.05, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.005, now + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch (e) {
      // ignore
    }
  }
  playLose() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [196.00, 174.61, 146.83, 110.00]; // descending sadness
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.07, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.14 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.22);
      });
    } catch (e) {
      // ignore
    }
  }
}

// Config shortcuts
const {
  maxHp,
  baseFireInterval,
  minFireInterval,
  fireIntervalFactor,
  baseDamage,
  damagePerPower,
  boltSpeed,
  steerLerp,
  spawnIntervalStart,
  spawnIntervalEnd,
  virusSpeedStart,
  virusSpeedEnd,
  hpRampMax,
  hpPerPower,
  contactDamage,
  bossLeadTime,
  bossBaseHp,
  bossHpPerPower,
  bossSpeed,
  bossDamage,
  shieldInterval,
  shieldHeal,
  shieldSpeed,
  killPoints,
  shieldPoints,
  bossPoints,
  healthBonusFactor,
} = GAME_CONFIG;

export default function SecureJourney({ config, onWin, onLose }) {
  void config; // already imported/defined

  // Refs for canvas and resizing
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const synthRef = useRef(new SoundSynth());

  // React state mirroring mutable values for HUD updates
  const [scoreState, setScoreState] = useState(0);
  const [hpState, setHpState] = useState(maxHp);
  const [shieldCountState, setShieldCountState] = useState(0);
  const [timeRemainingState, setTimeRemainingState] = useState(GAME_CONFIG.duration);
  const [progressState, setProgressState] = useState(0);
  const [banner, setBanner] = useState({ title: 'SECURE JOURNEY', sub: 'Steer & Survive' });
  const [showDragHintState, setShowDragHintState] = useState(true);

  // Mutable game state refs for high speed loop (60fps)
  const score = useRef(0);
  const hp = useRef(maxHp);
  const shieldCount = useRef(0);
  const timeRemaining = useRef(GAME_CONFIG.duration);
  const progressRatio = useRef(0);
  const isPlaying = useRef(true);
  const virusesDestroyed = useRef(0);

  // Layout calculations
  const displaySize = useRef({ width: 400, height: 600 });
  const playerX = useRef(200);
  const playerTargetX = useRef(200);
  const currentLane = useRef(1); // 0 = left, 1 = center, 2 = right
  const isDragging = useRef(false);

  // Arrays of active game entities
  const bolts = useRef([]);
  const viruses = useRef([]);
  const shields = useRef([]);
  const particles = useRef([]);
  const floatingTexts = useRef([]);
  const waterRipples = useRef([]);
  
  // Timing and ticks
  const lastTime = useRef(performance.now());
  const fireTimer = useRef(0);
  const spawnTimer = useRef(0);
  const shieldSpawnTimer = useRef(0);
  const scrollOffset = useRef(0);
  const shakeIntensity = useRef(0);
  const flashTimer = useRef(0); // white overlay flash on shield pickup

  // Muzzle flash indicator
  const muzzleFlash = useRef(null); // { x, y, duration }

  // Boss state
  const bossSpawned = useRef(false);
  const bossActive = useRef(false);
  const bossObj = useRef(null); // { x, y, hp, maxHp, speed, size }

  // Vault state
  const vaultSpawned = useRef(false);
  const vaultObj = useRef(null); // { x, y, speed, size }
  const playerControlLocked = useRef(false);

  // Banner fade helper
  const bannerTimer = useRef(null);
  const triggerBanner = (title, sub, duration = 2500) => {
    setBanner({ title, sub });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => {
      setBanner(null);
    }, duration);
  };

  // Helper: Bridge limits
  const getBridgeLayout = (width) => {
    const bridgeWidth = width * 0.72;
    const bridgeLeft = (width - bridgeWidth) / 2;
    const laneWidth = bridgeWidth / 3;
    return {
      bridgeWidth,
      bridgeLeft,
      bridgeRight: bridgeLeft + bridgeWidth,
      laneWidth,
      laneCenters: [
        bridgeLeft + laneWidth * 0.5,
        bridgeLeft + laneWidth * 1.5,
        bridgeLeft + laneWidth * 2.5,
      ]
    };
  };

  // Sound Synth play triggers
  const playLaser = () => synthRef.current.playLaser();
  const playHit = () => synthRef.current.playHit();
  const playExplode = () => synthRef.current.playExplode();
  const playShield = () => synthRef.current.playShield();
  const playHurt = () => synthRef.current.playHurt();
  const playBossRoar = () => synthRef.current.playBossRoar();
  const playWin = () => synthRef.current.playWin();
  const playLose = () => synthRef.current.playLose();

  // Resize canvas handler
  const handleResize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.min(container.clientWidth, 430);
    const height = container.clientHeight;
    // Capped at 2 — a 3x phone triples the fill cost for no visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    displaySize.current = { width, height };

    // Recenter player on start resize
    const layout = getBridgeLayout(width);
    if (!playerControlLocked.current && playerX.current === 200 && playerTargetX.current === 200) {
      playerX.current = layout.laneCenters[1];
      playerTargetX.current = layout.laneCenters[1];
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying.current || playerControlLocked.current) return;
      const layout = getBridgeLayout(displaySize.current.width);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        currentLane.current = Math.max(0, currentLane.current - 1);
        playerTargetX.current = layout.laneCenters[currentLane.current];
        setShowDragHintState(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        currentLane.current = Math.min(2, currentLane.current + 1);
        playerTargetX.current = layout.laneCenters[currentLane.current];
        setShowDragHintState(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pointer interaction
  const updateTargetX = (clientX) => {
    if (!isPlaying.current || playerControlLocked.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const displayW = displaySize.current.width;
    
    // Convert touch/pointer position relative to canvas
    const x = ((clientX - rect.left) / rect.width) * displayW;
    const layout = getBridgeLayout(displayW);
    const playerRadius = 18;

    playerTargetX.current = Math.max(layout.bridgeLeft + playerRadius, Math.min(layout.bridgeRight - playerRadius, x));
    
    // Sync current lane index
    const relativeX = playerTargetX.current - layout.bridgeLeft;
    currentLane.current = Math.max(0, Math.min(2, Math.floor((relativeX / layout.bridgeWidth) * 3)));
    
    if (showDragHintState) {
      setShowDragHintState(false);
    }
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    synthRef.current.init(); // prime web audio on first tap
    updateTargetX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (isDragging.current) {
      updateTargetX(e.clientX);
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // Sparkle/Particle spawner
  const spawnParticles = (x, y, color, count = 8, speedScale = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.6 + Math.random() * 2.2) * speedScale;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.025
      });
    }
  };

  // Floating text indicator
  const spawnFloatingText = (x, y, text, color = '#fff') => {
    floatingTexts.current.push({
      x,
      y,
      text,
      color,
      vy: -1.4,
      alpha: 1,
      decay: 0.016
    });
  };

  // Firing logic
  const fireBolt = (offsetAngle = 0, offsetX = 0) => {
    const layout = getBridgeLayout(displaySize.current.width);
    const currentDamage = baseDamage + shieldCount.current * damagePerPower;
    
    bolts.current.push({
      x: playerX.current + offsetX,
      y: displaySize.current.height * 0.8 - 18,
      damage: currentDamage,
      angle: offsetAngle,
      speed: boltSpeed * displaySize.current.height,
      size: { width: 5, height: 14 }
    });
  };

  // Initial banner trigger
  useEffect(() => {
    triggerBanner('START JOURNEY', 'Blaster active. Secure the bridge!');
  }, []);

  // Main Loop logic and Canvas rendering
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);

    let animationFrameId;
    let lastStateUpdate = 0;

    const gameLoop = (timestamp) => {
      if (!isPlaying.current) return;

      const dt = Math.min(0.1, (timestamp - lastTime.current) / 1000);
      lastTime.current = timestamp;

      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;
      if (!canvas || !ctx) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const { width, height } = displaySize.current;
      const layout = getBridgeLayout(width);

      // ─── Time & Progress ──────────────────────────────────
      if (!playerControlLocked.current) {
        timeRemaining.current = Math.max(0, timeRemaining.current - dt);
        progressRatio.current = Math.min(1, (GAME_CONFIG.duration - timeRemaining.current) / GAME_CONFIG.duration);
      }

      // Check for Game Over: timeout or HP zero
      if (hp.current <= 0) {
        isPlaying.current = false;
        playLose();
        onLose({
          score: score.current,
          viruses: virusesDestroyed.current,
          shields: shieldCount.current,
          health: 0
        });
        return;
      }

      // Scroll speed (illusion of runner speed)
      const currentSpeedMultiplier = 1 + progressRatio.current * 0.5;
      scrollOffset.current = (scrollOffset.current + 180 * currentSpeedMultiplier * dt) % 80;

      // ─── Spawners ─────────────────────────────────────────
      // Spawn Regular Viruses
      if (!bossActive.current && !vaultSpawned.current && !playerControlLocked.current) {
        spawnTimer.current += dt;
        const currentSpawnInterval = spawnIntervalStart + (spawnIntervalEnd - spawnIntervalStart) * progressRatio.current;
        if (spawnTimer.current >= currentSpawnInterval) {
          spawnTimer.current = 0;
          // Spawn in 1 or 2 lanes randomly
          const laneIndices = [0, 1, 2].sort(() => 0.5 - Math.random()).slice(0, Math.random() < 0.38 ? 2 : 1);
          laneIndices.forEach((laneIdx) => {
            const sizeRoll = Math.random();
            let size = 'medium';
            let radius = 18;
            let hpVal = 3;
            let dmg = contactDamage.medium;
            
            if (sizeRoll < 0.42) {
              size = 'small';
              radius = 12;
              hpVal = 1;
              dmg = contactDamage.small;
            } else if (sizeRoll > 0.88) {
              size = 'large';
              radius = 26;
              hpVal = 6;
              dmg = contactDamage.large;
            }

            // Toughen viruses according to progress & shield level
            const hpMult = 1 + hpRampMax * progressRatio.current + hpPerPower * shieldCount.current;
            const finalHp = Math.ceil(hpVal * hpMult);

            viruses.current.push({
              x: layout.laneCenters[laneIdx],
              y: -50,
              lane: laneIdx,
              size,
              radius,
              maxHp: finalHp,
              hp: finalHp,
              damage: dmg,
              speed: (virusSpeedStart + (virusSpeedEnd - virusSpeedStart) * progressRatio.current) * height,
              angle: Math.random() * Math.PI,
              rotationSpeed: (0.8 + Math.random() * 1.5) * (Math.random() < 0.5 ? -1 : 1)
            });
          });
        }
      }

      // Spawn Boss Virus
      if (timeRemaining.current <= bossLeadTime && !bossSpawned.current) {
        bossSpawned.current = true;
        bossActive.current = true;
        
        const bossHp = Math.ceil(bossBaseHp + bossHpPerPower * shieldCount.current);
        bossObj.current = {
          x: width / 2,
          y: -80,
          radius: 46,
          maxHp: bossHp,
          hp: bossHp,
          speed: bossSpeed * height,
          angle: 0,
          rotationSpeed: 0.6,
          floatTime: 0
        };

        playBossRoar();
        triggerBanner('BOSS ALERT', 'Risk of INFLATION approaching! Blasters up!', 3500);
      }

      // Spawn Shield Pickups
      if (!bossActive.current && !vaultSpawned.current && !playerControlLocked.current) {
        shieldSpawnTimer.current += dt;
        if (shieldSpawnTimer.current >= shieldInterval) {
          shieldSpawnTimer.current = 0;
          const laneIdx = Math.floor(Math.random() * 3);
          shields.current.push({
            x: layout.laneCenters[laneIdx],
            y: -30,
            radius: 14,
            speed: shieldSpeed * height,
            pulse: 0
          });
        }
      }

      // ─── Fire Blaster ─────────────────────────────────────
      if (!playerControlLocked.current) {
        fireTimer.current += dt;
        const currentFireInterval = Math.max(minFireInterval, baseFireInterval * Math.pow(fireIntervalFactor, shieldCount.current));
        if (fireTimer.current >= currentFireInterval) {
          fireTimer.current = 0;
          playLaser();
          
          // Muzzle flash trigger
          muzzleFlash.current = {
            x: playerX.current,
            y: height * 0.8 - 20,
            duration: 0.05
          };

          // Firing patterns based on Stacked Power
          if (shieldCount.current < 2) {
            // Single bolt
            fireBolt(0, 0);
          } else if (shieldCount.current < 4) {
            // Dual parallel bolts
            fireBolt(0, -8);
            fireBolt(0, 8);
          } else {
            // Triple spread bolts
            fireBolt(0, 0);
            fireBolt(-0.16, -10);
            fireBolt(0.16, 10);
          }
        }
      }

      // ─── Physics & Updates ────────────────────────────────
      // Screen Shake decay
      if (shakeIntensity.current > 0) {
        shakeIntensity.current = Math.max(0, shakeIntensity.current - 45 * dt);
      }

      // Flash timer decay
      if (flashTimer.current > 0) {
        flashTimer.current = Math.max(0, flashTimer.current - 3 * dt);
      }

      // Player Movement Lerp
      if (!playerControlLocked.current) {
        playerX.current += (playerTargetX.current - playerX.current) * steerLerp * dt;
        // Keep in lane bounds
        const playerRadius = 18;
        playerX.current = Math.max(layout.bridgeLeft + playerRadius, Math.min(layout.bridgeRight - playerRadius, playerX.current));
      } else {
        // Cut-scene movement to Vault center Y
        playerX.current += (width / 2 - playerX.current) * 4 * dt;
        
        if (vaultObj.current) {
          const targetY = vaultObj.current.y;
          playerX.current = width / 2;
          
          // Auto run player up to enter the vault
          const runSpeed = 160;
          const playerY = height * 0.8;
          const newPlayerY = playerY - runSpeed * dt;
          
          // Check vault entry
          if (newPlayerY <= targetY + 22) {
            isPlaying.current = false;
            playWin();
            
            // Calculate health bonus points
            const hpBonus = Math.round(hp.current * healthBonusFactor);
            score.current += hpBonus;
            
            onWin({
              score: score.current,
              viruses: virusesDestroyed.current,
              shields: shieldCount.current,
              health: hp.current
            });
            return;
          }
          
          // Render player run up
          ctx.save();
          ctx.translate(0, newPlayerY - playerY);
        }
      }

      // Update Muzzle Flash
      if (muzzleFlash.current) {
        muzzleFlash.current.duration -= dt;
        if (muzzleFlash.current.duration <= 0) muzzleFlash.current = null;
      }

      // Update Bolts
      bolts.current.forEach((bolt) => {
        bolt.x += Math.sin(bolt.angle) * bolt.speed * dt;
        bolt.y -= Math.cos(bolt.angle) * bolt.speed * dt;
      });
      bolts.current = bolts.current.filter((b) => b.y > -20 && b.x > 0 && b.x < width);

      // Update Regular Viruses
      viruses.current.forEach((v) => {
        v.y += v.speed * dt;
        v.angle += v.rotationSpeed * dt;
      });

      // Regular Viruses hitting player
      viruses.current.forEach((v) => {
        const dx = v.x - playerX.current;
        const dy = v.y - (playerControlLocked.current ? height * 0.8 : height * 0.8); // adjusting Y
        const dist = Math.sqrt(dx * dx + dy * dy);
        const playerRadius = 18;
        if (dist < (playerRadius + v.radius)) {
          // Hurt player
          hp.current = Math.max(0, hp.current - v.damage);
          shakeIntensity.current = 14;
          playHurt();
          spawnParticles(playerX.current, height * 0.8 - 10, '#EF4444', 12, 1.2);
          v.hp = 0; // mark for deletion
        }
      });
      // Remove dead/off-screen viruses
      viruses.current = viruses.current.filter((v) => {
        if (v.hp <= 0) return false;
        if (v.y > height + 40) {
          // Missed virus drains a minor safety penalty
          hp.current = Math.max(0, hp.current - 3);
          spawnFloatingText(v.x, height - 10, 'GAP PENALTY -3', '#FFB199');
          return false;
        }
        return true;
      });

      // Update Boss Virus
      if (bossActive.current && bossObj.current) {
        const b = bossObj.current;
        b.angle += b.rotationSpeed * dt;
        
        // Enter screen scrolling down
        const targetHoverY = height * 0.23;
        if (b.y < targetHoverY) {
          b.y += b.speed * dt;
        } else {
          // Hover floating side-to-side
          b.floatTime += dt;
          b.x = width / 2 + Math.sin(b.floatTime * 1.8) * (layout.bridgeWidth * 0.38);
        }

        // Boss-Player Collision
        const dx = b.x - playerX.current;
        const dy = b.y - (height * 0.8);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (18 + b.radius)) {
          hp.current = Math.max(0, hp.current - bossDamage);
          shakeIntensity.current = 24;
          playHurt();
          spawnParticles(playerX.current, height * 0.8 - 15, '#EF4444', 20, 1.5);
          
          // Rebound boss Y slightly to avoid instant drain
          b.y = Math.max(60, b.y - 120);
        }
      }

      // Update Shields
      shields.current.forEach((s) => {
        s.y += s.speed * dt;
        s.pulse += dt * 4.5;
      });
      // Shield Collide with player
      shields.current.forEach((s) => {
        const dx = s.x - playerX.current;
        const dy = s.y - (height * 0.8);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (18 + s.radius)) {
          // Collect!
          shieldCount.current += 1;
          hp.current = Math.min(maxHp, hp.current + shieldHeal);
          score.current += shieldPoints;
          
          playShield();
          flashTimer.current = 0.42; // white screen flash
          
          spawnFloatingText(playerX.current, height * 0.76, '+POWER UP', '#3B8DD4');
          spawnFloatingText(playerX.current, height * 0.72, `+${shieldPoints}`, '#FFD37A');
          spawnParticles(s.x, s.y, '#3B8DD4', 16, 1.4);

          s.collected = true;
        }
      });
      shields.current = shields.current.filter((s) => !s.collected && s.y < height + 30);

      // Update Vault
      if (vaultSpawned.current && vaultObj.current) {
        const v = vaultObj.current;
        const targetY = height * 0.42;
        if (v.y < targetY) {
          v.y += v.speed * dt;
        }
      }

      // ─── Collisions: Bolts vs Viruses ──────────────────────
      bolts.current.forEach((b) => {
        // Check normal viruses
        viruses.current.forEach((v) => {
          if (v.hp <= 0) return;
          const dx = b.x - v.x;
          const dy = b.y - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (v.radius + 6)) {
            // Hit!
            v.hp -= b.damage;
            b.hit = true;
            playHit();
            spawnParticles(b.x, b.y, '#7BF59B', 5, 0.8);

            if (v.hp <= 0) {
              score.current += killPoints;
              virusesDestroyed.current += 1;
              playExplode();
              spawnParticles(v.x, v.y, '#28A745', 14, 1.3);
              spawnFloatingText(v.x, v.y - 12, `+${killPoints}`, '#28A745');
            }
          }
        });

        // Check Boss
        if (bossActive.current && bossObj.current) {
          const boss = bossObj.current;
          const dx = b.x - boss.x;
          const dy = b.y - boss.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (boss.radius + 8)) {
            boss.hp -= b.damage;
            b.hit = true;
            playHit();
            spawnParticles(b.x, b.y, '#7BF59B', 6, 0.9);

            if (boss.hp <= 0) {
              bossActive.current = false;
              score.current += bossPoints;
              playExplode();
              spawnParticles(boss.x, boss.y, '#FF8533', 35, 1.8);
              spawnFloatingText(boss.x, boss.y, `BOSS ELIMINATED! +${bossPoints}`, '#FF8533');
              
              triggerBanner('RISK ELIMINATED', 'Wealth Vault is descending!', 3500);

              // Spawn the wealth vault
              vaultSpawned.current = true;
              vaultObj.current = {
                x: width / 2,
                y: -90,
                speed: 70 * currentSpeedMultiplier,
                size: 78
              };
              // Clear any remaining regular viruses instantly
              viruses.current.forEach((v) => {
                spawnParticles(v.x, v.y, '#28A745', 8, 1);
              });
              viruses.current = [];
            }
          }
        }
      });
      bolts.current = bolts.current.filter((b) => !b.hit);

      // Transition to Vault lock once it stops sliding
      if (vaultSpawned.current && vaultObj.current && !playerControlLocked.current) {
        const v = vaultObj.current;
        const targetY = height * 0.42;
        if (Math.abs(v.y - targetY) < 5) {
          playerControlLocked.current = true;
          triggerBanner('SECURE WEALTH', 'Enter the vault to finish!', 3000);
        }
      }

      // Update Particles
      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      particles.current = particles.current.filter((p) => p.alpha > 0);

      // Update Floating Texts
      floatingTexts.current.forEach((t) => {
        t.y += t.vy;
        t.alpha -= t.decay;
      });
      floatingTexts.current = floatingTexts.current.filter((t) => t.alpha > 0);

      // Update Ripples
      if (Math.random() < 0.05) {
        waterRipples.current.push({
          x: Math.random() < 0.5 ? Math.random() * layout.bridgeLeft : layout.bridgeRight + Math.random() * (width - layout.bridgeRight),
          y: -10,
          width: 14 + Math.random() * 22,
          speed: 1.1 + Math.random() * 0.8,
          alpha: 0.15 + Math.random() * 0.25
        });
      }
      waterRipples.current.forEach((r) => {
        r.y += r.speed * 120 * currentSpeedMultiplier * dt;
      });
      waterRipples.current = waterRipples.current.filter((r) => r.y < height + 20);

      // ─── Render Canvas ────────────────────────────────────
      // Map logical units onto the DPR-scaled backing store. Without this the
      // scene draws into the top-left 1/dpr of the canvas on every retina
      // phone, while touch input (which uses logical units) stays correct —
      // so visuals and controls disagree.
      const renderScale = canvas.width / width;
      ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

      ctx.clearRect(0, 0, width, height);

      // Screen Shake
      ctx.save();
      if (shakeIntensity.current > 0) {
        const sx = (Math.random() * 2 - 1) * shakeIntensity.current;
        const sy = (Math.random() * 2 - 1) * shakeIntensity.current;
        ctx.translate(sx, sy);
      }

      // 1. Water background
      ctx.fillStyle = '#04101f';
      ctx.fillRect(0, 0, width, height);

      // Draw Parallax water ripples
      waterRipples.current.forEach((r) => {
        ctx.strokeStyle = `rgba(59, 141, 212, ${r.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(r.x - r.width / 2, r.y);
        ctx.lineTo(r.x + r.width / 2, r.y);
        ctx.stroke();
      });

      // 2. Draw Bridge Background
      ctx.fillStyle = '#08172b';
      ctx.fillRect(layout.bridgeLeft, 0, layout.bridgeWidth, height);

      // Draw Bridge horizontal planks (illusion of movement)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 3;
      let plankY = (scrollOffset.current % 80) - 80;
      while (plankY < height) {
        ctx.beginPath();
        ctx.moveTo(layout.bridgeLeft, plankY);
        ctx.lineTo(layout.bridgeRight, plankY);
        ctx.stroke();
        plankY += 80;
      }

      // Draw Lane Dividers (dashed lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 25]);
      ctx.lineDashOffset = -scrollOffset.current * 1.5;
      
      // Left/Center lane divider
      ctx.beginPath();
      ctx.moveTo(layout.bridgeLeft + layout.laneWidth, 0);
      ctx.lineTo(layout.bridgeLeft + layout.laneWidth, height);
      ctx.stroke();

      // Center/Right lane divider
      ctx.beginPath();
      ctx.moveTo(layout.bridgeLeft + layout.laneWidth * 2, 0);
      ctx.lineTo(layout.bridgeLeft + layout.laneWidth * 2, height);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Draw Bridge Rails
      ctx.strokeStyle = '#3B8DD4';
      ctx.lineWidth = 4;
      // Draw left rail shadow
      ctx.shadowColor = 'rgba(59, 141, 212, 0.8)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(layout.bridgeLeft, 0);
      ctx.lineTo(layout.bridgeLeft, height);
      ctx.stroke();

      // Draw right rail shadow
      ctx.beginPath();
      ctx.moveTo(layout.bridgeRight, 0);
      ctx.lineTo(layout.bridgeRight, height);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Railing posts
      ctx.fillStyle = '#003DA6';
      let postY = (scrollOffset.current % 80) - 80;
      while (postY < height) {
        ctx.fillRect(layout.bridgeLeft - 6, postY, 12, 8);
        ctx.fillRect(layout.bridgeRight - 6, postY, 12, 8);
        
        ctx.fillStyle = '#3B8DD4';
        ctx.fillRect(layout.bridgeLeft - 3, postY + 2, 6, 4);
        ctx.fillRect(layout.bridgeRight - 3, postY + 2, 6, 4);
        ctx.fillStyle = '#003DA6';

        postY += 80;
      }

      // 3. Draw Vault
      if (vaultSpawned.current && vaultObj.current) {
        const v = vaultObj.current;
        ctx.save();
        ctx.shadowColor = '#FFD37A';
        ctx.shadowBlur = 18;
        
        // Outer safe box
        ctx.fillStyle = '#c0c0c0';
        ctx.strokeStyle = '#FFD37A';
        ctx.lineWidth = 4;
        
        const safeSize = v.size;
        ctx.beginPath();
        ctx.roundRect(v.x - safeSize/2, v.y - safeSize/2, safeSize, safeSize, 14);
        ctx.fill();
        ctx.stroke();
        
        // Inner dial rim
        ctx.fillStyle = '#2d3748';
        ctx.beginPath();
        ctx.arc(v.x, v.y, safeSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Safe door dial handle (spokes)
        ctx.strokeStyle = '#FFD37A';
        ctx.lineWidth = 3.5;
        const dialTime = timestamp / 1000;
        for (let i = 0; i < 4; i++) {
          const angle = dialTime + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(v.x, v.y);
          ctx.lineTo(v.x + Math.cos(angle) * (safeSize * 0.28), v.y + Math.sin(angle) * (safeSize * 0.28));
          ctx.stroke();
        }

        // Center hub
        ctx.fillStyle = '#FFD37A';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Draw Shields
      shields.current.forEach((s) => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(1 + Math.sin(s.pulse) * 0.08, 1 + Math.sin(s.pulse) * 0.08);

        ctx.shadowColor = '#3B8DD4';
        ctx.shadowBlur = 12;

        // Draw hexagon
        ctx.fillStyle = 'rgba(59, 141, 212, 0.85)';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = Math.cos(angle) * s.radius;
          const py = Math.sin(angle) * s.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // White cross inside hex
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, -s.radius * 0.55);
        ctx.lineTo(0, s.radius * 0.55);
        ctx.moveTo(-s.radius * 0.55, 0);
        ctx.lineTo(s.radius * 0.55, 0);
        ctx.stroke();

        ctx.restore();
      });

      // 5. Draw Bolts
      bolts.current.forEach((b) => {
        ctx.save();
        ctx.shadowColor = '#3B8DD4';
        ctx.shadowBlur = 10;

        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.size.height);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#3B8DD4');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(b.x - b.size.width / 2, b.y, b.size.width, b.size.height, 3);
        ctx.fill();
        ctx.restore();
      });

      // 6. Draw Normal Viruses
      viruses.current.forEach((v) => {
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(v.angle);

        ctx.shadowColor = '#28A745';
        ctx.shadowBlur = 10;

        // Draw spikes
        ctx.strokeStyle = '#28A745';
        ctx.lineWidth = v.size === 'small' ? 2 : (v.size === 'medium' ? 3 : 4);
        const spikeCount = v.size === 'small' ? 8 : (v.size === 'medium' ? 10 : 12);
        const spikeLen = v.size === 'small' ? 4 : (v.size === 'medium' ? 7 : 10);
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i * Math.PI * 2) / spikeCount;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * (v.radius + spikeLen), Math.sin(angle) * (v.radius + spikeLen));
          ctx.stroke();
        }

        // Core body
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, v.radius);
        grad.addColorStop(0, '#7BF59B');
        grad.addColorStop(1, '#157a30');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
        ctx.fill();

        // Stroke highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore(); // reset rotate/translate

        // Draw HP bar above virus
        const barW = v.radius * 1.8;
        const barH = 3.5;
        const barX = v.x - barW / 2;
        const barY = v.y - v.radius - 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        const hpRatio = v.hp / v.maxHp;
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      });

      // 7. Draw Boss Virus
      if (bossActive.current && bossObj.current) {
        const b = bossObj.current;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        ctx.shadowColor = '#28A745';
        ctx.shadowBlur = 18;

        // Big outer spikes
        ctx.strokeStyle = '#28A745';
        ctx.lineWidth = 5;
        for (let i = 0; i < 14; i++) {
          const angle = (i * Math.PI * 2) / 14;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * (b.radius + 18), Math.sin(angle) * (b.radius + 18));
          ctx.stroke();
        }

        // Inner spikes offset
        ctx.strokeStyle = '#F26522'; // fiery orange hint
        ctx.lineWidth = 3.5;
        for (let i = 0; i < 10; i++) {
          const angle = ((i + 0.5) * Math.PI * 2) / 10;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * (b.radius + 12), Math.sin(angle) * (b.radius + 12));
          ctx.stroke();
        }

        // Boss radial body
        const grad = ctx.createRadialGradient(-10, -10, 2, 0, 0, b.radius);
        grad.addColorStop(0, '#5eea84');
        grad.addColorStop(0.7, '#157a30');
        grad.addColorStop(1, '#052a0a');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Stroke core
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Angry face detail (eyes)
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(-14, -8, 6, 0, Math.PI * 2); // left eye
        ctx.arc(14, -8, 6, 0, Math.PI * 2);  // right eye
        ctx.fill();

        ctx.restore(); // reset rotate/translate
      }

      // 8. Draw Player (Guardian)
      if (!playerControlLocked.current) {
        ctx.save();
        ctx.translate(playerX.current, height * 0.8);

        // Flash red/white overlay if recently hit (not fully implemented but clean)
        ctx.shadowColor = '#3B8DD4';
        ctx.shadowBlur = 15;

        // Draw side thrusters/wings
        ctx.fillStyle = '#0a2f52';
        ctx.beginPath();
        ctx.moveTo(-18, 5);
        ctx.lineTo(-24, 18);
        ctx.lineTo(-14, 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, 5);
        ctx.lineTo(24, 18);
        ctx.lineTo(14, 18);
        ctx.closePath();
        ctx.fill();

        // Thruster flame
        ctx.fillStyle = Math.random() < 0.5 ? '#FF8533' : '#F26522';
        ctx.beginPath();
        ctx.moveTo(-22, 18);
        ctx.lineTo(-19, 28);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(22, 18);
        ctx.lineTo(19, 28);
        ctx.lineTo(16, 18);
        ctx.closePath();
        ctx.fill();

        // Guardian circular body
        const playerGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
        playerGrad.addColorStop(0, '#3B8DD4');
        playerGrad.addColorStop(0.7, '#003DA6');
        playerGrad.addColorStop(1, '#051833');

        ctx.fillStyle = playerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Glowing shield core marker
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Active front shield arc
        ctx.strokeStyle = '#3B8DD4';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 22, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();

        ctx.restore();
      }

      // 9. Draw Muzzle Flash
      if (muzzleFlash.current) {
        ctx.save();
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(muzzleFlash.current.x, muzzleFlash.current.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 10. Draw Particles
      particles.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 11. Draw Floating text
      floatingTexts.current.forEach((t) => {
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 11px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      // restore screen shake translation
      ctx.restore();

      // 12. Draw Pickup Flash Overlay
      if (flashTimer.current > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${flashTimer.current * 0.65})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // ─── Throttle React updates for HUD ───────────────────
      const nowMs = performance.now();
      if (nowMs - lastStateUpdate > 100) {
        setScoreState(score.current);
        setHpState(hp.current);
        setShieldCountState(shieldCount.current);
        setTimeRemainingState(Math.ceil(timeRemaining.current));
        setProgressState(progressRatio.current);
        lastStateUpdate = nowMs;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  // UI calculations
  const displayHp = Math.max(0, hpState);
  const displayProgressPercent = Math.min(100, Math.round(progressState * 100));

  // Determine HP bar class (below 30 is red pulse)
  const isHpLow = displayHp < 30;

  return (
    <div
      ref={containerRef}
      className="sj-game-wrap"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 2D Canvas */}
      <canvas ref={canvasRef} className="sj-canvas" />

      {/* HUD Layer */}
      <div className="sj-hud">
        {/* Row 1: Score & Timer */}
        <div className="sj-hud-row">
          <div className="sj-hud-chip ls-chip">
            <span className="hud-label">Score</span>
            <span className="sj-hud-value ls-num">{scoreState}</span>
          </div>

          <div className="sj-hud-chip ls-chip">
            <span className="hud-label">Time Left</span>
            <span className="sj-hud-value ls-num">{timeRemainingState}s</span>
          </div>
        </div>

        {/* Row 2: Health Shield Progress */}
        <div className="sj-hud-row" style={{ alignItems: 'center' }}>
          {/* Health Bar (Left) */}
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="hud-label" style={{ fontSize: 8 }}>Guardian Health</span>
            <div className="sj-bar-shell">
              <div
                className={`sj-bar-fill hp ${isHpLow ? 'low' : ''}`}
                style={{ width: `${displayHp}%` }}
              />
            </div>
          </div>

          {/* Stacking Power Pips (Right) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span className="hud-label" style={{ fontSize: 8 }}>Weapon Level</span>
            <div className="sj-power-pips">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`sj-pip ${shieldCountState > i ? 'on' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Bridge Run Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="hud-label" style={{ fontSize: 7.5 }}>Bridge Progress</span>
            <span className="hud-label" style={{ fontSize: 7.5, letterSpacing: '0.05em' }}>{displayProgressPercent}%</span>
          </div>
          <div className="sj-progress-shell">
            <div className="sj-progress-fill" style={{ width: `${displayProgressPercent}%` }} />
          </div>
        </div>

        {/* Boss HP Bar Overlay */}
        {bossActive.current && bossObj.current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, width: '90%', alignSelf: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="hud-label" style={{ color: '#EF4444', fontSize: 8.5, letterSpacing: '0.12em' }}>INFLATION (BOSS VIRUS)</span>
              <span className="hud-label" style={{ color: '#EF4444', fontSize: 8.5, letterSpacing: '0.05em' }}>
                {Math.max(0, Math.round((bossObj.current.hp / bossObj.current.maxHp) * 100))}%
              </span>
            </div>
            <div className="sj-bar-shell" style={{ height: 10 }}>
              <div
                className="sj-bar-fill"
                style={{
                  background: 'linear-gradient(180deg, #ff6b6b 0%, #EF4444 60%, #991b1b 100%)',
                  width: `${Math.max(0, (bossObj.current.hp / bossObj.current.maxHp) * 100)}%`,
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.7)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Screen Banner Display (Announcements) */}
      {banner && (
        <div className="sj-banner">
          <span className="sj-banner-title" style={{ color: '#fff' }}>{banner.title}</span>
          <span className="sj-banner-sub">{banner.sub}</span>
        </div>
      )}

      {/* Drag Horizontal Hint (disappears on first interaction) */}
      {showDragHintState && (
        <div className="sj-drag-hint">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F26522" strokeWidth="2.5">
            <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
            <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
            <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
            <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
          </svg>
          <span className="hud-label" style={{ color: '#fff', fontSize: 10, letterSpacing: '0.14em', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            DRAG LEFT/RIGHT TO STEER
          </span>
        </div>
      )}
    </div>
  );
}

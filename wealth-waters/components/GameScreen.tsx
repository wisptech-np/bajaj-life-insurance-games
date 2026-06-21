import React, { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_ITEM_DEFS, GAME_SECS, TARGET_PORTFOLIO } from "../constants";
import {
  Bubble,
  FishEntity,
  GameResult,
  Particle,
  Phase,
  UpgradeState,
  UpgradeType,
} from "../types";

// --- SYNTHESIZED SFX (WEB AUDIO API) ---
class SynthAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicInterval: any = null;
  private step = 0;
  public muted = false;

  private init() {
    if (this.ctx) return;
    try {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    dur: number,
    vol: number,
    slideTo?: number,
  ) {
    this.init();
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      }

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {
      console.warn("Failed playTone", e);
    }
  }

  public playClick() {
    this.playTone(600, "sine", 0.08, 0.2);
  }

  public playCast() {
    this.playTone(300, "sine", 0.4, 0.2, 100);
  }

  public playCatchGood(val: number) {
    const start = val >= 60 ? 523 : 392; // C5 or G4
    const mid = val >= 60 ? 659 : 494; // E5 or B4
    const end = val >= 60 ? 784 : 587; // G5 or D5

    this.playTone(start, "sine", 0.1, 0.25);
    setTimeout(() => this.playTone(mid, "sine", 0.1, 0.25), 60);
    setTimeout(() => this.playTone(end, "sine", 0.15, 0.3), 120);
  }

  public playCatchBad() {
    this.playTone(180, "sawtooth", 0.35, 0.3, 60);
  }

  public playUpgrade() {
    const scale = [262, 330, 392, 523, 659];
    scale.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.25, 0.15), i * 70);
    });
  }

  public playWin() {
    const scale = [523, 659, 784, 1047];
    scale.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.3, 0.2), i * 100);
    });
  }

  public startMusic() {
    this.init();
    if (this.musicInterval) return;

    const notes = [
      130.81,
      146.83,
      164.81,
      196.0, // C3, D3, E3, G3
      130.81,
      164.81,
      196.0,
      220.0, // C3, E3, G3, A3
    ];

    this.step = 0;
    this.musicInterval = setInterval(() => {
      if (this.muted || !this.masterGain) return;
      try {
        const base = notes[this.step % notes.length];
        // Bass line
        this.playTone(base, "triangle", 0.25, 0.08);

        // Soft ambient harmony chords on beat 0
        if (this.step % 4 === 0) {
          this.playTone(base * 2, "sine", 0.6, 0.04);
          this.playTone(base * 3, "sine", 0.6, 0.03);
        }

        this.step++;
      } catch (e) {}
    }, 450);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : 0.3,
        this.ctx.currentTime,
      );
    }
    return this.muted;
  }
}

const audio = new SynthAudio();

// --- UPGRADE DETAILS ---
interface UpgradeDef {
  name: string;
  description: string;
  icon: string;
  costFormula: (lvl: number) => number;
  maxLevel: number;
}

const UPGRADE_DEFS: Record<UpgradeType, UpgradeDef> = {
  rod: {
    name: "Rod Strength",
    description: "Reel in heavy treasures at full speed",
    icon: "🎣",
    costFormula: (lvl) => Math.round(150 * Math.pow(2.2, lvl - 1)),
    maxLevel: 5,
  },
  reel: {
    name: "Reel Speed",
    description: "Increases hook lowering and pulling speed",
    icon: "⚡",
    costFormula: (lvl) => Math.round(120 * Math.pow(2.1, lvl - 1)),
    maxLevel: 5,
  },
  hook: {
    name: "Hook Size",
    description: "Increases the grab area radius of the hook",
    icon: "🪝",
    costFormula: (lvl) => Math.round(100 * Math.pow(2.0, lvl - 1)),
    maxLevel: 5,
  },
  sonar: {
    name: "Radar Sonar",
    description: "Lvl 1: path prediction line. Lvl 2+: spots rare elements",
    icon: "📡",
    costFormula: (lvl) => Math.round(200 * Math.pow(2.5, lvl - 1)),
    maxLevel: 3,
  },
  magnet: {
    name: "Insurance Magnet",
    description: "Pulls good protection items towards your hook",
    icon: "🧲",
    costFormula: (lvl) => Math.round(250 * Math.pow(2.3, lvl - 1)),
    maxLevel: 3,
  },
};

interface GameScreenProps {
  onGameEnd: (res: GameResult) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onGameEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Upgrade & points states
  const [points, setPoints] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "upgrades" | "collection" | "settings"
  >("upgrades");
  const [muted, setMuted] = useState(audio.muted);
  const [upgrades, setUpgrades] = useState<UpgradeState>({
    rod: 1,
    reel: 1,
    hook: 1,
    sonar: 0,
    magnet: 0,
  });

  // HUD stats
  const [timeLeft, setTimeLeft] = useState(GAME_SECS);
  const [scorePercent, setScorePercent] = useState(0);
  const [isStormActive, setIsStormActive] = useState(false);
  const [showHowToPopup, setShowHowToPopup] = useState(true);

  // Game references for loop (to prevent React stale state references)
  const stateRef = useRef({
    points: 0,
    upgrades: { rod: 1, reel: 1, hook: 1, sonar: 0, magnet: 0 },
    timeLeft: GAME_SECS,
    running: false,
    width: 360,
    height: 520,

    // Physics
    angle: 0,
    angleDir: 1,
    ropeLenRatio: 0.45,
    phase: "swing" as Phase,
    retractStartRatio: 0.45,
    screenShake: 0,

    // Entities
    entities: [] as FishEntity[],
    particles: [] as Particle[],
    bubbles: [] as Bubble[],

    // Rare Event System
    stormTimer: 0,
    vaultSpawned: false,

    // Scoring parameters
    gains: 0,
    losses: 0,
    itemsCaught: 0,
    multiplier: 1,
  });

  // Visual constants
  const WATER_Y_RATIO = 0.28;

  // Handle resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 10 || h < 10) return;

      const dpr = window.devicePixelRatio || 1;
      stateRef.current.width = w;
      stateRef.current.height = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };

    handleResize();

    // Use ResizeObserver for accurate sizing on all screen boundaries
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, []);

  // Update loop references on points or upgrades change
  useEffect(() => {
    stateRef.current.points = points;
    stateRef.current.upgrades = upgrades;
  }, [points, upgrades]);

  // Main game loop logic
  const startGame = useCallback(() => {
    setShowHowToPopup(false);
    audio.playClick();
    audio.startMusic();

    const S = stateRef.current;
    S.running = true;
    S.timeLeft = GAME_SECS;
    S.points = 0;
    S.gains = 0;
    S.losses = 0;
    S.itemsCaught = 0;
    S.entities = [];
    S.particles = [];
    S.bubbles = [];
    S.phase = "swing";
    S.ropeLenRatio = 0.45;
    S.angle = 0;
    S.vaultSpawned = false;
    S.multiplier = 1;
    S.screenShake = 0;

    setPoints(0);
    setTimeLeft(GAME_SECS);

    // Dynamic entity generation
    const spawnEntity = () => {
      if (!S.running) return;

      const waterY = S.height * WATER_Y_RATIO;
      const spawnDepth = Math.random(); // 0.0 to 1.0 (shallow to deep)

      // Filter available item defs based on spawn depth
      const pool = DEFAULT_ITEM_DEFS.filter((item) => {
        // If storm is active, ONLY good items spawn
        if (isStormActive && item.kind === "bad") return false;
        return spawnDepth >= item.depthMin && spawnDepth <= item.depthMax;
      });

      if (pool.length > 0) {
        // Select by weights
        const totalW = pool.reduce((acc, x) => acc + x.weight, 0);
        let roll = Math.random() * totalW;
        let chosen = pool[0];
        for (const item of pool) {
          roll -= item.weight;
          if (roll <= 0) {
            chosen = item;
            break;
          }
        }

        const dir = Math.random() > 0.5 ? 1 : -1;
        const depthY = waterY + 30 + spawnDepth * (S.height - waterY - 80);

        S.entities.push({
          id: Math.random(),
          x: dir === 1 ? -40 : S.width + 40,
          y: depthY,
          def: chosen,
          size:
            chosen.kind === "good"
              ? 26 + chosen.value / 6
              : 28 + Math.abs(chosen.value) / 10,
          speed:
            chosen.kind === "good"
              ? 0.8 + Math.random() * 0.6
              : 1.2 + Math.random() * 0.8,
          dir,
          caught: false,
          bob: Math.random() * Math.PI,
          bobSpeed: 0.02 + Math.random() * 0.03,
        });
      }

      // Schedule next spawn based on storm state
      const nextTime = isStormActive
        ? 400 + Math.random() * 400
        : 800 + Math.random() * 600;
      setTimeout(spawnEntity, nextTime);
    };
    spawnEntity();

    // Bubble spawner
    const bubbleInterval = setInterval(() => {
      if (!S.running) return;
      S.bubbles.push({
        x: 10 + Math.random() * (S.width - 20),
        y: S.height + 10,
        r: 1 + Math.random() * 3,
        speed: 0.5 + Math.random() * 0.6,
        opacity: 0.15 + Math.random() * 0.3,
      });
      if (S.bubbles.length > 35) S.bubbles.shift();
    }, 400);

    // Timer Tick
    const timerInterval = setInterval(() => {
      if (!S.running) return;
      const waterY = S.height * WATER_Y_RATIO;
      S.timeLeft--;
      setTimeLeft(S.timeLeft);

      // Handle Protection Storm timer
      if (isStormActive) {
        S.multiplier = 2;
        S.stormTimer--;
        if (S.stormTimer <= 0) {
          setIsStormActive(false);
          S.multiplier = 1;
        }
      } else {
        // 4% chance of starting a storm every second
        if (Math.random() < 0.04 && S.timeLeft > 10) {
          setIsStormActive(true);
          S.stormTimer = 8; // storm lasts 8 seconds
          audio.playUpgrade();
          // Spawn extra positive particles
          for (let i = 0; i < 15; i++) {
            S.particles.push({
              x: Math.random() * S.width,
              y: waterY + Math.random() * (S.height - waterY),
              vx: (Math.random() - 0.5) * 1.5,
              vy: Math.random() * 1.5,
              r: 2 + Math.random() * 3,
              color: "#FBBF24",
              alpha: 0.8,
              life: 0,
              maxLife: 80 + Math.random() * 50,
            });
          }
        }
      }

      // Spawn Legacy Vault in abyss during final 20 seconds
      if (
        S.timeLeft <= 25 &&
        S.timeLeft > 10 &&
        !S.vaultSpawned &&
        S.upgrades.rod >= 3
      ) {
        S.vaultSpawned = true;
        S.entities.push({
          id: 9999,
          x: S.width / 2,
          y: S.height - 70,
          def: {
            id: "legacy_vault",
            label: "Legacy Vault",
            value: 250,
            emoji: "🗄️",
            kind: "good",
            depthMin: 0.85,
            depthMax: 1.0,
            color: "#FBBF24",
            weight: 1,
          },
          size: 45,
          speed: 0, // static vault
          dir: 1,
          caught: false,
          bob: 0,
          bobSpeed: 0,
        });
      }

      if (S.timeLeft <= 0) {
        clearInterval(timerInterval);
        clearInterval(bubbleInterval);
        endGame();
      }
    }, 1000);

    // Frame loops
    let animId: number;
    const tickFrame = (timestamp: number) => {
      if (!S.running) return;
      updateState(timestamp);
      drawFrame();
      animId = requestAnimationFrame(tickFrame);
    };
    animId = requestAnimationFrame(tickFrame);

    const endGame = () => {
      S.running = false;
      cancelAnimationFrame(animId);
      clearInterval(timerInterval);
      clearInterval(bubbleInterval);
      audio.stopMusic();
      audio.playWin();

      onGameEnd({
        portfolio: S.points,
        gains: S.gains,
        losses: S.losses,
        itemsCaught: S.itemsCaught,
        timeSeconds: GAME_SECS - S.timeLeft,
        rawScore: Math.min(
          100,
          Math.max(0, Math.round((S.points / TARGET_PORTFOLIO) * 100)),
        ),
      });
    };
  }, [isStormActive]);

  // Update physics frame
  const updateState = (time: number) => {
    const S = stateRef.current;
    const waterY = S.height * WATER_Y_RATIO;

    // Screen Shake damping
    if (S.screenShake > 0) S.screenShake -= 0.5;

    // Upgrades configurations
    const reelLvl = S.upgrades.reel;
    const rodLvl = S.upgrades.rod;
    const hookLvl = S.upgrades.hook;
    const magnetLvl = S.upgrades.magnet;

    // Swing, Cast, and Retract Speeds
    const swingSpeed = 0.015 + reelLvl * 0.003;
    const dropSpeed = 0.008 + reelLvl * 0.004;

    // Normal retract speed, heavily mitigated by rod strength for heavy assets
    const retractBase = 0.012 + reelLvl * 0.004;

    // Hook pendulum logic
    if (S.phase === "swing") {
      S.angle += swingSpeed * S.angleDir;
      if (S.angle > Math.PI / 3) {
        S.angle = Math.PI / 3;
        S.angleDir = -1;
      } else if (S.angle < -Math.PI / 3) {
        S.angle = -Math.PI / 3;
        S.angleDir = 1;
      }
      S.ropeLenRatio = 0.45;
    } else if (S.phase === "cast") {
      S.ropeLenRatio += dropSpeed;
      if (S.ropeLenRatio >= 0.95) {
        S.ropeLenRatio = 0.95;
        S.phase = "retract";
        S.retractStartRatio = S.ropeLenRatio;
      }
    } else if (S.phase === "retract") {
      // Find weight of caught items to slow down retraction
      const caughtItem = S.entities.find((e) => e.caught);
      let weightFactor = 1.0;
      if (caughtItem) {
        // Heavy item weight penalty, rod level reduces it
        const rawWeight = Math.abs(caughtItem.def.value) / 100; // e.g. 1.0 for 100 points
        weightFactor = Math.max(0.3, 1.0 - rawWeight * (1.1 - rodLvl * 0.2));
      }

      S.ropeLenRatio -= retractBase * weightFactor;
      if (S.ropeLenRatio <= 0.45) {
        S.ropeLenRatio = 0.45;
        S.phase = "swing";

        // Deliver caught item
        const delivered = S.entities.filter((e) => e.caught);
        if (delivered.length > 0) {
          delivered.forEach((item) => {
            const finalVal = item.def.value * S.multiplier;
            const nextPoints = Math.max(0, S.points + finalVal);
            setPoints(nextPoints);
            S.points = nextPoints;
            setScorePercent(
              Math.min(100, Math.round((nextPoints / TARGET_PORTFOLIO) * 100)),
            );

            S.itemsCaught++;
            if (finalVal > 0) {
              S.gains += finalVal;
            } else {
              S.losses += Math.abs(finalVal);
            }
          });
          // Remove caught items
          S.entities = S.entities.filter((e) => !e.caught);
        }
      }
    }

    const hookRadius = 8 + hookLvl * 3.5; // Hook boundary detection size
    const rockAngle = Math.sin(Date.now() * 0.0018) * 0.035;
    const rodAngle = -Math.PI / 4 + rockAngle;
    const rodLength = 45;
    const pivotX = S.width * 0.5;
    const rodEndX = pivotX - 10 + Math.cos(rodAngle) * rodLength;
    const rodEndY = waterY - 14 + Math.sin(rodAngle) * rodLength;

    const maxRopePx = S.height - rodEndY - 45;
    const currentRopePx = S.ropeLenRatio * maxRopePx;
    const hookX = rodEndX + Math.sin(S.angle) * currentRopePx;
    const hookY = rodEndY + Math.cos(S.angle) * currentRopePx;

    // Insurance Magnet pull logic (pulls positive items within magnet range)
    if (magnetLvl > 0 && S.phase === "cast") {
      const pullDist = 50 + magnetLvl * 25;
      const pullForce = 0.4 + magnetLvl * 0.3;

      S.entities.forEach((item) => {
        if (!item.caught && item.def.kind === "good") {
          const dx = hookX - item.x;
          const dy = hookY - item.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pullDist && dist > 5) {
            item.x += (dx / dist) * pullForce;
            item.y += (dy / dist) * pullForce;
          }
        }
      });
    }

    // Entity movements & collision detections
    S.entities.forEach((item) => {
      if (item.caught) {
        // Drag caught item to hook location
        item.x = hookX;
        item.y = hookY + 8;
      } else {
        // Normal horizontal swim
        item.x += item.speed * item.dir;
        item.bob += item.bobSpeed;

        // Collision Check during cast drop
        if (S.phase === "cast") {
          const dy = item.y + Math.sin(item.bob) * 4 - hookY;
          const dx = item.x - hookX;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const collisionRange = item.size / 2 + hookRadius;

          if (dist < collisionRange) {
            // Caught element!
            item.caught = true;
            S.phase = "retract";
            S.retractStartRatio = S.ropeLenRatio;

            // Trigger SFX & Visuals
            if (item.def.kind === "good") {
              audio.playCatchGood(item.def.value);
              // Green sparkle particles
              for (let i = 0; i < 8; i++) {
                S.particles.push({
                  x: item.x,
                  y: item.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  r: 2 + Math.random() * 2.5,
                  color: "#60A5FA",
                  alpha: 1,
                  life: 0,
                  maxLife: 25 + Math.random() * 15,
                });
              }
            } else {
              audio.playCatchBad();
              S.screenShake = 12; // trigger screen rumble
              // Red fire sparks
              for (let i = 0; i < 8; i++) {
                S.particles.push({
                  x: item.x,
                  y: item.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  r: 3 + Math.random() * 2,
                  color: "#EF4444",
                  alpha: 1,
                  life: 0,
                  maxLife: 30 + Math.random() * 20,
                });
              }
            }
          }
        }
      }
    });

    // Filter out off-screen entities
    S.entities = S.entities.filter((item) => {
      if (item.caught) return true;
      return item.x > -80 && item.x < S.width + 80;
    });

    // Update floating bubbles
    S.bubbles.forEach((b) => {
      b.y -= b.speed;
      b.x += Math.sin(b.y * 0.05) * 0.2;
    });
    S.bubbles = S.bubbles.filter((b) => b.y > waterY - 5);

    // Update burst particles
    S.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;
    });
    S.particles = S.particles.filter((p) => p.life < p.maxLife);
  };

  // HTML5 Canvas drawings
  const drawFrame = () => {
    const S = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();

    // Scale for high-DPI (Retina) sharp rendering
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // Handle Screen Shake
    if (S.screenShake > 0) {
      const dx = (Math.random() - 0.5) * S.screenShake;
      const dy = (Math.random() - 0.5) * S.screenShake;
      ctx.translate(dx, dy);
    }

    const waterY = S.height * WATER_Y_RATIO;

    // 1. Draw Surface Marina & Sunrise Skyline background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, S.width, waterY);

    const sunrise = ctx.createLinearGradient(0, 0, 0, waterY);
    sunrise.addColorStop(0, "#701a75"); // Dark violet
    sunrise.addColorStop(0.5, "#ea580c"); // Bright orange
    sunrise.addColorStop(1, "#ca8a04"); // Golden yellow
    ctx.fillStyle = sunrise;
    ctx.fillRect(0, 0, S.width, waterY);

    // City outline silhouettes
    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.fillRect(S.width * 0.1, waterY - 55, 30, 55);
    ctx.fillRect(S.width * 0.2, waterY - 80, 40, 80);
    ctx.fillRect(S.width * 0.42, waterY - 70, 35, 70);
    ctx.fillRect(S.width * 0.75, waterY - 90, 50, 90);
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillRect(S.width * 0.15, waterY - 40, 25, 40);
    ctx.fillRect(S.width * 0.3, waterY - 60, 35, 60);
    ctx.fillRect(S.width * 0.6, waterY - 50, 45, 50);

    // 2. Draw Underwater Gradients by Depth
    const waterBg = ctx.createLinearGradient(0, waterY, 0, S.height);
    if (isStormActive) {
      // Dark golden storm theme
      waterBg.addColorStop(0, "#111827");
      waterBg.addColorStop(0.3, "#1f2937");
      waterBg.addColorStop(0.7, "#111827");
      waterBg.addColorStop(1, "#030712");
    } else {
      waterBg.addColorStop(0, "#0284c7"); // 0m: Bright Blue (Shallow)
      waterBg.addColorStop(0.3, "#0d9488"); // 50m: Teal (Mid Depth)
      waterBg.addColorStop(0.65, "#1e3a8a"); // 150m: Dark Blue (Deep)
      waterBg.addColorStop(1, "#3b0764"); // 300m+: Purple-blue (Abyss)
    }
    ctx.fillStyle = waterBg;
    ctx.fillRect(0, waterY, S.width, S.height - waterY);

    // Caustic Light rays filtering down
    if (!isStormActive) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 3; i++) {
        const xOffset =
          S.width * 0.25 +
          i * (S.width * 0.25) +
          Math.sin(Date.now() * 0.0005 + i) * 15;
        ctx.beginPath();
        ctx.moveTo(xOffset, waterY);
        ctx.lineTo(xOffset + 40, S.height);
        ctx.lineTo(xOffset - 40, S.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Draw Floating Bubbles
    S.bubbles.forEach((b) => {
      ctx.save();
      ctx.globalAlpha = b.opacity;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 4. Draw Explorer Yacht Rocking on Surface
    const pivotX = S.width * 0.5;
    const pivotY = 24;
    const rockAngle = Math.sin(Date.now() * 0.0018) * 0.035; // gentle boat rocking

    ctx.save();
    ctx.translate(pivotX - 35, waterY + 4);
    ctx.rotate(rockAngle);

    // Yacht Silhouette
    ctx.fillStyle = "#F8FAFF"; // White fiberglass hull
    ctx.beginPath();
    ctx.moveTo(-50, -4);
    ctx.lineTo(-40, -16);
    ctx.lineTo(35, -16);
    ctx.lineTo(55, -4);
    ctx.lineTo(40, 8);
    ctx.lineTo(-45, 8);
    ctx.closePath();
    ctx.fill();

    // Gold accent trim
    ctx.fillStyle = "#FBBF24";
    ctx.fillRect(-45, 0, 88, 2);

    // Metallic cabin
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(-15, -28, 35, 12);
    ctx.fillStyle = "#60A5FA"; // Windows
    ctx.fillRect(8, -25, 8, 7);
    ctx.fillStyle = "#FBBF24"; // Cabin lights glow
    ctx.beginPath();
    ctx.arc(-8, -21, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Emblems
    ctx.strokeStyle = "#003DA6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-30, -5, 4, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.restore();

    // 5. Draw Fishing Rod & line
    const rodAngle = -Math.PI / 4 + rockAngle;
    const rodLength = 45;
    const rodEndX = pivotX - 10 + Math.cos(rodAngle) * rodLength;
    const rodEndY = waterY - 14 + Math.sin(rodAngle) * rodLength;

    // Draw Rod (Carbon fiber look)
    ctx.save();
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pivotX - 10, waterY - 14);
    ctx.lineTo(rodEndX, rodEndY);
    ctx.stroke();
    // Gold metallic joints
    ctx.fillStyle = "#FBBF24";
    ctx.beginPath();
    ctx.arc(pivotX - 10, waterY - 14, 4, 0, 2 * Math.PI);
    ctx.arc(rodEndX, rodEndY, 2.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Draw Sonar Radar Pulse if upgraded
    const sonarLvl = S.upgrades.sonar;
    if (sonarLvl > 0 && S.phase === "swing") {
      ctx.save();
      ctx.strokeStyle = "rgba(96,165,250,0.15)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);

      // Dashed sweep path indicator showing hook trajectory
      const maxRope = S.height - rodEndY - 45;
      const trajLen = 0.95 * maxRope;
      ctx.beginPath();
      const segments = 25;
      for (let i = 0; i <= segments; i++) {
        const hyp = (i / segments) * trajLen;
        const tx = rodEndX + Math.sin(S.angle) * hyp;
        const ty = rodEndY + Math.cos(S.angle) * hyp;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.restore();

      // Spotlight rare elements on Radar
      if (sonarLvl >= 2) {
        S.entities.forEach((item) => {
          if (!item.caught && item.def.value >= 60) {
            ctx.save();
            ctx.strokeStyle = "#FBBF24";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(
              item.x,
              item.y + Math.sin(item.bob) * 4,
              item.size + 15 * Math.sin(Date.now() * 0.005),
              0,
              2 * Math.PI,
            );
            ctx.stroke();
            ctx.restore();
          }
        });
      }
    }

    // Hook calculations
    const maxRopePx = S.height - rodEndY - 45;
    const currentRopePx = S.ropeLenRatio * maxRopePx;
    const hookX = rodEndX + Math.sin(S.angle) * currentRopePx;
    const hookY = rodEndY + Math.cos(S.angle) * currentRopePx;

    // Draw Fishing line
    ctx.strokeStyle =
      S.phase !== "swing" ? "rgba(251,191,36,0.75)" : "rgba(226,232,240,0.3)";
    ctx.lineWidth = S.phase !== "swing" ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(rodEndX, rodEndY);
    ctx.lineTo(hookX, hookY);
    ctx.stroke();

    // Draw Hook (Beautiful emoji hook matching tutorial)
    ctx.save();
    const hookLvl = S.upgrades.hook;
    const hookScale = 1 + (hookLvl - 1) * 0.15; // scales from 1.0 (Lvl 1) to 1.6 (Lvl 5)
    ctx.translate(hookX, hookY);
    ctx.rotate(-S.angle);
    ctx.scale(hookScale, hookScale);

    ctx.shadowColor = S.phase !== "swing" ? "#FBBF24" : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = S.phase !== "swing" ? 8 : 2;

    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("🪝", 0, -4);
    ctx.restore();

    // Runic cyan point particle
    if (S.phase !== "swing") {
      ctx.fillStyle = "#60A5FA";
      ctx.beginPath();
      ctx.arc(
        hookX,
        hookY,
        2.5 + Math.sin(Date.now() * 0.01) * 1.5,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    }

    // 6. Draw Items & Fishes
    S.entities.forEach((item) => {
      const by = item.y + Math.sin(item.bob) * 4;
      ctx.save();

      // Mirror texture direction
      ctx.translate(item.x, by);
      if (item.dir === -1 && !item.caught) {
        ctx.scale(-1, 1);
      }

      // Draw custom procedural drawings
      drawProceduralAsset(ctx, item.def.id, item.size);

      // Value label floating
      ctx.restore();
    });

    // 7. Draw Visual Burst Particles
    S.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore(); // restore screen shake
  };

  // Procedural Asset Illustrator
  const drawProceduralAsset = (
    ctx: CanvasRenderingContext2D,
    id: string,
    size: number,
  ) => {
    const half = size / 2;
    ctx.shadowBlur = 8;

    switch (id) {
      case "savings_pouch": {
        ctx.shadowColor = "#10B981";
        // Draw pouch body
        ctx.fillStyle = "#8B5E3C";
        ctx.beginPath();
        ctx.arc(0, 4, half * 0.9, 0, Math.PI, false);
        ctx.lineTo(-half * 0.6, -half * 0.5);
        ctx.lineTo(half * 0.6, -half * 0.5);
        ctx.closePath();
        ctx.fill();
        // Golden coins peeking
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.arc(-half * 0.2, -half * 0.4, half * 0.3, 0, 2 * Math.PI);
        ctx.arc(half * 0.2, -half * 0.4, half * 0.3, 0, 2 * Math.PI);
        ctx.fill();
        // Ribbon tie
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(-half * 0.4, -half * 0.3, half * 0.8, 3);
        break;
      }
      case "family_shield": {
        ctx.shadowColor = "#60A5FA";
        // Shield path
        ctx.fillStyle = "linear-gradient(135deg, #1e40af, #3b82f6)";
        const grad = ctx.createLinearGradient(-half, -half, half, half);
        grad.addColorStop(0, "#1E40AF");
        grad.addColorStop(1, "#3B82F6");
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, -half * 0.5);
        ctx.lineTo(half * 0.8, half * 0.4);
        ctx.quadraticCurveTo(0, half * 1.1, -half * 0.8, half * 0.4);
        ctx.lineTo(-half, -half * 0.5);
        ctx.closePath();
        ctx.fill();

        // Gold border
        ctx.strokeStyle = "#FBBF24";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Family silhouette
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(-half * 0.3, -half * 0.1, 3.5, 0, 2 * Math.PI); // parents
        ctx.arc(half * 0.3, -half * 0.1, 3.5, 0, 2 * Math.PI);
        ctx.arc(0, half * 0.1, 2.5, 0, 2 * Math.PI); // child
        ctx.fill();
        break;
      }
      case "emergency_bag": {
        ctx.shadowColor = "#10B981";
        ctx.fillStyle = "#0D9488";
        ctx.beginPath();
        ctx.roundRect(-half, -half * 0.7, size, size * 0.8, 6);
        ctx.fill();
        // Gold buckle
        ctx.fillStyle = "#FBBF24";
        ctx.fillRect(-3, -half * 0.7, 6, 8);
        // Handle
        ctx.strokeStyle = "#0F766E";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -half * 0.7, 8, Math.PI, 0);
        ctx.stroke();
        break;
      }
      case "child_education": {
        ctx.shadowColor = "#C084FC";
        // Oyster shell shape back
        ctx.fillStyle = "#818CF8";
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();
        // Pearl inside
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, -2, half * 0.45, 0, 2 * Math.PI);
        ctx.fill();
        // Mortarboard cap shape top
        ctx.fillStyle = "#1E1B4B";
        ctx.beginPath();
        ctx.moveTo(0, -half * 0.8);
        ctx.lineTo(half * 0.5, -half * 1.1);
        ctx.lineTo(0, -half * 1.4);
        ctx.lineTo(-half * 0.5, -half * 1.1);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "health_crystal": {
        ctx.shadowColor = "#34D399";
        // Green heart outline
        ctx.fillStyle = "#10B981";
        ctx.beginPath();
        ctx.moveTo(0, half * 0.8);
        ctx.bezierCurveTo(
          -half * 1.2,
          -half * 0.3,
          -half * 0.8,
          -half * 1.1,
          0,
          -half * 0.5,
        );
        ctx.bezierCurveTo(
          half * 0.8,
          -half * 1.1,
          half * 1.2,
          -half * 0.3,
          0,
          half * 0.8,
        );
        ctx.fill();
        // White medical cross
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-2, -half * 0.35, 4, half * 0.7);
        ctx.fillRect(-half * 0.35, -2, half * 0.7, 4);
        break;
      }
      case "retirement_chest": {
        ctx.shadowColor = "#FBBF24";
        // Chest wood
        ctx.fillStyle = "#78350F";
        ctx.fillRect(-half, -half * 0.3, size, size * 0.7);
        // Chest lid rounded
        ctx.beginPath();
        ctx.arc(0, -half * 0.3, half, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // Gold bands
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(-half, -half * 0.3, 4, size * 0.7);
        ctx.fillRect(half - 4, -half * 0.3, 4, size * 0.7);
        ctx.fillRect(-half * 0.6, -half * 0.8, 3, half * 0.5);
        ctx.fillRect(half * 0.6, -half * 0.8, 3, half * 0.5);
        break;
      }
      case "wealth_growth": {
        ctx.shadowColor = "#60A5FA";
        // Sapphire facets
        ctx.fillStyle = "#2563EB";
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, -half * 0.3);
        ctx.lineTo(half * 0.6, half * 0.8);
        ctx.lineTo(-half * 0.6, half * 0.8);
        ctx.lineTo(-half, -half * 0.3);
        ctx.closePath();
        ctx.fill();
        // Light reflection
        ctx.fillStyle = "#60A5FA";
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half * 0.3, -half * 0.3);
        ctx.lineTo(0, half * 0.8);
        ctx.lineTo(-half * 0.3, -half * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "guaranteed_income": {
        ctx.shadowColor = "#FBBF24";
        // Golden Orb
        ctx.fillStyle = "#F59E0B";
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.7, 0, 2 * Math.PI);
        ctx.fill();
        // Rotating Ring (Pulsing oval line)
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.save();
        ctx.rotate(Date.now() * 0.003);
        ctx.beginPath();
        ctx.ellipse(0, 0, half * 1.1, half * 0.3, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "legacy_vault": {
        ctx.shadowColor = "#F59E0B";
        // Metal safe outline
        ctx.fillStyle = "#475569";
        ctx.fillRect(-half, -half, size, size);
        // Golden vault door
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.7, 0, 2 * Math.PI);
        ctx.fill();
        // Lock wheel dial
        ctx.strokeStyle = "#78350F";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.35, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }

      // --- BAD ITEMS ---
      case "medical_debt": {
        ctx.shadowColor = "#EF4444";
        // Crab body
        ctx.fillStyle = "#991B1B";
        ctx.beginPath();
        ctx.ellipse(0, 4, half, half * 0.7, 0, 0, 2 * Math.PI);
        ctx.fill();
        // Crab eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-half * 0.4, -half * 0.5, 2, 0, 2 * Math.PI);
        ctx.arc(half * 0.4, -half * 0.5, 2, 0, 2 * Math.PI);
        ctx.fill();
        // Hospital bill tag (white paper rectangle)
        ctx.save();
        ctx.rotate(-0.25);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-half * 0.6, -half * 1.3, half * 1.2, half * 0.8);
        ctx.fillStyle = "#EF4444";
        ctx.fillRect(-half * 0.4, -half * 1.1, half * 0.8, 1.5);
        ctx.fillRect(-half * 0.4, -half * 0.8, half * 0.5, 1.5);
        ctx.restore();
        break;
      }
      case "inflation_jellyfish": {
        ctx.shadowColor = "#F87171";
        // Translucent Dome
        ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
        ctx.beginPath();
        ctx.arc(0, -2, half * 0.8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        // Wavy tentacles
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
        ctx.lineWidth = 2.0;
        const wave = Math.sin(Date.now() * 0.01) * 4;
        ctx.beginPath();
        ctx.moveTo(-half * 0.5, 0);
        ctx.quadraticCurveTo(
          -half * 0.5 + wave,
          half * 0.6,
          -half * 0.4,
          half * 1.1,
        );
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(wave, half * 0.7, 0, half * 1.2);
        ctx.moveTo(half * 0.5, 0);
        ctx.quadraticCurveTo(
          half * 0.5 + wave,
          half * 0.6,
          half * 0.4,
          half * 1.1,
        );
        ctx.stroke();
        break;
      }
      case "loan_shark": {
        ctx.shadowColor = "#DC2626";
        // Shark body
        ctx.fillStyle = "#64748B";
        ctx.beginPath();
        ctx.ellipse(0, 0, half * 1.2, half * 0.6, 0, 0, 2 * Math.PI);
        ctx.fill();
        // Banker collar & red tie
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(-half * 0.5, -4);
        ctx.lineTo(-half * 0.2, 8);
        ctx.lineTo(-half * 0.1, -4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#EF4444"; // red tie
        ctx.beginPath();
        ctx.moveTo(-half * 0.2, 4);
        ctx.lineTo(-half * 0.3, 16);
        ctx.lineTo(-half * 0.1, 16);
        ctx.closePath();
        ctx.fill();
        // Red glowing eye
        ctx.fillStyle = "#EF4444";
        ctx.beginPath();
        ctx.arc(half * 0.5, -half * 0.25, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        break;
      }
      case "tax_leak": {
        ctx.shadowColor = "#EF4444";
        // Rusty barrel
        ctx.fillStyle = "#451A03";
        ctx.fillRect(-half * 0.7, -half, size * 0.7, size);
        ctx.fillStyle = "#7C2D12";
        ctx.fillRect(-half * 0.6, -half * 0.8, size * 0.6, size * 0.8);
        // Rings
        ctx.fillStyle = "#000000";
        ctx.fillRect(-half * 0.7, -half * 0.4, size * 0.7, 2.5);
        ctx.fillRect(-half * 0.7, half * 0.2, size * 0.7, 2.5);
        // Leak droplet
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(
          0,
          half * 1.1 + Math.sin(Date.now() * 0.01) * 3,
          3,
          0,
          2 * Math.PI,
        );
        ctx.fill();
        break;
      }
      case "market_crash": {
        ctx.shadowColor = "#B91C1C";
        // Mine body
        ctx.fillStyle = "#1E293B";
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        // Spikes
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "#1E293B";
        for (let a = 0; a < 8; a++) {
          const angle = (a * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * half, Math.sin(angle) * half);
          ctx.stroke();
        }
        // Blinking red light
        ctx.fillStyle = Date.now() % 500 < 250 ? "#EF4444" : "#7F1D1D";
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.fill();
        break;
      }
      case "fraud_piranha": {
        ctx.shadowColor = "#DC2626";
        // Piranha body red
        ctx.fillStyle = "#991B1B";
        ctx.beginPath();
        ctx.ellipse(0, 0, half, half * 0.75, 0, 0, 2 * Math.PI);
        ctx.fill();
        // Teeth
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(half * 0.2, half * 0.1);
        ctx.lineTo(half * 0.4, -half * 0.1);
        ctx.lineTo(half * 0.3, half * 0.2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "uninsured_storm": {
        ctx.shadowColor = "#A855F7";
        // Energy core purple
        ctx.fillStyle = "#6B21A8";
        ctx.beginPath();
        ctx.arc(0, 0, half * 0.7, 0, 2 * Math.PI);
        ctx.fill();
        // Lightning crackle lines
        ctx.strokeStyle = "#F3E8FF";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-half * 0.4, -half * 0.4);
        ctx.lineTo(0, -half * 0.1);
        ctx.lineTo(-half * 0.2, half * 0.4);
        ctx.moveTo(half * 0.4, -half * 0.3);
        ctx.lineTo(0, half * 0.1);
        ctx.lineTo(half * 0.1, half * 0.5);
        ctx.stroke();
        break;
      }
      default: {
        ctx.font = `${size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🐟", 0, 0);
      }
    }
  };

  // Upgrades purchase click handler
  const handleUpgrade = (type: UpgradeType) => {
    const currentLvl = upgrades[type];
    const def = UPGRADE_DEFS[type];
    if (currentLvl >= def.maxLevel) return;

    const cost = def.costFormula(currentLvl);
    if (points >= cost) {
      const nextPoints = points - cost;
      const nextUpgrades = {
        ...upgrades,
        [type]: currentLvl + 1,
      };
      setPoints(nextPoints);
      setUpgrades(nextUpgrades);
      audio.playUpgrade();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (showHowToPopup) return;

    const S = stateRef.current;
    if (S.phase === "swing") {
      S.phase = "cast";
      audio.playCast();
    }
  };

  // Convert time to standard 0:00 format
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const timerCritical = timeLeft <= 10;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden select-none"
      style={{ background: "#030712" }}
    >
      {/* Top Header Panel */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 pb-2"
        style={{
          paddingTop: "max(1.5rem, calc(env(safe-area-inset-top) + 0.5rem))",
        }}
      >
        {/* Protection Points */}
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
            Protection Points
          </span>
          <span className="text-xl font-black text-white">
            {points.toLocaleString()}
          </span>
        </div>

        {/* Dynamic Timer */}
        <div className="text-center bg-white/5 border border-white/10 px-3 py-1 rounded-2xl">
          <span
            className="font-black tabular-nums transition-all text-lg"
            style={{
              color: timerCritical ? "#EF4444" : "#F8FAFF",
              textShadow: timerCritical
                ? "0 0 10px rgba(239,68,68,0.5)"
                : "none",
            }}
          >
            {mm}:{ss}
          </span>
          <p className="text-[7px] font-black uppercase tracking-widest text-gray-400">
            Time Left
          </p>
        </div>

        {/* Protection Storm Multiplier */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black tracking-widest text-yellow-400 uppercase">
            Multiplier
          </span>
          <div className="flex items-center gap-1">
            {isStormActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
            )}
            <span className="text-xl font-black text-yellow-400">
              {isStormActive ? "2x" : "1x"}
            </span>
          </div>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="mx-5 mb-2 flex-shrink-0 flex items-center gap-2">
        <div className="flex-1 bg-white/10 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${scorePercent}%`,
              background: "linear-gradient(90deg, #60A5FA, #34D399)",
            }}
          />
        </div>
        <span className="text-[10px] font-bold text-gray-400 tracking-wide flex-shrink-0">
          Target: {scorePercent}%
        </span>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="flex-1 px-5 relative min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-3xl border border-white/5 shadow-2xl"
          style={{ touchAction: "none", cursor: "pointer" }}
          onPointerDown={handlePointerDown}
        />
        {isStormActive && (
          <div className="absolute inset-x-5 top-4 text-center pointer-events-none z-10">
            <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 px-4 py-1.5 rounded-full backdrop-blur-md animate-[float_3s_infinite_ease-in-out]">
              <span className="text-yellow-400 font-black text-xs uppercase tracking-widest">
                ⚡ PROTECTION STORM ACTIVE! ⚡
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Settings/Upgrades Control Center Menu */}
      <div className="flex-shrink-0 px-5 pt-3 pb-4">
        {/* Menu Tabs */}
        <div className="flex justify-between border-b border-white/10 pb-2 mb-3">
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("upgrades");
            }}
            className={`text-xs font-black uppercase tracking-wider transition-all pb-1 ${activeTab === "upgrades" ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}
          >
            Upgrades
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("collection");
            }}
            className={`text-xs font-black uppercase tracking-wider transition-all pb-1 ${activeTab === "collection" ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}
          >
            Collection
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab("settings");
            }}
            className={`text-xs font-black uppercase tracking-wider transition-all pb-1 ${activeTab === "settings" ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}
          >
            Config
          </button>
        </div>

        {/* Tab Contents */}
        <div className="h-[9.5rem] overflow-y-auto">
          {activeTab === "upgrades" && (
            <div className="space-y-2">
              {(Object.keys(UPGRADE_DEFS) as UpgradeType[]).map((type) => {
                const def = UPGRADE_DEFS[type];
                const currentLvl = upgrades[type];
                const isMax = currentLvl >= def.maxLevel;
                const cost = def.costFormula(currentLvl);
                const canAfford = points >= cost && !isMax;

                // Special lock details for Abyss Retirement Reef
                const isLockedRetirement = type === "rod" && currentLvl === 2;

                return (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{def.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.78rem] font-black text-white">
                            {def.name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            Lvl {currentLvl}
                          </span>
                          {isLockedRetirement && (
                            <span className="text-[8px] font-black text-yellow-400 bg-yellow-500/10 px-1 rounded">
                              Unlocks Abyss
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-400 leading-none mt-0.5">
                          {def.description}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => handleUpgrade(type)}
                      className={`btn-press text-[9px] font-black px-3.5 py-2 rounded-xl transition-all uppercase ${canAfford ? "bg-blue-600 text-white shadow-md" : "bg-white/5 text-gray-500 cursor-default"}`}
                    >
                      {isMax ? "MAX" : `${cost} Pts`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "collection" && (
            <div className="grid grid-cols-2 gap-2 pb-2">
              {DEFAULT_ITEM_DEFS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold text-white truncate leading-none">
                      {item.label}
                    </p>
                    <p
                      className={`text-[9px] font-black mt-0.5 leading-none ${item.kind === "good" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {item.value > 0 ? `+${item.value}` : item.value} Pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <h5 className="text-[0.78rem] font-black text-white leading-none">
                    Sound Settings
                  </h5>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    Toggle music and arcade sound effects
                  </p>
                </div>
                <button
                  onClick={() => {
                    const isMuted = audio.toggleMute();
                    setMuted(isMuted);
                  }}
                  className={`btn-press text-[9px] font-black px-5 py-2 rounded-xl border uppercase ${muted ? "border-red-500 text-red-500 bg-red-500/10" : "border-emerald-500 text-emerald-500 bg-emerald-500/10"}`}
                >
                  {muted ? "MUTED" : "ACTIVE"}
                </button>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <h5 className="text-[0.78rem] font-black text-white leading-none">
                    Exit Game
                  </h5>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    Return back to the game center lobby
                  </p>
                </div>
                <button
                  onClick={() => {
                    audio.stopMusic();
                    window.location.href = "/";
                  }}
                  className="btn-press text-[9px] font-black px-5 py-2 rounded-xl border border-gray-600 text-gray-400 hover:text-white"
                >
                  QUIT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Initial Startup Tutorial popup overlay */}
      {showHowToPopup && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-6">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 text-center shadow-2xl max-w-xs pop">
            <span className="text-4xl mb-3 block">🎣</span>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              WEALTH WATERS
            </h3>
            <p className="text-xs text-gray-300 my-4 leading-relaxed">
              Drop your magic hook to collect savings pouches and shields. Spend
              points to upgrade gear to fish deeper in the Abyss!
            </p>
            <button
              onClick={startGame}
              className="btn-press w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30"
            >
              CAST ANCHOR!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;

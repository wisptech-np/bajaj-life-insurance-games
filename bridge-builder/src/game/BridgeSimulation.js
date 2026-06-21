// Bridge Builder - Physics Simulation & Rendering Engine
// Pure ES6 module using Verlet Integration for bridge sways and collapses.

// Synthesize SFX using Web Audio API
class AudioSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playCreak() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80 + Math.random() * 40, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (e) {}
    }

    playSnap() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.25);
        } catch (e) {}
    }

    playSplash() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
        } catch (e) {}
    }

    playLightning() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, this.ctx.currentTime);
            osc.frequency.setValueAtTime(50, this.ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
        } catch (e) {}
    }

    playChime() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15); // A5

            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.2);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.2);
        } catch (e) {}
    }

    playWinFanfare() {
        if (this.muted) return;
        this.init();
        try {
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);

                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.4);
                }, idx * 150);
            });
        } catch (e) {}
    }
}

export const audioSynth = new AudioSynth();

// Particle System
class Particle {
    constructor(x, y, type, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.type = type; // 'rain', 'splinter', 'splash', 'dust', 'leaf', 'star'
        this.color = color;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * 2 + 1;
        this.alpha = 1;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.01;
        this.size = Math.random() * 3 + 1;
        this.rotation = Math.random() * Math.PI * 2;

        if (type === 'rain') {
            this.vy = Math.random() * 5 + 8;
            this.vx = -2 - Math.random() * 2; // wind slant
            this.size = Math.random() * 1.5 + 0.5;
            this.decay = 0.015;
        } else if (type === 'splinter') {
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.7) * 5;
            this.size = Math.random() * 4 + 2;
            this.decay = 0.025;
        } else if (type === 'splash') {
            this.vx = (Math.random() - 0.5) * 7;
            this.vy = -Math.random() * 5 - 3;
            this.size = Math.random() * 5 + 3;
            this.decay = 0.02;
        } else if (type === 'leaf') {
            this.vx = (Math.random() - 0.2) * 2 - 1.5;
            this.vy = Math.random() * 1 + 0.5;
            this.size = Math.random() * 6 + 4;
            this.color = ['#F6AD55', '#48BB78', '#68D391', '#FC8181'][Math.floor(Math.random() * 4)];
            this.decay = 0.008;
        } else if (type === 'star') {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.size = Math.random() * 4 + 2;
            this.color = '#FFD700';
            this.decay = 0.03;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.life -= this.decay;
        if (this.type === 'leaf') {
            this.vx += Math.sin(this.y * 0.05) * 0.05;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        if (this.type === 'rain') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.vx * 0.5, this.y + this.vy * 0.5);
            ctx.stroke();
        } else if (this.type === 'splinter') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillRect(-this.size, -this.size / 3, this.size * 2, this.size / 1.5);
        } else if (this.type === 'star') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            // Draw a small 5-point star
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size, Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
                ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2), Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

export class BridgeSimulation {
    constructor(canvas, onWin, onLose, onUpdateHUD) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onWin = onWin;
        this.onLose = onLose;
        this.onUpdateHUD = onUpdateHUD;

        // Dimensions
        this.width = canvas.width;
        this.height = canvas.height;

        this.nodes = [];
        this.links = [];
        this.particles = [];
        this.bonuses = [];
        
        // Active drag drop preview parameters
        this.hoveredSegment = null;
        this.hoveredItemType = null;

        // Load background canyon image
        this.bgImage = new Image();
        this.bgImage.src = './assets/ui/bg_canyon.png';

        // Vehicle State
        this.car = {
            x: 50,
            y: 280,
            angle: 0,
            speed: 1.5,
            width: 70,
            height: 38,
            status: 'drive',
            wheelRotation: 0,
            bobOffset: 0
        };

        // Game parameters
        this.phase = 'build';
        this.level = 1;
        this.coins = 100;
        this.shield = 100;
        this.activeDisasters = [];
        this.crossingProgress = 0;
        this.crossingStarted = false;
        
        this.waterY = 380;
        this.targetWaterY = 380;
        this.windForce = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        
        // 6 Deck Spans config
        this.segments = Array(6).fill(null).map(() => ({
            deck: 'wood',
            support: 'none',
            reinforcement: false,
            protection: {
                life: false,
                health: false,
                critical: false,
                accident: false,
                emergency: false,
                property: false
            },
            decoration: 'none'
        }));

        this.initLevelParams();
        this.setupBuildEnvironment();
    }

    initLevelParams() {
        this.activeDisasters = [];
        this.windForce = 0;
        this.targetWaterY = 380;
        if (this.level === 1) {
            this.disastersConfig = [{ time: 3, type: 'wind', name: 'Strong Wind', duration: 8 }];
        } else if (this.level === 2) {
            this.disastersConfig = [
                { time: 2, type: 'rain', name: 'Heavy Rain', duration: 10 },
                { time: 4, type: 'medical', name: 'Medical Emergency', duration: 4 }
            ];
        } else if (this.level === 3) {
            this.disastersConfig = [
                { time: 1, type: 'flood', name: 'River Flood', duration: 12 },
                { time: 5, type: 'property_damage', name: 'Debris Impact', duration: 5 }
            ];
        } else if (this.level === 4) {
            this.disastersConfig = [
                { time: 1, type: 'storm', name: 'Severe Storm', duration: 12 },
                { time: 3, type: 'lightning', name: 'Lightning Strike', duration: 3 },
                { time: 6, type: 'accident', name: 'Slip Accident', duration: 4 }
            ];
        } else {
            this.disastersConfig = [
                { time: 1, type: 'flood', name: 'River Flood', duration: 15 },
                { time: 3, type: 'earthquake', name: 'Earthquake Shake', duration: 10 },
                { time: 5, type: 'lightning', name: 'Lightning Strike', duration: 3 },
                { time: 8, type: 'medical', name: 'Illness Crisis', duration: 6 }
            ];
        }
    }

    setupBuildEnvironment() {
        this.nodes = [];
        this.links = [];
        this.particles = [];
        this.bonuses = [];
        
        this.leftCliffX = 140;
        this.rightCliffX = 660;
        this.deckY = 280;

        // Place random bonuses floating above different segments
        // We put 3 bonuses in the river gap
        const bonusTypes = ['tax_rebate', 'dividend', 'interest'];
        const bonusLabels = {
            tax_rebate: 'Tax Benefit',
            dividend: 'Dividend Reward',
            interest: 'Interest Yield'
        };

        for (let i = 0; i < 3; i++) {
            const segIdx = 1 + i * 2; // spreads them across spans 1, 3, 5
            const x = this.leftCliffX + (segIdx + 0.5) * ((this.rightCliffX - this.leftCliffX) / 6);
            const y = this.deckY - 45 - Math.random() * 40; // floating above deck
            this.bonuses.push({
                x,
                y,
                type: bonusTypes[i % bonusTypes.length],
                label: bonusLabels[bonusTypes[i % bonusTypes.length]],
                collected: false,
                animTimer: Math.random() * Math.PI
            });
        }

        // Bridge Deck Nodes (7 nodes total creating 6 spans)
        for (let i = 0; i <= 6; i++) {
            const x = this.leftCliffX + i * ((this.rightCliffX - this.leftCliffX) / 6);
            const fixed = (i === 0 || i === 6);
            
            let segmentMass = 1.0;
            if (i > 0 && i <= 6) {
                const config = this.segments[i - 1];
                if (config.deck === 'steel') segmentMass += 1.0;
                if (config.decoration !== 'none') segmentMass += 1.6;
            }

            this.nodes.push({
                id: i,
                x: x,
                y: this.deckY,
                px: x,
                py: this.deckY,
                ox: x,
                oy: this.deckY,
                fixed: fixed,
                mass: segmentMass,
                invMass: fixed ? 0 : 1 / segmentMass,
                damaged: false
            });
        }

        // Connect deck nodes
        for (let i = 0; i < 6; i++) {
            const nA = this.nodes[i];
            const nB = this.nodes[i + 1];
            const length = Math.abs(nB.x - nA.x);
            const isSteel = this.segments[i].deck === 'steel';
            
            let stiffness = isSteel ? 0.95 : 0.65;
            let maxStress = isSteel ? 35 : 12;

            if (this.segments[i].reinforcement) {
                maxStress *= 2.0;
            }

            this.links.push({
                type: 'deck',
                segmentIndex: i,
                nodeA: nA,
                nodeB: nB,
                length: length,
                stiffness: stiffness,
                maxStress: maxStress,
                stress: 0,
                broken: false,
                color: isSteel ? '#78909C' : '#8D6E63'
            });

            const config = this.segments[i];
            if (config.support === 'pillar') {
                const bedY = 460;
                const pillarAnchorNode = {
                    x: nA.x,
                    y: bedY,
                    px: nA.x,
                    py: bedY,
                    fixed: true,
                    invMass: 0
                };
                
                let maxPillarStress = 40;
                if (config.protection.life) maxPillarStress = 999;

                this.links.push({
                    type: 'pillar',
                    segmentIndex: i,
                    nodeA: nA,
                    nodeB: pillarAnchorNode,
                    length: bedY - nA.y,
                    stiffness: 0.99,
                    maxStress: maxPillarStress,
                    stress: 0,
                    broken: false,
                    color: '#B0BEC5'
                });
            } else if (config.support === 'rope') {
                const towerY = 100;
                const towerAnchorNode = {
                    x: nA.x,
                    y: towerY,
                    px: nA.x,
                    py: towerY,
                    fixed: true,
                    invMass: 0
                };

                let maxRopeStress = 15;
                if (config.protection.emergency) maxRopeStress = 999;

                this.links.push({
                    type: 'rope',
                    segmentIndex: i,
                    nodeA: nA,
                    nodeB: towerAnchorNode,
                    length: nA.y - towerY,
                    stiffness: 0.5,
                    maxStress: maxRopeStress,
                    stress: 0,
                    broken: false,
                    color: '#D7CCC8'
                });
            }
        }
    }

    startCrossing() {
        audioSynth.init();
        this.phase = 'crossing';
        this.crossingStarted = true;
        this.crossingProgress = 0;
        this.shield = 100;

        // Reset car
        this.car = {
            x: 30,
            y: this.deckY - 15,
            angle: 0,
            speed: 1.6,
            width: 70,
            height: 38,
            status: 'drive',
            wheelRotation: 0,
            bobOffset: 0
        };

        this.initLevelParams();
        this.startTime = Date.now();
    }

    update(dt) {
        if (this.phase === 'crossing') {
            this.updateCrossing(dt);
        }
        
        // Physics update
        this.applyForces();
        this.solveConstraints();
        this.updatePhysicsPositions();

        // Update particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        // Water level dampening
        this.waterY += (this.targetWaterY - this.waterY) * 0.05;

        // Camera dampening
        this.shakeX *= 0.9;
        this.shakeY *= 0.9;

        // rain
        const isRainActive = this.activeDisasters.some(d => d.type === 'rain' || d.type === 'storm');
        if (isRainActive) {
            for (let i = 0; i < 5; i++) {
                this.particles.push(new Particle(Math.random() * this.width, 0, 'rain', 'rgba(100, 200, 255, 0.45)'));
            }
        }

        // leaves
        if (Math.random() < 0.04) {
            this.particles.push(new Particle(Math.random() * this.width, 0, 'leaf'));
        }
    }

    updateCrossing(dt) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        
        // Check for planned disasters
        this.disastersConfig.forEach(dis => {
            const alreadyTriggered = this.activeDisasters.some(d => d.name === dis.name);
            if (elapsed >= dis.time && !alreadyTriggered && elapsed < dis.time + dis.duration) {
                this.activeDisasters.push({
                    type: dis.type,
                    name: dis.name,
                    timeLeft: dis.duration,
                    totalDuration: dis.duration
                });
                
                if (dis.type === 'earthquake' || dis.type === 'lightning') {
                    this.shakeX = 14;
                    this.shakeY = 14;
                    if (dis.type === 'lightning') audioSynth.playLightning();
                }
            }
        });

        // Update active disasters
        this.activeDisasters.forEach(dis => {
            dis.timeLeft -= dt;
            this.applyDisasterEffects(dis);
        });
        this.activeDisasters = this.activeDisasters.filter(d => d.timeLeft > 0);

        // Move Car
        if (this.car.status === 'drive' || this.car.status === 'caught') {
            const isFrightened = this.activeDisasters.length > 0;
            const currentSpeed = isFrightened ? this.car.speed * 1.4 : this.car.speed;
            
            this.car.x += currentSpeed * 65 * dt;
            this.car.wheelRotation += (currentSpeed * 0.15);
            this.car.bobOffset = Math.sin(Date.now() * 0.015) * 2;

            const onBridge = this.car.x >= this.leftCliffX && this.car.x <= this.rightCliffX;
            const carSegment = Math.floor((this.car.x - this.leftCliffX) / ((this.rightCliffX - this.leftCliffX) / 6));

            let currentDeckBroken = false;
            if (onBridge && carSegment >= 0 && carSegment < 6) {
                const deckLink = this.links.find(l => l.type === 'deck' && l.segmentIndex === carSegment);
                if (deckLink && deckLink.broken) {
                    currentDeckBroken = true;
                }
            }

            if (onBridge && carSegment >= 0 && carSegment < 6) {
                const backX = this.car.x - 20;
                const frontX = this.car.x + 20;
                
                const getBridgeHeight = (x) => {
                    const localSeg = Math.floor((x - this.leftCliffX) / ((this.rightCliffX - this.leftCliffX) / 6));
                    if (localSeg < 0) return this.deckY;
                    if (localSeg >= 6) return this.deckY;

                    const nodeL = this.nodes[localSeg];
                    const nodeR = this.nodes[localSeg + 1];
                    const ratio = (x - nodeL.x) / (nodeR.x - nodeL.x);
                    
                    nodeL.y += (1 - ratio) * 2.8;
                    nodeR.y += ratio * 2.8;

                    return nodeL.y + ratio * (nodeR.y - nodeL.y);
                };

                const backY = getBridgeHeight(backX);
                const frontY = getBridgeHeight(frontX);

                this.car.y = (backY + frontY) / 2 - 14;
                this.car.angle = Math.atan2(frontY - backY, frontX - backX);

                // Check bonus collection
                this.bonuses.forEach(bonus => {
                    if (!bonus.collected) {
                        const dist = Math.hypot(this.car.x - bonus.x, this.car.y - bonus.y);
                        if (dist < 32) {
                            bonus.collected = true;
                            audioSynth.playChime();
                            this.spawnStarParticles(bonus.x, bonus.y);

                            if (bonus.type === 'tax_rebate') {
                                this.coins += 15; // return coins to budget
                                this.showHUDToast("Tax Benefit collected! +15 Coins");
                            } else if (bonus.type === 'dividend') {
                                this.shield = Math.min(100, this.shield + 20); // restore health
                                this.showHUDToast("Dividend reward! +20% Shield");
                            } else if (bonus.type === 'interest') {
                                // adds bonus points
                                this.showHUDToast("Interest yield collected! +15% Wisdom");
                            }
                        }
                    }
                });

                if (currentDeckBroken) {
                    const segConfig = this.segments[carSegment];
                    if (segConfig.protection.accident) {
                        this.car.status = 'caught';
                        this.car.y = this.deckY + 45;
                        this.car.angle = 0;
                        this.showHUDToast("Accident net deployed! Car caught safely.");
                    } else {
                        this.car.status = 'falling';
                    }
                }
            } else {
                this.car.y = this.deckY - 14;
                this.car.angle = 0;
            }

            if (this.car.x >= this.rightCliffX + 60) {
                this.car.status = 'safe';
            }
        } else if (this.car.status === 'falling') {
            this.car.y += 180 * dt;
            this.car.angle += 3 * dt;
            if (this.car.y >= this.waterY) {
                this.car.status = 'drowned';
                audioSynth.playSplash();
                this.spawnSplashParticles(this.car.x, this.waterY);
                this.shield = 0;
            }
        }

        // Win/Loss triggers
        this.crossingProgress = Math.min(100, Math.round((this.car.x / this.width) * 100));

        this.onUpdateHUD({
            shield: this.shield,
            progress: this.crossingProgress,
            disasters: this.activeDisasters
        });

        if (this.car.status === 'safe') {
            this.phase = 'done';
            audioSynth.playWinFanfare();
            this.calculateEndScores();
            this.onWin();
        }

        if (this.shield <= 0 || this.car.status === 'drowned') {
            this.phase = 'done';
            this.onLose();
        }
    }

    applyDisasterEffects(dis) {
        const segIdx = Math.floor(Math.random() * 6);
        const config = this.segments[segIdx];

        if (dis.type === 'wind' || dis.type === 'storm') {
            this.windForce = Math.sin(Date.now() * 0.005) * (dis.type === 'storm' ? 8.5 : 3.5);
            if (config.support === 'rope' && !config.protection.emergency) {
                const ropeLink = this.links.find(l => l.type === 'rope' && l.segmentIndex === segIdx);
                if (ropeLink) ropeLink.stress += 0.85;
            }
        }

        if (dis.type === 'rain' || dis.type === 'storm') {
            this.links.forEach(l => {
                if (l.type === 'deck' && l.color === '#8D6E63' && !this.segments[l.segmentIndex].protection.property) {
                    l.stress += 0.16;
                }
            });
        }

        if (dis.type === 'earthquake') {
            this.shakeX = (Math.random() - 0.5) * 8.5;
            this.shakeY = (Math.random() - 0.5) * 8.5;
            
            this.nodes[0].y = this.deckY + Math.sin(Date.now() * 0.085) * 12;
            this.nodes[6].y = this.deckY + Math.cos(Date.now() * 0.085) * 12;

            this.links.forEach(l => {
                let damage = 0.42;
                if (l.type === 'deck' && this.segments[l.segmentIndex].protection.critical) {
                    damage = 0.06;
                }
                l.stress += damage;
            });
            if (Math.random() < 0.05) audioSynth.playCreak();
        }

        if (dis.type === 'flood') {
            this.targetWaterY = 290;
            this.nodes.forEach(n => {
                if (!n.fixed && n.y > this.waterY - 10) {
                    n.x += 1.9;
                }
            });

            this.links.forEach(l => {
                if (l.type === 'pillar') {
                    const seg = this.segments[l.segmentIndex];
                    if (!seg.protection.life && !seg.protection.property) {
                        l.stress += 0.62;
                    }
                }
            });
        }

        if (dis.type === 'lightning') {
            if (Math.random() < 0.02) {
                const deckLink = this.links.find(l => l.type === 'deck' && l.segmentIndex === segIdx && !l.broken);
                if (deckLink) {
                    this.shakeX = 25;
                    this.shakeY = 25;
                    audioSynth.playLightning();
                    
                    if (config.deck === 'wood' && !config.protection.accident) {
                        deckLink.broken = true;
                        audioSynth.playSnap();
                        this.spawnSplinterParticles(deckLink.nodeA.x + 40, deckLink.nodeA.y);
                        this.showHUDToast("Lightning shattered deck!");
                    } else if (config.deck === 'steel') {
                        deckLink.stress += 2;
                    }
                }
            }
        }

        if (dis.type === 'medical') {
            this.nodes.forEach(n => {
                if (!n.fixed) {
                    n.y += (Math.random() - 0.5) * 8;
                }
            });
            const hasHealth = this.segments.some(s => s.protection.health);
            if (!hasHealth) {
                this.shield = Math.max(0, this.shield - 0.25);
            }
        }

        if (dis.type === 'accident') {
            const hasNet = this.segments.some(s => s.protection.accident);
            if (!hasNet) {
                this.shield = Math.max(0, this.shield - 0.35);
            }
        }
    }

    applyForces() {
        const gravity = 0.52;
        this.nodes.forEach(node => {
            if (node.fixed) return;

            const tempX = node.x;
            const tempY = node.y;

            let wind = this.windForce / node.mass;
            node.x += (node.x - node.px) + wind;
            node.y += (node.y - node.py) + gravity;

            node.px = tempX;
            node.py = tempY;
        });
    }

    solveConstraints() {
        for (let pass = 0; pass < 3; pass++) {
            this.links.forEach(link => {
                if (link.broken) return;

                const dx = link.nodeB.x - link.nodeA.x;
                const dy = link.nodeB.y - link.nodeA.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = link.length - dist;
                
                const stressVal = Math.abs(diff);
                link.stress = Math.max(link.stress, stressVal);

                if (link.stress > link.maxStress) {
                    link.broken = true;
                    audioSynth.playSnap();
                    this.spawnSplinterParticles((link.nodeA.x + link.nodeB.x) / 2, (link.nodeA.y + link.nodeB.y) / 2);
                    this.showHUDToast("Bridge member collapsed!");
                    return;
                }

                const percent = (diff / dist) * 0.5 * link.stiffness;
                const offsetX = dx * percent;
                const offsetY = dy * percent;

                if (!link.nodeA.fixed) {
                    link.nodeA.x -= offsetX * link.nodeA.invMass;
                    link.nodeA.y -= offsetY * link.nodeA.invMass;
                }
                if (!link.nodeB.fixed) {
                    link.nodeB.x += offsetX * link.nodeB.invMass;
                    link.nodeB.y += offsetY * link.nodeB.invMass;
                }
            });
        }
    }

    updatePhysicsPositions() {
        this.nodes.forEach(node => {
            if (node.fixed) return;
            if (node.y > 480) node.y = 480;
        });
    }

    spawnSplinterParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, 'splinter', '#8D6E63'));
            this.particles.push(new Particle(x, y, 'splinter', '#78909C'));
        }
    }

    spawnSplashParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, 'splash', 'rgba(100, 220, 255, 0.7)'));
        }
    }

    spawnStarParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(x, y, 'star'));
        }
    }

    showHUDToast(msg) {
        if (this.hudToastTimer) clearTimeout(this.hudToastTimer);
        this.hudToast = msg;
        this.hudToastTimer = setTimeout(() => {
            this.hudToast = null;
        }, 2500);
    }

    calculateEndScores() {
        let protectionCount = 0;
        let luxurySpent = 0;
        let structureStrength = 0;

        this.segments.forEach(seg => {
            if (seg.protection.life) protectionCount++;
            if (seg.protection.health) protectionCount++;
            if (seg.protection.critical) protectionCount++;
            if (seg.protection.accident) protectionCount++;
            if (seg.protection.emergency) protectionCount++;
            if (seg.protection.property) protectionCount++;

            if (seg.deck === 'steel') structureStrength += 1.5;
            else structureStrength += 0.5;

            if (seg.support === 'pillar') structureStrength += 2.0;
            if (seg.support === 'rope') structureStrength += 1.0;
            if (seg.reinforcement) structureStrength += 1.5;

            if (seg.decoration !== 'none') luxurySpent += 10;
        });

        // Add bonus collection boost to metrics
        const collectedCount = this.bonuses.filter(b => b.collected).length;
        const interestCollected = this.bonuses.some(b => b.type === 'interest' && b.collected);

        const protectionScore = Math.min(100, Math.round((protectionCount / 6) * 100));
        const planningScore = Math.min(100, Math.round((structureStrength / 15) * 100));
        
        const safetyScore = this.car.status === 'safe' ? 100 : this.car.status === 'caught' ? 60 : 0;
        
        // collect bonus boosts risk management
        const riskManagement = Math.min(100, Math.round(this.shield) + collectedCount * 5);
        
        // interest collected bonus increases wisdom score
        const financialWisdom = Math.min(100, Math.max(20, 100 - luxurySpent) + (interestCollected ? 15 : 0));
        
        const finalScore = Math.round((protectionScore + planningScore + safetyScore + riskManagement + financialWisdom) / 5);

        this.finalCalculatedScores = {
            protectionScore,
            planningScore,
            safetyScore,
            riskManagement,
            financialWisdom,
            finalScore
        };
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.shakeX, this.shakeY);
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw canyon background image
        if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.width, this.height);
        } else {
            // Fallback sky
            const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
            skyGrad.addColorStop(0, '#E0F2FE');
            skyGrad.addColorStop(0.7, '#BAE6FD');
            this.ctx.fillStyle = skyGrad;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw Canyon Mountains outline shading (if image is loading/transparent)
        if (!this.bgImage.complete) {
            const wallColor = isStorm ? '#334155' : '#90A4AE';
            this.ctx.fillStyle = wallColor;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 80);
            this.ctx.lineTo(this.leftCliffX, this.deckY);
            this.ctx.lineTo(this.leftCliffX - 40, 480);
            this.ctx.lineTo(0, 480);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.moveTo(this.width, 80);
            this.ctx.lineTo(this.rightCliffX, this.deckY);
            this.ctx.lineTo(this.rightCliffX + 40, 480);
            this.ctx.lineTo(this.width, 480);
            this.ctx.fill();
        }

        // Draw Ropes Towers
        const towerColor = '#455A64';
        const hasRopes = this.segments.some(s => s.support === 'rope') || (this.hoveredItemType === 'rope');
        if (hasRopes) {
            this.ctx.strokeStyle = towerColor;
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.moveTo(this.leftCliffX, this.deckY);
            this.ctx.lineTo(this.leftCliffX, 100);
            this.ctx.moveTo(this.rightCliffX, this.deckY);
            this.ctx.lineTo(this.rightCliffX, 100);
            this.ctx.stroke();

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(this.leftCliffX, 100);
            this.ctx.bezierCurveTo(this.width / 3, 220, this.width * 2 / 3, 220, this.rightCliffX, 100);
            this.ctx.stroke();
        }

        // Draw Drag Hover highlights
        if (this.phase === 'build' && this.hoveredSegment !== null) {
            const nodeL = this.nodes[this.hoveredSegment];
            const nodeR = this.nodes[this.hoveredSegment + 1];
            
            this.ctx.fillStyle = 'rgba(0, 242, 254, 0.08)';
            this.ctx.beginPath();
            this.ctx.moveTo(nodeL.x, 80);
            this.ctx.lineTo(nodeR.x, 80);
            this.ctx.lineTo(nodeR.x, 480);
            this.ctx.lineTo(nodeL.x, 480);
            this.ctx.fill();

            this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(nodeL.x, 80);
            this.ctx.lineTo(nodeL.x, 480);
            this.ctx.moveTo(nodeR.x, 80);
            this.ctx.lineTo(nodeR.x, 480);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw Pillars / Ropes Supports
        this.links.forEach(link => {
            if (link.broken || link.type === 'deck') return;
            this.drawSupportLink(link, false);
        });

        // Draw Drag Preview Silhouette
        if (this.phase === 'build' && this.hoveredSegment !== null && this.hoveredItemType) {
            const item = this.hoveredItemType;
            const nodeL = this.nodes[this.hoveredSegment];
            const nodeR = this.nodes[this.hoveredSegment + 1];

            if (item === 'pillar') {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 14;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(nodeL.x, nodeL.y);
                this.ctx.lineTo(nodeL.x, 460);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else if (item === 'rope') {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 2.5;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                this.ctx.moveTo(nodeL.x, nodeL.y);
                this.ctx.lineTo(nodeL.x, 100);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else if (item === 'wood' || item === 'steel') {
                this.ctx.strokeStyle = item === 'steel' ? 'rgba(120, 144, 156, 0.5)' : 'rgba(141, 110, 99, 0.5)';
                this.ctx.lineWidth = 12;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(nodeL.x, nodeL.y);
                this.ctx.lineTo(nodeR.x, nodeR.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        // Draw deck planks
        this.links.forEach(link => {
            if (link.broken || link.type !== 'deck') return;

            this.ctx.strokeStyle = link.color;
            this.ctx.lineWidth = link.color === '#78909C' ? 9 : 6;
            this.ctx.lineCap = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(link.nodeA.x, link.nodeA.y);
            this.ctx.lineTo(link.nodeB.x, link.nodeB.y);
            this.ctx.stroke();

            const segConfig = this.segments[link.segmentIndex];
            if (segConfig.reinforcement) {
                this.ctx.fillStyle = '#FF7000';
                this.ctx.beginPath();
                this.ctx.arc(link.nodeA.x, link.nodeA.y, 4, 0, Math.PI * 2);
                this.ctx.arc(link.nodeB.x, link.nodeB.y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Decorations
            if (segConfig.decoration === 'flowers') {
                this.ctx.fillStyle = '#F50057';
                this.ctx.beginPath();
                this.ctx.arc((link.nodeA.x + link.nodeB.x) / 2, (link.nodeA.y + link.nodeB.y) / 2 - 8, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#48BB78';
                this.ctx.fillRect((link.nodeA.x + link.nodeB.x) / 2 - 3, (link.nodeA.y + link.nodeB.y) / 2 - 5, 6, 5);
            } else if (segConfig.decoration === 'lights') {
                const midX = (link.nodeA.x + link.nodeB.x) / 2;
                const midY = (link.nodeA.y + link.nodeB.y) / 2;
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(midX, midY);
                this.ctx.lineTo(midX, midY - 10);
                this.ctx.stroke();

                this.ctx.fillStyle = '#FFD700';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#FFD700';
                this.ctx.beginPath();
                this.ctx.arc(midX, midY - 10, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else if (segConfig.decoration === 'banners') {
                this.ctx.fillStyle = '#E53E3E';
                this.ctx.beginPath();
                const midX = (link.nodeA.x + link.nodeB.x) / 2;
                const midY = (link.nodeA.y + link.nodeB.y) / 2;
                this.ctx.moveTo(link.nodeA.x, link.nodeA.y);
                this.ctx.lineTo(midX, midY + 12);
                this.ctx.lineTo(link.nodeB.x, link.nodeB.y);
                this.ctx.fill();
            }

            // Draw protection shields
            let activeShieldIcon = null;
            if (segConfig.protection.life) activeShieldIcon = '👤';
            else if (segConfig.protection.health) activeShieldIcon = '➕';
            else if (segConfig.protection.property) activeShieldIcon = '🏠';
            else if (segConfig.protection.accident) activeShieldIcon = '🕸️';
            else if (segConfig.protection.critical) activeShieldIcon = '🛡️';
            else if (segConfig.protection.emergency) activeShieldIcon = '☂️';

            if (activeShieldIcon) {
                this.ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
                this.ctx.strokeStyle = '#00F2FE';
                this.ctx.lineWidth = 1.5;
                const midX = (link.nodeA.x + link.nodeB.x) / 2;
                const midY = (link.nodeA.y + link.nodeB.y) / 2;
                
                this.ctx.beginPath();
                this.ctx.arc(midX, midY - 24, 10, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.fillStyle = '#00F2FE';
                this.ctx.font = '9px Outfit, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(activeShieldIcon, midX, midY - 21);
            }
        });

        // Draw River Water
        const waterGrad = this.ctx.createLinearGradient(0, this.waterY, 0, this.height);
        waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
        waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.95)');
        this.ctx.fillStyle = waterGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.waterY);
        for (let x = 0; x <= this.width; x += 10) {
            const y = this.waterY + Math.sin(x * 0.02 + Date.now() * 0.003) * 6;
            this.ctx.lineTo(x, y);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.lineTo(0, this.height);
        this.ctx.fill();

        // Draw Bonuses
        this.bonuses.forEach(bonus => {
            if (bonus.collected) return;
            
            this.ctx.save();
            this.ctx.translate(bonus.x, bonus.y + Math.sin(Date.now() * 0.004 + bonus.animTimer) * 4);
            this.ctx.rotate(Date.now() * 0.002);

            // Draw glowing background circle
            this.ctx.fillStyle = 'rgba(255, 223, 0, 0.15)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Draw icon indicator shape
            this.ctx.fillStyle = '#FFD700';
            if (bonus.type === 'tax_rebate') {
                this.ctx.font = '900 11px Inter, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('$', 0, 4);
            } else if (bonus.type === 'dividend') {
                this.ctx.font = '900 9px Inter, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('🛡️', 0, 3);
            } else {
                this.ctx.font = '900 9px Inter, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('⭐', 0, 3);
            }
            
            this.ctx.restore();

            // Label text floating above
            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.font = '900 8px Outfit, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(bonus.label, bonus.x, bonus.y - 18);
        });

        // Draw Vehicle (Bouncy Car)
        if (this.car.status !== 'drowned') {
            this.drawVehicle();
        }

        // Draw Particles
        this.particles.forEach(p => p.draw(this.ctx));

        // Draw active warning banners
        if (this.activeDisasters.length > 0 && this.phase === 'crossing') {
            const warningDis = this.activeDisasters[0];
            const warningText = `⚠️ DISASTER: ${warningDis.name}`;

            this.ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
            this.ctx.fillRect(this.width / 2 - 160, 15, 320, 32);
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(this.width / 2 - 160, 15, 320, 32);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '900 11px Outfit, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(warningText.toUpperCase(), this.width / 2, 35);
        }

        if (this.hudToast) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            this.ctx.fillRect(this.width / 2 - 130, this.height - 50, 260, 24);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 9px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.hudToast.toUpperCase(), this.width / 2, this.height - 35);
        }

        this.ctx.restore();
    }

    drawSupportLink(link, isPreview) {
        this.ctx.strokeStyle = link.color;
        if (link.type === 'pillar') {
            this.ctx.lineWidth = 14;
            this.ctx.lineCap = 'butt';
            
            this.ctx.beginPath();
            this.ctx.moveTo(link.nodeA.x, link.nodeA.y);
            this.ctx.lineTo(link.nodeB.x, link.nodeB.y);
            this.ctx.stroke();

            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(link.nodeA.x - 4, link.nodeA.y);
            this.ctx.lineTo(link.nodeB.x - 4, link.nodeB.y);
            this.ctx.stroke();
        } else if (link.type === 'rope') {
            this.ctx.lineWidth = 2.5;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(link.nodeA.x, link.nodeA.y);
            this.ctx.lineTo(link.nodeB.x, link.nodeB.y);
            this.ctx.stroke();
        }
    }

    drawVehicle() {
        this.ctx.save();
        
        this.ctx.translate(this.car.x, this.car.y);
        this.ctx.rotate(this.car.angle);
        this.ctx.translate(0, this.car.bobOffset);

        if (this.car.status === 'caught') {
            this.ctx.strokeStyle = '#00F2FE';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(-45, 12);
            this.ctx.lineTo(45, 12);
            this.ctx.stroke();
        }

        // Draw Chassis (Warm pastel red body tub)
        this.ctx.fillStyle = '#E53E3E';
        this.ctx.fillRect(-35, -12, 70, 16);

        // Cabin/Roof (Pastel grey glass bubble dome)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.strokeStyle = '#E53E3E';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-20, -12);
        this.ctx.lineTo(-10, -28);
        this.ctx.lineTo(20, -28);
        this.ctx.lineTo(26, -12);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.fillRect(-35, -8, 70, 4);

        // Headlight
        this.ctx.fillStyle = '#FEF08A';
        this.ctx.beginPath();
        this.ctx.arc(34, -4, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Family Members Inside Cabin
        // Father (Blue)
        this.ctx.fillStyle = '#63B3ED';
        this.ctx.beginPath();
        this.ctx.arc(10, -18, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Mother (Pink)
        this.ctx.fillStyle = '#F687B3';
        this.ctx.beginPath();
        this.ctx.arc(-6, -18, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Dog ears
        this.ctx.fillStyle = '#ED8936';
        this.ctx.beginPath();
        this.ctx.ellipse(-16, -16, 2.5, 4, Math.PI/4, 0, Math.PI * 2);
        this.ctx.fill();

        // Back Wheel
        this.ctx.save();
        this.ctx.translate(-20, 6);
        this.ctx.rotate(this.car.wheelRotation);
        this.drawWheel();
        this.ctx.restore();

        // Front Wheel
        this.ctx.save();
        this.ctx.translate(20, 6);
        this.ctx.rotate(this.car.wheelRotation);
        this.drawWheel();
        this.ctx.restore();

        this.ctx.restore();
    }

    drawWheel() {
        this.ctx.fillStyle = '#18181B';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 9, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#718096';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -5); this.ctx.lineTo(0, 5);
        this.ctx.moveTo(-5, 0); this.ctx.lineTo(5, 0);
        this.ctx.stroke();
    }

    drawCloud(x, y, r) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.6, y - r * 0.2, r * 0.8, 0, Math.PI * 2);
        this.ctx.arc(x + r * 1.2, y, r * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

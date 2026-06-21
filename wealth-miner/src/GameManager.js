import { GAME_WIDTH, GAME_HEIGHT, THEMES, LEVEL_CONFIGS, UPGRADES } from './constants.js';
import { LevelManager } from './LevelManager.js';
import { ClawSystem } from './ClawSystem.js';
import { ParticleManager } from './ParticleManager.js';
import { audioService } from './services/AudioService.js';
import { Speedometer } from './components/Speedometer.js';
import { submitToLMS, updateLeadNew } from './services/api.js';
import { incrementPlayCount } from './services/playCount.js';
import { buildShareUrl } from './utils/crypto.js';
import { shortenUrl } from './utils/shortener.js';

export class GameManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.levelManager = new LevelManager();
        this.clawSystem = new ClawSystem();
        this.particleManager = new ParticleManager();
        this.audioService = audioService;
        
        // Game States: 'INTRO', 'TUTORIAL', 'LEVEL_START', 'PLAYING', 'SHOP', 'GAMEOVER', 'LEAD', 'SLOT', 'THANKYOU'
        this.state = 'INTRO';
        
        // Progress State
        this.score = 0;
        this.coins = 0; // Currency for upgrades
        this.level = 1;
        this.timer = 45; // seconds
        this.comboCount = 0;
        this.comboTimer = 0;
        this.screenShake = 0;
        
        // Upgrades Inventory (0-indexed levels: 0 = un-upgraded, 1, 2, 3)
        this.upgrades = {
            clawStrength: 0,
            pullSpeed: 0,
            grabRadius: 0,
            treasureMagnet: 0,
            luckyFinder: 0
        };
        
        // Visual Assets
        this.assets = {
            money_bag: null,
            protection_shield: null,
            education_crystal: null,
            retirement_vault: null,
            legacy_relic: null,
            loan_shark: null,
            inflation_jellyfish: null,
            market_crash_bomb: null,
            claw: null,
            crane: null
        };
        
        this.loadAssets();
        this.loadProgress();
        this.initDomElements();
        
        // Boot landing screen
        this.transitionTo('INTRO');
        
        // Track play count once
        incrementPlayCount();
    }
    
    loadAssets() {
        const loadImg = (name, src) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { 
                this.removeImageBackground(img, (cleaned) => {
                    this.assets[name] = cleaned;
                    
                    // Assign cleaned images to the intro screen graphics dynamically
                    if (name === 'claw') {
                        const introClaw = document.getElementById('intro-claw');
                        if (introClaw) {
                            introClaw.src = cleaned.src;
                            introClaw.style.display = 'block';
                        }
                    } else if (name === 'crane') {
                        const introWinch = document.getElementById('intro-winch');
                        if (introWinch) {
                            introWinch.src = cleaned.src;
                            introWinch.style.display = 'block';
                        }
                    }
                });
            };
            img.onerror = () => { console.warn(`Asset ${name} failed to load from ${src}`); };
        };
        
        // Visual paths are relative to base ./assets/
        loadImg('money_bag', 'assets/savings_money_bag.png');
        loadImg('protection_shield', 'assets/family_protection_shield.png');
        loadImg('education_crystal', 'assets/education_crystal.png');
        loadImg('retirement_vault', 'assets/retirement_vault.png');
        loadImg('legacy_relic', 'assets/legacy_relic.png');
        
        loadImg('loan_shark', 'assets/loan_shark.png');
        loadImg('inflation_jellyfish', 'assets/inflation_jellyfish.png');
        loadImg('market_crash_bomb', 'assets/market_crash_bomb.png');
        
        loadImg('claw', 'assets/mechanical_claw.png');
        loadImg('crane', 'assets/mining_machine.png');
    }

    removeImageBackground(img, callback) {
        try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            tempCtx.drawImage(img, 0, 0);
            
            const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imgData.data;
            const width = tempCanvas.width;
            const height = tempCanvas.height;
            
            const borderColors = [];
            const samplePixel = (x, y) => {
                const idx = (y * width + x) * 4;
                return { r: data[idx], g: data[idx+1], b: data[idx+2] };
            };
            
            borderColors.push(samplePixel(0, 0));
            borderColors.push(samplePixel(width - 1, 0));
            borderColors.push(samplePixel(0, height - 1));
            borderColors.push(samplePixel(width - 1, height - 1));
            
            borderColors.push(samplePixel(Math.floor(width / 2), 0));
            borderColors.push(samplePixel(Math.floor(width / 2), height - 1));
            borderColors.push(samplePixel(0, Math.floor(height / 2)));
            borderColors.push(samplePixel(width - 1, Math.floor(height / 2)));
            
            const visited = new Uint8Array(width * height);
            const queue = [];
            
            const colorDistance = (c1, c2) => {
                return Math.sqrt(
                    Math.pow(c1.r - c2.r, 2) +
                    Math.pow(c1.g - c2.g, 2) +
                    Math.pow(c1.b - c2.b, 2)
                );
            };
            
            const isBackground = (color) => {
                // Check standard checkerboard patterns
                const isCheckeredGray = Math.abs(color.r - 204) < 25 && Math.abs(color.g - 204) < 25 && Math.abs(color.b - 204) < 25;
                const isCheckeredGray2 = Math.abs(color.r - 128) < 20 && Math.abs(color.g - 128) < 20 && Math.abs(color.b - 128) < 20;
                const isCheckeredWhite = color.r > 235 && color.g > 235 && color.b > 235;
                if (isCheckeredGray || isCheckeredGray2 || isCheckeredWhite) return true;
                
                for (const bColor of borderColors) {
                    if (colorDistance(color, bColor) < 40) return true;
                }
                return false;
            };
            
            for (let x = 0; x < width; x++) {
                queue.push({ x, y: 0 });
                queue.push({ x, y: height - 1 });
                visited[0 * width + x] = 1;
                visited[(height - 1) * width + x] = 1;
            }
            for (let y = 1; y < height - 1; y++) {
                queue.push({ x: 0, y });
                queue.push({ x: width - 1, y });
                visited[y * width + 0] = 1;
                visited[y * width + (width - 1)] = 1;
            }
            
            let head = 0;
            while (head < queue.length) {
                const curr = queue[head++];
                const idx = (curr.y * width + curr.x) * 4;
                const color = { r: data[idx], g: data[idx+1], b: data[idx+2] };
                
                if (isBackground(color)) {
                    data[idx + 3] = 0; // remove alpha channel
                    
                    const neighbors = [
                        { x: curr.x + 1, y: curr.y },
                        { x: curr.x - 1, y: curr.y },
                        { x: curr.x, y: curr.y + 1 },
                        { x: curr.x, y: curr.y - 1 }
                    ];
                    for (const n of neighbors) {
                        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                            const nIdx = n.y * width + n.x;
                            if (!visited[nIdx]) {
                                visited[nIdx] = 1;
                                queue.push(n);
                            }
                        }
                    }
                }
            }
            
            tempCtx.putImageData(imgData, 0, 0);
            const cleaned = new Image();
            cleaned.src = tempCanvas.toDataURL();
            callback(cleaned);
        } catch (e) {
            console.error("Background filter failed, falling back to original image:", e);
            callback(img);
        }
    }

    
    loadProgress() {
        try {
            const savedUpgrades = localStorage.getItem('wealth_miner_upgrades');
            if (savedUpgrades != null) {
                const parsed = JSON.parse(savedUpgrades);
                this.upgrades = { ...this.upgrades, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load saved progress:', e);
        }
    }
    
    saveProgress() {
        try {
            localStorage.setItem('wealth_miner_upgrades', JSON.stringify(this.upgrades));
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    }
    
    resetGame() {
        this.score = 0;
        this.coins = 0;
        this.level = 1;
    }
    
    resetUpgrades() {
        this.upgrades = {
            clawStrength: 0,
            pullSpeed: 0,
            grabRadius: 0,
            treasureMagnet: 0,
            luckyFinder: 0
        };
        this.saveProgress();
    }
    
    initDomElements() {
        // Wire up clicks on main screens
        document.getElementById('btn-play').addEventListener('click', () => {
            this.audioService.initCtx();
            this.transitionTo('TUTORIAL');
        });
        
        const resetUpgradesBtn = document.getElementById('btn-reset-upgrades');
        if (resetUpgradesBtn) {
            resetUpgradesBtn.addEventListener('click', () => {
                this.resetUpgrades();
                alert("Upgrades have been reset!");
            });
        }
        
        document.getElementById('btn-tutorial-close').addEventListener('click', () => {
            this.transitionTo('LEVEL_START');
        });
        
        document.getElementById('btn-tutorial-start').addEventListener('click', () => {
            this.transitionTo('LEVEL_START');
        });
        
        document.getElementById('btn-start-level').addEventListener('click', () => {
            this.transitionTo('PLAYING');
        });
        
        // Upgrade shop triggers
        document.getElementById('btn-shop-next').addEventListener('click', () => {
            this.level++;
            this.transitionTo('LEVEL_START');
        });
        
        document.getElementById('btn-shop-end').addEventListener('click', () => {
            this.transitionTo('GAMEOVER');
        });
        
        // Game Over screen triggers
        document.getElementById('btn-gameover-restart').addEventListener('click', () => {
            this.resetGame();
            this.transitionTo('LEVEL_START');
        });
        
        document.getElementById('btn-gameover-lms').addEventListener('click', () => {
            this.transitionTo('LEAD');
        });
        
        document.getElementById('btn-gameover-share').addEventListener('click', () => {
            this.handleShare();
        });
        
        // Lead capture actions
        document.getElementById('btn-lead-submit').addEventListener('click', () => {
            this.handleLeadSubmit();
        });
        
        document.getElementById('btn-link-tc').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('tc-modal').classList.remove('hidden');
        });
        
        document.getElementById('btn-tc-close').addEventListener('click', () => {
            document.getElementById('tc-modal').classList.add('hidden');
        });
        
        document.getElementById('btn-tc-agree').addEventListener('click', () => {
            document.getElementById('lead-tc-checkbox').checked = true;
            document.getElementById('tc-modal').classList.add('hidden');
        });
        
        // Slot booking actions
        document.getElementById('btn-slot-confirm').addEventListener('click', () => {
            this.handleSlotBooking();
        });
        
        document.getElementById('btn-slot-skip').addEventListener('click', () => {
            this.transitionTo('THANKYOU');
        });
        
        // Thank you actions
        document.getElementById('btn-thankyou-restart').addEventListener('click', () => {
            this.resetGame();
            this.transitionTo('INTRO');
        });
        
        // Canvas interactions for launching claw
        const handleInteraction = (e) => {
            if (this.state === 'PLAYING') {
                e.preventDefault();
                this.clawSystem.launch();
            }
        };
        
        this.canvas.addEventListener('mousedown', handleInteraction);
        this.canvas.addEventListener('touchstart', handleInteraction, { passive: false });
        
        // Create speedometer canvas wrapper
        const speedoCanvas = document.getElementById('speedometer-canvas');
        if (speedoCanvas) {
            this.speedometer = new Speedometer(speedoCanvas);
        }
        
        // Populate upgrades display
        this.renderUpgradeButtons();
    }
    
    transitionTo(newState) {
        // Hide all screens
        document.querySelectorAll('.game-screen').forEach(s => s.classList.add('hidden'));
        
        this.state = newState;
        
        if (newState === 'INTRO') {
            document.getElementById('intro-screen').classList.remove('hidden');
            
            // Set intro images dynamically once cleaned assets are loaded
            const introClaw = document.getElementById('intro-claw');
            if (introClaw && this.assets.claw) {
                introClaw.src = this.assets.claw.src;
                introClaw.style.display = 'block';
            }
            const introWinch = document.getElementById('intro-winch');
            if (introWinch && this.assets.crane) {
                introWinch.src = this.assets.crane.src;
                introWinch.style.display = 'block';
            }
        }
        else if (newState === 'TUTORIAL') {
            document.getElementById('tutorial-screen').classList.remove('hidden');
        }
        else if (newState === 'LEVEL_START') {
            const theme = THEMES[this.level];
            const config = LEVEL_CONFIGS[this.level];
            
            document.getElementById('level-card-title').innerText = `Level ${this.level}`;
            document.getElementById('level-card-name').innerText = theme.name;
            document.getElementById('level-card-subtitle').innerText = theme.subtitle;
            document.getElementById('level-card-target').innerText = `Target: $${config.targetScore}`;
            
            // Set style for card
            const startCard = document.getElementById('level-start-card');
            startCard.style.background = `linear-gradient(135deg, ${theme.bgGradient[0]}, ${theme.bgGradient[1]})`;
            startCard.style.borderColor = theme.textColor;
            
            document.getElementById('level-start-screen').classList.remove('hidden');
        }
        else if (newState === 'PLAYING') {
            this.timer = LEVEL_CONFIGS[this.level].duration;
            this.comboCount = 0;
            this.comboTimer = 0;
            
            // Update constants multipliers
            const currentUpgrades = {
                clawStrength: UPGRADES.clawStrength.multipliers[this.upgrades.clawStrength],
                pullSpeed: UPGRADES.pullSpeed.values[this.upgrades.pullSpeed],
                grabRadius: UPGRADES.grabRadius.multipliers[this.upgrades.grabRadius],
                treasureMagnet: UPGRADES.treasureMagnet.values[this.upgrades.treasureMagnet],
                luckyFinder: UPGRADES.luckyFinder.multipliers[this.upgrades.luckyFinder]
            };
            
            this.clawSystem.reset();
            this.clawSystem.applyUpgrades(currentUpgrades);
            
            this.levelManager.setupLevel(this.level, currentUpgrades.luckyFinder);
            this.particleManager.reset();
            
            document.getElementById('hud-container').classList.remove('hidden');
            
            // Start clock countdown interval
            this.lastTime = Date.now();
        }
        else if (newState === 'SHOP') {
            document.getElementById('hud-container').classList.add('hidden');
            this.audioService.playLevelComplete();
            
            // Populate coins and transition
            document.getElementById('shop-coins-count').innerText = this.coins;
            this.renderUpgradeButtons();
            
            document.getElementById('shop-screen').classList.remove('hidden');
        }
        else if (newState === 'GAMEOVER') {
            document.getElementById('hud-container').classList.add('hidden');
            
            // Renders score details
            const scoreText = document.getElementById('gameover-score-value');
            scoreText.innerText = `$${this.score}`;
            
            // Calculate final financial health speedometer score
            // Complete 5 levels = 100 max. Each level is 20 points. High scores add extra weights.
            const levelsDone = this.level - 1;
            let targetScore = levelsDone * 20;
            
            // Add progress within the failed level
            if (this.level <= 5) {
                const config = LEVEL_CONFIGS[this.level];
                const currentLevelRatio = Math.min(1.0, this.score / config.targetScore);
                targetScore += Math.round(currentLevelRatio * 20);
            } else {
                // Win game bonus
                targetScore = 100;
            }
            
            targetScore = Math.max(10, Math.min(100, targetScore));
            
            // Trigger speedometer
            if (this.speedometer) {
                this.speedometer.reset();
                this.speedometer.setScore(targetScore);
                this.speedometer.start();
            }
            
            // Determine call now button visibility based on mobile
            const empMobile = sessionStorage.getItem('gamification_emp_mobile') || "02261241800";
            const callBtn = document.getElementById('btn-gameover-call');
            callBtn.href = `tel:${empMobile}`;
            
            // Highlight wins/loses details
            const goTitle = document.getElementById('gameover-insurance-title');
            const goBody = document.getElementById('gameover-insurance-body');
            
            if (this.level > 5) {
                goTitle.innerHTML = `Triumphant Legacy! <span>Secure Your Future</span>`;
                goBody.innerText = `Sensational mining run! You've conquered the final Legacy Chamber. Build a real-life insurance vault to secure your family's future today!`;
                this.audioService.playLevelComplete();
            } else {
                goTitle.innerHTML = `Tunnels collapse, <span>Life Goals shouldn't!</span>`;
                goBody.innerText = `One market crash or hazard ended the game, we can't afford that in real life. Shield your family's goals with Bajaj Life Term plans!`;
                this.audioService.playGameOver();
            }
            
            document.getElementById('gameover-screen').classList.remove('hidden');
        }
        else if (newState === 'LEAD') {
            // Prep lead form fields
            document.getElementById('lead-error').innerText = "";
            document.getElementById('lead-screen').classList.remove('hidden');
        }
        else if (newState === 'SLOT') {
            document.getElementById('slot-error').innerText = "";
            
            // Set min date to today
            const todayStr = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('slot-date');
            dateInput.value = todayStr;
            dateInput.min = todayStr;
            
            this.populateTimeSlots();
            document.getElementById('slot-screen').classList.remove('hidden');
        }
        else if (newState === 'THANKYOU') {
            document.getElementById('thankyou-screen').classList.remove('hidden');
        }
    }
    
    populateTimeSlots() {
        const slots = [
            "09:00 AM - 12:00 PM",
            "12:00 PM - 03:00 PM",
            "03:00 PM - 06:00 PM",
            "06:00 PM - 09:00 PM"
        ];
        const grid = document.getElementById('slot-times-grid');
        grid.innerHTML = "";
        
        slots.forEach((s, idx) => {
            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = "ls-slot-chip";
            btn.innerText = s;
            if (idx === 0) btn.classList.add('selected');
            
            btn.addEventListener('click', () => {
                grid.querySelectorAll('.ls-slot-chip').forEach(c => c.classList.remove('selected'));
                btn.classList.add('selected');
            });
            grid.appendChild(btn);
        });
    }
    
    renderUpgradeButtons() {
        const container = document.getElementById('shop-items-grid');
        container.innerHTML = "";
        
        Object.keys(UPGRADES).forEach(key => {
            const up = UPGRADES[key];
            const currentLvl = this.upgrades[key]; // 0 to 3
            const maxed = currentLvl >= up.costs.length;
            const cost = maxed ? 0 : up.costs[currentLvl];
            
            const card = document.createElement('div');
            card.className = `shop-item-card ${maxed ? 'maxed' : ''}`;
            
            // Generate visual dot indicators for levels
            let dotsHtml = "";
            for (let i = 0; i < up.costs.length; i++) {
                dotsHtml += `<div class="level-dot ${i < currentLvl ? 'active' : ''}"></div>`;
            }
            
            card.innerHTML = `
                <div class="shop-item-header">
                    <div class="shop-item-name">${up.name}</div>
                    <div class="shop-item-dots">${dotsHtml}</div>
                </div>
                <div class="shop-item-desc">${up.desc}</div>
                <button class="shop-buy-btn ls-btn ls-btn-primary" ${maxed || this.coins < cost ? 'disabled' : ''}>
                    ${maxed ? 'MAXED' : `<span class="gold-symbol">●</span> ${cost} Coins`}
                </button>
            `;
            
            const buyBtn = card.querySelector('.shop-buy-btn');
            buyBtn.addEventListener('click', () => {
                if (!maxed && this.coins >= cost) {
                    this.coins -= cost;
                    this.upgrades[key]++;
                    this.audioService.playPurchase();
                    this.saveProgress();
                    
                    // Re-render shop
                    document.getElementById('shop-coins-count').innerText = this.coins;
                    this.renderUpgradeButtons();
                }
            });
            
            container.appendChild(card);
        });
    }
    
    collectItem(item) {
        if (item.isHazard) {
            this.audioService.playScoreSub();
            this.comboCount = 0;
            this.score = Math.max(0, this.score + item.value);
            this.particleManager.spawnSparks(item.x, item.y, '#FF3D00', 10);
            this.particleManager.spawnFloatingText(item.x, item.y - 10, `${item.value}`, '#FF4B4B');
            
            if (item.isBomb) {
                // Massive screen shake
                this.screenShake = 16;
            }
        } else {
            // Combo increment
            this.comboCount++;
            this.comboTimer = 240; // combo stays alive for 4 seconds (approx 240 frames)
            
            const currentUpgrades = {
                luckyFinder: UPGRADES.luckyFinder.multipliers[this.upgrades.luckyFinder]
            };
            
            // Combo score scaling
            const comboMultiplier = 1.0 + (this.comboCount - 1) * 0.15;
            const pointsEarned = Math.round(item.value * comboMultiplier);
            
            this.score += pointsEarned;
            this.coins += pointsEarned; // Earn coins matching score
            this.saveProgress();
            
            this.particleManager.spawnGoldBurst(item.x, item.y, 12);
            
            // Standard sound or arpeggio for combo
            if (this.comboCount >= 3) {
                this.audioService.playCombo(this.comboCount);
                this.particleManager.spawnComboBurst(item.x, item.y, `COMBO x${this.comboCount}!`);
            } else {
                this.audioService.playCoin();
                this.particleManager.spawnFloatingText(item.x, item.y - 10, `+${pointsEarned}`, '#00E064');
            }
        }
    }
    
    async handleShare() {
        const shareUrl = buildShareUrl();
        if (!shareUrl) {
            // Fallback native copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert("Share link copied to clipboard!");
            return;
        }
        
        const short = await shortenUrl(shareUrl);
        const text = `Join Wealth Miner and test your Financial Fitness! Mined wealth with shields, coins and pension vaults. Play here: ${short}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Wealth Miner – Insurance Fortune Hunt',
                text: text,
                url: short
            }).catch(err => {
                console.log('Share canceled', err);
            });
        } else {
            navigator.clipboard.writeText(text);
            alert("WhatsApp share message copied to clipboard!");
        }
    }
    
    async handleLeadSubmit() {
        const name = document.getElementById('lead-name-input').value.trim();
        const mobile = document.getElementById('lead-mobile-input').value.trim();
        const email = document.getElementById('lead-email-input').value.trim();
        const tc = document.getElementById('lead-tc-checkbox').checked;
        const errDiv = document.getElementById('lead-error');
        
        if (!name) {
            errDiv.innerText = "Please enter your name.";
            return;
        }
        if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
            errDiv.innerText = "Please enter a valid 10-digit mobile number.";
            return;
        }
        if (!tc) {
            errDiv.innerText = "Please consent to the Terms & Conditions.";
            return;
        }
        
        errDiv.innerText = "Submitting lead...";
        
        const leadPayload = {
            fullName: name,
            mobile_no: mobile,
            email_id: email,
            score: this.score,
            summary_dtls: `Wealth Miner game completed level ${this.level}. Upgrades purchased: Strength lvl ${this.upgrades.clawStrength}, Reel Speed lvl ${this.upgrades.pullSpeed}, Radius lvl ${this.upgrades.grabRadius}.`
        };
        
        const result = await submitToLMS(leadPayload);
        if (result.success) {
            // Save lead no if returned, to associate with appointment slot
            const leadNo = result.data?.leadNo || "";
            if (leadNo) {
                sessionStorage.setItem('wealthMinerLeadNo', leadNo);
            }
            this.transitionTo('SLOT');
        } else {
            errDiv.innerText = result.error || "Submission failed. Please check network.";
        }
    }
    
    async handleSlotBooking() {
        const date = document.getElementById('slot-date').value;
        const grid = document.getElementById('slot-times-grid');
        const selectedChip = grid.querySelector('.ls-slot-chip.selected');
        const errDiv = document.getElementById('slot-error');
        
        if (!date) {
            errDiv.innerText = "Please select a booking date.";
            return;
        }
        if (!selectedChip) {
            errDiv.innerText = "Please select a time slot.";
            return;
        }
        
        const leadNo = sessionStorage.getItem('wealthMinerLeadNo') || "";
        const timeSlot = selectedChip.innerText;
        
        errDiv.innerText = "Reserving appointment slot...";
        
        const slotPayload = {
            date: date,
            time: timeSlot,
            remarks: `User selected slot ${timeSlot} on date ${date} for game lead.`
        };
        
        const result = await updateLeadNew(leadNo, slotPayload);
        if (result.success) {
            this.transitionTo('THANKYOU');
        } else {
            errDiv.innerText = "Slot update failed. Skipping to final screen...";
            setTimeout(() => {
                this.transitionTo('THANKYOU');
            }, 1500);
        }
    }
    
    update() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        if (this.state === 'PLAYING') {
            // Timer ticking
            this.timer -= dt;
            
            // Combo timer ticking
            if (this.comboCount > 0) {
                this.comboTimer -= 1;
                if (this.comboTimer <= 0) {
                    this.comboCount = 0;
                }
            }
            
            // Frame checks: update systems
            this.levelManager.update();
            this.clawSystem.update(
                this.levelManager,
                this.particleManager,
                this.audioService,
                (item) => this.collectItem(item)
            );
            
            // Level timer ends checks
            if (this.timer <= 0) {
                this.timer = 0;
                
                // Allow claw to reel in any active item before terminating level
                if (this.clawSystem.state === 'SWINGING' && this.clawSystem.length === this.clawSystem.minLength) {
                    const target = LEVEL_CONFIGS[this.level].targetScore;
                    if (this.score >= target) {
                        if (this.level >= 5) {
                            // Conquered game!
                            this.transitionTo('GAMEOVER');
                        } else {
                            this.transitionTo('SHOP');
                        }
                    } else {
                        // Failed to clear level
                        this.transitionTo('GAMEOVER');
                    }
                }
            }
        }
        
        // Screenshake decay
        if (this.screenShake > 0.05) {
            this.screenShake *= 0.9;
        } else {
            this.screenShake = 0;
        }
        
        this.particleManager.update();
        this.draw();
    }
    
    draw() {
        const ctx = this.ctx;
        
        ctx.save();
        
        // Handle Screen Shake
        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(dx, dy);
        }
        
        // 1. Draw layered cavern gradient background
        const theme = THEMES[this.level] || THEMES[1];
        ctx.fillStyle = theme.bgColor;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        grad.addColorStop(0, theme.bgGradient[0]);
        grad.addColorStop(1, theme.bgGradient[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Soft cave structures details (subtle ambient spotlight glow)
        ctx.fillStyle = theme.ambientColor;
        ctx.beginPath();
        ctx.arc(GAME_WIDTH / 2, 100, 320, 0, Math.PI * 2);
        ctx.fill();

        
        // 2. Draw Items
        if (this.state === 'PLAYING') {
            for (const item of this.levelManager.items) {
                if (item.collected) continue;
                
                ctx.save();
                
                const assetKey = item.type;
                const assetImg = this.assets[assetKey];
                
                // Spotlighting glow for premium item assets
                ctx.shadowColor = item.isHazard ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 215, 0, 0.35)';
                ctx.shadowBlur = 8 + Math.sin(item.pulseTime) * 4;
                
                if (assetImg && assetImg.complete && assetImg.naturalWidth > 0) {
                    // Render generated high-quality asset
                    ctx.drawImage(
                        assetImg,
                        item.x - item.radius - 3,
                        item.y - item.radius - 3,
                        item.radius * 2 + 6,
                        item.radius * 2 + 6
                    );
                } else {
                    // Fallback Premium vector representation
                    ctx.fillStyle = item.color;
                    ctx.beginPath();
                    
                    if (item.isBomb) {
                        // Mine bomb shape
                        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                        ctx.fill();
                        // spikes
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 2;
                        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                            ctx.beginPath();
                            ctx.moveTo(item.x, item.y);
                            ctx.lineTo(item.x + Math.cos(a) * (item.radius + 6), item.y + Math.sin(a) * (item.radius + 6));
                            ctx.stroke();
                        }
                    } else if (item.isHazard) {
                        // Loan Shark or generic triangle spike
                        ctx.moveTo(item.x, item.y - item.radius);
                        ctx.lineTo(item.x + item.radius, item.y + item.radius);
                        ctx.lineTo(item.x - item.radius, item.y + item.radius);
                        ctx.closePath();
                        ctx.fill();
                    } else {
                        // Standard collectible circles/polygons
                        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Golden border
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            }
        }
        
        // 3. Draw Crane and Swing Claw
        if (this.state === 'PLAYING') {
            this.clawSystem.draw(ctx, this.assets.claw, this.assets.crane);
        }
        
        // 4. Update and Draw Visual Particles
        this.particleManager.draw(ctx);
        
        ctx.restore();
        
        // Update DOM HUD overlays in Playing State
        if (this.state === 'PLAYING') {
            document.getElementById('score-val').innerText = this.score;
            document.getElementById('timer-val').innerText = Math.ceil(this.timer);
            
            const targetScore = LEVEL_CONFIGS[this.level].targetScore;
            document.getElementById('target-val').innerText = targetScore;
            
            // Combo multiplier label
            const comboEl = document.getElementById('combo-val');
            if (this.comboCount >= 2) {
                comboEl.innerText = `x${this.comboCount}`;
                comboEl.parentElement.classList.remove('hidden');
                // Pulse size
                const progressRatio = this.comboTimer / 240;
                document.getElementById('combo-bar-fill').style.width = `${progressRatio * 100}%`;
            } else {
                comboEl.parentElement.classList.add('hidden');
            }
        }
    }
}
export default GameManager;

// GameManager.js – central state machine + game loop coordinator

import { spawnBlock, resetBlockIndex } from './BlockSpawner.js';
import { RopeSwingController } from './RopeSwingController.js';
import { FallingBlock, calculateLanding } from './PhysicsSystem.js';
import { StabilitySystem } from './StabilitySystem.js';
import { CameraSystem } from './CameraSystem.js';
import { Renderer, getLevelTheme } from './Renderer.js';
import { UIManager } from './UIManager.js';
import { SoundManager } from './SoundManager.js';
import { submitToLMS, updateLeadNew } from './api.js';
import { buildShareUrl } from './utils/crypto.js';
import { shortenUrl } from './utils/shortener.js';

const STATE = { IDLE: 'idle', PLAYING: 'playing', DROPPING: 'dropping', GAMEOVER: 'gameover' };
const LEVEL_THRESHOLDS = [0, 5, 12, 20, 30, 42];
const GAME_DURATION_MS = 60_000;

export class GameManager {
    constructor(canvas) {
        this._canvas = canvas;
        this._renderer = new Renderer(canvas);
        this._camera = new CameraSystem();
        this._stackStability = new StabilitySystem();
        this._rope = new RopeSwingController();

        this._ui = new UIManager();

        // Lead / slot / thank-you flow state
        this._leadNo = null;
        this._leadName = '';
        this._leadMobile = '';

        this._ui.setOnLeadSubmit(async ({ name, mobile }) => {
            const result = await submitToLMS({ name, mobile, score: this._score });
            this._leadNo = result.leadNo || result.LeadNo || null;
            if (this._leadNo) sessionStorage.setItem('stackibilityLeadNo', this._leadNo);
            this._leadName = name;
            this._leadMobile = mobile;
            this._ui.hideLead();
            // After lead capture, reveal the personalized score CTA screen.
            this._ui.showGameOver({
                name,
                score: this._score,
                floors: this._tower.length - 1,
                won: this._lastGameWon,
            });
        });
        this._ui.setOnBookSlot(() => {
            this._ui.hideGameOver();
            this._ui.showSlot(this._leadName, this._leadMobile);
        });
        this._ui.setOnShare(() => this._handleShare());
        this._ui.setOnSlotConfirm(async ({ date, time }) => {
            if (this._leadNo) {
                await updateLeadNew(this._leadNo, {
                    name: this._leadName,
                    mobile: this._leadMobile,
                    date,
                    time,
                    remarks: 'Slot Booking via Stackibility Stack',
                });
            }
            this._ui.hideSlot();
            this._ui.showThankYou();
        });
        this._ui.setOnSlotSkip(() => {
            this._ui.hideSlot();
            this._ui.showThankYou();
        });
        this._ui.setOnPlayAgain(() => {
            this._ui.hideThankYou();
            this._ui.hideGameOver();
            this._startGame();
        });

        // Game state
        this._state = STATE.IDLE;
        this._score = 0;
        this._combo = 0;
        this._level = 1;
        this._tower = [];
        this._falling = null;
        this._particles = [];
        this._swingBlock = null;
        this._swingPos = { x: 0, y: 0 };
        this._timeLeftMs = GAME_DURATION_MS;
        this._lastTickTs = 0;
        this._lastGameWon = false;

        this._updateLayout();

        window.addEventListener('click', () => this._onTap());
        window.addEventListener('touchstart', e => {
            // Only prevent default if we're not tapping on an interactive element
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                e.preventDefault();
            }
            this._onTap();
        }, { passive: false });
        window.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') this._onTap(); });

        window.addEventListener('resize', () => this._updateLayout());

        this._ui.showStart();
    }

    _updateLayout() {
        // Ground sits lower now
        this._groundWorldY = window.innerHeight * 0.88;
        this._anchorX = window.innerWidth / 2;
        // Anchor moves with tower
        const towerTopY = this._tower.length > 0 ? this._tower[this._tower.length - 1].worldY : this._groundWorldY;
        this._anchorY = (towerTopY - this._camera.scrollY) - 180;
    }


    // ── Input ───────────────────────────────────────────────────────────
    _onTap() {
        // Block taps while a lead/slot/thank-you overlay is visible — those
        // screens have their own primary CTAs and should not be dismissed by
        // a stray click on the canvas.
        if (this._isFlowOverlayOpen()) return;
        if (this._state === STATE.IDLE || this._state === STATE.GAMEOVER) { this._startGame(); return; }
        if (this._state === STATE.PLAYING) this._releaseBlock();
    }

    _isFlowOverlayOpen() {
        const ids = ['lead-screen', 'slot-screen', 'thankyou-screen', 'gameover-screen'];
        return ids.some((id) => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
    }

    // ── Game flow ────────────────────────────────────────────────────────
    _startGame() {
        this._state = STATE.PLAYING;
        this._score = 0;
        this._combo = 0;
        this._level = 1;
        this._tower = [];
        this._falling = null;
        this._particles = [];
        this._timeLeftMs = GAME_DURATION_MS;
        this._lastTickTs = performance.now();

        resetBlockIndex();
        this._camera.reset();
        this._stackStability.reset();
        this._rope.reset(1);

        // Starting platform — single flat block spanning the full screen,
        // no facade pattern, distinct stone-brown palette. The swing-width
        // cap below stops blocks from inflating to platform width.
        const baseBlock = spawnBlock(window.innerWidth);
        baseBlock.label = 'Foundation';
        baseBlock.iconType = null;
        baseBlock.height = 56;
        baseBlock.color = '#6D4C41';
        baseBlock.borderColor = '#3E2723';
        baseBlock.labelHeight = 28;
        baseBlock.labelFontSize = 16;
        this._tower.push({ block: baseBlock, worldX: this._anchorX, worldY: this._groundWorldY });

        this._ui.hideStart();
        this._ui.hideGameOver();
        this._spawnSwing();
    }

    _spawnSwing() {
        const top = this._tower[this._tower.length - 1];
        // Cap the swing block so a wide foundation doesn't produce a
        // screen-spanning swing block on the first drop.
        const SWING_MAX_W = 100;
        const width = Math.min(
            Math.max(top.block.width * (this._level > 2 ? 0.95 : 0.98), 40),
            SWING_MAX_W,
        );

        this._swingBlock = spawnBlock(width);
        this._rope.reset(this._level);
    }

    _releaseBlock() {
        if (!this._swingBlock) return;

        // Anchor updates before release to ensure correct drop height
        const top = this._tower[this._tower.length - 1];
        const worldAnchorY = top.worldY - 200;
        const { x, y, vx } = this._rope.update(0, 1, this._anchorX, worldAnchorY - this._camera.scrollY);

        // Screen coordinate y converted back to world coordinate
        const worldY = (y - this._swingBlock.height / 2) + this._camera.scrollY;

        this._falling = new FallingBlock(this._swingBlock, x, worldY, vx * 0.4);
        this._swingBlock = null;
        this._state = STATE.DROPPING;
    }

    _landBlock(fb) {
        const top = this._tower[this._tower.length - 1];
        const result = calculateLanding(fb.px, fb.block.width, top.worldX, top.block.width);

        if (result.result === 'miss') {
            if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
            SoundManager.playCrash();
            this._triggerGameOver();
            return;
        }

        const placedX = result.result === 'perfect' ? top.worldX : result.overlapCenter;
        // Perfect drop preserves the falling block's width (don't inflate to
        // a wide top like the foundation). Trim to overlap on partial hits.
        const newWidth = result.result === 'perfect'
            ? Math.min(fb.block.width, top.block.width)
            : Math.max(result.overlapWidth, 20);
        const placedY = top.worldY - top.block.height;

        const placedBlock = { ...fb.block, width: newWidth };
        this._tower.push({ block: placedBlock, worldX: placedX, worldY: placedY });
        this._stackStability.onPlace(result.overhangRatio);
        this._stackStability.onDrop(this._tower.length - 1);

        const isPerfect = result.result === 'perfect';
        if (isPerfect) {
            this._combo++;
            if (navigator.vibrate) navigator.vibrate(15);
            this._hitStopTimer = 3; // ~0.05s skip frames
            SoundManager.playPerfect();
        } else {
            this._combo = 0;
            if (navigator.vibrate) navigator.vibrate(30);
            SoundManager.playThud();
        }

        this._feverMode = this._combo >= 5;

        this._score += isPerfect ? 10 + this._combo * 5 : 5;

        if (isPerfect) {
            this._ui.showCombo(this._combo);
            this._spawnParticles(placedX, placedY, placedBlock.color);
        }

        this._state = STATE.PLAYING;
        this._spawnSwing();

        // Level up
        const floors = this._tower.length - 1;
        if (floors >= (LEVEL_THRESHOLDS[this._level] ?? Infinity) && this._level < 6) {
            this._level++;
            this._rope.reset(this._level);
        }

        if (this._stackStability.isCollapsed) this._triggerGameOver();
    }

    _triggerGameOver(won = false) {
        if (this._state === STATE.GAMEOVER) return;
        if (!won) SoundManager.playCrash();
        this._state = STATE.GAMEOVER;
        this._falling = null;
        this._lastGameWon = !!won;
        this._ui.markPlayed();
        // Lead capture comes BEFORE the score CTA. The submit handler
        // routes onward to the personalized game-over screen.
        this._ui.showLead();
    }

    async _handleShare() {
        const floors = this._tower.length - 1;
        const rawUrl = buildShareUrl() || window.location.href;
        const shareUrl = await shortenUrl(rawUrl);
        const senderName = this._leadName || '';
        const signature = senderName ? `\n\nBest Regards,\n${senderName}` : '';
        const message = `Hi,\nI just played LifeStack and built a tower of ${floors} floors.\nSee how high you can stack — try it here: ${shareUrl}${signature}`.trim();
        if (navigator.share) {
            try { await navigator.share({ title: 'LifeStack', text: message, url: shareUrl }); } catch {}
            return;
        }
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Score and link copied to clipboard!');
        } catch {}
    }

    _spawnParticles(x, worldY, color) {
        for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1.5 + Math.random() * 3.5;
            this._particles.push({ x, y: worldY - this._camera.scrollY, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: 2 + Math.random() * 3, alpha: 1, color });
        }
    }

    update() {
        if (this._hitStopTimer > 0) {
            this._hitStopTimer--;
            this._draw();
            return;
        }

        // Tick the 60-second game timer. When it hits zero with the tower
        // still standing, that's a "win" — route to the success CTA.
        const now = performance.now();
        if (this._state === STATE.PLAYING || this._state === STATE.DROPPING) {
            const dt = this._lastTickTs ? now - this._lastTickTs : 0;
            this._timeLeftMs = Math.max(0, this._timeLeftMs - dt);
            if (this._timeLeftMs <= 0) {
                this._lastTickTs = now;
                this._triggerGameOver(true);
                this._draw();
                return;
            }
        }
        this._lastTickTs = now;

        this._stackStability.update();

        const towerTopWorldY = this._tower.length > 0
            ? this._tower[this._tower.length - 1].worldY
            : this._groundWorldY;

        this._camera.update(towerTopWorldY, window.innerHeight, this._groundWorldY);

        // Update swing anchor dynamically
        this._anchorY = (towerTopWorldY - this._camera.scrollY) - 280;

        if (this._state === STATE.PLAYING && this._swingBlock) {
            const speedMod = this._feverMode ? 0.5 : 1;
            this._swingPos = this._rope.update(1, speedMod, this._anchorX, this._anchorY);
        }

        if (this._state === STATE.DROPPING && this._falling) {
            this._falling.update(towerTopWorldY, window.innerHeight, this._camera.scrollY);
            if (!this._falling.active) {
                this._triggerGameOver();
            } else if (this._falling.hasLanded(towerTopWorldY)) {
                const fb = this._falling;
                this._falling = null;
                this._landBlock(fb);
            }
        }

        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= 0.03;
            if (p.alpha <= 0) this._particles.splice(i, 1);
        }

        this._updateUI();
        this._draw();
    }

    _updateUI() {
        this._ui.updateHUD({
            score: this._score,
            floors: this._tower.length - 1,
            levelName: getLevelTheme(this._level).name,
            instabilityFraction: this._stackStability.fraction,
            timeLeftMs: this._timeLeftMs,
        });
    }

    _draw() {
        const r = this._renderer;
        const ctx = r.ctx;
        const shake = this._stackStability.shakeOffset;
        const theme = getLevelTheme(this._level);

        r.clear();
        r.drawBackground(theme, shake, this._camera.scrollY);

        ctx.save();
        this._camera.applyTransform(ctx);
        r.drawGround(this._groundWorldY, theme, shake);
        for (const e of this._tower) r.drawBlock(e.block, e.worldX + shake, e.worldY);
        if (this._falling) r.drawBlock(this._falling.block, this._falling.px + shake, this._falling.py);
        ctx.restore();

        r.drawParticles(this._particles);

        if (this._state === STATE.PLAYING && this._swingBlock) {
            r.setPendulumBlock(this._swingBlock);
            r.drawRope(this._anchorX, this._anchorY, this._swingPos.x, this._swingPos.y);
            r.drawBlock(this._swingBlock, this._swingPos.x, this._swingPos.y, 0);
        }
    }
}

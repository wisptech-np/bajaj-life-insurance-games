// UIManager.js – DOM overlay management (Synchronized with Snake-Life look)

const PLAYED_KEY = 'lifestack_played';

const TIME_SLOTS = [
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM',
];

const MOBILE_RE = /^[6-9]\d{9}$/;

export class UIManager {
    constructor() {
        this._score = document.getElementById('score');
        this._height = document.getElementById('height');
        this._level = document.getElementById('level-name');
        this._timer = document.getElementById('timer');
        this._sFill = document.getElementById('stability-fill');

        this._combo = document.getElementById('combo-badge');
        this._tapHint = document.getElementById('tap-hint');

        this._startScreen = document.getElementById('start-screen');
        this._gameoverScreen = document.getElementById('gameover-screen');
        this._tutScreen = document.getElementById('tutorial-screen');
        this._leadScreen = document.getElementById('lead-screen');
        this._slotScreen = document.getElementById('slot-screen');
        this._thankyouScreen = document.getElementById('thankyou-screen');
        this._termsModal = document.getElementById('terms-modal');

        this._comboClearTimer = null;

        // Lead/Slot/Play-again callbacks (set by GameManager)
        this._onLeadSubmit = () => {};
        this._onSlotConfirm = () => {};
        this._onSlotSkip = () => {};
        this._onPlayAgain = () => {};
        this._onBookSlot = () => {};
        this._onShare = () => {};

        this._selectedSlot = null;

        // Hide the tap-to-drop hint for returning players.
        try {
            if (localStorage.getItem(PLAYED_KEY) === '1') {
                this._tapHint?.classList.add('hidden');
            }
        } catch {}

        // Tutorial wiring
        document.getElementById('btn-tutorial')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showTutorial();
        });
        document.getElementById('btn-tut-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideTutorial();
        });

        // "Book a Slot"
        const insuranceBtn = document.getElementById('btn-insurance');
        if (insuranceBtn) {
            insuranceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._onBookSlot();
            });
        }

        // Share
        const shareBtn = document.getElementById('btn-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._onShare();
            });
        }

        // Call now
        const callBtn = document.getElementById('btn-call');
        const empMobile = sessionStorage.getItem('gamification_emp_mobile')
            || sessionStorage.getItem('gamification_empMobile');
        if (callBtn && empMobile) {
            callBtn.href = `tel:${empMobile}`;
            callBtn.classList.remove('hidden');
        }

        // Restart from game-over CTA
        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideGameOver();
                this._onPlayAgain();
            });
        }

        // Render time-slot buttons once
        this._slotTimesEl = document.getElementById('slot-times');
        if (this._slotTimesEl) {
            this._slotTimesEl.innerHTML = '';
            TIME_SLOTS.forEach((t) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ls-slot-pill-premium';
                btn.dataset.slot = t;
                btn.textContent = t;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._selectedSlot = t;
                    this._slotTimesEl.querySelectorAll('.ls-slot-pill-premium').forEach((el) => {
                        el.classList.toggle('selected', el.dataset.slot === t);
                    });
                });
                this._slotTimesEl.appendChild(btn);
            });
        }

        // Lead submit
        const leadSubmit = document.getElementById('btn-lead-submit');
        if (leadSubmit) {
            leadSubmit.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleLeadSubmit(leadSubmit);
            });
        }

        // Terms link/modal
        document.getElementById('link-tc')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showTerms();
        });
        document.getElementById('btn-terms-close')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideTerms();
        });
        document.getElementById('terms-overlay')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideTerms();
        });
        document.getElementById('btn-terms-agree')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const tc = document.getElementById('lead-tc');
            if (tc) tc.checked = true;
            this.hideTerms();
        });

        // Slot confirm/skip
        const slotConfirm = document.getElementById('btn-slot-confirm');
        if (slotConfirm) {
            slotConfirm.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleSlotConfirm(slotConfirm);
            });
        }
        const slotSkip = document.getElementById('btn-slot-skip');
        if (slotSkip) {
            slotSkip.addEventListener('click', (e) => {
                e.stopPropagation();
                this._onSlotSkip();
            });
        }

        // Thank-you Play Again
        const thanksRestart = document.getElementById('btn-thankyou-restart');
        if (thanksRestart) {
            thanksRestart.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideThankYou();
                this._onPlayAgain();
            });
        }
    }

    // ── Public callback setters ───────────────────────────────
    setOnLeadSubmit(fn) { this._onLeadSubmit = fn || (() => {}); }
    setOnSlotConfirm(fn) { this._onSlotConfirm = fn || (() => {}); }
    setOnSlotSkip(fn) { this._onSlotSkip = fn || (() => {}); }
    setOnPlayAgain(fn) { this._onPlayAgain = fn || (() => {}); }
    setOnBookSlot(fn) { this._onBookSlot = fn || (() => {}); }
    setOnShare(fn) { this._onShare = fn || (() => {}); }

    // ── Lead form ─────────────────────────────────────────────
    _handleLeadSubmit(btn) {
        const nameEl = document.getElementById('lead-name');
        const mobEl = document.getElementById('lead-mobile');
        const tcEl = document.getElementById('lead-tc');
        const errEl = document.getElementById('lead-error');

        const name = (nameEl?.value || '').trim();
        const mobile = (mobEl?.value || '').trim();
        const tc = !!tcEl?.checked;

        if (!name) {
            if (errEl) errEl.textContent = 'PLEASE ENTER YOUR FULL NAME.';
            return;
        }
        if (!/^[A-Za-z\s]+$/.test(name)) {
            if (errEl) errEl.textContent = 'LETTERS ONLY FOR NAME.';
            return;
        }
        if (!MOBILE_RE.test(mobile)) {
            if (errEl) errEl.textContent = 'INVALID 10-DIGIT MOBILE NUMBER.';
            return;
        }
        if (!tc) {
            if (errEl) errEl.textContent = 'PLEASE AGREE TO TERMS.';
            return;
        }
        if (errEl) errEl.textContent = '';

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'SUBMITTING…';

        Promise.resolve(this._onLeadSubmit({ name, mobile })).finally(() => {
            btn.disabled = false;
            btn.textContent = originalText;
        });
    }

    // ── Slot form ─────────────────────────────────────────────
    _handleSlotConfirm(btn) {
        const dateEl = document.getElementById('slot-date');
        const errEl = document.getElementById('slot-error');
        const date = dateEl?.value || '';
        const time = this._selectedSlot || '';

        if (!date) {
            if (errEl) errEl.textContent = 'PLEASE PICK A DATE.';
            return;
        }
        if (!time) {
            if (errEl) errEl.textContent = 'PLEASE SELECT A TIME SLOT.';
            return;
        }
        if (errEl) errEl.textContent = '';

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'BOOKING…';

        Promise.resolve(this._onSlotConfirm({ date, time })).finally(() => {
            btn.disabled = false;
            btn.textContent = originalText;
        });
    }

    /** Mark that the player has finished a game; hides the tap-hint going forward. */
    markPlayed() {
        try {
            if (localStorage.getItem(PLAYED_KEY) !== '1') {
                localStorage.setItem(PLAYED_KEY, '1');
            }
        } catch {}
        this._tapHint?.classList.add('hidden');
    }

    showTutorial() { this._tutScreen?.classList.remove('hidden'); }
    hideTutorial() { this._tutScreen?.classList.add('hidden'); }

    updateHUD({ score, floors, levelName, instabilityFraction, timeLeftMs }) {
        if (this._score) {
            if (this._score.textContent !== score.toString()) {
                this._score.textContent = score;
                // Pop animation
                this._score.classList.remove('score-pop');
                void this._score.offsetWidth;
                this._score.classList.add('score-pop');
            }
        }
        if (this._height) this._height.textContent = `${floors}`;
        if (this._level) this._level.textContent = levelName;
        if (this._timer && timeLeftMs != null) {
            const totalSec = Math.max(0, Math.ceil(timeLeftMs / 1000));
            const m = Math.floor(totalSec / 60);
            const s = String(totalSec % 60).padStart(2, '0');
            const formatted = `${m}:${s}`;
            if (this._timer.textContent !== formatted) {
                this._timer.textContent = formatted;
            }
            this._timer.classList.toggle('timer-low', totalSec <= 10);
        }

        // Stability bar logic
        if (this._sFill) {
            const stability = 1 - instabilityFraction;
            this._sFill.style.height = `${Math.round(stability * 100)}%`;

            // Dynamic colors and shake
            this._sFill.classList.remove('shake-warning');
            const wrap = document.getElementById('stability-bar-wrap');
            if (wrap) wrap.classList.remove('shake-warning');

            if (stability >= 0.7) {
                this._sFill.style.backgroundColor = '#005BAC';
            } else if (stability >= 0.3) {
                this._sFill.style.backgroundColor = '#F26922';
            } else {
                this._sFill.style.backgroundColor = '#EF4444';
                if (wrap) wrap.classList.add('shake-warning');
            }
        }
    }

    showCombo(combo) {
        if (!this._combo) return;
        clearTimeout(this._comboClearTimer);
        this._combo.classList.remove('hidden');
        this._combo.textContent = combo >= 5
            ? `🔥 x${combo} STREAK!`
            : combo >= 3 ? `✨ x${combo} COMBO!` : 'PERFECT!';
        void this._combo.offsetWidth;
        this._combo.classList.add('show');
        this._comboClearTimer = setTimeout(() => {
            this._combo.classList.remove('show');
            setTimeout(() => this._combo.classList.add('hidden'), 250);
        }, 1400);
    }

    showStart() { this._startScreen?.classList.remove('hidden'); this._gameoverScreen?.classList.add('hidden'); }
    hideStart() { this._startScreen?.classList.add('hidden'); }
    showGameOver({ name, score, floors, won }) {
        const goScoreEl = document.getElementById('go-score');
        const goFloorsEl = document.getElementById('go-floors');
        if (goScoreEl) goScoreEl.textContent = score;
        if (goFloorsEl) goFloorsEl.textContent = floors;

        const greetingEl = document.getElementById('go-greeting');
        if (greetingEl) {
            const firstName = (name || '').trim().split(/\s+/)[0] || 'there';
            greetingEl.textContent = `Hi ${firstName}`;
        }

        const titleEl = document.getElementById('go-insurance-title');
        const bodyEl = document.getElementById('go-insurance-body');
        if (won) {
            if (titleEl) titleEl.innerHTML = `<span>You managed to successfully build your tower!</span>`;
            if (bodyEl) bodyEl.textContent = `In real life as well, protect your family's Life Goals with Bajaj Life term plan and riders so that they don't fall apart due to one bad move.`;
        } else {
            if (titleEl) titleEl.innerHTML = `Towers fall, <span>Your Life Goals shouldn't!</span>`;
            if (bodyEl) bodyEl.textContent = `One bad move ended the game, we can't afford that in real life! Protect your family's Life Goals with Bajaj Life term plan and riders now!`;
        }

        this._gameoverScreen?.classList.remove('hidden');
    }
    hideGameOver() { this._gameoverScreen?.classList.add('hidden'); }

    // ── Lead/Slot/Thank-you screen toggles ────────────────────
    showLead() {
        const errEl = document.getElementById('lead-error');
        if (errEl) errEl.textContent = '';
        this._leadScreen?.classList.remove('hidden');
    }
    hideLead() { this._leadScreen?.classList.add('hidden'); }

    showSlot(name, mobile) {
        this._selectedSlot = null;
        const errEl = document.getElementById('slot-error');
        if (errEl) errEl.textContent = '';
        const dateEl = document.getElementById('slot-date');
        if (dateEl) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const max = new Date();
            max.setDate(max.getDate() + 14);
            const fmt = (d) => {
                const yy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yy}-${mm}-${dd}`;
            };
            dateEl.min = fmt(tomorrow);
            dateEl.max = fmt(max);
            dateEl.value = '';
        }
        if (this._slotTimesEl) {
            this._slotTimesEl.querySelectorAll('.ls-slot-pill-premium').forEach((el) => {
                el.classList.remove('selected');
            });
        }
        this._slotScreen?.classList.remove('hidden');
    }
    hideSlot() { this._slotScreen?.classList.add('hidden'); }

    showThankYou() { this._thankyouScreen?.classList.remove('hidden'); }
    hideThankYou() { this._thankyouScreen?.classList.add('hidden'); }

    showTerms() { this._termsModal?.classList.remove('hidden'); }
    hideTerms() { this._termsModal?.classList.add('hidden'); }

    showRiskEvent() { } 
}


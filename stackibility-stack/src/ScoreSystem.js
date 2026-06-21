// ScoreSystem.js – manages score, combos, and UI updates

export class ScoreSystem {
    constructor() {
        this.score = 0;
        this.combo = 0;
        this._scoreEl = document.getElementById('score');
        this._comboEl = document.getElementById('combo-badge');
        this._comboTimeout = null;
    }

    reset() {
        this.score = 0;
        this.combo = 0;
        this._update();
    }

    addStack(isPerfect) {
        if (isPerfect) {
            this.combo++;
            const bonus = 1 + this.combo;
            this.score += bonus;
            this._showCombo();
        } else {
            this.combo = 0;
            this.score += 1;
            this._hideCombo();
        }
        this._update();
    }

    _update() {
        this._scoreEl.textContent = this.score;
    }

    _showCombo() {
        clearTimeout(this._comboTimeout);
        this._comboEl.classList.remove('hidden');
        this._comboEl.textContent = this.combo >= 3 ? `🔥 x${this.combo} PERFECT!` : '⚡ PERFECT!';
        // Trigger reflow for animation restart
        void this._comboEl.offsetWidth;
        this._comboEl.classList.add('visible');
        this._comboTimeout = setTimeout(() => this._hideCombo(), 1200);
    }

    _hideCombo() {
        this._comboEl.classList.remove('visible');
        setTimeout(() => {
            if (!this._comboEl.classList.contains('visible')) {
                this._comboEl.classList.add('hidden');
            }
        }, 300);
    }
}

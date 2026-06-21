// InputController.js – normalised click + touch input

export class InputController {
    /**
     * @param {Function} onTap  callback fired on each player action
     */
    constructor(onTap) {
        this._onTap = onTap;
        this._enabled = false;

        this._handleClick = (e) => {
            // Ignore right-click
            if (e.button !== undefined && e.button !== 0) return;
            if (this._enabled) this._onTap();
        };

        this._handleTouch = (e) => {
            e.preventDefault();
            if (this._enabled) this._onTap();
        };

        window.addEventListener('click', this._handleClick, { passive: true });
        window.addEventListener('touchstart', this._handleTouch, { passive: false });
        window.addEventListener('keydown', this._onKeyDown.bind(this));
    }

    _onKeyDown(e) {
        if ((e.code === 'Space' || e.code === 'Enter') && this._enabled) {
            this._onTap();
        }
    }

    enable() { this._enabled = true; }
    disable() { this._enabled = false; }

    destroy() {
        window.removeEventListener('click', this._handleClick);
        window.removeEventListener('touchstart', this._handleTouch);
    }
}

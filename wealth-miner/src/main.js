import './index.css';
import { GameManager } from './GameManager.js';
import { decryptToken } from './utils/crypto.js';

// Parse query params from LMS or WhatsApp referrals
const params = new URLSearchParams(window.location.search);
const storeParam = (key, storageKey) => {
    const v = params.get(key);
    if (v) sessionStorage.setItem(storageKey, v);
};

storeParam('userId', 'gamification_userId');
storeParam('gameId', 'gamification_gameId');
storeParam('empName', 'gamification_empName');
storeParam('empMobile', 'gamification_empMobile');
storeParam('location', 'gamification_location');
storeParam('zone', 'gamification_zone');
storeParam('token', 'gamification_token');

// Default backup game ID if not injected
if (!sessionStorage.getItem('gamification_gameId')) {
    sessionStorage.setItem('gamification_gameId', 'GAME_035');
}

const empMobile = sessionStorage.getItem('gamification_empMobile');
if (empMobile) {
    sessionStorage.setItem('gamification_emp_mobile', empMobile);
}

// Decrypt ciphertext parameters
const token = params.get('token');
if (token && token !== 'GUEST_SESSION') {
    sessionStorage.setItem('gamification_rawToken', token);
    const payload = decryptToken(token);
    if (payload) {
        ['game_id', 'emp_id', 'emp_name', 'emp_mobile', 'location', 'zone'].forEach((k) => {
            if (payload[k] != null) sessionStorage.setItem(`gamification_${k}`, String(payload[k]));
        });
        sessionStorage.setItem('gamification_referral', payload.referral || 'N');
    }
}

// Clear URL address query string for slicker experience
if (params.toString()) {
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Instantiate GameManager
const canvas = document.getElementById('c');
const game = new GameManager(canvas);
window.game = game;

// Active gameloop
function loop() {
    game.update();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

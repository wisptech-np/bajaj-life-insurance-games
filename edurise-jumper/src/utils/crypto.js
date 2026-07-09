import CryptoJS from 'crypto-js';

const AES_KEY_B64 = 'TKgxQ/OeHM6XRXslJ/PbMyOCOu24cH7h4CwpyzQ2T3U=';

export function decryptToken(encryptedB64) {
    try {
        const key = CryptoJS.enc.Base64.parse(AES_KEY_B64);
        const decrypted = CryptoJS.AES.decrypt(encryptedB64, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        });

        const text = decrypted.toString(CryptoJS.enc.Utf8);
        if (!text) {
            console.error('[crypto] Decryption resulted in empty string');
            return null;
        }

        return JSON.parse(text);
    } catch (e) {
        console.error('[crypto] Decryption failed', e);
        return null;
    }
}

export function encryptPayload(payload) {
    const key = CryptoJS.enc.Base64.parse(AES_KEY_B64);
    const plainText = JSON.stringify(payload);
    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
}

export function buildShareUrl() {
    if (!sessionStorage.getItem('gamification_rawToken')) return null;

    const payload = {
        game_id: sessionStorage.getItem('gamification_game_id') || '',
        emp_id: sessionStorage.getItem('gamification_emp_id') || '',
        emp_name: sessionStorage.getItem('gamification_emp_name') || '',
        emp_mobile: sessionStorage.getItem('gamification_emp_mobile') || '',
        location: sessionStorage.getItem('gamification_location') || '',
        zone: sessionStorage.getItem('gamification_zone') || '',
        referral: 'Y',
    };

    const newToken = encryptPayload(payload);
    const gameId = payload.game_id;
    const origin = window.location.origin;
    return `${origin}/gamification/${encodeURIComponent(gameId)}?token=${encodeURIComponent(newToken)}`;
}

import CryptoJS from 'crypto-js';

const AES_KEY_B64 = 'TKgxQ/OeHM6XRXslJ/PbMyOCOu24cH7h4CwpyzQ2T3U=';

/**
 * Decrypt an AES-256 ECB Base64-encoded token into a JSON object.
 * @param {string} encryptedB64  Base64 cipher text (URL-decoded)
 * @returns {any}  Parsed payload or null on failure
 */
export function decryptToken(encryptedB64: string): any {
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

/**
 * Encrypt a JSON payload into an AES-256 ECB Base64-encoded string.
 * @param {any} payload  Plain object to encrypt
 * @returns {string}  Base64-encoded cipher text
 */
export function encryptPayload(payload: any): string {
    const key = CryptoJS.enc.Base64.parse(AES_KEY_B64);
    const plainText = JSON.stringify(payload);
    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString(); // Base64 by default
}

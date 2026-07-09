/**
 * URL Shortening Utility
 * Uses Vspagy API to shorten long share URLs.
 */

export async function shortenUrl(longUrl) {
    if (!longUrl) return null;

    try {
        console.log('[Shortener] Shortening URL:', longUrl);
        const response = await fetch('https://vspagy.com/csites/apishortlink/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: JSON.stringify({
                "bid": "30144827887",
                "key": "5g2frpb2t2Cxsu/zjtOcRg==",
                "tid": "LIVE",
                "lid": "LIVE",
                "lurl": longUrl
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.CODE === "1000") {
                console.log('[Shortener] Success:', data.DETAIL);
                return data.DETAIL;
            }
            console.warn('[Shortener] API returned code:', data.CODE);
        }

        console.warn('[Shortener] Failed with status:', response.status);
        return longUrl;
    } catch (error) {
        console.error('[Shortener] Error:', error);
        return longUrl;
    }
}

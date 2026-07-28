const PLAYCOUNT_API_BASE = 'https://newbuyserve.bajajlife.com/balic/api';

/**
 * Increments the play count for the current game exactly once per browser session.
 * Reads gameId from sessionStorage (set by the entry file from URL params / JWT).
 * Uses a sessionStorage guard so a page refresh does not re-trigger the call.
 */
export const incrementPlayCount = async () => {
  const gameId = sessionStorage.getItem('gamification_gameId');
  if (!gameId) return;

  const guardKey = `playcount_incremented_${gameId}`;
  if (sessionStorage.getItem(guardKey) === 'true') return;

  try {
    const res = await fetch(
      `${PLAYCOUNT_API_BASE}/incrementPlayCount/${encodeURIComponent(gameId)}`,
      { method: 'POST', headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      sessionStorage.setItem(guardKey, 'true');
    }
  } catch (e) {
    console.error('[playCount] increment failed:', e);
  }
};

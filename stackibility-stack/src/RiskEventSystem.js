// RiskEventSystem.js – risk event definitions + trigger logic

export const RISK_EVENTS = {
    fire: { icon: '🔥', name: 'Fire!', desc: 'Your home is on fire!', color: '#ef4444' },
    medical: { icon: '🚑', name: 'Medical Emergency!', desc: 'Unexpected health crisis!', color: '#ec4899' },
    accident: { icon: '💥', name: 'Accident!', desc: 'Your car is damaged!', color: '#f97316' },
    disaster: { icon: '🌧️', name: 'Natural Disaster!', desc: 'Storm hits your business!', color: '#6366f1' },
    crash: { icon: '📉', name: 'Market Crash!', desc: 'Your savings took a hit!', color: '#22c55e' },
};

/** Returns a risk event key for the given block, or null if no event triggers. */
export function rollRiskEvent(block, floorCount) {
    // First block never triggers. Higher floors = more frequent.
    if (floorCount < 2) return null;
    const chance = Math.min(0.08 + floorCount * 0.01, 0.35);
    if (Math.random() > chance) return null;

    // Only trigger the event that matches this block type if available
    if (block.riskType && RISK_EVENTS[block.riskType]) return block.riskType;

    // Random fallback event
    const keys = Object.keys(RISK_EVENTS);
    return keys[Math.floor(Math.random() * keys.length)];
}

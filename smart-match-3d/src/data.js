// data.js — Smart Match 3D
// 11 Life-Goal token types rendered as premium layered inline-SVG sprites
// (gradient fills, inner highlights, soft shadows — NO emoji anywhere).
// Each sprite is a glass tile + vector icon, rasterized to an offscreen
// canvas by the game for crisp 60fps drawing.

export const GAME_CONFIG = {
  traySize: 7,          // slots in the bottom tray
  totalTriplets: 20,    // 20 triplets = 60 tokens on the board
  duration: 120,        // hard session cap (seconds)
  matchScore: 100,      // per merged triple
  comboBonus: 25,       // extra per chain step (merge within combo window)
  comboWindow: 3.0,     // seconds to keep a combo alive
  timeBonusPerSec: 10,  // win bonus per second remaining
  trayEffBonus: 50,     // win bonus per tray slot never used at peak
  boosters: { undo: 1, shuffle: 1, magnet: 1 },
};

/* ─── Life-goal palette ──────────────────────────────────────────
   Every goal gets a distinct tile hue so tokens read instantly. */
export const GOALS = [
  { id: 'shield',     label: 'Shield',     line: 'Term cover that guards every goal', hi: '#5B8DEF', lo: '#0F3480', glow: '#7FA8FF' },
  { id: 'savings',    label: 'Savings',    line: 'Grow a disciplined savings pot',    hi: '#F6B93B', lo: '#8A5A05', glow: '#FFD97A' },
  { id: 'home',       label: 'Home',       line: 'A roof your family owns',           hi: '#2BB0A3', lo: '#0B564F', glow: '#6FE3D6' },
  { id: 'car',        label: 'Car',        line: 'Drive the dream, insured',          hi: '#8DA2C0', lo: '#333F55', glow: '#B9C9E0' },
  { id: 'education',  label: 'Education',  line: "Fund your child's education",       hi: '#8A7BF5', lo: '#37298F', glow: '#B4A9FF' },
  { id: 'marriage',   label: 'Marriage',   line: 'A wedding without loans',           hi: '#EF74A8', lo: '#8C2A56', glow: '#FFA6CB' },
  { id: 'child',      label: 'Child',      line: "Secure your child's future",        hi: '#54C6F9', lo: '#0E5A88', glow: '#93DDFF' },
  { id: 'retirement', label: 'Retirement', line: 'Retire on your own terms',          hi: '#CE9057', lo: '#663912', glow: '#E8B584' },
  { id: 'health',     label: 'Health',     line: 'Health cover for the tough days',   hi: '#F05B52', lo: '#851511', glow: '#FF938C' },
  { id: 'rewards',    label: 'Rewards',    line: 'Milestone rewards along the way',   hi: '#AB63EC', lo: '#4C1D86', glow: '#CE9BFF' },
  { id: 'family',     label: 'Family',     line: 'Everything, for them',              hi: '#57BB5B', lo: '#1B5E20', glow: '#8FE293' },
];

export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g]));

/* ─── Icon bodies (viewBox 0 0 96 96, drawn in the middle ~56px) ── */
function iconBody(id) {
  switch (id) {
    case 'shield':
      return `
      <g filter="url(#ds_${id})">
        <path d="M48 17 L73 26 v16.5 c0 15.5-10.8 25.3-25 31.5 -14.2-6.2-25-16-25-31.5 V26 Z" fill="url(#icA_${id})" stroke="rgba(255,255,255,0.65)" stroke-width="1.6"/>
        <path d="M48 21.5 L69 29 v13.4 c0 13-9 21.4-21 27 V21.5 Z" fill="rgba(15,52,128,0.16)"/>
        <path d="M38.5 46.5 l7 7 L61 37.5" fill="none" stroke="#1D4ED8" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M31 25 q17-7 17-7" stroke="rgba(255,255,255,0.9)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      </g>`;
    case 'savings':
      return `
      <g filter="url(#ds_${id})">
        <ellipse cx="48" cy="52" rx="26" ry="24.5" fill="#B97907"/>
        <circle cx="48" cy="48" r="26" fill="url(#icA_${id})" stroke="#8A5A05" stroke-width="1.6"/>
        <circle cx="48" cy="48" r="19.5" fill="none" stroke="rgba(138,90,5,0.55)" stroke-width="2" stroke-dasharray="3.4 3.2"/>
        <path d="M39 37 h18 M39 44.5 h18 M41.5 37 c8.5 0 8.5 11.5 0 11.5 h-2.5 l14 14"
          fill="none" stroke="#7A4A00" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M31 33 a21 21 0 0 1 14-6.5" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M73 27 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6-3.6 -3.6-1.6 3.6-1.6 Z" fill="#FFF3C4"/>
      </g>`;
    case 'home':
      return `
      <g filter="url(#ds_${id})">
        <rect x="60" y="24" width="7" height="12" rx="1.6" fill="#CFE7E4"/>
        <path d="M48 17 L78 44 h-8 v26 a3 3 0 0 1 -3 3 H29 a3 3 0 0 1 -3-3 V44 h-8 Z" fill="url(#icA_${id})"/>
        <path d="M48 17 L78 44 h-8 L48 26 28 44 h-10 Z" fill="#F26522"/>
        <path d="M48 20.5 L74.5 44" stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round"/>
        <rect x="41.5" y="52" width="13" height="21" rx="2.4" fill="#0B564F"/>
        <circle cx="51.5" cy="63" r="1.5" fill="#9FE8DF"/>
        <rect x="31" y="49" width="8.4" height="8.4" rx="1.6" fill="#0B564F" opacity="0.8"/>
        <rect x="56.8" y="49" width="8.4" height="8.4" rx="1.6" fill="#0B564F" opacity="0.8"/>
      </g>`;
    case 'car':
      return `
      <g filter="url(#ds_${id})">
        <path d="M22 52 c1-7 4-12 9-13 l6-7 c1.6-1.8 3.6-2.6 6-2.6 h12 c5 0 8 2.2 10.6 5.4 l4.4 5.2 c5 1.4 7.5 5 8 12 v6 a3.4 3.4 0 0 1 -3.4 3.4 H25.4 A3.4 3.4 0 0 1 22 58 Z" fill="url(#icA_${id})"/>
        <path d="M38.5 34.6 c1-1.3 2.4-2 4.4-2 H55 c3.4 0 5.6 1.4 7.4 3.6 l3.2 4 H35 Z" fill="#BFE3FF" opacity="0.92"/>
        <path d="M53 32.6 v7.6" stroke="#33445E" stroke-width="1.8"/>
        <path d="M24 51 h48" stroke="rgba(255,255,255,0.35)" stroke-width="1.6"/>
        <circle cx="34.5" cy="61" r="7.2" fill="#1B2434"/><circle cx="34.5" cy="61" r="3.4" fill="#AFC3DE"/>
        <circle cx="61.5" cy="61" r="7.2" fill="#1B2434"/><circle cx="61.5" cy="61" r="3.4" fill="#AFC3DE"/>
        <rect x="66.5" y="47" width="6.4" height="4" rx="2" fill="#FFE08A"/>
        <rect x="23" y="47" width="5" height="4" rx="2" fill="#FF9D80"/>
      </g>`;
    case 'education':
      return `
      <g filter="url(#ds_${id})">
        <path d="M48 25 L80 38.5 48 52 16 38.5 Z" fill="url(#icA_${id})" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
        <path d="M48 30 L72 40 48 50 24 40 Z" fill="rgba(20,12,70,0.25)"/>
        <path d="M32 46 v12.5 c0 5 7.2 9 16 9 s16-4 16-9 V46 l-16 7 Z" fill="url(#icB_${id})"/>
        <path d="M76 40 v14" stroke="#FFD25E" stroke-width="3" stroke-linecap="round"/>
        <circle cx="76" cy="57.5" r="3.6" fill="#FFD25E"/>
        <path d="M20 37 L48 26" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round"/>
      </g>`;
    case 'marriage':
      return `
      <g filter="url(#ds_${id})">
        <path d="M40 26 l-4.5 6 4.5 5 4.5-5 Z" fill="url(#icB_${id})" stroke="#FFF" stroke-width="1"/>
        <circle cx="40" cy="52" r="15.5" fill="none" stroke="url(#icA_${id})" stroke-width="6"/>
        <circle cx="57" cy="52" r="15.5" fill="none" stroke="#FFE1AE" stroke-width="6" opacity="0.96"/>
        <circle cx="57" cy="52" r="15.5" fill="none" stroke="rgba(140,42,86,0.35)" stroke-width="1.4"/>
        <path d="M28.5 45 a15.5 15.5 0 0 1 6-6.5" stroke="rgba(255,255,255,0.9)" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <path d="M70 32 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4-3.2 -3.2-1.4 3.2-1.4 Z" fill="#FFF6DE"/>
      </g>`;
    case 'child':
      return `
      <g filter="url(#ds_${id})">
        <path d="M26 30 a22 22 0 0 1 22 22 H26 Z" fill="url(#icA_${id})"/>
        <path d="M29.5 34.5 a17 17 0 0 1 13.5 13.5" stroke="rgba(255,255,255,0.75)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M22 44 h4 v8 h-4 Z" fill="#0E5A88" opacity="0.0"/>
        <path d="M26 52 h44 l-3.2 8.6 a6 6 0 0 1 -5.6 4 H34.8 a6 6 0 0 1 -5.6-4 Z" fill="url(#icB_${id})"/>
        <path d="M70 52 l8-10" stroke="#0E5A88" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="79.5" cy="40.5" r="3.4" fill="#FFD25E"/>
        <circle cx="37" cy="70.5" r="5.6" fill="#123B5C"/><circle cx="37" cy="70.5" r="2.2" fill="#BEE4FF"/>
        <circle cx="60" cy="70.5" r="5.6" fill="#123B5C"/><circle cx="60" cy="70.5" r="2.2" fill="#BEE4FF"/>
      </g>`;
    case 'retirement':
      return `
      <g filter="url(#ds_${id})">
        <path d="M31 26 a5 5 0 0 1 5-5 h2 a5 5 0 0 1 5 5 v22 h-12 Z" fill="url(#icA_${id})" opacity="0"/>
        <path d="M33 24 c0-3 2.4-5 5.4-5 3 0 5.6 2 5.6 5 v24 H33 Z" fill="url(#icA_${id})"/>
        <path d="M33 48 h11 v-4 h14 a6 6 0 0 1 6 6 v10 H33 Z" fill="url(#icB_${id})"/>
        <path d="M27 42 v14 a6 6 0 0 0 6 6 h30 a6 6 0 0 0 6-6 v-8" fill="none" stroke="#5C3411" stroke-width="5" stroke-linecap="round"/>
        <path d="M31 62 v8 M63 62 v8" stroke="#5C3411" stroke-width="4.6" stroke-linecap="round"/>
        <path d="M24 74 q24 9 48 0" fill="none" stroke="#8B5A2B" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M35.5 22.5 c1.4-1.4 4.6-1.4 6 0" stroke="rgba(255,255,255,0.8)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      </g>`;
    case 'health':
      return `
      <g filter="url(#ds_${id})">
        <path d="M48 71 C36 62 24 52.5 24 40.5 24 32.5 30.5 26 38.5 26 c4 0 7.6 1.8 9.5 4.6 C50 27.8 53.5 26 57.5 26 65.5 26 72 32.5 72 40.5 72 52.5 60 62 48 71 Z" fill="url(#icA_${id})" stroke="rgba(255,255,255,0.55)" stroke-width="1.4"/>
        <path d="M30 34 c1.4-2.6 4-4.6 7-5.2" stroke="rgba(255,255,255,0.85)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <path d="M29 47.5 h9.5 l3.6-7 5 13 4.4-9.5 2.6 3.5 H67" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;
    case 'rewards':
      return `
      <g filter="url(#ds_${id})">
        <rect x="26" y="42" width="44" height="31" rx="4" fill="url(#icA_${id})"/>
        <rect x="26" y="42" width="44" height="8" fill="rgba(30,8,60,0.22)"/>
        <rect x="22.5" y="33" width="51" height="11.5" rx="3.4" fill="url(#icB_${id})"/>
        <rect x="43.4" y="33" width="9.2" height="40" fill="#FFD25E"/>
        <rect x="43.4" y="33" width="9.2" height="40" fill="url(#icC_${id})" opacity="0.5"/>
        <path d="M48 32 c-8-1.4-13-5-12.4-8.6 .6-3.4 6-3.8 9.2-1 2 1.8 3.2 5.4 3.2 9.6 Z" fill="#FFC93C" stroke="#B8860B" stroke-width="1.2"/>
        <path d="M48 32 c8-1.4 13-5 12.4-8.6 -.6-3.4-6-3.8-9.2-1 -2 1.8-3.2 5.4-3.2 9.6 Z" fill="#FFC93C" stroke="#B8860B" stroke-width="1.2"/>
        <path d="M25 36 h18" stroke="rgba(255,255,255,0.5)" stroke-width="1.6" stroke-linecap="round"/>
      </g>`;
    case 'family':
      return `
      <g filter="url(#ds_${id})">
        <circle cx="33" cy="33" r="8.4" fill="url(#icA_${id})"/>
        <path d="M20.5 61 c0-8.4 5.4-14 12.5-14 s12.5 5.6 12.5 14 v4 h-25 Z" fill="url(#icA_${id})"/>
        <circle cx="63" cy="33" r="8.4" fill="url(#icB_${id})"/>
        <path d="M50.5 61 c0-8.4 5.4-14 12.5-14 s12.5 5.6 12.5 14 v4 h-25 Z" fill="url(#icB_${id})"/>
        <circle cx="48" cy="52" r="6.6" fill="#FFE3B3" stroke="#1B5E20" stroke-width="1.4"/>
        <path d="M38.5 73.5 c0-6.6 4.2-11 9.5-11 s9.5 4.4 9.5 11 v1.5 h-19 Z" fill="#FFE3B3" stroke="#1B5E20" stroke-width="1.4"/>
        <path d="M28 28.5 a8.4 8.4 0 0 1 6-3.4" stroke="rgba(255,255,255,0.8)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      </g>`;
    default:
      return '';
  }
}

/* Per-icon gradient stops (icA = primary body, icB = secondary, icC = sheen) */
function iconDefs(id) {
  const G = {
    shield:     { a: ['#FFFFFF', '#CFE0FF'], b: ['#FFD25E', '#E8A317'] },
    savings:    { a: ['#FFE9A8', '#F0A500'], b: ['#FFF6D8', '#FFD97A'] },
    home:       { a: ['#FDF6EC', '#E8D9C3'], b: ['#F26522', '#C24608'] },
    car:        { a: ['#FF8A5C', '#D64541'], b: ['#BFE3FF', '#7FB3DC'] },
    education:  { a: ['#3E3480', '#221A52'], b: ['#5B4FC0', '#2F2578'] },
    marriage:   { a: ['#FFE9F3', '#F3B8D4'], b: ['#CFF3FF', '#8FD8F3'] },
    child:      { a: ['#FFFFFF', '#CDEBFF'], b: ['#FF9D5C', '#E8672B'] },
    retirement: { a: ['#FFE9C9', '#F3C888'], b: ['#A9672B', '#7C4514'] },
    health:     { a: ['#FF8B84', '#D6221B'], b: ['#FFFFFF', '#FFD9D6'] },
    rewards:    { a: ['#7C3AED', '#4C1D86'], b: ['#A45BE8', '#6D28C9'] },
    family:     { a: ['#FFFFFF', '#CDEBCE'], b: ['#FFD25E', '#E8A317'] },
  }[id] || { a: ['#FFFFFF', '#DDDDDD'], b: ['#FFD25E', '#E8A317'] };
  return `
    <linearGradient id="icA_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${G.a[0]}"/><stop offset="1" stop-color="${G.a[1]}"/>
    </linearGradient>
    <linearGradient id="icB_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${G.b[0]}"/><stop offset="1" stop-color="${G.b[1]}"/>
    </linearGradient>
    <linearGradient id="icC_${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(255,255,255,0.7)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="ds_${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" flood-color="rgba(0,0,0,0.38)"/>
    </filter>`;
}

/* ─── Full token sprite: premium glass tile + layered icon ──────── */
export function tokenSpriteSvg(goal) {
  const id = goal.id;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
  <defs>
    <linearGradient id="tile_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${goal.hi}"/>
      <stop offset="1" stop-color="${goal.lo}"/>
    </linearGradient>
    <linearGradient id="gloss_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.55)"/>
      <stop offset="0.55" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <radialGradient id="halo_${id}" cx="0.5" cy="0.32" r="0.75">
      <stop offset="0" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    ${iconDefs(id)}
  </defs>
  <rect x="7" y="10" width="82" height="82" rx="21" fill="rgba(0,6,20,0.4)"/>
  <rect x="6" y="6" width="84" height="84" rx="21" fill="url(#tile_${id})"/>
  <rect x="6" y="6" width="84" height="84" rx="21" fill="url(#halo_${id})"/>
  <rect x="8" y="8" width="80" height="80" rx="19" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="1.8"/>
  <rect x="10" y="10" width="76" height="38" rx="16" fill="url(#gloss_${id})"/>
  ${iconBody(id)}
  <rect x="6" y="6" width="84" height="84" rx="21" fill="none" stroke="rgba(0,10,30,0.35)" stroke-width="1"/>
</svg>`;
}

export function tokenDataUri(goal) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tokenSpriteSvg(goal))}`;
}

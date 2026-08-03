// Screens.jsx — Home, How to Play and Results screens for Slide to Safety.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { perfectScore } from './data.js';
import { LEVELS, TOTAL_PAR } from './levels.js';

const GAME_TITLE = 'Slide to Safety';
const TAGLINE = 'Hold to aim the slide. Let go and it is committed.';
const PERFECT_SCORE = perfectScore(LEVELS);
const TOTAL_COINS = LEVELS.reduce((a, lv) => a + lv.coins.length, 0);
const TOTAL_COVERS = LEVELS.reduce((a, lv) => a + lv.covers.length, 0);

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const ICE = '#CFE4F7';
const ICE_LT = '#F2F9FF';
const ICE_DEEP = '#9BC1E4';
const CRACK = '#E0785A';
const COVER = '#8FC2FF';
const COVER_LT = '#CFE9FF';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TrophyIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9 5h14v5a7 7 0 0 1-14 0V5z" fill="#fff" />
      <path d="M5 7h4v3a3 3 0 0 1-3-3z" fill="#fff" opacity="0.85" />
      <path d="M27 7h-4v3a3 3 0 0 0 3-3z" fill="#fff" opacity="0.85" />
      <rect x="13" y="16" width="6" height="6" fill="#fff" opacity="0.92" />
      <rect x="9" y="22" width="14" height="4" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** Run-ended mark: a route that stopped short of the shore. */
function ShortfallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 26h22" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
      <path d="M6 22 6 12l8 0 0-6" stroke="#fff" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8l7 7M27 8l-7 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function PhoneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HomeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes ssTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes ssFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ssGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes ssChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes ssHeroSlide {
  0%      { transform: translate(24px, 132px); }
  8%      { transform: translate(24px, 132px); }
  24%     { transform: translate(24px, 36px); }
  34%     { transform: translate(24px, 36px); }
  50%     { transform: translate(120px, 36px); }
  60%     { transform: translate(120px, 36px); }
  76%,100%{ transform: translate(120px, 108px); }
}
@keyframes ssHeroTrail { 0% { stroke-dashoffset: 300; } 60%,100% { stroke-dashoffset: 0; } }
@keyframes ssGust { 0% { opacity: 0.25; transform: translateX(-6px); } 50% { opacity: 0.9; } 100% { opacity: 0.25; transform: translateX(6px); } }
/* How-to-play loop (5.6 s), one cell = 26px. Three legs, and each leg is played
   as the game plays it: the thumb goes DOWN and a dashed preview draws itself to
   the cell the slide will stop in, the thumb LIFTS, and only then does the shield
   move. Leg 1 runs east into the rock, sweeping a coin. Leg 2 runs north onto the
   cover point, which catches it and re-freezes the thin ice. Leg 3 finishes on
   the family tile. */
@keyframes stsTok  { 0%,20% { transform: translate(0,0); } 30%,50% { transform: translate(78px,0); } 58%,70% { transform: translate(78px,-52px); } 78%,100% { transform: translate(78px,-78px); } }
@keyframes stsP1   { 0% { opacity: 0; stroke-dashoffset: 78; } 5% { opacity: 1; } 14%,20% { opacity: 1; stroke-dashoffset: 0; } 24%,100% { opacity: 0; stroke-dashoffset: 0; } }
@keyframes stsP2   { 0%,30% { opacity: 0; stroke-dashoffset: 52; } 35% { opacity: 1; } 44%,50% { opacity: 1; stroke-dashoffset: 0; } 54%,100% { opacity: 0; stroke-dashoffset: 0; } }
@keyframes stsP3   { 0%,58% { opacity: 0; stroke-dashoffset: 26; } 62% { opacity: 1; } 68%,70% { opacity: 1; stroke-dashoffset: 0; } 74%,100% { opacity: 0; stroke-dashoffset: 0; } }
@keyframes stsR1   { 0%,4% { opacity: 0; transform: scale(0.6); } 10%,20% { opacity: 1; transform: scale(1); } 24%,100% { opacity: 0; transform: scale(1); } }
@keyframes stsR2   { 0%,34% { opacity: 0; transform: scale(0.6); } 40%,50% { opacity: 1; transform: scale(1); } 54%,100% { opacity: 0; transform: scale(1); } }
@keyframes stsR3   { 0%,62% { opacity: 0; transform: scale(0.6); } 66%,70% { opacity: 1; transform: scale(1); } 74%,100% { opacity: 0; transform: scale(1); } }
@keyframes stsHand { 0% { opacity: 0; transform: translate(0,26px); } 5% { opacity: 1; transform: translate(0,16px); } 15%,20% { opacity: 1; transform: translate(52px,16px); } 24%,32% { opacity: 0; transform: translate(78px,16px); } 36% { opacity: 1; transform: translate(78px,16px); } 45%,50% { opacity: 1; transform: translate(78px,-26px); } 54%,60% { opacity: 0; transform: translate(78px,-38px); } 63% { opacity: 1; transform: translate(78px,-38px); } 68%,70% { opacity: 1; transform: translate(78px,-54px); } 74%,100% { opacity: 0; transform: translate(78px,-54px); } }
@keyframes stsCoin { 0%,24% { opacity: 1; transform: translate(0,0) scale(1); } 28% { opacity: 1; transform: translate(0,-10px) scale(1.3); } 36%,100% { opacity: 0; transform: translate(0,-24px) scale(0.6); } }
@keyframes stsCrack{ 0%,20% { opacity: 1; } 30%,55% { opacity: 0.42; } 62%,100% { opacity: 1; } }
@keyframes stsClaim{ 0%,58% { opacity: 0; } 64%,100% { opacity: 1; } }
@keyframes stsBank { 0%,56% { opacity: 0; transform: scale(0.4); } 62% { opacity: 1; transform: scale(1); } 74%,100% { opacity: 0; transform: scale(1.9); } }
.ss-title { animation: ssTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-float { animation: ssFloat 4s ease-in-out infinite; }
.ss-glow  { animation: ssGlow 2.2s ease-in-out infinite; }
.ss-chip  { animation: ssChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-hero-slide { animation: ssHeroSlide 5s cubic-bezier(0.3,0,0.2,1) infinite; }
.ss-hero-trail { animation: ssHeroTrail 5s cubic-bezier(0.3,0,0.2,1) infinite; }
.ss-gust  { animation: ssGust 1.8s ease-in-out infinite; }
.sts-tok   { animation: stsTok 5.6s cubic-bezier(0.3,0,0.12,1) infinite; }
.sts-p1    { animation: stsP1 5.6s linear infinite; }
.sts-p2    { animation: stsP2 5.6s linear infinite; }
.sts-p3    { animation: stsP3 5.6s linear infinite; }
.sts-r1    { animation: stsR1 5.6s ease-out infinite; }
.sts-r2    { animation: stsR2 5.6s ease-out infinite; }
.sts-r3    { animation: stsR3 5.6s ease-out infinite; }
.sts-hand  { animation: stsHand 5.6s cubic-bezier(0.3,0,0.3,1) infinite; }
.sts-coin  { animation: stsCoin 5.6s ease-out infinite; }
.sts-crack { animation: stsCrack 5.6s ease-in-out infinite; }
.sts-claim { animation: stsClaim 5.6s ease-out infinite; }
.sts-bank  { animation: stsBank 5.6s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-title, .ss-float, .ss-glow, .ss-chip, .ss-hero-slide, .ss-hero-trail,
  .ss-gust, .sts-tok, .sts-p1, .sts-p2, .sts-p3, .sts-r1, .sts-r2, .sts-r3,
  .sts-hand, .sts-coin, .sts-crack, .sts-claim, .sts-bank { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, ICE];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        return (
          <div
            key={i}
            className="confetti"
            style={{
              position: 'absolute',
              left: `${left}%`,
              background: colors[i % colors.length],
              '--dur': `${dur}s`,
              '--delay': `${delay}s`,
              top: -20,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Shared SVG pieces ─────────────────────────────────── */
function ShieldToken({ s = 12 }) {
  return (
    <g>
      <path
        d={`M0 ${-s} L${s * 0.88} ${-s * 0.48} L${s * 0.88} ${s * 0.18}
            Q${s * 0.7} ${s * 0.92} 0 ${s * 1.08}
            Q${-s * 0.7} ${s * 0.92} ${-s * 0.88} ${s * 0.18}
            L${-s * 0.88} ${-s * 0.48} Z`}
        fill={BLUE_LT}
        stroke="#A6D0FF"
        strokeWidth={s * 0.12}
      />
      <path
        d={`M${-s * 0.34} 0 L${-s * 0.05} ${s * 0.3} L${s * 0.4} ${-s * 0.34}`}
        fill="none"
        stroke="#fff"
        strokeWidth={s * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function IceGrid({ cols, rows, cell, x = 0, y = 0, opacity = 1 }) {
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push(
        <rect
          key={`${c}-${r}`}
          x={x + c * cell + 1}
          y={y + r * cell + 1}
          width={cell - 2}
          height={cell - 2}
          rx={cell * 0.18}
          fill={(c + r) % 2 ? ICE : ICE_LT}
          opacity={opacity}
        />,
      );
    }
  }
  return <g>{tiles}</g>;
}

function FamilyTile({ cell, x, y }) {
  const s = cell * 0.42;
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} rx={cell * 0.18}
        fill="rgba(40,167,69,0.24)" stroke={GREEN_LT} strokeWidth="1.4" />
      <path d={`M${cx} ${cy - s * 0.86} L${cx + s * 0.8} ${cy - s * 0.1} L${cx - s * 0.8} ${cy - s * 0.1} Z`} fill={GREEN} />
      <rect x={cx - s * 0.6} y={cy - s * 0.1} width={s * 1.2} height={s * 0.86} rx={s * 0.12} fill={ICE_LT} />
      <circle cx={cx - s * 0.28} cy={cy + s * 0.16} r={s * 0.15} fill={BLUE} />
      <circle cx={cx + s * 0.04} cy={cy + s * 0.14} r={s * 0.17} fill={BLUE_LT} />
      <circle cx={cx + s * 0.34} cy={cy + s * 0.22} r={s * 0.12} fill={ORANGE} />
    </g>
  );
}

function RockTile({ cell, x, y }) {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const r = cell * 0.34;
  return (
    <g>
      <path
        d={`M${cx - r} ${cy + r * 0.6} L${cx - r * 0.75} ${cy - r * 0.3} L${cx - r * 0.15} ${cy - r * 0.9}
            L${cx + r * 0.55} ${cy - r * 0.65} L${cx + r} ${cy + r * 0.1} L${cx + r * 0.65} ${cy + r * 0.7} Z`}
        fill="#3C516C"
        stroke="#1C2A3D"
        strokeWidth="1"
      />
      <path
        d={`M${cx - r * 0.15} ${cy - r * 0.9} L${cx + r * 0.55} ${cy - r * 0.65} L${cx + r * 0.1} ${cy - r * 0.2}
            L${cx - r * 0.6} ${cy - r * 0.3} Z`}
        fill="#6A83A2"
        opacity="0.7"
      />
    </g>
  );
}

/** The cover point: an umbrella over a shield, on a raised blue floe. */
function CoverTile({ cell, x, y, claimed = false, claimClass }) {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const R = cell * 0.42;
  const uw = R * 0.82;
  const sr = R * 0.4;
  return (
    <g>
      <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} rx={cell * 0.2}
        fill="#78B2F8" stroke={COVER_LT} strokeWidth="1.6" />
      <path
        d={`M${cx - uw} ${cy - R * 0.06}
            Q${cx - uw * 0.62} ${cy - R * 0.28} ${cx - uw * 0.34} ${cy - R * 0.06}
            Q${cx} ${cy - R * 0.3} ${cx + uw * 0.34} ${cy - R * 0.06}
            Q${cx + uw * 0.62} ${cy - R * 0.28} ${cx + uw} ${cy - R * 0.06}
            Q${cx + uw * 0.6} ${cy - R * 0.9} ${cx} ${cy - R * 0.94}
            Q${cx - uw * 0.6} ${cy - R * 0.9} ${cx - uw} ${cy - R * 0.06} Z`}
        fill={BLUE}
      />
      <path d={`M${cx} ${cy - R * 0.9} L${cx} ${cy + R * 0.2}`} stroke="#fff"
        strokeWidth={cell * 0.035} strokeLinecap="round" />
      <path
        d={`M${cx} ${cy + R * 0.16} L${cx + sr * 0.85} ${cy + R * 0.16 + sr * 0.3}
            Q${cx + sr * 0.7} ${cy + R * 0.16 + sr * 1.25} ${cx} ${cy + R * 0.16 + sr * 1.45}
            Q${cx - sr * 0.7} ${cy + R * 0.16 + sr * 1.25} ${cx - sr * 0.85} ${cy + R * 0.16 + sr * 0.3} Z`}
        fill="#fff"
      />
      {/* With a claimClass the CSS keyframes own the tick's opacity; without one
          it is simply on or off. Never left undefined, or an unclaimed tile
          would render as claimed. */}
      <g className={claimClass} opacity={claimClass ? undefined : (claimed ? 1 : 0)}>
        <path
          d={`M${cx - sr * 0.34} ${cy + R * 0.16 + sr * 0.72}
              L${cx - sr * 0.06} ${cy + R * 0.16 + sr * 0.98}
              L${cx + sr * 0.4} ${cy + R * 0.16 + sr * 0.42}`}
          fill="none" stroke={BLUE} strokeWidth={sr * 0.3} strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

function CrackTile({ cell, x, y, className }) {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const arms = [0, 1.1, 2.2, 3.4, 4.5, 5.6];
  return (
    <g className={className}>
      <rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} rx={cell * 0.18}
        fill="rgba(224,120,90,0.24)" />
      {arms.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(a) * cell * 0.34}
          y2={cy + Math.sin(a) * cell * 0.34}
          stroke={CRACK}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: a miniature of the real board — an ice field, a rock that stops
 * the glide, thin ice, a gust lane and the family tile — with the shield token
 * taking three legs of a route. The same construction the canvas uses, so the
 * screen previews the game rather than illustrating it.
 */
const HERO_CELL = 24;

function HeroBoard() {
  return (
    <g>
      <IceGrid cols={7} rows={7} cell={HERO_CELL} x={0} y={12} />
      <RockTile cell={HERO_CELL} x={0} y={12} />
      <RockTile cell={HERO_CELL} x={HERO_CELL * 5} y={12 + HERO_CELL * 4} />
      <CrackTile cell={HERO_CELL} x={HERO_CELL * 3} y={12 + HERO_CELL} />
      <CoverTile cell={HERO_CELL} x={HERO_CELL * 5} y={12 + HERO_CELL} claimed />
      <FamilyTile cell={HERO_CELL} x={HERO_CELL * 5} y={12 + HERO_CELL * 5} />
      <g className="ss-gust">
        {[2, 3, 4].map((r) => (
          <g key={r}>
            <rect x={HERO_CELL * 1 + 1} y={12 + r * HERO_CELL + 1} width={HERO_CELL - 2}
              height={HERO_CELL - 2} rx={HERO_CELL * 0.18} fill="rgba(166,208,255,0.5)" />
            <path
              d={`M${HERO_CELL * 1.3} ${12 + r * HERO_CELL + HERO_CELL * 0.32}
                  L${HERO_CELL * 1.7} ${12 + r * HERO_CELL + HERO_CELL * 0.5}
                  L${HERO_CELL * 1.3} ${12 + r * HERO_CELL + HERO_CELL * 0.68}`}
              fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            />
          </g>
        ))}
      </g>
      <path
        className="ss-hero-trail"
        d={`M${HERO_CELL} ${12 + HERO_CELL * 5.5} L${HERO_CELL} ${12 + HERO_CELL * 1.5}
            L${HERO_CELL * 5} ${12 + HERO_CELL * 1.5} L${HERO_CELL * 5} ${12 + HERO_CELL * 4.5}`}
        fill="none"
        stroke={ORANGE_LT}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="300"
        opacity="0.75"
      />
      <g className="ss-hero-slide">
        <ShieldToken s={9} />
      </g>
    </g>
  );
}

function FeatureChip({ tint, title, note }) {
  return (
    <div className="ss-chip" style={{
      flex: 1, minWidth: 0, padding: '9px 8px', borderRadius: 14,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 900, color: tint, textTransform: 'uppercase',
        letterSpacing: '0.04em', lineHeight: 1.15,
      }}>{title}</div>
      <div style={{
        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
        marginTop: 4, lineHeight: 1.25,
      }}>{note}</div>
    </div>
  );
}

export function HomeScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '44px 24px 48px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="ss-title" style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 9px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.55)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 800,
          color: ORANGE_LT,
          letterSpacing: '0.02em',
          margin: 0,
          maxWidth: 310,
          lineHeight: 1.45,
        }}>
          {TAGLINE}
        </p>
      </div>

      <div className="ss-float" style={{ position: 'relative', width: 276, height: 254, zIndex: 1 }}>
        <svg width="276" height="254" viewBox="-8 0 184 192" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <radialGradient id="ssWell" cx="0.5" cy="0.5" r="0.7">
              <stop offset="0%" stopColor="rgba(38,102,196,0.4)" />
              <stop offset="100%" stopColor="rgba(38,102,196,0)" />
            </radialGradient>
          </defs>
          <g className="ss-glow">
            <ellipse cx="84" cy="98" rx="104" ry="96" fill="url(#ssWell)" />
          </g>
          <HeroBoard />
        </svg>
      </div>

      {/* Three things the run is about, per the design system's start screen. */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 330, zIndex: 2 }}>
        <FeatureChip tint={ORANGE_LT} title="Hold to aim" note="See the route before you commit" />
        <FeatureChip tint={COVER} title="Reach cover" note={`${TOTAL_COVERS} safe points bank the board`} />
        <FeatureChip tint={GREEN_LT} title="Get them home" note={`${LEVELS.length} boards, 120 seconds`} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}
      >
        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%',
            maxWidth: 320,
            height: 60,
            border: 'none',
            borderRadius: 14,
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
            boxShadow: '0 6px 22px rgba(242,101,34,0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <PlayIcon size={20} />
          <span>Start Game</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ────────────────────────────────────────── */
/** A premium coin, same gold token the board drops. */
function CoinToken({ r = 8 }) {
  return (
    <g>
      <circle cx="0" cy="0" r={r} fill={GOLD} stroke='#B07B12' strokeWidth={r * 0.2} />
      <circle cx="0" cy="0" r={r * 0.58} fill="none" stroke={GOLD_LT} strokeWidth={r * 0.16} />
      <ellipse cx={-r * 0.3} cy={-r * 0.36} rx={r * 0.26} ry={r * 0.14} fill="rgba(255,255,255,0.6)"
        transform={`rotate(-24 ${-r * 0.3} ${-r * 0.36})`} />
    </g>
  );
}

/** A four-finger swipe hand; the leading fingertip sits on the local origin. */
function SwipeHand({ scale = 1 }) {
  return (
    <g transform={`scale(${scale}) translate(-9,-2)`} fill="rgba(11,18,33,0.55)"
      stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V3a2 2 0 0 0-4 0v11" />
      <path d="M6 14v-2.5a2 2 0 0 0-4 0V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
    </g>
  );
}

/** Icon-led cue under the demo. Label must stay ≤ 4 words. */
function Cue({ label, tint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
      }}>
        {children}
      </div>
      <span style={{
        fontSize: 8.5, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase',
        color: tint, lineHeight: 1.15, textAlign: 'center',
      }}>{label}</span>
    </div>
  );
}

/**
 * One 5.6 s loop of the real control scheme, built from the board's own tiles.
 *
 * Each leg is played the way the game plays it, and that order is the lesson:
 * the thumb goes DOWN and a dashed preview draws itself to the exact cell the
 * slide will stop in, the thumb LIFTS, and only then does the shield move.
 * Nothing is committed while the hand is on the glass.
 *
 * Leg 1 runs east into the rock, sweeping a coin. Leg 2 runs north onto the
 * cover point, which catches the shield and re-freezes the thin ice behind it.
 * Leg 3 finishes on the family tile.
 *
 * CSS transforms only ever touch <g> elements with no transform attribute.
 */
const TUT_CELL = 26;
const TUT_X0 = 72;
const TUT_Y0 = 26;
const tutC = (col, row) => [TUT_X0 + col * TUT_CELL + TUT_CELL / 2, TUT_Y0 + row * TUT_CELL + TUT_CELL / 2];

function StopRing({ x, y, color, className }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <rect x={-11} y={-11} width={22} height={22} rx={5} fill="none" stroke={color} strokeWidth="2.4" />
      </g>
    </g>
  );
}

function BoardDemo() {
  const [sx, sy] = tutC(0, 3);
  const [coinX, coinY] = tutC(2, 3);
  const [stopX, stopY] = tutC(3, 3);
  const [coverX, coverY] = tutC(3, 1);
  const [homeX, homeY] = tutC(3, 0);
  const dash = { fill: 'none', stroke: ORANGE_LT, strokeWidth: 2.6, strokeLinecap: 'round' };
  return (
    <div style={{
      position: 'relative', width: '100%', height: 152,
      background: 'rgba(6,18,41,0.6)', borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 14,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 300 152" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <IceGrid cols={6} rows={4} cell={TUT_CELL} x={TUT_X0} y={TUT_Y0} />
        <CrackTile cell={TUT_CELL} x={TUT_X0 + TUT_CELL * 2} y={TUT_Y0 + TUT_CELL} className="sts-crack" />
        <RockTile cell={TUT_CELL} x={TUT_X0 + TUT_CELL * 4} y={TUT_Y0 + TUT_CELL * 3} />
        <FamilyTile cell={TUT_CELL} x={TUT_X0 + TUT_CELL * 3} y={TUT_Y0} />
        <CoverTile cell={TUT_CELL} x={TUT_X0 + TUT_CELL * 3} y={TUT_Y0 + TUT_CELL} claimClass="sts-claim" />

        {/* The three previews — drawn while the thumb is still down */}
        <path className="sts-p1" d={`M${sx} ${sy} H${stopX}`} {...dash} strokeDasharray="78" />
        <path className="sts-p2" d={`M${stopX} ${stopY} V${coverY}`} {...dash} strokeDasharray="52" />
        <path className="sts-p3" d={`M${coverX} ${coverY} V${homeY}`} {...dash} strokeDasharray="26" />

        <StopRing x={stopX} y={stopY} color={ORANGE_LT} className="sts-r1" />
        <StopRing x={coverX} y={coverY} color={COVER} className="sts-r2" />
        <StopRing x={homeX} y={homeY} color={GREEN_LT} className="sts-r3" />

        {/* Premium coin swept up en route */}
        <g transform={`translate(${coinX} ${coinY})`}>
          <g className="sts-coin"><CoinToken r={8} /></g>
        </g>

        {/* Cover point banking the board */}
        <g transform={`translate(${coverX} ${coverY})`}>
          <g className="sts-bank">
            <circle cx="0" cy="0" r="15" fill="none" stroke={COVER_LT} strokeWidth="2.4" />
          </g>
        </g>

        {/* The shield token */}
        <g transform={`translate(${sx} ${sy})`}>
          <g className="sts-tok"><ShieldToken s={9} /></g>
        </g>

        {/* The real input */}
        <g transform={`translate(${sx} ${sy})`}>
          <g className="sts-hand"><SwipeHand scale={1.15} /></g>
        </g>
      </svg>
    </div>
  );
}

function StatePill({ label, bg, ink }) {
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '5px 8px', borderRadius: 7, background: bg, color: ink, lineHeight: 1, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function Caret() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)"
      strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const C = 18;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: SCREEN_BG,
        overflowY: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '24px 18px 20px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 25, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 6px 0', color: '#fff',
        }}>
          How to Play
        </h2>
        <BoardDemo />

        {/* The commitment point, spelled out — the same three states the route
            dock shows during play. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 5, marginBottom: 7,
        }}>
          <StatePill label="Ready" bg="rgba(255,255,255,0.10)" ink="rgba(255,255,255,0.75)" />
          <Caret />
          <StatePill label="Aiming" bg="rgba(255,138,61,0.22)" ink={ORANGE_LT} />
          <Caret />
          <StatePill label="Committed" bg={ORANGE_LT} ink="#1A0B02" />
        </div>
        <p style={{
          fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)',
          margin: '0 0 14px', lineHeight: 1.35,
        }}>
          Your input still counts until you let go. After that the slide is out of your hands.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginBottom: 14 }}>
          <Cue label="Hold to aim" tint={ORANGE_LT}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <g transform="translate(13,5)"><SwipeHand scale={0.68} /></g>
              <path d="M4 25 H25" stroke={ORANGE_LT} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
              <rect x="21" y="21" width="8" height="8" rx="2" fill="none" stroke={ORANGE_LT} strokeWidth="2" />
            </svg>
          </Cue>
          <Cue label="Release to commit" tint="#fff">
            <svg width="30" height="30" viewBox="0 0 30 30">
              <g transform="translate(11,2)"><SwipeHand scale={0.6} /></g>
              <path d="M6 26 H24" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M20 22 L24 26 L20 30" fill="none" stroke="#fff" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Cue>
          <Cue label="Thin ice breaks" tint={CRACK}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <CrackTile cell={C + 6} x={3} y={3} />
            </svg>
          </Cue>
          <Cue label="Cover banks it" tint={COVER}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <CoverTile cell={C + 8} x={2} y={2} claimed />
            </svg>
          </Cue>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${BLUE_LT} 0%, ${BLUE} 100%)`,
              boxShadow: '0 4px 16px rgba(0,61,166,0.45)',
              cursor: 'pointer',
            }}
          >
            Play Game
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Results ────────────────────────────────────────────── */
function StatTile({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '10px 6px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const levels = stats?.levels || 0;
  const coins = stats?.coins || 0;
  const covers = stats?.covers || 0;
  const moves = stats?.moves || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return undefined;
    }
    const stepTime = 16;
    const increment = end / (1200 / stepTime);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [score]);

  async function handleShare() {
    const rawShareUrl = buildShareUrl() || window.location.href;
    const shareUrl = await shortenUrl(rawShareUrl);
    const shareMessage = `Hi,\nI slid my shield across ${levels} of ${LEVELS.length} frozen boards for ${score} points in the ${GAME_TITLE} challenge.\nThin ice is everywhere - the right cover is what gets your family home. Take your run here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: GAME_TITLE, text: shareMessage });
      } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareMessage);
        alert('Score and link copied to clipboard!');
      } catch { /* ignore */ }
    }
  }

  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(score, PERFECT_SCORE) / PERFECT_SCORE) * circumference;
  const weak = score < PERFECT_SCORE * 0.35;
  const strokeColor = won ? GREEN : weak ? DANGER : GOLD;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : weak ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '34px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <TrophyIcon size={20} /> : <ShortfallIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Everyone home' : 'Stopped short'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your route.</span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, zIndex: 2 }}>
        <div style={{ width: 162, height: 162, position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              SCORE
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              perfect {PERFECT_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, levels, coins, covers, moves} contract */}
      <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Boards" value={`${levels}/${LEVELS.length}`} accent={GREEN_LT} />
        <StatTile label="Cover pts" value={`${covers}/${TOTAL_COVERS}`} accent={COVER} />
        <StatTile label="Coins" value={`${coins}/${TOTAL_COINS}`} accent={GOLD} />
        <StatTile label="Moves" value={`${moves}`} accent={BLUE_LT} />
      </div>

      <div style={{
        width: '100%', maxWidth: 360, marginBottom: 14, textAlign: 'center',
        fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', zIndex: 2,
      }}>
        A perfect run clears all {LEVELS.length} boards in {TOTAL_PAR} moves,
        reaching every one of the {TOTAL_COVERS} cover points.
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_LT, color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(30,107,224,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 18, zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Lead / booking card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.05)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 22, padding: '18px 16px',
        border: '1px solid rgba(255,255,255,0.12)',
        textAlign: 'center', marginBottom: 16, zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: '0 0 16px 0' }}>
          On the lake, cover means a fall costs you a retry instead of the whole board.
          Real life has thin ice you cannot see either — a specialist can map the cover that gets your family home.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
                color: '#fff', fontWeight: 900, padding: '15px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(242,101,34,0.35)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
            </button>
          </motion.div>

          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 900,
                padding: '14px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 16, textDecoration: 'none', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
            </a>
          )}
        </div>
      </div>

      {/* Retry / Home */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360, marginBottom: 16, zIndex: 2 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 2, height: 48, borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
        <button
          onClick={onHome}
          style={{
            flex: 1, height: 48, borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}

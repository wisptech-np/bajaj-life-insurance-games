// Screens.jsx — Home, How to Play, and Results screens for Goal Orbit.
//
// All art on these screens is inline SVG animated with CSS keyframes: no image
// files, no emoji, no canvas. The hero and the three tutorial beats are built
// from the same primitives the game draws (gravity well, orbit ring, planet
// body, comet head + tail, virus asteroid), so the screens preview the game
// rather than illustrate it.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, MILESTONE_LIST, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Goal Orbit';
const GAME_TAGLINE = 'Stay on track. Orbit every life goal.';
const HOW_TO_LINE = 'Tap to leave orbit · Time your transfer · Dodge the virus asteroids';
const FONT = "'Poppins', system-ui, sans-serif";

const SCREEN_BG =
  'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.5), rgba(11,18,33,0.97) 72%), #0B1221';

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

/** Run-ended mark: the virus asteroid that knocked you off the chain. */
function RiskIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="8" fill="#fff" />
      <circle cx="16" cy="16" r="3.6" fill="rgba(11,18,33,0.6)" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M16 5v3.5M16 23.5V27M5 16h3.5M23.5 16H27" />
        <path d="M8.2 8.2l2.5 2.5M21.3 21.3l2.5 2.5M23.8 8.2l-2.5 2.5M10.7 21.3l-2.5 2.5" />
      </g>
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

/* ─── Shared keyframes ───────────────────────────────────────
   Rotations use `transform-origin` in user units with an explicit
   `transform-box: view-box`, so the pivot is the planet centre in the
   viewBox rather than the group's own bounding box. */
const SCREEN_CSS = `
@keyframes goTitleIn { from { opacity: 0; letter-spacing: 0.26em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes goFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes goWell    { 0%,100% { opacity: 0.42; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.06); } }
@keyframes goSpin    { to { transform: rotate(360deg); } }
@keyframes goSpinRev { to { transform: rotate(-360deg); } }
@keyframes goDash    { to { stroke-dashoffset: -72; } }
@keyframes goTwinkle { 0%,100% { opacity: 0.22; } 50% { opacity: 1; } }
@keyframes goDrift   { 0%,100% { transform: translate(-14px, 8px); } 50% { transform: translate(14px, -8px); } }
@keyframes goChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes goCoinPop { 0%,100% { opacity: 0.35; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.15); } }

/* Beat 1 — tap to release tangentially. */
@keyframes goB1Ping  { 0%,16% { opacity: 0; transform: scale(0.45); } 26% { opacity: 1; transform: scale(1); } 46%,100% { opacity: 0; transform: scale(1.75); } }
@keyframes goB1Fly   { 0%,26% { transform: translate(0,0); opacity: 1; } 72% { transform: translate(36px,-24px); opacity: 1; } 88%,100% { transform: translate(54px,-36px); opacity: 0; } }
/* Beat 2 — the transfer arc into the next ring. */
@keyframes goB2Fly   { 0% { transform: translate(0,0); opacity: 0; } 12% { opacity: 1; } 52% { transform: translate(23px,-15px); } 88% { transform: translate(45px,-31px); opacity: 1; } 100% { transform: translate(45px,-31px); opacity: 0; } }
@keyframes goB2Lock  { 0%,74% { opacity: 0; transform: scale(1.5); } 88% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1); } }
/* Beat 3 — the rock sweeps across the line; you leave a beat later. */
@keyframes goB3Rock  { 0%,100% { transform: translate(0,-15px); } 50% { transform: translate(0,15px); } }
@keyframes goB3Fly   { 0%,14% { transform: translate(0,0); opacity: 0; } 22% { opacity: 1; } 92% { transform: translate(50px,-30px); opacity: 1; } 100% { transform: translate(50px,-30px); opacity: 0; } }

.go-title { animation: goTitleIn 720ms cubic-bezier(0.22,1,0.36,1) both; }
.go-float { animation: goFloat 5s ease-in-out infinite; }
.go-well  { animation: goWell 2.6s ease-in-out infinite; transform-box: view-box; }
.go-dash  { animation: goDash 2.6s linear infinite; }
.go-chip  { animation: goChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.go-drift { animation: goDrift 3.6s ease-in-out infinite; }
.go-coin  { animation: goCoinPop 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

.go-orbit-a { animation: goSpin 6s linear infinite; transform-box: view-box; transform-origin: 62px 120px; }
.go-ring-a  { animation: goSpin 22s linear infinite; transform-box: view-box; transform-origin: 62px 120px; }
.go-ring-b  { animation: goSpinRev 18s linear infinite; transform-box: view-box; transform-origin: 143px 62px; }

.go-b1-ping { animation: goB1Ping 3s ease-out infinite; transform-box: view-box; transform-origin: 20px 44px; }
.go-b1-ring { animation: goSpin 5s linear infinite; transform-box: view-box; transform-origin: 20px 44px; }
.go-b1-fly  { animation: goB1Fly 3s cubic-bezier(0.3,0,0.7,1) infinite; }
.go-b2-fly  { animation: goB2Fly 3s linear infinite; }
.go-b2-lock { animation: goB2Lock 3s ease-out infinite; transform-box: view-box; transform-origin: 55px 17px; }
.go-b3-rock { animation: goB3Rock 1.5s ease-in-out infinite; }
.go-b3-fly  { animation: goB3Fly 3s linear infinite; }

.go-star-a { animation: goTwinkle 3.2s ease-in-out infinite; }
.go-star-b { animation: goTwinkle 4.6s ease-in-out infinite 0.8s; }
.go-star-c { animation: goTwinkle 2.6s ease-in-out infinite 1.6s; }

@media (prefers-reduced-motion: reduce) {
  .go-title, .go-float, .go-well, .go-dash, .go-chip, .go-drift, .go-coin,
  .go-orbit-a, .go-ring-a, .go-ring-b,
  .go-b1-ping, .go-b1-ring, .go-b1-fly, .go-b2-fly, .go-b2-lock, .go-b3-rock, .go-b3-fly,
  .go-star-a, .go-star-b, .go-star-c { animation: none !important; }
}
`;

/* ─── Shared SVG primitives ──────────────────────────────── */
/** Gradient/def block shared by every screen's artwork. */
function OrbitDefs() {
  return (
    <defs>
      <linearGradient id="goSpace" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={COLORS.spaceTop} />
        <stop offset="60%" stopColor={COLORS.spaceMid} />
        <stop offset="100%" stopColor={COLORS.spaceLow} />
      </linearGradient>
      <radialGradient id="goWellGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={COLORS.well} />
        <stop offset="100%" stopColor="rgba(30,107,224,0)" />
      </radialGradient>
      <radialGradient id="goPlanetBlue" cx="34%" cy="30%" r="76%">
        <stop offset="0%" stopColor="#6FB4FF" />
        <stop offset="55%" stopColor={COLORS.brandBlueLt} />
        <stop offset="100%" stopColor="#04204F" />
      </radialGradient>
      <radialGradient id="goPlanetGold" cx="34%" cy="30%" r="76%">
        <stop offset="0%" stopColor="#FFD489" />
        <stop offset="55%" stopColor="#E9962A" />
        <stop offset="100%" stopColor="#5E3006" />
      </radialGradient>
      <radialGradient id="goComet" cx="42%" cy="38%" r="62%">
        <stop offset="0%" stopColor={COLORS.cometCore} />
        <stop offset="55%" stopColor={COLORS.cometMid} />
        <stop offset="100%" stopColor={COLORS.cometEdge} />
      </radialGradient>
      <linearGradient id="goCometTail" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stopColor="rgba(126,184,255,0.85)" />
        <stop offset="100%" stopColor="rgba(126,184,255,0)" />
      </linearGradient>
      <linearGradient id="goGoldCoin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={COLORS.goldLt} />
        <stop offset="100%" stopColor={COLORS.goldDeep} />
      </linearGradient>
    </defs>
  );
}

/** A goal planet: gravity-well glow, orbit ring, banded body. */
function Planet({ cx, cy, r, orbit, gold = false, ringClass, label }) {
  return (
    <g>
      <circle className="go-well" cx={cx} cy={cy} r={orbit * GAME_CONFIG.view.wellFrac}
        fill="url(#goWellGrad)" />
      <g className={ringClass}>
        <circle cx={cx} cy={cy} r={orbit} fill="none"
          stroke={gold ? COLORS.ringGold : COLORS.ring} strokeWidth="1.4"
          strokeDasharray="5 6" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={r} fill={gold ? 'url(#goPlanetGold)' : 'url(#goPlanetBlue)'} />
      {/* Latitude band + terminator, the same two passes the canvas draws. */}
      <path d={`M ${cx - r * 0.94} ${cy - r * 0.2} a ${r} ${r} 0 0 0 ${r * 1.88} 0`}
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={r * 0.16} />
      <path d={`M ${cx} ${cy - r} a ${r} ${r} 0 0 1 0 ${r * 2} a ${r * 0.62} ${r} 0 0 0 0 ${-r * 2}`}
        fill="rgba(4,14,34,0.42)" />
      {label && (
        <text x={cx} y={cy + orbit + 13} fill={gold ? COLORS.goldLt : 'rgba(255,255,255,0.62)'}
          fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="1.4" fontFamily={FONT}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Comet head with a swept tail, drawn pointing along +x. */
function Comet({ r = 5 }) {
  return (
    <g>
      <path d={`M 0 ${-r * 0.72} L ${-r * 5.4} 0 L 0 ${r * 0.72} Z`} fill="url(#goCometTail)" />
      <circle cx="0" cy="0" r={r * 1.9} fill={COLORS.brandBlueGlow} opacity="0.4" />
      <circle cx="0" cy="0" r={r} fill="url(#goComet)" />
    </g>
  );
}

/** Green virus asteroid — risk, in the catalog's fixed colour grammar. */
function VirusRock({ r = 8 }) {
  return (
    <g>
      <circle cx="0" cy="0" r={r} fill={COLORS.virus} />
      <circle cx="0" cy="0" r={r * 0.45} fill={COLORS.virusCore} />
      <g stroke={COLORS.virus} strokeWidth={r * 0.3} strokeLinecap="round">
        <path d={`M0 ${-r} v${-r * 0.5} M0 ${r} v${r * 0.5} M${-r} 0 h${-r * 0.5} M${r} 0 h${r * 0.5}`} />
        <path
          d={`M${-r * 0.72} ${-r * 0.72} l${-r * 0.35} ${-r * 0.35}`
            + ` M${r * 0.72} ${r * 0.72} l${r * 0.35} ${r * 0.35}`
            + ` M${r * 0.72} ${-r * 0.72} l${r * 0.35} ${-r * 0.35}`
            + ` M${-r * 0.72} ${r * 0.72} l${-r * 0.35} ${r * 0.35}`}
        />
      </g>
    </g>
  );
}

/** Star parallax field — three depth layers, matching data.js view.starLayers. */
const HERO_STARS = [
  [22, 26, 0.8, 'a'], [48, 16, 1.2, 'b'], [78, 34, 0.7, 'c'], [104, 20, 1.5, 'a'],
  [132, 30, 0.9, 'c'], [168, 22, 1.1, 'b'], [16, 62, 1.3, 'c'], [92, 58, 0.8, 'a'],
  [180, 58, 0.9, 'a'], [30, 92, 1.0, 'b'], [112, 92, 1.4, 'c'], [186, 96, 0.8, 'b'],
  [18, 138, 1.1, 'a'], [96, 146, 0.9, 'b'], [150, 132, 1.3, 'c'], [184, 152, 1.0, 'a'],
  [58, 166, 0.8, 'c'], [126, 168, 1.2, 'b'],
];

function StarField() {
  return (
    <g fill="#DCEBFF">
      {HERO_STARS.map(([x, y, r, cls], i) => (
        <circle key={i} className={`go-star-${cls}`} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [COLORS.gold, COLORS.goldLt, COLORS.orangeLt, COLORS.brandBlueLt, COLORS.brandBlue, COLORS.green, '#EC4899'];
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

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: two goal planets with their gravity wells and orbit rings, the
 * comet mid-orbit on the near one, and the coin-dotted transfer arc it is about
 * to fly to the far one — the whole loop of the game in one frame.
 */
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
        padding: '46px 24px 52px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="go-title" style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 12px rgba(0,0,0,0.55)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: COLORS.orangeLt,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          margin: 0,
          maxWidth: 300,
        }}>
          {GAME_TAGLINE}
        </p>
      </div>

      <div className="go-float" style={{ position: 'relative', width: 268, height: 240, zIndex: 1 }}>
        <svg width="268" height="240" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <OrbitDefs />
          <clipPath id="goHeroClip"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#goSpace)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#goHeroClip)">
            <StarField />

            {/* Transfer arc from the near ring to the far one, with its coins. */}
            <path className="go-dash"
              d="M 88 100 Q 116 74 130 44"
              fill="none" stroke={COLORS.ringLive} strokeWidth="1.6"
              strokeDasharray="6 8" strokeLinecap="round" opacity="0.75" />
            <g className="go-coin" style={{ animationDelay: '0ms' }}>
              <circle cx="99" cy="90" r="3.4" fill="url(#goGoldCoin)" />
            </g>
            <g className="go-coin" style={{ animationDelay: '260ms' }}>
              <circle cx="111" cy="73" r="3.4" fill="url(#goGoldCoin)" />
            </g>
            <g className="go-coin" style={{ animationDelay: '520ms' }}>
              <circle cx="122" cy="57" r="3.4" fill="url(#goGoldCoin)" />
            </g>

            {/* Far goal: a milestone planet, gold ringed. */}
            <Planet cx={143} cy={62} r={13} orbit={27} gold ringClass="go-ring-b" label="EDUCATION" />

            {/* Near goal: Home, the planet the comet starts on. */}
            <Planet cx={62} cy={120} r={15} orbit={32} ringClass="go-ring-a" label="HOME" />

            {/* Comet riding the near orbit. */}
            <g className="go-orbit-a">
              <g transform="translate(62,88)">
                <Comet r={5} />
              </g>
            </g>

            {/* A virus asteroid sweeping across the transfer line. */}
            <g className="go-drift" transform="translate(122,92)">
              <VirusRock r={8} />
            </g>
          </g>
        </svg>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 10 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.62)',
          textAlign: 'center',
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.5,
          letterSpacing: '0.01em',
        }}>
          {HOW_TO_LINE}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
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
              background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
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
      </div>
    </motion.div>
  );
}

/* ─── How to play ────────────────────────────────────────── */
/** One beat of the release - transfer - dodge loop. Pure CSS-animated SVG. */
function Beat({ n, title, copy, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 12px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
    }}>
      <div style={{ width: 74, height: 62, flexShrink: 0 }}>{children}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: COLORS.orangeLt, textTransform: 'uppercase' }}>
          Step {n}
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.35 }}>{copy}</div>
      </div>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
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
        padding: 22,
        background: SCREEN_BG,
        overflowY: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      {/* Gradients for the beat diagrams, kept out of the layout flow. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <OrbitDefs />
      </svg>

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '26px 20px 22px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 25, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 16px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <Beat n="1" title="Tap to release" copy="One tap slings the comet off its orbit, straight along the tangent.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <circle className="go-well" cx="20" cy="44" r="26" fill="url(#goWellGrad)" />
              <g className="go-b1-ring">
                <circle cx="20" cy="44" r="17" fill="none" stroke={COLORS.ring} strokeWidth="1.3" strokeDasharray="4 5" />
              </g>
              <circle cx="20" cy="44" r="8" fill="url(#goPlanetBlue)" />
              <path d="M 12.5 42 a 8 8 0 0 0 15 0" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" />
              <circle className="go-b1-ping" cx="20" cy="44" r="17" fill="none" stroke={COLORS.orangeLt} strokeWidth="2" />
              <g className="go-b1-fly" transform="translate(20,27)">
                <Comet r={3.6} />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Time the transfer" copy="Release late or early and you sail past. Coins sit on the clean arc.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <circle className="go-well" cx="12" cy="50" r="20" fill="url(#goWellGrad)" />
              <circle cx="12" cy="50" r="13" fill="none" stroke={COLORS.ring} strokeWidth="1.2" strokeDasharray="4 5" />
              <circle cx="12" cy="50" r="6" fill="url(#goPlanetBlue)" />
              <circle cx="60" cy="16" r="12" fill="none" stroke={COLORS.ringGold} strokeWidth="1.2" strokeDasharray="4 5" />
              <circle cx="60" cy="16" r="6" fill="url(#goPlanetGold)" />
              <path className="go-dash" d="M 15 47 L 55 17" fill="none" stroke={COLORS.ringLive}
                strokeWidth="1.4" strokeDasharray="5 6" strokeLinecap="round" opacity="0.8" />
              <circle cx="26" cy="39" r="2.6" fill="url(#goGoldCoin)" />
              <circle cx="35" cy="32" r="2.6" fill="url(#goGoldCoin)" />
              <circle cx="44" cy="26" r="2.6" fill="url(#goGoldCoin)" />
              <circle className="go-b2-lock" cx="55" cy="17" r="10" fill="none" stroke={COLORS.green} strokeWidth="2" />
              <g className="go-b2-fly" transform="translate(15,47)">
                <Comet r={3.4} />
              </g>
            </svg>
          </Beat>

          <Beat n="3" title="Dodge the asteroids" copy="Green virus rocks sweep the arc. Wait a beat, then go — 3 lives.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <circle className="go-well" cx="10" cy="52" r="18" fill="url(#goWellGrad)" />
              <circle cx="10" cy="52" r="12" fill="none" stroke={COLORS.ring} strokeWidth="1.2" strokeDasharray="4 5" />
              <circle cx="10" cy="52" r="5.5" fill="url(#goPlanetBlue)" />
              <circle cx="64" cy="14" r="6" fill="url(#goPlanetBlue)" />
              <path d="M 13 49 L 58 18" fill="none" stroke={COLORS.ring} strokeWidth="1.2"
                strokeDasharray="4 5" strokeLinecap="round" />
              <g transform="translate(38,34)">
                <g className="go-b3-rock"><VirusRock r={6.5} /></g>
              </g>
              <g className="go-b3-fly" transform="translate(13,49)">
                <Comet r={3.4} />
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Every 5th goal is a <strong style={{ color: COLORS.goldLt }}>milestone</strong> worth a bonus.
          Reach all <strong style={{ color: '#fff' }}>{GAME_CONFIG.planets.count} goals</strong> inside{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong> to win.
        </p>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${COLORS.brandBlueLt} 0%, ${COLORS.brandBlue} 100%)`,
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
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const planets = stats?.planets || 0;
  const coins = stats?.coins || 0;
  const perfects = stats?.perfects || 0;
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
    const shareMessage = `Hi,\nI orbited ${planets} of ${GAME_CONFIG.planets.count} life goals and scored ${score} points in the ${GAME_TITLE} challenge.\nStaying on track is what gets you there. Take your run here: ${shareUrl}`.trim();

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
  const progress = (Math.min(score, RESULT_TARGET_SCORE) / RESULT_TARGET_SCORE) * circumference;
  const strokeColor = won ? COLORS.green : score < 500 ? COLORS.danger : COLORS.gold;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 500 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
          {won ? <TrophyIcon size={20} /> : <RiskIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Retirement orbit reached' : 'Run ended'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COLORS.brandBlueLt }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your run.</span>
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
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Goals" value={`${planets}/${GAME_CONFIG.planets.count}`} accent={COLORS.brandBlueLt} />
        <StatTile label="Coins" value={coins} accent={COLORS.gold} />
        <StatTile label="Perfects" value={perfects} accent={COLORS.green} />
      </div>

      {/* Milestone chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {MILESTONE_LIST.map((ms, i) => {
          const hit = planets >= ms.planet;
          return (
            <span
              key={ms.planet}
              className="go-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 11px',
                borderRadius: 999,
                color: hit ? '#fff' : 'rgba(255,255,255,0.4)',
                background: hit ? 'rgba(40,167,69,0.85)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {ms.label}
            </span>
          );
        })}
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: COLORS.brandBlueLt, color: '#fff', fontWeight: 900,
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
          You kept the comet on track. A specialist can keep your real goals on track too.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
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

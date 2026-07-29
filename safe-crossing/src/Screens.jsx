// Screens.jsx — Home, How to Play and Results screens for Safe Crossing.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE, VEHICLE_TYPES } from './data.js';

const GAME_TITLE = 'Safe Crossing';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const DANGER = '#EF4444';
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

/** Run-ended mark: a warning triangle over a broken lane line. */
function IncidentIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 5 29 27H3L16 5z" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16 13v7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="23.4" r="1.5" fill="#fff" />
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
@keyframes scTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes scFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes scGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes scChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
/* NOTE — every keyframe below that moves a vehicle uses translateX, never
   translateY, and is applied to a <g> that carries NO transform attribute of
   its own. Both rules matter in SVG: a CSS transform replaces an element's
   transform attribute rather than composing with it, and vehicles are drawn
   nose-along-local-+x and then rotated onto their approach, so "forward" is
   always local +x whichever way the vehicle is pointing. */
@keyframes scHeroDown { 0% { transform: translateX(-104px); } 40%,62% { transform: translateX(-58px); } 100% { transform: translateX(110px); } }
@keyframes scHeroAcross { 0% { transform: translateX(-58px); } 46% { transform: translateX(0px); } 100% { transform: translateX(62px); } }
@keyframes scHeroBrake { 0%,36% { opacity: 0.25; } 40%,62% { opacity: 1; } 66%,100% { opacity: 0.25; } }
@keyframes scHeroSpark { 0%,50% { opacity: 0; transform: scale(0.4); } 58% { opacity: 1; transform: scale(1); } 88%,100% { opacity: 0; transform: scale(1.6); } }
@keyframes scBeatTap { 0%,30% { transform: scale(1); opacity: 0.35; } 40% { transform: scale(0.8); opacity: 1; } 60%,100% { transform: scale(1.35); opacity: 0; } }
@keyframes scBeatHold { 0%,35% { transform: translateX(-14px); } 55%,100% { transform: translateX(-4px); } }
@keyframes scBeatTruck { 0% { transform: translateX(-24px); } 100% { transform: translateX(28px); } }
.sc-title { animation: scTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.sc-float { animation: scFloat 4s ease-in-out infinite; }
.sc-glow  { animation: scGlow 2.2s ease-in-out infinite; }
.sc-chip  { animation: scChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sc-hero-down   { animation: scHeroDown 3.4s cubic-bezier(0.4,0,0.5,1) infinite; }
.sc-hero-across { animation: scHeroAcross 3.4s linear infinite; }
.sc-hero-brake  { animation: scHeroBrake 3.4s ease-in-out infinite; }
.sc-hero-spark  { animation: scHeroSpark 3.4s ease-out infinite; }
.sc-tap   { animation: scBeatTap 2.2s ease-out infinite; }
.sc-hold  { animation: scBeatHold 2.2s cubic-bezier(0.3,0,0.2,1) infinite; }
.sc-truck { animation: scBeatTruck 2.2s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .sc-title, .sc-float, .sc-glow, .sc-chip, .sc-hero-down, .sc-hero-across,
  .sc-hero-brake, .sc-hero-spark, .sc-tap, .sc-hold, .sc-truck { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GREEN, GREEN_LT, GOLD, BLUE_LT, BLUE, ORANGE_LT, '#3BC9B0'];
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

/* ─── Shared SVG pieces ──────────────────────────────────── */
/** A top-down vehicle, drawn the way the canvas draws it. */
function MiniVehicle({ w = 26, h = 13, body, bodyLt, trim, brake = false, brakeClass }) {
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.32} fill={body} stroke={trim} strokeWidth="0.8" />
      <rect x={-w * 0.16} y={-h * 0.34} width={w * 0.44} height={h * 0.68} rx={2} fill="rgba(9,18,34,0.6)" />
      <rect x={-w * 0.4} y={-h * 0.46} width={w * 0.8} height={h * 0.12} fill={bodyLt} opacity="0.5" />
      <rect x={w * 0.4} y={-h * 0.36} width={w * 0.08} height={h * 0.2} rx={1} fill="#FFF3C4" />
      <rect x={w * 0.4} y={h * 0.16} width={w * 0.08} height={h * 0.2} rx={1} fill="#FFF3C4" />
      <g className={brakeClass} opacity={brake ? 1 : 0.3}>
        <rect x={-w * 0.48} y={-h * 0.38} width={w * 0.08} height={h * 0.24} rx={1} fill={DANGER} />
        <rect x={-w * 0.48} y={h * 0.14} width={w * 0.08} height={h * 0.24} rx={1} fill={DANGER} />
      </g>
    </g>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: the junction itself. A blue family car comes down the vertical
 * lane and stops on its brake lights while an orange risk truck barrels
 * straight through the box — the whole game in one loop.
 */
function HeroJunction() {
  const lane = 22;
  const half = lane * 2;
  return (
    <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="scSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1A33" />
          <stop offset="100%" stopColor="#060F20" />
        </linearGradient>
        <clipPath id="scClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
      </defs>

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#scSky)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#scClip)">
        <g className="sc-glow">
          <ellipse cx="100" cy="95" rx="86" ry="74" fill="rgba(38,102,196,0.2)" />
        </g>

        {/* City blocks */}
        {[[10, 10], [10, 118], [122, 10], [122, 118]].map(([bx, by], i) => (
          <rect key={i} x={bx} y={by} width="58" height="62" rx="8"
            fill="#101C33" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
        ))}

        {/* Roads */}
        <rect x={100 - half} y="0" width={half * 2} height="190" fill="#232B3B" />
        <rect x="0" y={95 - half} width="200" height={half * 2} fill="#232B3B" />
        <rect x={100 - half} y={95 - half} width={half * 2} height={half * 2} fill="#2E3849"
          stroke="rgba(255,200,69,0.35)" strokeWidth="1.4" />
        <line x1="100" y1="0" x2="100" y2={95 - half} stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeDasharray="6 8" />
        <line x1="100" y1={95 + half} x2="100" y2="190" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeDasharray="6 8" />
        <line x1="0" y1="95" x2={100 - half} y2="95" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeDasharray="6 8" />
        <line x1={100 + half} y1="95" x2="200" y2="95" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeDasharray="6 8" />

        {/* Held family car on the southbound lane */}
        <g transform={`translate(${100 + lane / 2}, 95) rotate(90)`}>
          <g className="sc-hero-down">
            <MiniVehicle w={26} h={13} body="#1E6BE0" bodyLt="#7FB6FF" trim="#003DA6" brakeClass="sc-hero-brake" />
          </g>
        </g>

        {/* Risk truck straight through on the eastbound lane */}
        <g transform={`translate(100, ${95 + lane / 2})`}>
          <g className="sc-hero-across">
            <MiniVehicle w={36} h={15} body="#F26522" bodyLt="#FFA96B" trim="#8C2E05" brake={false} />
          </g>
        </g>

        {/* The near-miss spark at the conflict point. The scaling <g> carries no
            transform attribute of its own, so the CSS scale is about the
            conflict point rather than about the SVG origin. */}
        <g transform={`translate(${100 + lane / 2}, ${95 + lane / 2})`}>
          <g className="sc-hero-spark">
            <circle cx="0" cy="0" r="9" fill="none" stroke={GOLD} strokeWidth="2" />
          </g>
        </g>
      </g>
    </svg>
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
        padding: '46px 24px 52px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="sc-title" style={{
          fontSize: 34,
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
          letterSpacing: '0.04em',
          margin: 0,
          maxWidth: 310,
          lineHeight: 1.45,
        }}>
          Life&rsquo;s traffic never stops &mdash; one Claim Cushion, and after that,
          timing is everything.
        </p>
      </div>

      <div className="sc-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <HeroJunction />
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
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: ORANGE_LT, textTransform: 'uppercase' }}>
          Step {n}
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.35 }}>{copy}</div>
      </div>
    </div>
  );
}

/** A miniature junction for the tutorial diagrams. */
function BeatRoads() {
  return (
    <g>
      <rect x="0" y="22" width="74" height="18" fill="#232B3B" />
      <rect x="28" y="0" width="18" height="62" fill="#232B3B" />
      <rect x="28" y="22" width="18" height="18" fill="#2E3849" stroke="rgba(255,200,69,0.4)" strokeWidth="0.8" />
    </g>
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
          letterSpacing: '-0.02em', margin: '0 0 6px 0', color: '#fff',
        }}>
          How to Play
        </h2>
        <p style={{ fontSize: 11.5, fontWeight: 800, color: ORANGE_LT, margin: '0 0 16px 0', lineHeight: 1.4 }}>
          You are the junction. Nothing waits unless you make it wait.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Tap to hold" copy="A tap puts a vehicle on its brakes. Tap again and it goes.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatRoads />
              <g transform="translate(37,44) rotate(-90)">
                <g className="sc-hold">
                  <MiniVehicle w={22} h={11} body="#1E6BE0" bodyLt="#7FB6FF" trim="#003DA6" brake />
                </g>
              </g>
              <g transform="translate(37,48)">
                <circle className="sc-tap" cx="0" cy="0" r="11" fill="none" stroke="#fff" strokeWidth="2" />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Risk trucks never stop" copy="The orange truck ignores you. Time everyone else around it.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatRoads />
              <g transform="translate(37,31)">
                <g className="sc-truck">
                  <MiniVehicle w={28} h={12} body="#F26522" bodyLt="#FFA96B" trim="#8C2E05" />
                </g>
              </g>
              <path d="M37 8 v9 M37 20.5 h0.01" stroke={ORANGE_LT} strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </Beat>

          <Beat n="3" title="One Claim Cushion" copy="The first collision is covered. The second closes the junction.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatRoads />
              <g transform="translate(37,31)">
                <path d="M0 -13 l10 3.6 l0 7.4 c0 6 -4 10.6 -10 13 c-6 -2.4 -10 -7 -10 -13 l0 -7.4 z"
                  fill="rgba(30,107,224,0.35)" stroke={BLUE_LT} strokeWidth="1.6" />
                <path d="M-4.4 0 l3 3 l5.6 -6" fill="none" stroke="#fff" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          Get <strong style={{ color: GREEN_LT }}>{GAME_CONFIG.targetCrossed} vehicles</strong> through
          within <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong>.
          Each one is <strong style={{ color: '#fff' }}>{GAME_CONFIG.scoring.crossPoints}</strong>;
          slipping past inside {GAME_CONFIG.scoring.nearMissGapPx}px without touching is{' '}
          <strong style={{ color: GOLD }}>+{GAME_CONFIG.scoring.nearMissPoints} smart timing</strong>.
          Hold a vehicle too long and the driver goes anyway.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {VEHICLE_TYPES.map((t, i) => (
            <span
              key={t.key}
              className="sc-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: t.bodyLt,
                background: t.brakeable ? 'rgba(255,255,255,0.06)' : 'rgba(242,101,34,0.18)',
                border: `1px solid ${t.brakeable ? 'rgba(255,255,255,0.14)' : 'rgba(242,101,34,0.55)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t.label}{t.brakeable ? '' : ' · no brakes'}
            </span>
          ))}
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
  const crossed = stats?.crossed || 0;
  const nearMisses = stats?.nearMisses || 0;
  const crashes = stats?.crashes || 0;
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
    const shareMessage = `Hi,\nI ran the junction in the ${GAME_TITLE} challenge: ${crossed} vehicles home safe, ${nearMisses} close calls, ${score} points.\nLife's traffic never stops - one Claim Cushion, and after that timing is everything. Take your shift here: ${shareUrl}`.trim();

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
  const weak = score < RESULT_TARGET_SCORE * 0.4;
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
          {won ? <TrophyIcon size={20} /> : <IncidentIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Everyone home safe' : 'Junction closed'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your shift.</span>
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
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              clean shift {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, crossed, nearMisses, crashes} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Through" value={`${crossed}/${GAME_CONFIG.targetCrossed}`} accent={GREEN_LT} />
        <StatTile label="Close calls" value={nearMisses} accent={GOLD} />
        <StatTile label="Collisions" value={crashes} accent={crashes > 0 ? DANGER : BLUE_LT} />
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
          You only get one Claim Cushion in a game. A specialist can show you how much
          cover your family actually has &mdash; before the truck arrives.
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

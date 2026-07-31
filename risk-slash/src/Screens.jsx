// Screens.jsx — Home, How to Play, and Results screens for Risk Slash.
// Glassmorphism on the deep-blue brand backdrop; all art is inline SVG.
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const SCREEN_BG =
  'radial-gradient(ellipse at 50% 18%, rgba(30, 107, 224, 0.28), rgba(7, 16, 38, 0) 60%), ' +
  'linear-gradient(180deg, #071026 0%, #0d1e3f 55%, #0a1730 100%)';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

/* ─── Shared SVG art pieces ────────────────────────────── */

/** Spiky green risk orb with a glossy body, used across the static screens. */
function RiskOrbArt({ cx, cy, r, idPrefix }) {
  const spikes = 10;
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r * 1.28 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return (
    <g>
      <polygon points={pts.join(' ')} fill={`url(#${idPrefix}-spike)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${idPrefix}-body)`} />
      <ellipse cx={cx - r * 0.32} cy={cy - r * 0.38} rx={r * 0.30} ry={r * 0.17} fill="rgba(255,255,255,0.5)" transform={`rotate(-24 ${cx - r * 0.32} ${cy - r * 0.38})`} />
      {/* percent icon */}
      <g stroke="#fff" strokeWidth={r * 0.11} fill="none" strokeLinecap="round">
        <circle cx={cx - r * 0.30} cy={cy - r * 0.28} r={r * 0.16} />
        <circle cx={cx + r * 0.30} cy={cy + 0.28 * r} r={r * 0.16} />
        <line x1={cx + r * 0.34} y1={cy - r * 0.38} x2={cx - r * 0.34} y2={cy + r * 0.38} />
      </g>
    </g>
  );
}

/** Serene blue Family Shield orb. */
function ShieldOrbArt({ cx, cy, r, idPrefix }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.35} fill={`url(#${idPrefix}-halo)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${idPrefix}-shield)`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      {/* family silhouette */}
      <g fill="rgba(255,255,255,0.92)">
        <circle cx={cx - r * 0.32} cy={cy - r * 0.22} r={r * 0.16} />
        <path d={`M ${cx - r * 0.55} ${cy + r * 0.42} C ${cx - r * 0.55} ${cy} ${cx - r * 0.1} ${cy} ${cx - r * 0.1} ${cy + r * 0.42} Z`} />
        <circle cx={cx + r * 0.32} cy={cy - r * 0.2} r={r * 0.14} />
        <path d={`M ${cx + r * 0.1} ${cy + r * 0.42} C ${cx + r * 0.1} ${cy + r * 0.02} ${cx + r * 0.54} ${cy + r * 0.02} ${cx + r * 0.54} ${cy + r * 0.42} Z`} />
        <circle cx={cx} cy={cy + r * 0.02} r={r * 0.11} />
        <path d={`M ${cx - r * 0.16} ${cy + r * 0.42} C ${cx - r * 0.16} ${cy + r * 0.16} ${cx + r * 0.16} ${cy + r * 0.16} ${cx + r * 0.16} ${cy + r * 0.42} Z`} />
      </g>
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.42} rx={r * 0.28} ry={r * 0.13} fill="rgba(255,255,255,0.35)" transform={`rotate(-20 ${cx - r * 0.3} ${cy - r * 0.42})`} />
    </g>
  );
}

function ArtDefs({ idPrefix }) {
  return (
    <defs>
      <radialGradient id={`${idPrefix}-body`} cx="0.35" cy="0.32" r="0.9">
        <stop offset="0%" stopColor="#8CF09A" />
        <stop offset="45%" stopColor="#49E24B" />
        <stop offset="100%" stopColor="#0E5C1D" />
      </radialGradient>
      <linearGradient id={`${idPrefix}-spike`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#49E24B" />
        <stop offset="100%" stopColor="#0E5C1D" />
      </linearGradient>
      <radialGradient id={`${idPrefix}-shield`} cx="0.35" cy="0.3" r="0.95">
        <stop offset="0%" stopColor="#7FC0FF" />
        <stop offset="55%" stopColor="#1E6BE0" />
        <stop offset="100%" stopColor="#003DA6" />
      </radialGradient>
      <radialGradient id={`${idPrefix}-halo`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="rgba(127,192,255,0.45)" />
        <stop offset="100%" stopColor="rgba(127,192,255,0)" />
      </radialGradient>
      <linearGradient id={`${idPrefix}-slash`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
        <stop offset="45%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
  );
}

/** Icon-led cue chip used by the how-to-play screen. */
function CueChip({ children, label, tint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
      }}>
        {children}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: tint, textAlign: 'center', lineHeight: 1.2,
      }}>{label}</span>
    </div>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#3B8DD4', '#005BAC', '#10B981', '#EC4899'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            className="confetti"
            style={{
              position: 'absolute',
              left: `${left}%`,
              background: color,
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

/* ─── Home ─────────────────────────────────────────────── */
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
        padding: '50px 24px 64px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 6px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}>
          Risk <span style={{ color: COLORS.orangeBright }}>Slash</span>
        </h1>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: COLORS.orangeBright,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          Cover is the blade
        </p>
      </div>

      {/* Concept art: a slash cutting a risk orb, a shield orb kept safe */}
      <div style={{
        position: 'relative',
        width: 250,
        height: 250,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <svg width="250" height="250" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
          <ArtDefs idPrefix="home" />
          <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          {/* Sliced risk orb — two halves parting along the cut */}
          <g transform="translate(66 74) rotate(-14)">
            <g transform="translate(-8 -6) rotate(-7)">
              <clipPath id="home-halfL"><rect x="-40" y="-40" width="40" height="80" /></clipPath>
              <g clipPath="url(#home-halfL)"><RiskOrbArt cx={0} cy={0} r={26} idPrefix="home" /></g>
            </g>
            <g transform="translate(10 8) rotate(9)">
              <clipPath id="home-halfR"><rect x="0" y="-40" width="40" height="80" /></clipPath>
              <g clipPath="url(#home-halfR)"><RiskOrbArt cx={0} cy={0} r={26} idPrefix="home" /></g>
            </g>
          </g>

          {/* Goo drops */}
          <circle cx="46" cy="112" r="4" fill="#3ECB5B" opacity="0.85" />
          <circle cx="86" cy="118" r="3" fill="#3ECB5B" opacity="0.7" />
          <circle cx="64" cy="128" r="2.4" fill="#177A32" opacity="0.8" />

          {/* Intact second risk orb */}
          <g transform="translate(150 60)">
            <RiskOrbArt cx={0} cy={0} r={18} idPrefix="home" />
          </g>

          {/* The blade slash */}
          <path d="M 22 168 C 66 118 118 74 178 30" stroke="url(#home-slash)" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.95" />
          <path d="M 22 168 C 66 118 118 74 178 30" stroke="rgba(127,192,255,0.5)" strokeWidth="13" strokeLinecap="round" fill="none" opacity="0.35" />

          {/* Family Shield orb — serene, untouched */}
          <g transform="translate(132 142)">
            <ShieldOrbArt cx={0} cy={0} r={24} idPrefix="home" />
          </g>
        </svg>
      </div>

      {/* Start Button */}
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
            borderRadius: '12px',
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
            boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
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

/* ─── How to Play ──────────────────────────────────────── */
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
        padding: '24px',
        background: SCREEN_BG,
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'rgba(4, 16, 40, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '30px 24px 24px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 20px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        {/* Animated demo: hand swipes through a risk orb; the shield floats safe */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 190,
          background: 'rgba(5, 14, 34, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes rsTutOrb {
              0%   { transform: translate(0, 150px) scale(0.9); opacity: 0; }
              18%  { transform: translate(6px, 46px) scale(1); opacity: 1; }
              34%  { transform: translate(10px, 22px) scale(1); opacity: 1; }
              40%  { transform: translate(11px, 18px) scale(1); opacity: 1; }
              41%, 100% { opacity: 0; }
            }
            @keyframes rsTutHalfL {
              0%, 40% { transform: translate(11px, 18px) rotate(0deg); opacity: 0; }
              41% { opacity: 1; }
              78%, 100% { transform: translate(-46px, 90px) rotate(-80deg); opacity: 0; }
            }
            @keyframes rsTutHalfR {
              0%, 40% { transform: translate(11px, 18px) rotate(0deg); opacity: 0; }
              41% { opacity: 1; }
              78%, 100% { transform: translate(66px, 96px) rotate(84deg); opacity: 0; }
            }
            @keyframes rsTutSwipe {
              0%, 28% { transform: translate(118px, 148px); opacity: 0; }
              34% { transform: translate(118px, 148px); opacity: 1; }
              52% { transform: translate(-38px, 24px); opacity: 1; }
              60%, 100% { transform: translate(-58px, 6px); opacity: 0; }
            }
            @keyframes rsTutSlashLine {
              0%, 36% { opacity: 0; }
              42% { opacity: 1; }
              62%, 100% { opacity: 0; }
            }
            @keyframes rsTutShield {
              0%   { transform: translate(0, 160px); opacity: 0; }
              24%  { transform: translate(-4px, 66px); opacity: 1; }
              54%  { transform: translate(-8px, 40px); opacity: 1; }
              86%  { transform: translate(-12px, 130px); opacity: 1; }
              100% { transform: translate(-14px, 170px); opacity: 0; }
            }
          `}} />

          <svg width="0" height="0"><ArtDefs idPrefix="tut" /></svg>

          {/* Risk orb rising then sliced */}
          <div style={{ position: 'absolute', left: 68, top: 0, animation: 'rsTutOrb 4s ease-out infinite' }}>
            <svg width="64" height="64" viewBox="-32 -32 64 64"><RiskOrbArt cx={0} cy={0} r={20} idPrefix="tut" /></svg>
          </div>
          {/* Halves */}
          <div style={{ position: 'absolute', left: 68, top: 0, animation: 'rsTutHalfL 4s ease-in infinite' }}>
            <svg width="64" height="64" viewBox="-32 -32 64 64">
              <clipPath id="tut-halfL"><rect x="-32" y="-32" width="32" height="64" /></clipPath>
              <g clipPath="url(#tut-halfL)"><RiskOrbArt cx={0} cy={0} r={20} idPrefix="tut" /></g>
            </svg>
          </div>
          <div style={{ position: 'absolute', left: 68, top: 0, animation: 'rsTutHalfR 4s ease-in infinite' }}>
            <svg width="64" height="64" viewBox="-32 -32 64 64">
              <clipPath id="tut-halfR"><rect x="0" y="-32" width="32" height="64" /></clipPath>
              <g clipPath="url(#tut-halfR)"><RiskOrbArt cx={0} cy={0} r={20} idPrefix="tut" /></g>
            </svg>
          </div>

          {/* Slash streak */}
          <svg width="100%" height="100%" viewBox="0 0 320 190" preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, animation: 'rsTutSlashLine 4s linear infinite' }}>
            <path d="M 214 166 C 160 118 118 78 56 34" stroke="url(#tut-slash)" strokeWidth="6" strokeLinecap="round" fill="none" />
          </svg>

          {/* Swiping hand */}
          <div style={{ position: 'absolute', left: 60, top: 0, width: 34, height: 34, zIndex: 5, animation: 'rsTutSwipe 4s cubic-bezier(0.3, 0, 0.4, 1) infinite' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5">
              <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
            </svg>
          </div>

          {/* Shield orb — never touched */}
          <div style={{ position: 'absolute', right: 46, top: 0, animation: 'rsTutShield 4s ease-in-out infinite' }}>
            <svg width="70" height="70" viewBox="-35 -35 70 70"><ShieldOrbArt cx={0} cy={0} r={20} idPrefix="tut" /></svg>
          </div>
        </div>

        {/* Icon labels — no prose */}
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 6, marginBottom: 20 }}>
          <CueChip tint="#FACC15" label="Swipe">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-4 0v5" />
              <path d="M14 10V4a2 2 0 0 0-4 0v6" />
              <path d="M10 10.5V3a2 2 0 0 0-4 0v11" />
              <path d="M6 14v-2.5a2 2 0 0 0-4 0V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
            </svg>
          </CueChip>
          <CueChip tint={COLORS.greenLt} label="Slash risk">
            <svg width="26" height="26" viewBox="-16 -16 32 32">
              <ArtDefs idPrefix="cue" />
              <RiskOrbArt cx={0} cy={0} r={10} idPrefix="cue" />
            </svg>
          </CueChip>
          <CueChip tint={COLORS.blueLt} label="Spare shields">
            <svg width="26" height="26" viewBox="-16 -16 32 32">
              <ShieldOrbArt cx={0} cy={0} r={10} idPrefix="cue" />
              <g stroke="#EF4444" strokeWidth="2.6" strokeLinecap="round">
                <line x1="-11" y1="-11" x2="11" y2="11" />
              </g>
            </svg>
          </CueChip>
        </div>

        {/* Play Button */}
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%',
              height: 52,
              border: 'none',
              borderRadius: '12px',
              fontSize: 18,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'linear-gradient(180deg, #1E6BE0 0%, #003DA6 100%)',
              boxShadow: '0 4px 15px rgba(0, 61, 166, 0.4)',
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

/* ─── Results ──────────────────────────────────────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
  const score = stats?.score || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return;
    }
    const duration = 1200;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;
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
    const shareMessage = `Hi,\nI slashed ${score} points of risk in the Risk Slash challenge.\nCover is the blade — cut the risks out of your family's life: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Risk Slash',
          text: shareMessage,
        });
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
  const targetScore = GAME_CONFIG.targetScore;
  const progress = (Math.min(Math.max(score, 0), targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#28A745' : '#ef4444';
  const glowColor = won ? 'rgba(40, 167, 69, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  const endCause = stats?.endCause;
  const message = won
    ? 'Risks cut down, family shielded. That is exactly what the right cover does.'
    : endCause === 'shields'
      ? 'Three Family Shields went down. Protection only works when the cover stays whole.'
      : 'The risks kept coming faster than the blade. The right cover never tires.';

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
        padding: '40px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 18, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Risks Slashed' : 'Your Score'}
          </span>
        </p>
      </div>

      {/* Circular Progress Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              of {targetScore} points
            </span>
          </div>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Risks cut', value: stats?.sliced ?? 0 },
          { label: 'Best combo', value: stats?.bestCombo ?? 0 },
          { label: 'Shields hit', value: stats?.shieldsHit ?? 0 },
        ].map((c) => (
          <div key={c.label} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '7px 14px',
            textAlign: 'center',
            minWidth: 88,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Message */}
      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {message}
        </h2>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: '#1E6BE0',
          color: '#fff',
          fontWeight: 900,
          height: 52,
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(30, 107, 224, 0.4)',
          width: '100%',
          maxWidth: 280,
          marginBottom: 20,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Action card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'rgba(15, 23, 42, 0.75)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '20px 18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        marginBottom: 20,
      }}>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          Talk to a specialist about cutting the real risks out of your family's future.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#FF8A3D',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                textDecoration: 'none',
                textTransform: 'uppercase',
                border: '1px solid #FF8A3D',
                boxShadow: '0 4px 12px rgba(255, 138, 61, 0.25)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
            </a>
          )}

          {empPhone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 9, letterSpacing: '0.15em' }}>OR</span>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: '#28A745',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book Consultation</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Play again */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            padding: '12px 24px',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
            marginBottom: 16,
          }}
        >
          <RotateIcon />
          <span>Play again</span>
        </button>
      </motion.div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}

// Screens.jsx — Home, How to Play, and Results screens for Premium Tiles.
// Same glassmorphism design language as the guardian-shelter gold standard;
// backdrop is pure gradients (no binary asset), lanes-and-tiles key art in SVG.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const SCREEN_BG = [
  'radial-gradient(ellipse 120% 55% at 50% 0%, rgba(30,107,224,0.32), rgba(5,16,38,0) 70%)',
  'radial-gradient(ellipse 130% 45% at 50% 100%, rgba(242,101,34,0.20), rgba(5,16,38,0) 70%)',
  'linear-gradient(180deg, #081530 0%, #0B2450 55%, #06122B 100%)',
].join(', ');

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

function StarIcon({ size = 34, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"
        fill={filled ? 'url(#ptStarGold)' : 'rgba(255,255,255,0.12)'}
        stroke={filled ? '#FFD68A' : 'rgba(255,255,255,0.25)'}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="ptStarGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE7A8" />
          <stop offset="100%" stopColor="#F2A522" />
        </linearGradient>
      </defs>
    </svg>
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

/* ─── Key art: four lanes with falling tiles (SVG) ─────── */
function LanesArt() {
  return (
    <div style={{ position: 'relative', width: 236, height: 250, margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ptFallA { 0% { transform: translateY(-70px); } 100% { transform: translateY(240px); } }
        @keyframes ptFallB { 0% { transform: translateY(-130px); } 100% { transform: translateY(180px); } }
        @keyframes ptFallC { 0% { transform: translateY(-40px); } 100% { transform: translateY(270px); } }
        .pt-fall-a { animation: ptFallA 2.6s linear infinite; }
        .pt-fall-b { animation: ptFallB 2.6s linear infinite; }
        .pt-fall-c { animation: ptFallC 2.6s linear infinite; }
      `}} />
      <svg width="236" height="250" viewBox="0 0 200 212" style={{ overflow: 'hidden', borderRadius: 26 }}>
        <rect x="0" y="0" width="200" height="212" rx="26" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        {[50, 100, 150].map((x) => (
          <line key={x} x1={x} y1="8" x2={x} y2="204" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        ))}
        <defs>
          <linearGradient id="ptTileBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F7BE8" />
            <stop offset="60%" stopColor="#003DA6" />
            <stop offset="100%" stopColor="#00185A" />
          </linearGradient>
          <linearGradient id="ptTileRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F05555" />
            <stop offset="100%" stopColor="#5F1010" />
          </linearGradient>
          <clipPath id="ptArtClip">
            <rect x="0" y="0" width="200" height="212" rx="26" />
          </clipPath>
        </defs>
        <g clipPath="url(#ptArtClip)">
          <g className="pt-fall-a">
            <rect x="4" y="0" width="42" height="30" rx="7" fill="url(#ptTileBlue)" stroke="rgba(255,255,255,0.4)" />
            <rect x="104" y="-60" width="42" height="30" rx="7" fill="url(#ptTileBlue)" stroke="rgba(255,255,255,0.4)" />
          </g>
          <g className="pt-fall-b">
            <rect x="54" y="0" width="42" height="30" rx="7" fill="url(#ptTileBlue)" stroke="rgba(255,255,255,0.4)" />
            <rect x="154" y="-70" width="42" height="30" rx="7" fill="url(#ptTileRed)" stroke="rgba(255,255,255,0.3)" />
          </g>
          <g className="pt-fall-c">
            <rect x="154" y="0" width="42" height="30" rx="7" fill="url(#ptTileBlue)" stroke="rgba(255,255,255,0.4)" />
            <rect x="54" y="-90" width="42" height="30" rx="7" fill="url(#ptTileBlue)" stroke="rgba(255,255,255,0.4)" />
          </g>
          {/* DUE line */}
          <rect x="6" y="176" width="188" height="3" rx="1.5" fill="#FF8A3D" />
          <rect x="6" y="168" width="188" height="18" fill="rgba(255,138,61,0.14)" />
        </g>
        {/* music note */}
        <g transform="translate(168, 30)" fill="#FFD68A">
          <ellipse cx="-4" cy="10" rx="6" ry="4.4" transform="rotate(-20 -4 10)" />
          <rect x="0.8" y="-8" width="2.4" height="17" rx="1.2" />
          <path d="M1 -8 q9 3 7 11 q-1.6 -6 -7 -6 z" />
        </g>
      </svg>
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
        padding: '50px 24px 56px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
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
          Premium Tiles
        </h1>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#FF8A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          A premium on every note
        </p>
        <p style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          margin: '10px auto 0',
          maxWidth: 280,
          lineHeight: 1.5,
        }}>
          Never miss a payment and your family's plan plays like music. Tap every falling premium to perform the melody.
        </p>
      </div>

      <LanesArt />

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

/* ─── How to play ────────────────────────────────────────── */
/* One 5.2s loop of the real chart: a blue premium tile lands on the DUE line and
   is tapped (note flies), a tall HOLD tile lands and is held down (two more
   notes bank), and a red risk tile falls straight through while the finger stays
   clear of the glass. Same four lanes, same tile colours and same DUE line as
   PremiumTilesGame.jsx. Every track shares the 5.2s duration. */
const HTP_CSS = `
@keyframes ptuTileA {
  0%        { transform: translateY(-50px); opacity: 1; }
  26%       { transform: translateY(145px); opacity: 1; }
  33%       { transform: translateY(145px); opacity: 1; }
  38%, 100% { transform: translateY(145px); opacity: 0; }
}
@keyframes ptuFlashA {
  0%, 27%   { transform: scale(0.9); opacity: 0; }
  31%       { transform: scale(1);   opacity: 1; }
  42%, 100% { transform: scale(1.4); opacity: 0; }
}
@keyframes ptuHold {
  0%, 16%   { transform: translateY(-110px); opacity: 1; }
  46%       { transform: translateY(105px);  opacity: 1; }
  70%       { transform: translateY(105px);  opacity: 1; }
  77%, 100% { transform: translateY(105px);  opacity: 0; }
}
@keyframes ptuHoldGlow {
  0%, 46%   { opacity: 0; }
  50%       { opacity: 1; }
  68%       { opacity: 1; }
  76%, 100% { opacity: 0; }
}
@keyframes ptuRed {
  0%, 52%   { transform: translateY(-50px); opacity: 0; }
  57%       { transform: translateY(-10px); opacity: 1; }
  86%       { transform: translateY(178px); opacity: 1; }
  95%, 100% { transform: translateY(220px); opacity: 0; }
}
@keyframes ptuFinger {
  0%        { transform: translate(20px, 208px); }
  26%, 33%  { transform: translate(20px, 160px); }
  40%       { transform: translate(20px, 204px); }
  47%       { transform: translate(60px, 152px); }
  50%, 70%  { transform: translate(60px, 146px); }
  78%       { transform: translate(60px, 204px); }
  86%, 96%  { transform: translate(40px, 212px); }
  100%      { transform: translate(20px, 208px); }
}
@keyframes ptuPress {
  0%, 26%   { transform: scale(0.4);  opacity: 0; }
  29%       { transform: scale(0.55); opacity: 0.9; }
  38%       { transform: scale(1.7);  opacity: 0; }
  47%       { transform: scale(0.6);  opacity: 0; }
  51%       { transform: scale(1.15); opacity: 0.85; }
  68%       { transform: scale(1.15); opacity: 0.85; }
  75%, 100% { transform: scale(1.7);  opacity: 0; }
}
@keyframes ptuNoteA {
  0%, 30%   { transform: translate(0, 0);      opacity: 0; }
  34%       { transform: translate(4px, -10px); opacity: 1; }
  52%, 100% { transform: translate(20px, -62px); opacity: 0; }
}
@keyframes ptuNoteB {
  0%, 52%   { transform: translate(0, 0);       opacity: 0; }
  56%       { transform: translate(4px, -10px); opacity: 1; }
  70%, 100% { transform: translate(22px, -58px); opacity: 0; }
}
@keyframes ptuNoteC {
  0%, 62%   { transform: translate(0, 0);        opacity: 0; }
  66%       { transform: translate(-4px, -10px); opacity: 1; }
  82%, 100% { transform: translate(-20px, -60px); opacity: 0; }
}
@keyframes ptuNo  { 0%, 78% { opacity: 0; } 84%, 94% { opacity: 1; } 99%, 100% { opacity: 0; } }
@keyframes ptuDue { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

.ptu-tile-a  { animation: ptuTileA 5.2s cubic-bezier(0.45,0,0.7,0.6) infinite; }
.ptu-flash-a { animation: ptuFlashA 5.2s ease-out infinite; transform-origin: 20px 160px; }
.ptu-hold    { animation: ptuHold 5.2s cubic-bezier(0.45,0,0.7,0.6) infinite; }
.ptu-holdglow{ animation: ptuHoldGlow 5.2s ease-in-out infinite; }
.ptu-red     { animation: ptuRed 5.2s linear infinite; }
.ptu-finger  { animation: ptuFinger 5.2s cubic-bezier(0.4,0,0.2,1) infinite; }
.ptu-press   { animation: ptuPress 5.2s ease-out infinite; transform-origin: 0 0; }
.ptu-note-a  { animation: ptuNoteA 5.2s ease-out infinite; }
.ptu-note-b  { animation: ptuNoteB 5.2s ease-out infinite; }
.ptu-note-c  { animation: ptuNoteC 5.2s ease-out infinite; }
.ptu-no      { animation: ptuNo 5.2s ease-out infinite; }
.ptu-due     { animation: ptuDue 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ptu-tile-a, .ptu-flash-a, .ptu-hold, .ptu-holdglow, .ptu-red, .ptu-finger,
  .ptu-press, .ptu-note-a, .ptu-note-b, .ptu-note-c, .ptu-no, .ptu-due {
    animation: none !important;
  }
}
`;

/** The melody note that flies off every tile the player performs. */
function Note({ className, x, y, color }) {
  return (
    <g className={className} transform={`translate(${x},${y})`}>
      <g fill={color}>
        <ellipse cx="-3.5" cy="6" rx="4.2" ry="3" transform="rotate(-20 -3.5 6)" />
        <rect x="-0.4" y="-7" width="1.9" height="13" rx="0.95" />
        <path d="M-0.2 -7 q6.6 2.2 5.3 8.3 q-1.1 -4.5 -5.3 -4.5 z" />
      </g>
    </g>
  );
}

function DemoLanes() {
  return (
    <svg width="200" height="275" viewBox="0 0 160 220" aria-hidden="true">
      <defs>
        <linearGradient id="ptuBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F7BE8" />
          <stop offset="60%" stopColor="#003DA6" />
          <stop offset="100%" stopColor="#00185A" />
        </linearGradient>
        <linearGradient id="ptuHoldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FC0FF" />
          <stop offset="45%" stopColor="#1E6BE0" />
          <stop offset="100%" stopColor="#00185A" />
        </linearGradient>
        <linearGradient id="ptuRedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F05555" />
          <stop offset="100%" stopColor="#5F1010" />
        </linearGradient>
        <clipPath id="ptuClip"><rect x="0" y="0" width="160" height="220" rx="14" /></clipPath>
      </defs>

      <rect x="0" y="0" width="160" height="220" rx="14" fill="rgba(5,20,45,0.6)"
        stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      <g clipPath="url(#ptuClip)">
        {/* four lanes */}
        {[40, 80, 120].map((x) => (
          <line key={x} x1={x} y1="6" x2={x} y2="214" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        ))}

        {/* the DUE line */}
        <line className="ptu-due" x1="6" y1="175" x2="154" y2="175" stroke="#FF8A3D" strokeWidth="3"
          strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(255,138,61,0.85))' }} />

        {/* lane 1 — a premium tile, tapped on the line */}
        <g className="ptu-tile-a">
          <rect x="4" y="0" width="32" height="30" rx="6" fill="url(#ptuBlue)"
            stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
        </g>
        <g className="ptu-flash-a">
          <rect x="2" y="143" width="36" height="34" rx="7" fill="none" stroke="#FFD68A" strokeWidth="2.6" />
        </g>

        {/* lane 2 — a HOLD tile, pressed and kept down */}
        <g className="ptu-hold">
          <rect x="44" y="0" width="32" height="70" rx="6" fill="url(#ptuHoldGrad)"
            stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
          <rect x="56" y="12" width="8" height="46" rx="4" fill="rgba(255,255,255,0.35)" />
        </g>
        <g className="ptu-holdglow">
          <rect x="42" y="103" width="36" height="74" rx="7" fill="none" stroke="#7FC0FF" strokeWidth="2.4" />
        </g>

        {/* lane 4 — a risk tile, allowed to fall straight through */}
        <g className="ptu-red">
          <rect x="124" y="0" width="32" height="28" rx="6" fill="url(#ptuRedGrad)"
            stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
          <line x1="132" y1="10" x2="148" y2="18" stroke="rgba(255,255,255,0.75)" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="148" y1="10" x2="132" y2="18" stroke="rgba(255,255,255,0.75)" strokeWidth="2.4" strokeLinecap="round" />
        </g>

        {/* the melody the taps perform */}
        <Note className="ptu-note-a" x={30} y={150} color="#FFD68A" />
        <Note className="ptu-note-b" x={72} y={140} color="#FFD68A" />
        <Note className="ptu-note-c" x={50} y={132} color="#FFD68A" />

        {/* the finger: taps, holds, then stays clear of the red lane */}
        <g className="ptu-finger">
          <g className="ptu-press">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#fff" strokeWidth="2.4" />
          </g>
          <circle cx="0" cy="0" r="8" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
          <g className="ptu-no" transform="translate(0,-22)">
            <circle cx="0" cy="0" r="8.5" fill="rgba(8,21,48,0.9)" stroke="#E23B3B" strokeWidth="2.4" />
            <line x1="-4.6" y1="4.6" x2="4.6" y2="-4.6" stroke="#E23B3B" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function TileGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="10" rx="2.5" fill="#1E6BE0" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
      <line x1="3" y1="17" x2="21" y2="17" stroke="#FF8A3D" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="20.5" r="2.6" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

function HoldGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="2" width="12" height="15" rx="2.5" fill="#1E6BE0" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
      <rect x="10.5" y="4.5" width="3" height="10" rx="1.5" fill="rgba(255,255,255,0.4)" />
      <circle cx="12" cy="20.5" r="2.6" fill="rgba(255,255,255,0.9)" />
      <circle cx="12" cy="20.5" r="5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
    </svg>
  );
}

function RiskGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="6" width="14" height="10" rx="2.5" fill="#E23B3B" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      <line x1="9" y1="9" x2="15" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="9" x2="9" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="3.5" y1="20.5" x2="20.5" y2="20.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** icon + one short label. The only words allowed on this screen. */
function Cue({ icon, word }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      padding: '9px 4px', borderRadius: 13,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    }}>
      {icon}
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 1.1,
      }}>
        {word}
      </span>
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
        padding: 18,
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: HTP_CSS }} />

      <div style={{
        background: 'rgba(0, 30, 70, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '18px 16px 16px',
        width: '100%',
        maxWidth: 340,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 8px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        <DemoLanes />

        <div style={{ display: 'flex', gap: 7, margin: '8px 0 12px' }}>
          <Cue icon={<TileGlyph />} word="TAP BLUE TILES" />
          <Cue icon={<HoldGlyph />} word="HOLD LONG TILES" />
          <Cue icon={<RiskGlyph />} word="NEVER TAP RED" />
        </div>

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

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel = 'Play again' }) {
  const score = stats?.score || 0;
  const stars = stats?.stars || 0;
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
    const shareMessage = `Hi,\nI scored ${score} points performing the Premium Tiles melody${won ? ` and earned ${stars} star${stars === 1 ? '' : 's'}` : ''}.\nA premium on every note — never miss a payment and the plan plays like music! Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Premium Tiles',
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
  const targetScore = 400;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#28A745' : '#ef4444';
  const glowColor = won ? 'rgba(40, 167, 69, 0.4)' : 'rgba(239, 68, 68, 0.4)';

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
        padding: '36px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 12, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Song Complete!' : 'The Music Stopped'}
          </span>
        </p>
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, zIndex: 2 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.35 + i * 0.18, type: 'spring', damping: 12, stiffness: 220 }}
          >
            <StarIcon size={i === 1 ? 42 : 34} filled={i < stars} />
          </motion.div>
        ))}
      </div>

      {/* Circular Progress Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14, zIndex: 2 }}>
        <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
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
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Performance chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, zIndex: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Perfect', value: `${stats?.perfectPct ?? 0}%` },
          { label: 'Max combo', value: stats?.maxCombo ?? 0 },
          { label: 'Notes played', value: `${stats?.tilesHit ?? 0}/${stats?.totalTiles ?? 0}` },
        ].map((chip) => (
          <div key={chip.label} style={{
            padding: '8px 14px',
            borderRadius: 14,
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            minWidth: 84,
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{chip.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{chip.label}</div>
          </div>
        ))}
      </div>

      {/* Motivational Message */}
      <div style={{ textAlign: 'center', marginBottom: 18, padding: '0 16px', zIndex: 2 }}>
        <h2 style={{ fontSize: 16.5, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {won
            ? 'Every premium paid on time keeps your family’s plan in perfect harmony.'
            : 'One missed premium can break the rhythm of a life goal. Stay regular, stay protected.'}
        </h2>
      </div>

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
          zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Action Card Section */}
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
        zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          Talk to a specialist about a plan that never misses a beat.
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

      {/* Play again + home */}
      <div style={{ display: 'flex', gap: 6, zIndex: 2 }}>
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
              padding: '12px 18px',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
              marginBottom: 12,
            }}
          >
            <RotateIcon />
            <span>{retryLabel}</span>
          </button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <button
            onClick={onHome}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              padding: '12px 18px',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
              marginBottom: 12,
            }}
          >
            Home
          </button>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}

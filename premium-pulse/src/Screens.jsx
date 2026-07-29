// Screens.jsx — Home, How to Play, and Results screens for Premium Pulse.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Premium Pulse';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. Values are the
   index.css design tokens. */
const BLUE = '#005BAC';
const BLUE_LT = '#3B8DD4';
const BLUE_PALE = '#BEE0FF';
const ORANGE = '#F26922';
const ORANGE_LT = '#FF8533';
const GREEN_LT = '#6EE7A8';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 30%, rgba(0,91,172,0.50), rgba(3,16,42,0.97) 72%), #03102a';

const SCREEN_CSS = `
@keyframes ppRingIn {
  0%   { transform: scale(1);    opacity: 0; }
  15%  { opacity: 0.95; }
  100% { transform: scale(0.16); opacity: 0; }
}
@keyframes ppSpikeIn {
  0%   { transform: scale(1) rotate(0deg);    opacity: 0; }
  15%  { opacity: 0.95; }
  100% { transform: scale(0.16) rotate(48deg); opacity: 0; }
}
@keyframes ppBadgePulse {
  0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 5px rgba(255,133,51,0.55)); }
  50%      { transform: scale(1.07); filter: drop-shadow(0 0 15px rgba(255,133,51,0.95)); }
}
@keyframes ppTapDot {
  0%, 62%  { opacity: 0; transform: scale(0.6); }
  70%      { opacity: 1; transform: scale(1.25); }
  100%     { opacity: 0; transform: scale(0.9); }
}
@keyframes ppNoDot {
  0%, 100% { opacity: 0; }
}
@keyframes ppChip { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes ppBarPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }

.pp-ring-a { animation: ppRingIn 2.6s cubic-bezier(0.4,0,0.9,0.4) infinite; transform-origin: center; }
.pp-ring-b { animation: ppRingIn 2.6s cubic-bezier(0.4,0,0.9,0.4) infinite 0.87s; transform-origin: center; }
.pp-ring-c { animation: ppSpikeIn 2.6s cubic-bezier(0.4,0,0.9,0.4) infinite 1.74s; transform-origin: center; }
.pp-badge  { animation: ppBadgePulse 1.3s ease-in-out infinite; transform-origin: center; }
.pp-tapdot { animation: ppTapDot 2.6s ease-out infinite; transform-origin: center; }
.pp-chip   { animation: ppChip 420ms ease-out both; }
.pp-bar i  { animation: ppBarPulse 1.1s ease-in-out infinite; }
.pp-bar i:nth-child(2) { animation-delay: 0.14s; }
.pp-bar i:nth-child(3) { animation-delay: 0.28s; }
.pp-bar i:nth-child(4) { animation-delay: 0.42s; }

/* How-to beat demos */
@keyframes ppDemoRing { 0% { r: 30; opacity: 0; } 12% { opacity: 1; } 76% { r: 11; opacity: 1; } 88%, 100% { r: 11; opacity: 0; } }
@keyframes ppDemoHit  { 0%, 74% { opacity: 0; transform: scale(0.4); } 82% { opacity: 1; transform: scale(1.5); } 100% { opacity: 0; transform: scale(1.9); } }
@keyframes ppDemoPass { 0% { r: 30; opacity: 0; } 12% { opacity: 1; } 76% { r: 11; opacity: 1; } 92%, 100% { r: 3; opacity: 0; } }
.pp-demo-ring { animation: ppDemoRing 2.2s ease-in infinite; }
.pp-demo-hit  { animation: ppDemoHit 2.2s ease-out infinite; transform-origin: center; }
.pp-demo-pass { animation: ppDemoPass 2.2s ease-in infinite; }

@media (prefers-reduced-motion: reduce) {
  .pp-ring-a, .pp-ring-b, .pp-ring-c, .pp-badge, .pp-tapdot, .pp-chip,
  .pp-bar i, .pp-demo-ring, .pp-demo-hit, .pp-demo-pass {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
  }
}
`;

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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function HomeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.8V21h14V9.8" />
    </svg>
  );
}

/** Won: a metronome at rest, on the beat. */
function MetronomeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 5h8l5 22H7z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 25 21 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="19.6" cy="13" r="2.4" fill="#fff" />
    </svg>
  );
}

/** Lost: a broken beat. */
function BrokenBeatIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 16h6l3-7 3 12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9 26 23M26 9 20 23" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** The policy badge, drawn the way the canvas draws it. */
function BadgeMark({ size = 60, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ppBadgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ORANGE_LT} />
          <stop offset="55%" stopColor={ORANGE} />
          <stop offset="100%" stopColor="#B3400E" />
        </linearGradient>
      </defs>
      <path d="M24 6 38 11v12c0 9-6 15.5-14 19-8-3.5-14-10-14-19V11z"
        fill="url(#ppBadgeGrad)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
      <circle cx="24" cy="22" r="9" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.1" />
      <path d="m18 23 4.4 4.4L31 18" fill="none" stroke="#fff" strokeWidth="3.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  // Randomised ONCE, in a lazy state initialiser.
  //
  // ResultsScreen runs a 16 ms interval for 1.2 s to animate the score counter,
  // which re-renders this child ~75 times. Generating the positions in the
  // render body (the scaffold's shape) gave all 26 pieces new left/rotation/
  // duration on every one of those renders against stable keys, so React kept
  // rewriting the same DOM nodes and the confetti flickered in place instead of
  // falling — on every win.
  const [pieces] = React.useState(() => {
    const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN_LT, BLUE_PALE];
    return Array.from({ length: 26 }, (_, i) => ({
      left: Math.random() * 100,
      dur: 2 + Math.random() * 2,
      delay: Math.random() * 1.5,
      rot: Math.random() * 360,
      color: colors[i % colors.length],
    }));
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            background: p.color,
            '--dur': `${p.dur}s`,
            '--delay': `${p.delay}s`,
            top: -20,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
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
        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.035em',
          lineHeight: 1,
          margin: '0 0 7px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 800,
          color: ORANGE_LT,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          margin: 0,
        }}>
          A premium on every beat
        </p>
      </div>

      {/* The mechanic, as one picture: rings contracting onto the badge. */}
      <div style={{ position: 'relative', width: 232, height: 232, zIndex: 1 }}>
        <svg width="232" height="232" viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
          {/* Approach corridor */}
          {[54, 42, 30].map((r) => (
            <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="rgba(190,224,255,0.09)" strokeWidth="0.7" />
          ))}
          {[0, 90, 180, 270].map((a) => (
            <line
              key={a}
              x1={60 + Math.cos((a * Math.PI) / 180) * 20}
              y1={60 + Math.sin((a * Math.PI) / 180) * 20}
              x2={60 + Math.cos((a * Math.PI) / 180) * 56}
              y2={60 + Math.sin((a * Math.PI) / 180) * 56}
              stroke="rgba(190,224,255,0.10)"
              strokeWidth="0.7"
            />
          ))}

          {/* Two blue premiums and one red temptation, contracting in sequence */}
          <g className="pp-ring-a">
            <circle cx="60" cy="60" r="52" fill="none" stroke={BLUE_LT} strokeWidth="2.6" />
            {[0, 90, 180, 270].map((a) => (
              <circle
                key={a}
                cx={60 + Math.cos((a * Math.PI) / 180) * 52}
                cy={60 + Math.sin((a * Math.PI) / 180) * 52}
                r="2.2"
                fill={BLUE_PALE}
              />
            ))}
          </g>
          <g className="pp-ring-b">
            <circle cx="60" cy="60" r="52" fill="none" stroke={GOLD} strokeWidth="2.6" />
            {[0, 90, 180, 270].map((a) => (
              <circle
                key={a}
                cx={60 + Math.cos((a * Math.PI) / 180) * 52}
                cy={60 + Math.sin((a * Math.PI) / 180) * 52}
                r="2.2"
                fill={GOLD_LT}
              />
            ))}
          </g>
          <g className="pp-ring-c">
            <path
              d={spikePath(60, 60, 52, 42, 16)}
              fill="none"
              stroke={DANGER}
              strokeWidth="2.2"
              strokeLinejoin="miter"
            />
          </g>

          {/* Hit line */}
          <circle cx="60" cy="60" r="20" fill="none" stroke={ORANGE_LT} strokeWidth="1.5" opacity="0.75" />
          {[0, 90, 180, 270].map((a) => (
            <line
              key={a}
              x1={60 + Math.cos((a * Math.PI) / 180) * 17}
              y1={60 + Math.sin((a * Math.PI) / 180) * 17}
              x2={60 + Math.cos((a * Math.PI) / 180) * 23}
              y2={60 + Math.sin((a * Math.PI) / 180) * 23}
              stroke={ORANGE}
              strokeWidth="1.6"
            />
          ))}

          {/* Tap flash on the beat */}
          <circle className="pp-tapdot" cx="60" cy="60" r="24" fill="none" stroke={GOLD_LT} strokeWidth="1.6" />
        </svg>

        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <BadgeMark size={62} className="pp-badge" />
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 10 }}>
        <div className="pp-bar" style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {[0, 1, 2, 3].map((i) => (
            <i
              key={i}
              style={{
                display: 'block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: i === 0 ? ORANGE_LT : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
          <span style={{
            marginLeft: 8,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
          }}>
            96 · 112 · 126 BPM
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, type: 'spring', damping: 20, stiffness: 180 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <button
            type="button"
            onClick={onStart}
            className="pp-cta"
            style={{
              width: '100%',
              maxWidth: 320,
              height: 60,
              border: 'none',
              borderRadius: 12,
              fontSize: 20,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
              boxShadow: '0 6px 20px rgba(242,101,34,0.4)',
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

/** Star-polygon path for the temptation ring. */
function spikePath(cx, cy, outer, inner, spikes) {
  let d = '';
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = (cx + Math.cos(a) * r).toFixed(2);
    const y = (cy + Math.sin(a) * r).toFixed(2);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }
  return `${d}Z`;
}

/* ═══════════════════════════════════════════════════════ */
function Beat({ n, title, copy, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 11px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.10)',
      textAlign: 'left',
    }}>
      <div style={{ flex: '0 0 74px', display: 'flex', justifyContent: 'center' }}>{children}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
          <span style={{ color: ORANGE_LT, marginRight: 6 }}>{n}.</span>
          {title}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.66)', lineHeight: 1.35, marginTop: 2 }}>
          {copy}
        </div>
      </div>
    </div>
  );
}

/** Shared mini-arena for the how-to-play beats. */
function DemoArena({ children }) {
  return (
    <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
      <circle cx="37" cy="31" r="27" fill="none" stroke="rgba(190,224,255,0.10)" strokeWidth="0.8" />
      <circle cx="37" cy="31" r="19" fill="none" stroke="rgba(190,224,255,0.08)" strokeWidth="0.8" />
      <circle cx="37" cy="31" r="11" fill="none" stroke={ORANGE_LT} strokeWidth="1.2" opacity="0.75" />
      {children}
      <g transform="translate(37,31)">
        <path d="M0 -7.5 6 -5v6c0 4.4-3 7.6-6 9.2-3-1.6-6-4.8-6-9.2v-6z"
          fill={ORANGE} stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
        <path d="m-2.6 0.4 2 2 3.8-4.2" fill="none" stroke="#fff" strokeWidth="1.4"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const cfg = GAME_CONFIG;
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
        background: 'rgba(3,16,42,0.72)',
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
          Tap the blue &middot; Skip the red &middot; Stay on the beat
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Meet the premium" copy="A blue ring closes on the badge. Tap the moment it touches the outline.">
            <DemoArena>
              <circle className="pp-demo-ring" cx="37" cy="31" r="30" fill="none" stroke={BLUE_LT} strokeWidth="2.2" />
              <circle className="pp-demo-hit" cx="37" cy="31" r="12" fill="none" stroke={GOLD_LT} strokeWidth="1.8" />
            </DemoArena>
          </Beat>

          <Beat n="2" title="Let the spikes pass" copy="Red spiked rings are impulse buys. Touch one and the beat is broken; ignore it and it pays.">
            <DemoArena>
              <path className="pp-demo-pass" d={spikePath(37, 31, 26, 21, 12)}
                fill="none" stroke={DANGER} strokeWidth="1.8" strokeLinejoin="miter" />
            </DemoArena>
          </Beat>

          <Beat n="3" title="Keep the streak" copy="Every clean beat builds the combo. Ten in a row doubles a PERFECT, twenty triples it.">
            <DemoArena>
              <circle className="pp-demo-ring" cx="37" cy="31" r="30" fill="none" stroke={GOLD} strokeWidth="2.2" />
              <g className="pp-demo-hit" transform="translate(37,31)">
                <circle r="14" fill="none" stroke={ORANGE_LT} strokeWidth="1.6" />
                <circle r="18" fill="none" stroke={GOLD_LT} strokeWidth="1" opacity="0.7" />
              </g>
            </DemoArena>
          </Beat>
        </div>

        {/* The two rules a player most often learns the hard way. 4.04 of the
            5.72 misses in an average run come from a tap that was mistimed or
            aimed at nothing, so saying so up front is worth more than any other
            sentence on this screen. The one-finger note is a real constraint:
            the shared input kit tracks a single pointer and ignores a second
            finger's pointerdown while the first is down. */}
        <p style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: '#fff',
          background: 'rgba(239,68,68,0.14)',
          border: '1px solid rgba(239,68,68,0.34)',
          borderRadius: 12,
          padding: '9px 11px',
          margin: '0 0 12px 0',
          lineHeight: 1.45,
          textAlign: 'left',
        }}>
          <strong style={{ color: DANGER }}>A miss is any tap that isn&rsquo;t on a blue ring.</strong>{' '}
          Too early, too late, on a red ring, or on nothing at all &mdash; they all cost you one.
          Missing a blue ring entirely costs one too.{' '}
          <strong style={{ color: '#fff' }}>Use one finger:</strong> a second finger on the glass is ignored
          while the first is down.
        </p>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>Three movements, 96 &rarr; 126 BPM.</strong> Reach{' '}
          <strong style={{ color: GOLD }}>{cfg.targetScore.toLocaleString()}</strong> points to win &mdash;{' '}
          <strong style={{ color: DANGER }}>{cfg.maxMisses}</strong> missed beats and the cover lapses. Every 8th beat
          is a <strong style={{ color: GOLD_LT }}>bonus double</strong>: two premiums, half a beat apart.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {[
            { k: 'p', label: `Perfect ≤${cfg.judge.perfectMs}ms +${cfg.scoring.perfect}`, color: GOLD_LT },
            { k: 'g', label: `Good ≤${cfg.judge.goodMs}ms +${cfg.scoring.good}`, color: BLUE_PALE },
            { k: 's', label: `Skipped temptation +${cfg.scoring.redAvoided}`, color: GREEN_LT },
            { k: 'c', label: 'Combo up to x3', color: ORANGE_LT },
          ].map((c, i) => (
            <span
              key={c.k}
              className="pp-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: c.color,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {c.label}
            </span>
          ))}
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            className="pp-cta"
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${BLUE_LT} 0%, ${BLUE} 100%)`,
              boxShadow: '0 4px 16px rgba(0,91,172,0.45)',
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

/* ═══════════════════════════════════════════════════════ */
function StatTile({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '11px 8px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.10)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 8.5,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.5)',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 21,
        fontWeight: 900,
        color: accent,
        marginTop: 3,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const cfg = GAME_CONFIG;
  const score = stats?.score || 0;
  const perfects = stats?.perfects || 0;
  const bestCombo = stats?.bestCombo || 0;
  const misses = stats?.misses || 0;

  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  // Two different losses. The 8th miss is a lapse; running out of track below
  // the target is the commoner one and is the opposite story — every beat you
  // played was covered, there just were not enough of them. `lapsed` comes from
  // the game so this chip can never contradict the "Missed n/8" tile below it.
  const lapsed = stats?.lapsed ?? (misses >= cfg.maxMisses);

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
    const increment = end / (duration / stepTime);
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
    const shareMessage = `Hi,\nI scored ${score} points in the ${GAME_TITLE} challenge — ${perfects} premiums paid right on the beat.\nStay in rhythm, stay covered: ${shareUrl}`.trim();

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
  const strokeColor = won ? '#22C55E' : score < RESULT_TARGET_SCORE * 0.45 ? DANGER : ORANGE;
  const glowColor = won ? 'rgba(34,197,94,0.45)' : score < RESULT_TARGET_SCORE * 0.45
    ? 'rgba(239,68,68,0.4)' : 'rgba(242,105,34,0.4)';

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
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 999,
          background: won ? 'rgba(34,197,94,0.18)' : lapsed ? 'rgba(239,68,68,0.18)' : 'rgba(242,105,34,0.18)',
          border: `1px solid ${won ? 'rgba(34,197,94,0.5)' : lapsed ? 'rgba(239,68,68,0.5)' : 'rgba(242,105,34,0.5)'}`,
          marginBottom: 10,
        }}>
          {won ? <MetronomeIcon size={18} /> : <BrokenBeatIcon size={18} />}
          <span style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#fff',
          }}>
            {won ? 'In rhythm' : lapsed ? 'Cover lapsed' : 'Premiums short'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: 800 }}>Your Score</span>
        </p>
        {!won && (
          <p style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: 12.5,
            fontWeight: 700,
            lineHeight: 1.4,
            margin: '8px 0 0',
          }}>
            {lapsed
              ? `${misses} missed beats — the cover lapsed before the track ran out.`
              : `${score.toLocaleString()} of ${RESULT_TARGET_SCORE.toLocaleString()} — the cover held, the payments did not add up.`}
          </p>
        )}
      </div>

      {/* Score ring — closes exactly at the win line */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, zIndex: 2 }}>
        <div style={{ width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(3,16,42,0.85)" strokeWidth="11" />
            <circle cx="100" cy="100" r={radius + 7} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 29, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              POINTS
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, perfects, bestCombo, misses} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Perfect" value={perfects} accent={GOLD_LT} />
        <StatTile label="Best combo" value={`x${bestCombo}`} accent={ORANGE_LT} />
        <StatTile label="Missed" value={`${misses}/${cfg.maxMisses}`} accent={DANGER} />
      </div>

      <button
        onClick={handleShare}
        className="pp-cta"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_LT, color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(59,141,212,0.4)',
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
          A premium on every beat &mdash; stay in rhythm, skip the temptations, and your cover never misses.
          A specialist can set that rhythm up once and leave it running.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              className="pp-cta"
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

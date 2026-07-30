// Screens.jsx — Home, How to Play, and Results screens for Risk Radar.
// All art is inline SVG or CSS: no image files, no emoji sprites.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG } from './data.js';

const GAME_TITLE = 'Risk Radar';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   stay bright and glassmorphic; only the canvas is pitch dark. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const DANGER = '#EF4444';
const CYAN = '#60CDFF';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 26%, rgba(30,107,224,0.4), rgba(11,18,33,0.97) 70%), #0B1221';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Won: the family under the gold shelter light. */
function ShelterIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 3 4 12v2h24v-2L16 3z" fill={GOLD} opacity="0.9" />
      <circle cx="10" cy="21" r="3" fill="#fff" opacity="0.9" />
      <circle cx="16" cy="19.5" r="3.4" fill="#fff" />
      <circle cx="22" cy="21" r="3" fill="#8FC6FF" />
      <path d="M6 28c1-3.4 4.6-4.6 10-4.6s9 1.2 10 4.6" stroke="#fff" strokeWidth="2"
        strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

/** Lost on hearts: the radar contact that got through. */
function CaughtIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="12" stroke={DANGER} strokeWidth="2" opacity="0.5" />
      <circle cx="16" cy="16" r="7" stroke={DANGER} strokeWidth="2" opacity="0.75" />
      <circle cx="16" cy="16" r="2.6" fill={DANGER} />
      <path d="M23 9 9 23" stroke={DANGER} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Lost on the clock: the sweep ran out of night. */
function TimeoutIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="17" r="11" stroke={GOLD} strokeWidth="2.2" opacity="0.55" />
      <path d="M16 10v7l4.5 3" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 3h10" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
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
@keyframes rrTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes rrFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes rrChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes rrPing    { 0% { r: 8; opacity: 0.95; } 100% { r: 86; opacity: 0; } }
@keyframes rrPingSm  { 0% { r: 4; opacity: 0.8; } 100% { r: 34; opacity: 0; } }
@keyframes rrWall    { 0%, 18% { opacity: 0; } 30% { opacity: 1; } 62% { opacity: 1; } 86%, 100% { opacity: 0; } }
@keyframes rrExit    { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
@keyframes rrFinger  { 0%,44% { opacity: 0; transform: translateY(8px); } 52% { opacity: 1; transform: translateY(0); } 70%,100% { opacity: 0; transform: translateY(0); } }
@keyframes rrWalk    { 0% { transform: translate(0,0); } 100% { transform: translate(26px,-18px); } }
@keyframes rrLurk    { 0%,35% { transform: translate(0,0); } 80%,100% { transform: translate(-22px,10px); } }
.rr-title { animation: rrTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.rr-float { animation: rrFloat 4s ease-in-out infinite; }
.rr-chip  { animation: rrChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rr-ping   { animation: rrPing 2.6s cubic-bezier(0.1,0.6,0.4,1) infinite; }
.rr-ping-2 { animation: rrPing 2.6s cubic-bezier(0.1,0.6,0.4,1) 0.85s infinite; }
.rr-ping-sm { animation: rrPingSm 3.2s ease-out infinite; }
.rr-wall   { animation: rrWall 2.6s ease-out infinite; }
.rr-exit   { animation: rrExit 2s ease-in-out infinite; }
.rr-finger { animation: rrFinger 2.6s ease-in-out infinite; }
.rr-walk   { animation: rrWalk 2.2s ease-in-out infinite alternate; }
.rr-lurk   { animation: rrLurk 3.4s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) {
  .rr-title, .rr-float, .rr-chip, .rr-ping, .rr-ping-2, .rr-ping-sm, .rr-wall,
  .rr-exit, .rr-finger, .rr-walk, .rr-lurk { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, '#FFE38A', ORANGE_LT, BLUE_LT, BLUE, GREEN, CYAN];
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
 * Hero motif: the game in one frame — a pitch-dark card, the family in the
 * middle, sonar rings expanding, wall fragments that light only as the ring
 * passes, a red lurker announcing itself with its gray ring, and the gold
 * shelter light in the corner. Same reveal grammar the canvas uses.
 */
function HeroRadar() {
  return (
    <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <radialGradient id="rrDarkWell" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0%" stopColor="#0A1730" />
          <stop offset="100%" stopColor="#03060C" />
        </radialGradient>
        <clipPath id="rrClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
      </defs>

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#rrDarkWell)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#rrClip)">
        {/* Sonar rings from the family */}
        <circle className="rr-ping" cx="92" cy="102" r="8" fill="none" stroke={CYAN} strokeWidth="2.4" />
        <circle className="rr-ping-2" cx="92" cy="102" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />

        {/* Wall fragments — lit only while the wavefront passes */}
        <g stroke="#E8F1FF" strokeWidth="2.6" strokeLinecap="round">
          <path className="rr-wall" d="M40 62 L118 62" style={{ animationDelay: '0.28s' }} />
          <path className="rr-wall" d="M148 62 L164 62" style={{ animationDelay: '0.52s' }} />
          <path className="rr-wall" d="M36 62 L36 132" style={{ animationDelay: '0.36s' }} />
          <path className="rr-wall" d="M36 142 L110 142" style={{ animationDelay: '0.30s' }} />
          <path className="rr-wall" d="M132 142 L164 142" style={{ animationDelay: '0.48s' }} />
          <path className="rr-wall" d="M164 76 L164 142" style={{ animationDelay: '0.58s' }} />
        </g>

        {/* Spike pool — lit red on the sweep */}
        <g className="rr-wall" style={{ animationDelay: '0.44s' }}>
          <circle cx="140" cy="120" r="9" fill="rgba(255,90,90,0.32)" stroke="#FF5A5A" strokeWidth="1.6" />
          <path d="M140 113v-4M146 117l3-3M146 124l4 1M134 117l-3-3M134 124l-4 1" stroke="#FF5A5A" strokeWidth="1.4" strokeLinecap="round" />
        </g>

        {/* The lurker and its self-ring telegraph */}
        <g className="rr-lurk">
          <circle className="rr-ping-sm" cx="52" cy="118" r="4" fill="none" stroke="rgba(170,178,196,0.55)" strokeWidth="1.6" />
          <circle cx="52" cy="118" r="5.4" fill="#FF4D4D" opacity="0.9" />
          <circle cx="52" cy="118" r="2.2" fill="#7A0F0F" />
        </g>

        {/* Shelter — the gold light */}
        <g className="rr-exit">
          <circle cx="164" cy="52" r="16" fill="rgba(255,200,69,0.18)" />
          <path d="M164 42l-9 7v2h18v-2l-9-7z" fill={GOLD} />
          <rect x="159" y="51" width="10" height="8" rx="1.4" fill={GOLD} opacity="0.8" />
        </g>

        {/* The family — always visible; everything else must be earned */}
        <circle cx="86" cy="106" r="3" fill="#8FC6FF" />
        <circle cx="80" cy="109" r="2.6" fill="#8FC6FF" opacity="0.85" />
        <circle cx="92" cy="102" r="4.4" fill="#fff" />

        {/* The tap that fires the pulse */}
        <g className="rr-finger">
          <circle cx="92" cy="102" r="7" fill="none" stroke="#fff" strokeWidth="1.8" opacity="0.9" />
          <circle cx="92" cy="102" r="15" fill="none" stroke="#fff" strokeWidth="1" opacity="0.35" />
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
        <h1 className="rr-title" style={{
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
          maxWidth: 320,
          lineHeight: 1.45,
        }}>
          You can&rsquo;t see risks coming &mdash; your cover can. Send out the radar and walk the family home.
        </p>
      </div>

      <div className="rr-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <HeroRadar />
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

/** A miniature dark frame for the tutorial diagrams. */
function BeatFrame({ children }) {
  return (
    <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
      <rect x="1" y="1" width="72" height="60" rx="10" fill="#04070E" stroke="rgba(255,255,255,0.14)" />
      {children}
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
          Tap to pulse &middot; Hold to walk &middot; Reach the shelter with a heart left
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Tap: send the radar" copy="The maze is pitch dark. A tap fires a sound wave — walls light only where the ring touches, then fade. One pulse every 1.6s.">
            <BeatFrame>
              <circle className="rr-ping-sm" cx="37" cy="34" r="4" fill="none" stroke={CYAN} strokeWidth="1.8" />
              <path className="rr-wall" d="M14 16 L60 16" stroke="#E8F1FF" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: '0.4s' }} />
              <path className="rr-wall" d="M14 50 L60 50" stroke="#E8F1FF" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: '0.5s' }} />
              <circle cx="37" cy="34" r="3.4" fill="#fff" />
            </BeatFrame>
          </Beat>

          <Beat n="2" title="Hold: walk the family" copy="Hold and drag — you walk toward your finger, and two family members follow your exact footsteps. Spikes and dead ends punish blind rushing.">
            <BeatFrame>
              <path d="M18 44 Q30 40 48 26" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeDasharray="3 4" fill="none" />
              <g className="rr-walk">
                <circle cx="14" cy="47" r="2.4" fill="#8FC6FF" opacity="0.85" />
                <circle cx="19" cy="45" r="2.6" fill="#8FC6FF" />
                <circle cx="25" cy="42" r="3.6" fill="#fff" />
              </g>
              <circle className="rr-finger" cx="50" cy="24" r="5" fill="none" stroke="#fff" strokeWidth="1.6" />
            </BeatFrame>
          </Beat>

          <Beat n="3" title="Noise is heard" copy="Lurkers hunt the spot you pulsed from — fire, then move on. They always announce themselves: gray rings, and a shriek before any lunge.">
            <BeatFrame>
              <g className="rr-lurk" style={{ animationDuration: '2.4s' }}>
                <circle className="rr-ping-sm" cx="52" cy="22" r="3" fill="none" stroke="rgba(170,178,196,0.55)" strokeWidth="1.4" style={{ animationDuration: '2.2s' }} />
                <circle cx="52" cy="22" r="4.6" fill="#FF4D4D" />
                <circle cx="52" cy="22" r="1.8" fill="#7A0F0F" />
              </g>
              <circle className="rr-ping-sm" cx="22" cy="42" r="4" fill="none" stroke={CYAN} strokeWidth="1.6" style={{ animationDelay: '0.6s' }} />
              <circle cx="22" cy="42" r="2" fill="none" stroke={CYAN} strokeWidth="1" opacity="0.6" />
              <path d="M46 26 L28 38" stroke="rgba(255,90,90,0.5)" strokeWidth="1.4" strokeDasharray="3 3" strokeLinecap="round" />
            </BeatFrame>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{cfg.sessionSeconds} seconds</strong> and{' '}
          <strong style={{ color: DANGER }}>{cfg.hearts} hearts</strong>. Getting caught costs a heart
          and sends the family back to the last of the{' '}
          <strong style={{ color: GREEN_LT }}>{cfg.maze.gates.length} checkpoints</strong>.{' '}
          <strong style={{ color: CYAN }}>{cfg.maze.orbs.length} hidden orbs</strong> glint only
          while a pulse sweeps them.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {[
            { k: 'h', label: `+${cfg.scoring.perHeart} per heart`, color: DANGER },
            { k: 't', label: `+${cfg.scoring.perSecondRemaining} x seconds left`, color: GREEN_LT },
            { k: 'o', label: `+${cfg.scoring.perOrb} per orb`, color: CYAN },
            { k: 'q', label: `Quiet +${cfg.scoring.quietBonus} (${'≤'}${cfg.scoring.quietMaxPulses} pulses)`, color: GOLD },
          ].map((c, i) => (
            <span
              key={c.k}
              className="rr-chip"
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

export function ResultsScreen({ stats, won, endCause, onRetry, onHome, onBookSlot, retryLabel }) {
  const cfg = GAME_CONFIG;
  const score = stats?.score || 0;
  const hearts = stats?.hearts ?? 0;
  const pulsesUsed = stats?.pulsesUsed || 0;
  const orbs = stats?.orbs || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';
  /* Two different losses, two different lessons: the risks caught up with the
     family, or the night simply outlasted a too-cautious sweep. */
  const timedOut = !won && endCause === 'time';

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
    const shareMessage = `Hi,\nI guided my family through the dark with ${hearts} heart${hearts === 1 ? '' : 's'} to spare and scored ${score.toLocaleString()} in the ${GAME_TITLE} challenge.\nYou can't see risks coming - cover is the radar that can. Take your turn here: ${shareUrl}`.trim();

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
  const target = cfg.scoring.resultRingTarget;
  const progress = (Math.min(score, target) / target) * circumference;
  const weak = score < target * 0.4;
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
          {won ? <ShelterIcon size={20} /> : timedOut ? <TimeoutIcon size={20} /> : <CaughtIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Family safely home' : timedOut ? 'Lost in the dark' : 'The risks caught up'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
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

      {/* Run stats — the {score, hearts, pulsesUsed, orbs} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Hearts left" value={`${hearts}/${cfg.hearts}`} accent={DANGER} />
        <StatTile label="Pulses" value={pulsesUsed} accent={CYAN} />
        <StatTile label="Orbs found" value={`${orbs}/${cfg.maze.orbs.length}`} accent={GOLD} />
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
          In real life the risks stay invisible until they hit. The right cover is the radar that
          sees them first &mdash; a specialist can map yours in one call.
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

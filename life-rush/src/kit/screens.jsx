// screens.jsx — the shared screen furniture every title inherits.
//
// The portfolio drifted: the approved game says "Call Now" above an OR divider
// above "Book a Slot", and most titles here say "Call Specialist" below the
// booking button with no divider. Divergence like that is what makes 37 games
// read as 37 vendors. These components are the single source of truth; copy is
// fixed, only the per-game message line varies.
//
// Deliberately dependency-free (no framer-motion) so it drops into every title
// regardless of which React major or animation library that title uses.

import React from 'react';

/* ─── Icons ──────────────────────────────────────────────────────────── */

export function PhoneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function CalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

/* ─── Relationship-manager CTA ───────────────────────────────────────── */

/**
 * Exact structure and copy from the approved title: Call Now, an OR divider,
 * then Book a Slot. Call Now only renders when an employee number was passed
 * into the session, which is why the divider is tied to the same condition.
 */
export function RMActionCard({ message, onBookSlot }) {
  const empPhone =
    (typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('gamification_emp_mobile')) || '';

  return (
    <div style={{
      width: '100%', maxWidth: 360,
      background: 'rgba(15, 23, 42, 0.75)',
      WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
      borderRadius: 24, padding: '20px 18px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      marginBottom: 20,
    }}>
      <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
        {message}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {empPhone && (
          <a href={`tel:${empPhone}`} style={{
            background: '#F59E0B', color: '#000', fontWeight: 900,
            padding: '15px 20px', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 17, textDecoration: 'none', textTransform: 'uppercase',
            border: '1px solid #fbbf24', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
          }}>
            <PhoneIcon /><span>Call Now</span>
          </a>
        )}

        {empPhone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', fontSize: 9, letterSpacing: '0.15em' }}>OR</span>
            <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>
        )}

        <button onClick={onBookSlot} style={{
          background: '#16A34A', color: '#fff', fontWeight: 900,
          padding: '15px 20px', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 17, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
        }}>
          <CalendarIcon size={18} /><span>Book a Slot</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Disclaimer ─────────────────────────────────────────────────────── */

export const DISCLAIMER_TEXT =
  'The results shown in this game are indicative and based solely on the information provided by the participant. ' +
  'They are intended for engagement and awareness purposes only and do not constitute financial advice or a ' +
  'recommendation to purchase any life insurance product. Participants should seek independent professional advice ' +
  'before making any financial or insurance decisions. While due care has been taken in designing the game, ' +
  'Bajaj Life Insurance Ltd. assumes no liability for its outcomes.';

export function Disclaimer() {
  return (
    <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
      <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
        <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
        {DISCLAIMER_TEXT}
      </p>
    </div>
  );
}

/* ─── Score dial ─────────────────────────────────────────────────────── */

/**
 * mode: 'points' | 'percent' | 'yesno'
 * Percent and yes/no exist because not every title has a meaningful score —
 * a puzzle that is solved or not should not be dressed up as a number.
 */
export function ScoreDial({ mode = 'points', value = 0, target = 1000, pass = false, caption }) {
  const isYesNo = mode === 'yesno';
  const pct = isYesNo
    ? (pass ? 100 : 0)
    : mode === 'percent'
      ? Math.max(0, Math.min(100, value))
      : Math.min(value, target) / target * 100;

  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const end = isYesNo ? (pass ? 1 : 0) : value;
    if (!end) { setShown(0); return; }
    let cur = 0;
    const steps = 1200 / 16;
    const inc = end / steps;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= end) { setShown(end); clearInterval(t); } else { setShown(Math.round(cur)); }
    }, 16);
    return () => clearInterval(t);
  }, [value, pass, isYesNo]);

  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const good = isYesNo ? pass : pct >= 30;
  const stroke = good ? '#22c55e' : '#ef4444';
  const glow = good ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
      <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
          <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
          <circle
            cx="100" cy="100" r={radius} fill="none"
            stroke={stroke} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (pct / 100) * circumference}
            style={{ filter: `drop-shadow(0 0 8px ${glow})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: isYesNo ? 34 : 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {isYesNo ? (pass ? 'YES' : 'NO') : mode === 'percent' ? `${Math.round(shown)}%` : shown.toLocaleString()}
          </span>
          <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {caption || (isYesNo ? 'Result' : mode === 'percent' ? 'Complete' : 'Points')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── How to Play frame ──────────────────────────────────────────────── */

/**
 * Fixed vertical order per the brief: title, animated demo, one-line goal,
 * start button. The demo is passed in as children because it has to be a
 * recreation of that specific game — a generic diagram would defeat the point.
 */
export function HowToPlayFrame({ goal, onPlay, children, startLabel = 'Start' }) {
  return (
    <div className="screen-enter" style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflowY: 'auto',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(14,79,148,0.55), rgba(5,26,58,0.85) 70%), #051a3a',
    }}>
      <h2 style={{
        fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em',
        margin: '0 0 18px', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      }}>
        How to Play
      </h2>

      <div style={{
        width: '100%', maxWidth: 340, minHeight: 210,
        position: 'relative', borderRadius: 20, overflow: 'hidden',
        background: 'rgba(10,19,32,0.55)', border: '1px solid rgba(255,255,255,0.10)',
        marginBottom: 18,
      }}>
        {children}
      </div>

      <div style={{
        width: '100%', maxWidth: 340, textAlign: 'center', marginBottom: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#FFB800', flexShrink: 0,
        }}>
          Goal
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3 }}>
          {goal}
        </span>
      </div>

      <button onClick={onPlay} style={{
        width: '100%', maxWidth: 280, height: 56,
        background: '#00529B', color: '#fff', fontWeight: 900, fontSize: 17,
        border: 'none', borderRadius: 999, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        boxShadow: '0 4px 0 #003B71, 0 8px 18px rgba(0,0,0,0.35)',
      }}>
        {startLabel}
      </button>
    </div>
  );
}

/**
 * Positive / negative markers for the how-to-play demo. The brief asks the
 * tutorial to show what scores and what hurts, using the game's own visuals
 * rather than a written explanation.
 */
export function Marker({ kind = 'pos', x, y, label, size = 26 }) {
  const pos = kind === 'pos';
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
      display: 'flex', alignItems: 'center', gap: 6, zIndex: 20, pointerEvents: 'none',
    }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: pos ? '#16A34A' : '#EF4444',
        border: `2px solid ${pos ? '#4ADE80' : '#FCA5A5'}`,
        boxShadow: `0 0 12px ${pos ? 'rgba(22,163,74,0.6)' : 'rgba(239,68,68,0.6)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 900, fontSize: size * 0.62, lineHeight: 1,
      }}>
        {pos ? '+' : '−'}
      </div>
      {label && (
        <span style={{
          fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
          color: pos ? '#4ADE80' : '#FCA5A5',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ─── Thumbnail / landing screen ─────────────────────────────────────── */

/** Static thumbnail plus a single Play button. No motion, no copy. */
export function ThumbnailScreen({ thumbnail, onPlay, playLabel = 'Play' }) {
  return (
    <div className="screen-enter" style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 24px 64px', overflow: 'hidden',
      backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
      backgroundColor: '#101D2E',
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      <button onClick={onPlay} style={{
        width: '100%', maxWidth: 320, height: 68,
        background: '#00529B', color: '#fff',
        fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.05em',
        border: 'none', borderRadius: 999, cursor: 'pointer',
        boxShadow: '0 4px 0 #003B71, 0 10px 24px rgba(0,0,0,0.45)',
      }}>
        {playLabel}
      </button>
    </div>
  );
}

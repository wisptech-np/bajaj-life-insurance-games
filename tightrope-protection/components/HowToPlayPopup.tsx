import React from 'react';
import { CloseIcon, GustIcon, HandIcon } from './Icons';

interface Props {
  onStart: () => void;
  onClose: () => void;
}

/** Walker built from the same shapes the Phaser sprite uses. */
const DemoWalker: React.FC = () => (
  <g>
    <path d="M-19 -17 L19 -17" stroke="#F26522" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="-19" cy="-17" r="2.6" fill="#F26522" />
    <circle cx="19" cy="-17" r="2.6" fill="#F26522" />
    <path d="M-4 -16.6 L0 -14 L4 -16.6" stroke="#EDF3FF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M-3.6 -13.6 Q-4.6 -7 -3.2 -0.6 L3.2 -0.6 Q4.6 -7 3.6 -13.6 Z" fill="#EDF3FF" />
    <path d="M-3.4 -11.4 L3.4 -7.4" stroke="#003DA6" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="0.4" cy="-19" r="3.5" fill="#F3D2AE" />
    <path d="M-3.1 -19.4 a3.5 3.5 0 0 1 7 0 Z" fill="#003DA6" />
    <path d="M0 -0.6 L-4.4 1 M0 -0.6 L4.4 1" stroke="#0A2C6B" strokeWidth="3.1" strokeLinecap="round" />
    <ellipse cx="-4.4" cy="1" rx="2.5" ry="1.4" fill="#FFC845" />
    <ellipse cx="4.4" cy="1" rx="2.5" ry="1.4" fill="#FFC845" />
  </g>
);

/** Arrow glyphs used as the two input labels — no instruction sentences. */
const SwipeGlyph: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 20V5" stroke="#F26522" strokeWidth="2.4" strokeLinecap="round" />
    <path d="m6.5 10.5 5.5-5.5 5.5 5.5" stroke="#F26522" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HopGlyph: React.FC = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 18c4-11 14-11 18 0" stroke="#FFC845" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="12" cy="7.4" r="2.6" fill="#FFC845" />
    <path d="M2.5 21h19" stroke="#7E97BB" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const LABELS: { glyph: React.ReactNode; text: string }[] = [
  { glyph: <SwipeGlyph />, text: 'Swipe' },
  { glyph: <HopGlyph />, text: 'Tap to hop' },
  { glyph: <GustIcon size={22} />, text: 'Avoid gusts' },
];

const HowToPlayPopup: React.FC<Props> = ({ onStart, onClose }) => {
  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(1,4,10,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 'var(--s4)' }}
    >
      <div
        className="pop tp-glass relative w-full"
        style={{ maxWidth: 340, padding: 'var(--s5)', background: 'rgba(7,27,62,0.86)' }}
      >
        {/* corner light */}
        <div
          className="pointer-events-none absolute"
          style={{ top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(242,101,34,0.24)', filter: 'blur(42px)' }}
        />

        <button
          onClick={onClose}
          aria-label="Close"
          className="btn-press absolute flex items-center justify-center"
          style={{ top: 8, right: 8, width: 44, height: 44, background: 'transparent', borderRadius: 'var(--tp-r)' }}
        >
          <CloseIcon size={18} />
        </button>

        <h2
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--tp-text-2)',
            textAlign: 'center',
            marginBottom: 'var(--s4)',
          }}
        >
          How to Play
        </h2>

        {/* ── Looping demo: the only teaching surface ── */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: 168,
            borderRadius: 'var(--tp-r)',
            border: '1px solid var(--tp-stroke)',
            background: 'linear-gradient(180deg,#030913 0%,#071B3E 62%,#02060F 100%)',
          }}
        >
          <svg viewBox="0 0 260 168" width="100%" height="100%" aria-hidden="true">
            {/* skyline hint */}
            <g fill="#0A2450" opacity="0.7">
              <rect x="6" y="84" width="26" height="84" />
              <rect x="40" y="66" width="18" height="102" />
              <rect x="196" y="76" width="30" height="92" />
              <rect x="232" y="58" width="22" height="110" />
            </g>

            {/* lower cable */}
            <line x1="0" y1="138" x2="260" y2="138" stroke="#02060F" strokeWidth="6" />
            <line className="tp-rope-cold" x1="0" y1="137" x2="260" y2="137" stroke="#F26522" strokeWidth="3.2" />
            <line className="tp-rope-hot" x1="0" y1="137" x2="260" y2="137" stroke="#7E97BB" strokeWidth="2.4" opacity="0.55" />

            {/* upper cable */}
            <line x1="0" y1="108" x2="260" y2="108" stroke="#02060F" strokeWidth="6" />
            <line className="tp-rope-hot" x1="0" y1="107" x2="260" y2="107" stroke="#F26522" strokeWidth="3.2" />
            <line className="tp-rope-cold" x1="0" y1="107" x2="260" y2="107" stroke="#7E97BB" strokeWidth="2.4" opacity="0.55" />

            {/* the walker, anchored on the lower cable and driven by CSS */}
            <g className="tp-walker-demo" transform="translate(70 137)">
              <DemoWalker />
            </g>

            {/* the gust she hops over */}
            <g className="tp-gust-run" transform="translate(246 96)">
              <circle r="9" fill="#5B0E1E" />
              <circle r="9" fill="none" stroke="#FF5C78" strokeWidth="2.6" />
              <path d="M-3 -3.4 L0.8 0 L-3 3.4" stroke="#FFE3E9" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 -6 h13 M11 0 h17 M11 6 h11" stroke="#FF5C78" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </g>

            {/* a coin on the upper cable to show the reward */}
            <g transform="translate(178 92)">
              <circle r="8" fill="#E8A317" />
              <circle r="6.2" fill="#FFC845" />
              <path d="M-3 -2.6h6M-3 -0.4h6M1.4 -2.6c1.2 0 1.7.8 1.7 1.7 0 1.1-.9 2-2.2 2h-2.9l3.6 3.8" stroke="#8A5A05" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>

          {/* finger glyph performing the real input, over the walker */}
          <div
            className="tp-hand pointer-events-none absolute"
            style={{ left: '26%', top: '52%' }}
          >
            <HandIcon size={32} />
          </div>
        </div>

        {/* ── Three icon-led labels, nothing else ── */}
        <div
          className="flex items-start justify-between"
          style={{ marginTop: 'var(--s4)', gap: 'var(--s2)' }}
        >
          {LABELS.map((l) => (
            <div key={l.text} className="flex flex-1 flex-col items-center" style={{ gap: 6 }}>
              {l.glyph}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--tp-text-2)',
                  textAlign: 'center',
                  lineHeight: 1.25,
                }}
              >
                {l.text}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="btn-press tp-btn tp-btn-rope pulse-cta"
          style={{ marginTop: 'var(--s5)' }}
        >
          Play
        </button>
      </div>
    </div>
  );
};

export default HowToPlayPopup;

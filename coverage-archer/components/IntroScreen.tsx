// IntroScreen — title screen in the repo's shared design language:
// deep-blue gradient, glassmorphism plate, 12px gradient CTA, framer-motion entry.
import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  onPlay: () => void;
}

function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/* Hero plate — the archer against the four risks he actually shoots at. */
function ArcherHeroArt() {
  return (
    <svg width="240" height="240" viewBox="0 0 200 200" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="ga-cell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="ga-shard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="ga-weight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#3b1a86" />
        </linearGradient>
        <linearGradient id="ga-case" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Glass plate */}
      <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

      {/* ILLNESS — hex cell */}
      <g transform="translate(60 46)">
        <polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="url(#ga-cell)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
        <circle cx="0" cy="0" r="4" fill="#fff" />
      </g>

      {/* ACCIDENT — hazard shard */}
      <g transform="translate(132 40)">
        <polygon points="0,-15 14,10 -14,10" fill="url(#ga-shard)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M-2,-7 L3,0 L-3,3 L1,8" stroke="#3c1a04" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* DEBT — shackled weight */}
      <g transform="translate(158 92)">
        <ellipse cx="0" cy="-16" rx="4.5" ry="6" fill="none" stroke="#a5b4fc" strokeWidth="2" />
        <rect x="-14" y="-10" width="28" height="22" rx="5" fill="url(#ga-weight)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <rect x="-14" y="-3" width="28" height="3" fill="rgba(15,10,45,0.55)" />
        <circle cx="0" cy="4" r="3.2" fill="#D6C2FF" />
      </g>

      {/* JOB LOSS — split briefcase */}
      <g transform="translate(112 122)">
        <path d="M-16,-9 L-1,-9 L-3,0 L-1,9 L-16,9 Z" fill="url(#ga-case)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <path d="M16,-9 L2,-9 L0,0 L2,9 L16,9 Z" fill="url(#ga-case)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <path d="M-6,-13 a6 6 0 0 1 12 0" fill="none" stroke="#475569" strokeWidth="2" />
      </g>

      {/* Protection arrow arcing across the plate */}
      <path d="M44 152 Q100 60 150 74" fill="none" stroke="#00AEEF" strokeWidth="2" strokeDasharray="4 6" opacity="0.7" />
      <g transform="translate(150 74) rotate(18)">
        <line x1="-16" y1="0" x2="6" y2="0" stroke="#fff" strokeWidth="2.4" />
        <polygon points="6,-4.5 14,0 6,4.5" fill="#00AEEF" stroke="#fff" strokeWidth="0.8" />
        <polygon points="-16,0 -22,-5 -18,0 -22,5" fill="#003DA6" />
      </g>

      {/* Archer */}
      <g transform="translate(38 150)">
        <ellipse cx="0" cy="14" rx="9" ry="13" fill="#003DA6" />
        <circle cx="0" cy="-2" r="7.5" fill="#FFCDB2" />
        <path d="M-7.5 -2 a7.5 7.5 0 0 1 15 0" fill="#003DA6" />
        <path d="M-2,10 L2,10 L3,15 L0,18 L-3,15 Z" fill="#FACC15" />
        <path d="M10 -14 C 22 -4, 22 18, 10 28" stroke="#D97706" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <path d="M10 -14 L-2 7 L10 28" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" fill="none" />
        <rect x="-6" y="26" width="4.5" height="8" fill="#fff" />
        <rect x="1.5" y="26" width="4.5" height="8" fill="#fff" />
      </g>
    </svg>
  );
}

const IntroScreen: React.FC<Props> = ({ onPlay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden px-6 pb-14 pt-12"
      style={{ background: 'linear-gradient(180deg, #04122B 0%, #061839 48%, #0B2450 100%)' }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/3 h-36 w-36 rounded-full bg-[#00AEEF]/10 blur-[44px]" />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 h-40 w-40 rounded-full bg-[#F26522]/10 blur-[52px]" />

      {/* Title */}
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 inline-block rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#00AEEF]">
          Bajaj Life Insurance
        </div>
        <h1
          className="m-0 text-[32px] font-black uppercase leading-none tracking-tight text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        >
          Guardian Archer
        </h1>
        <p
          className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-[#00AEEF]"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          Precision Coverage
        </p>
      </div>

      {/* Hero */}
      <div className="relative z-[1] float flex items-center justify-center">
        <ArcherHeroArt />
      </div>

      {/* CTA */}
      <div className="relative z-10 flex w-full flex-col items-center gap-4">
        <div className="glass-card w-full max-w-[340px] px-4 py-3 text-center">
          <p className="text-[11px] font-bold leading-relaxed text-blue-100/85">
            Four risks. Twelve arrows. Two minutes.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onPlay}
          className="btn-primary"
          style={{ maxWidth: 320, height: 60, fontSize: 20 }}
        >
          <PlayIcon />
          <span>Start Game</span>
        </motion.button>

        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-200/50">
          Bajaj Life Protection Arcade
        </span>
      </div>
    </motion.div>
  );
};

export default IntroScreen;

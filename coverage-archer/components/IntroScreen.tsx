import React from 'react';

interface Props {
  onPlay: () => void;
}

/* Vector bow-and-shield hero illustration — no emoji sprites */
function BowShieldArt() {
  return (
    <svg width="150" height="150" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ga-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#28A745" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="ga-bow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Glow */}
      <circle cx="60" cy="60" r="52" fill="#00AEEF" opacity="0.08" />
      <circle cx="60" cy="60" r="40" fill="#28A745" opacity="0.08" />

      {/* Shield */}
      <path
        d="M60 18 L92 30 v26 c0 20 -14 34 -32 42 -18 -8 -32 -22 -32 -42 V30 Z"
        fill="url(#ga-shield)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.5"
      />
      <path d="M46 60 l10 10 l20 -22" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Bow overlay */}
      <path
        d="M30 96 C 58 84, 58 40, 38 22"
        stroke="url(#ga-bow)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="38" y1="22" x2="30" y2="96" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />
      {/* Arrow */}
      <line x1="24" y1="70" x2="86" y2="42" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M86 42 l-9 -1.5 l4.5 8 Z" fill="#00AEEF" stroke="#fff" strokeWidth="1" />
      <path d="M24 70 l-6 -4 l2 7 l-7 1 l6 4 Z" fill="#003DA6" />
    </svg>
  );
}

const IntroScreen: React.FC<Props> = ({ onPlay }) => {
  return (
    <div
      className="relative flex h-full w-full flex-col justify-between px-6 py-8"
      style={{
        background: 'linear-gradient(180deg, #030F26 0%, #061839 50%, #0b224d 100%)',
      }}
    >
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(3, 15, 38, 0.85) 0%, rgba(3, 15, 38, 0.4) 15%, rgba(3, 15, 38, 0) 32%, rgba(3, 15, 38, 0) 68%, rgba(3, 15, 38, 0.4) 85%, rgba(3, 15, 38, 0.85) 100%)',
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-1/3 left-1/4 w-36 h-36 bg-[#00AEEF]/10 rounded-full blur-[40px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-[#28A745]/10 rounded-full blur-[50px] pointer-events-none"></div>

      {/* Header card */}
      <div className="relative z-10 flex flex-col items-center pt-4 pb-5 px-6 bg-[#030F26]/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl max-w-[340px] mx-auto text-center pop">
        <div className="mb-2.5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#00AEEF] bg-[#00AEEF]/15 border border-[#00AEEF]/30 rounded-full">
          Bajaj Life Insurance
        </div>
        <h2 className="text-[10px] font-bold tracking-[0.1em] text-blue-200/90 uppercase mb-3.5">
          Aim True • Protect Your Future
        </h2>
        <h1 className="font-black tracking-tight leading-none text-white text-[2rem]">
          GUARDIAN
          <br />
          <span className="bg-gradient-to-r from-[#00AEEF] via-[#28A745] to-[#00AEEF] bg-clip-text text-transparent">
            ARCHER
          </span>
        </h1>
      </div>

      {/* Hero illustration */}
      <div className="flex-1 min-h-[140px] flex items-center justify-center relative z-10 pointer-events-none">
        <div className="w-40 h-40 rounded-full border border-white/10 bg-gradient-to-br from-[#00AEEF]/15 to-[#28A745]/15 flex items-center justify-center float relative">
          <BowShieldArt />
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex flex-col gap-4 items-center pb-2 w-full">
        <div className="w-full max-w-[340px] bg-[#030F26]/75 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-2xl text-center">
          <p className="text-[10.5px] font-bold text-blue-100/90 leading-relaxed mb-3">
            Risk viruses are floating in! Take precise aim with your Protection Arrows and
            neutralize every threat — 12 arrows, 2 minutes, 3 waves. Nothing fires back;
            only your precision counts.
          </p>

          <button
            onClick={onPlay}
            className="btn-press w-full rounded-full py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_6px_24px_rgba(40,167,69,0.45)] transition-all"
            style={{
              background: 'linear-gradient(135deg, #28A745 0%, #16A34A 100%)',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            Play Game
          </button>
        </div>

        <span
          className="text-[9px] text-blue-200/50 uppercase tracking-widest font-bold"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          Bajaj Life Protection Arcade
        </span>
      </div>
    </div>
  );
};

export default IntroScreen;

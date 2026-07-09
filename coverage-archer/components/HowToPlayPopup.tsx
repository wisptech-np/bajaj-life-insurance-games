import React from 'react';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

/* Small vector virus for the tutorial mock (no emoji) */
function MiniVirus({ size = 34, x, y, bounce = false }: { size?: number; x: string; y: string; bounce?: boolean }) {
  const r = size / 2;
  return (
    <div className={bounce ? 'absolute animate-bounce' : 'absolute'} style={{ left: x, top: y, width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <defs>
          <radialGradient id={`mv-${size}-${x}`} cx="35%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#5EE07C" />
            <stop offset="60%" stopColor="#28A745" />
            <stop offset="100%" stopColor="#166534" />
          </radialGradient>
        </defs>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="20" y1="20"
            x2={20 + Math.cos((deg * Math.PI) / 180) * 18}
            y2={20 + Math.sin((deg * Math.PI) / 180) * 18}
            stroke="#166534" strokeWidth="3" strokeLinecap="round"
          />
        ))}
        <circle cx="20" cy="20" r={r > 15 ? 13 : 12} fill={`url(#mv-${size}-${x})`} />
        <circle cx="20" cy="20" r="4.5" fill="#EAFFEF" />
        <circle cx="20" cy="20" r="6.5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeDasharray="2,2" />
        <circle cx="16" cy="14" r="1.8" fill="#052E13" />
        <circle cx="24" cy="14" r="1.8" fill="#052E13" />
      </svg>
    </div>
  );
}

function MiniArcher() {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" fill="none" aria-hidden="true">
      <ellipse cx="15" cy="24" rx="7" ry="10" fill="#003DA6" />
      <circle cx="15" cy="10" r="5.5" fill="#FFCDB2" />
      <path d="M9.5 10 a5.5 5.5 0 0 1 11 0" fill="#003DA6" />
      <path d="M22 8 C 30 14, 30 26, 22 32" stroke="#D97706" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <line x1="22" y1="8" x2="22" y2="32" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
      <rect x="10" y="34" width="3.5" height="5" fill="#fff" />
      <rect x="16" y="34" width="3.5" height="5" fill="#fff" />
    </svg>
  );
}

function DragHand() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }}>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
      <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
      <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
      <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
    </svg>
  );
}

const HowToPlayPopup: React.FC<Props> = ({ onStart, onBack }) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="relative w-full max-w-[380px] bg-[#061939]/95 border border-white/15 rounded-[1.5rem] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-center flex flex-col justify-between overflow-hidden"
        style={{ height: 'auto', minHeight: '480px' }}
      >
        {/* Corner light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00AEEF]/20 rounded-full blur-[40px] pointer-events-none"></div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-sm font-black tracking-widest text-blue-200 uppercase">How to Play</h2>
          <div className="h-[2px] w-12 bg-[#00AEEF] mx-auto mt-1 rounded-full"></div>
        </div>

        {/* Tutorial mock area */}
        <div className="relative w-full h-[160px] bg-slate-950/80 rounded-xl border border-white/10 overflow-hidden mb-4 flex flex-col justify-center select-none">
          {/* Ground */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-900 border-t border-white/5"></div>

          {/* Archer bottom-left */}
          <div className="absolute left-6 bottom-4">
            <MiniArcher />
          </div>

          {/* Dotted trajectory */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <path
              d="M 58 108 Q 130 30 220 52 Q 265 64 300 92"
              fill="none"
              stroke="#00AEEF"
              strokeDasharray="4,5"
              strokeWidth="2"
            />
          </svg>

          {/* Virus targets — varied sizes / positions */}
          <MiniVirus size={40} x="60%" y="18%" />
          <MiniVirus size={30} x="78%" y="46%" bounce />
          <MiniVirus size={24} x="48%" y="8%" />

          {/* Critical callout */}
          <span className="absolute right-[4%] top-[24%] text-[8px] font-black text-[#FACC15] animate-pulse">
            CORE = x2
          </span>

          {/* Drag gesture */}
          <div className="absolute left-[42px] top-[74px] pointer-events-none z-20 swipe-hand">
            <DragHand />
          </div>
        </div>

        {/* Steps */}
        <div className="text-left text-xs text-blue-100 space-y-2.5 mb-6 px-1">
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">1.</span>
            <p>
              <strong className="text-white">Drag back</strong> anywhere to set{' '}
              <strong className="text-white">angle & power</strong> — release to fire. A dotted
              trajectory guides your first 3 shots.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">2.</span>
            <p>
              Pop the <strong className="text-green-400">green risk viruses</strong> across 3 waves.
              Small &amp; distant targets score more. Watch the <strong className="text-[#00AEEF]">wind</strong> —
              it bends every arrow.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">3.</span>
            <p>
              Strike the glowing <strong className="text-[#FACC15]">core</strong> for a{' '}
              <strong className="text-[#FACC15]">CRITICAL x2</strong>. You have{' '}
              <strong className="text-white">12 arrows</strong> and{' '}
              <strong className="text-white">2 minutes</strong> — they never fire back, but every
              arrow counts.
            </p>
          </div>
        </div>

        {/* Objective & CTA */}
        <div className="space-y-4">
          <p className="text-xs font-black text-blue-200/90 tracking-wide uppercase italic bg-[#00AEEF]/5 py-2 rounded-lg border border-[#00AEEF]/20">
            "Precision coverage beats every risk!"
          </p>
          <div className="grid grid-cols-5 gap-3 pt-2">
            <button
              onClick={onBack}
              className="btn-press col-span-2 rounded-full border border-white/20 bg-white/10 py-3 text-xs font-bold text-white hover:bg-white/15"
            >
              Back
            </button>
            <button
              onClick={onStart}
              className="btn-press col-span-3 rounded-full py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_4px_16px_rgba(242,101,34,0.4)]"
              style={{ background: 'linear-gradient(135deg, #F26522 0%, #FACC15 100%)' }}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToPlayPopup;

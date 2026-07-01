import React from 'react';

interface Props {
  onStart: () => void;
  onClose: () => void;
}

const HowToPlayPopup: React.FC<Props> = ({ onStart, onClose }) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
      {/* Container Card */}
      <div 
        className="relative w-full max-w-[380px] bg-[#061939]/95 border border-white/15 rounded-[1.5rem] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-center flex flex-col justify-between overflow-hidden"
        style={{ height: 'auto', minHeight: '480px' }}
      >
        {/* Decorative corner light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00AEEF]/20 rounded-full blur-[40px] pointer-events-none"></div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-sm font-black tracking-widest text-blue-200 uppercase">How to Play</h2>
          <div className="h-[2px] w-12 bg-[#00AEEF] mx-auto mt-1 rounded-full"></div>
        </div>

        {/* Interactive Tutorial Animation Area */}
        <div className="relative w-full h-[160px] bg-slate-950/80 rounded-xl border border-white/10 overflow-hidden mb-4 flex flex-col justify-center select-none">
          
          {/* Parallax Ground & Sky Mockup */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-900 border-t border-white/5"></div>
          
          {/* Tiny Family House Illustration on the left */}
          <div className="absolute left-3 bottom-4 text-left flex flex-col items-center">
            <span className="text-2xl">🏡</span>
            <span className="text-[7px] text-green-400 font-black">FAMILY</span>
          </div>

          {/* Dotted Trajectory representation */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d="M 64 100 Q 120 40 180 60 Q 230 75 290 115"
              fill="none"
              stroke="#00AEEF"
              strokeDasharray="4,4"
              strokeWidth="2"
            />
          </svg>

          {/* Archer standing in base */}
          <div className="absolute left-12 bottom-4 flex flex-col items-center">
            <span className="text-2xl">🏹</span>
          </div>

          {/* Floating score representation for Positive Tokens */}
          <div className="absolute left-[45%] top-[10%] flex flex-col items-center">
            <span className="text-lg">🛡️</span>
            <span className="text-[9px] font-black text-green-400 absolute top-[-16px] animate-pulse">+1000</span>
          </div>
          
          <div className="absolute left-[62%] top-[25%] flex flex-col items-center">
            <span className="text-lg">🪙</span>
            <span className="text-[9px] font-black text-cyan-400 absolute top-[-16px] animate-pulse">+800</span>
          </div>

          {/* Floating score representation for Hazards (Illness / Debt / Accident Viruses) */}
          <div className="absolute right-[10%] bottom-4 flex flex-col items-center">
            <span className="text-2xl animate-bounce">🦠</span>
            <span className="text-[9px] font-black text-red-400 absolute top-[-16px] animate-pulse">-1400</span>
          </div>

          {/* Looping Hand Gesture Animation demonstrating Pull-Back aim */}
          <div className="absolute left-[38px] top-[75px] pointer-events-none z-20 flex flex-col items-center">
            <span className="text-2xl swipe-hand">👆</span>
          </div>
        </div>

        {/* Instructions list */}
        <div className="text-left text-xs text-blue-100 space-y-2.5 mb-6 px-1">
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">1.</span>
            <p>
              Drag <strong className="text-white">Backwards</strong> from the Archer to adjust <strong className="text-white">Angle</strong> and <strong className="text-white">Power</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">2.</span>
            <p>
              Release your hold to shoot a <strong className="text-[#00AEEF]">Protection Arrow</strong>. Projectiles are affected by wind & gravity.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">3.</span>
            <p>
              Hit advancing <strong className="text-red-400">Risk Viruses</strong> before they reach your family home, and collect <strong className="text-cyan-400">Premium Shields</strong>.
            </p>
          </div>
        </div>

        {/* Objective & CTA */}
        <div className="space-y-4">
          <p className="text-xs font-black text-blue-200/90 tracking-wide uppercase italic bg-[#00AEEF]/5 py-2 rounded-lg border border-[#00AEEF]/20">
            "Neutralize incoming threats & secure your goals!"
          </p>
          <div className="grid grid-cols-5 gap-3 pt-2">
            <button
              onClick={onClose}
              className="btn-press col-span-2 rounded-full border border-white/20 bg-white/10 py-3 text-xs font-bold text-white hover:bg-white/15"
            >
              Back
            </button>
            <button
              onClick={onStart}
              className="btn-press col-span-3 rounded-full py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_4px_16px_rgba(249,115,22,0.4)]"
              style={{ background: 'linear-gradient(135deg, #F97316 0%, #FACC15 100%)' }}
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

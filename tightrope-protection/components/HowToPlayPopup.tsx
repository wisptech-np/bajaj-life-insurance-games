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
        style={{ height: 'auto', minHeight: '460px' }}
      >
        {/* Decorative corner light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00AEEF]/20 rounded-full blur-[40px] pointer-events-none"></div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-sm font-black tracking-widest text-blue-200 uppercase">How to Play</h2>
          <div className="h-[2px] w-12 bg-[#00AEEF] mx-auto mt-1 rounded-full"></div>
        </div>

        {/* Interactive Tutorial Animation Area */}
        <div className="relative w-full h-[150px] bg-slate-950/80 rounded-xl border border-white/10 overflow-hidden mb-4 flex flex-col justify-center">
          
          {/* Parallel Wires Mockup */}
          <div className="absolute inset-x-0 top-1/4 h-[1px] bg-[#00AEEF]/40"></div>
          <div className="absolute inset-x-0 top-2/4 h-[1px] bg-[#00AEEF]/40"></div>
          <div className="absolute inset-x-0 top-3/4 h-[1px] bg-[#00AEEF]/40"></div>

          {/* Looping Beetle Mascot running */}
          <div className="absolute left-10 top-2/4 -translate-y-1/2 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center border-2 border-[#00AEEF] animate-bounce">
              <span className="text-[14px]">🐞</span>
            </div>
            {/* Ripple representation */}
            <div className="pulse-ripple mt-[-16px]"></div>
          </div>

          {/* Floating score representation for Positive Tokens */}
          <div className="absolute left-[35%] top-[10%] flex flex-col items-center">
            <span className="text-[18px]">🪙</span>
            <span className="text-[10px] font-black text-green-400 absolute top-[-16px] animate-pulse">+1000</span>
          </div>
          
          <div className="absolute left-[52%] top-[35%] flex flex-col items-center">
            <span className="text-[18px]">🛡️</span>
            <span className="text-[10px] font-black text-[#00AEEF] absolute top-[-16px] animate-pulse">+800</span>
          </div>

          {/* Floating score representation for Hazards */}
          <div className="absolute right-[15%] top-[55%] flex flex-col items-center">
            <span className="text-[18px] animate-bounce">🐦</span>
            <span className="text-[10px] font-black text-red-400 absolute top-[-16px] animate-pulse">-1400</span>
          </div>

          {/* Looping Hand Gesture Animation */}
          <div className="absolute left-[80px] top-[40px] pointer-events-none z-20 flex flex-col items-center">
            <span className="text-2xl swipe-hand">👆</span>
          </div>
        </div>

        {/* Instructions list */}
        <div className="text-left text-xs text-blue-100 space-y-2.5 mb-6 px-1">
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">1.</span>
            <p>
              Swipe <strong className="text-white">Up/Down</strong> or use <strong className="text-white">Arrow Keys</strong> to switch wires with natural anti-gravity arcs.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">2.</span>
            <p>
              Tap <strong className="text-white">Screen</strong> or press <strong className="text-white">Space</strong> to Jump over hazards and catch floating items.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-[#00AEEF] font-bold">3.</span>
            <p>
              Grab <strong className="text-green-400">Rupee Coins</strong> & <strong className="text-cyan-400">Shield Covers</strong> while avoiding risk <strong className="text-red-400">Obstacles (Birds)</strong>.
            </p>
          </div>
        </div>

        {/* Objective & CTA */}
        <div className="space-y-4">
          <p className="text-xs font-black text-blue-200/90 tracking-wide uppercase italic bg-[#00AEEF]/5 py-2 rounded-lg border border-[#00AEEF]/20">
            "Grab opportunities, shields and reach your future goals!"
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

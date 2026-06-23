import React, { useState } from "react";
import HowToPlayPopup from "./HowToPlayPopup";

interface Props {
  onPlay: () => void;
}

const IntroScreen: React.FC<Props> = ({ onPlay }) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between px-6 py-8"
      style={{
        backgroundImage: "url('/landing_bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top and Bottom gradient vignette for high contrast text without dark center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3, 15, 38, 0.85) 0%, rgba(3, 15, 38, 0.4) 15%, rgba(3, 15, 38, 0) 32%, rgba(3, 15, 38, 0) 68%, rgba(3, 15, 38, 0.4) 85%, rgba(3, 15, 38, 0.85) 100%)",
        }}
      />

      {/* Top Glassmorphic Card (Brand Header + Subtitle + Relocated Title) */}
      <div className="relative z-10 flex flex-col items-center pt-4 pb-5 px-6 bg-[#030F26]/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl max-w-[320px] mx-auto text-center pop">
        <div className="mb-2.5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#00AEEF] bg-[#00AEEF]/15 border border-[#00AEEF]/30 rounded-full">
          Bajaj Allianz Life Insurance
        </div>
        <h2 className="text-[10px] font-bold tracking-[0.1em] text-blue-200/90 uppercase mb-3.5">
          Balance Your Life • Secure Your Future
        </h2>
        <h1 className="font-black tracking-tight leading-none text-white text-[2rem]">
          TIGHTROPE
          <br />
          <span className="bg-gradient-to-r from-[#00AEEF] via-[#22C55E] to-[#00AEEF] bg-clip-text text-transparent">
            PROTECTION
          </span>
        </h1>
      </div>

      {/* Spacer to keep center empty for the protection beetle illustration */}
      <div className="flex-1 min-h-[140px]" />

      {/* Footer Controls (translucent panel holding play button + info description) */}
      <div className="relative z-10 flex flex-col gap-4 items-center pb-2 w-full">
        <div className="w-full max-w-[320px] bg-[#030F26]/75 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-2xl text-center">
          <p className="text-[10.5px] font-bold text-blue-100/90 leading-relaxed mb-3">
            Guide the Protection Beetle across the high-wires. Balance risks and
            secure your future path!
          </p>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="btn-press w-full rounded-full py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_6px_24px_rgba(34,197,94,0.45)] transition-all"
            style={{
              background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            Play Game
          </button>
        </div>

        <span
          className="text-[9px] text-blue-200/50 uppercase tracking-widest font-bold"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
        >
          Secure Endless Runner
        </span>
      </div>

      {/* Tutorial Popup Modal */}
      {showHowToPlay && (
        <HowToPlayPopup
          onStart={() => {
            setShowHowToPlay(false);
            onPlay();
          }}
          onClose={() => setShowHowToPlay(false)}
        />
      )}
    </div>
  );
};

export default IntroScreen;

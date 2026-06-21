import React, { useState } from "react";
import { ORANGE } from "../constants";
import HowToPlayPopup from "./HowToPlayPopup";

interface Props {
  onPlay: () => void;
}

const IntroScreen: React.FC<Props> = ({ onPlay }) => {
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col justify-between"
      style={{
        background: "linear-gradient(to bottom, #0d1e3d 0%, #030712 100%)",
      }}
    >
      {/* Sunburst background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[160%] aspect-square rounded-full opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #FBBF24 0%, transparent 65%)",
          transform: "translate(-50%, -40%)",
        }}
      />

      {/* Skyline & Sunrise silhouette background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 flex flex-col justify-end pb-32">
        <div className="h-48 w-full flex items-end justify-between px-4 gap-2">
          <div className="h-32 w-10 bg-blue-900 rounded-t-lg opacity-60"></div>
          <div className="h-44 w-12 bg-blue-900 rounded-t-lg opacity-40"></div>
          <div className="h-40 w-14 bg-blue-900 rounded-t-lg opacity-50"></div>
          <div className="h-48 w-16 bg-blue-900 rounded-t-lg opacity-70"></div>
          <div className="h-36 w-10 bg-blue-900 rounded-t-lg opacity-50"></div>
        </div>
      </div>

      {/* Sparks particles */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-yellow-400 opacity-60 animate-ping"></div>
        <div className="absolute top-[40%] right-[25%] w-2 h-2 rounded-full bg-yellow-300 opacity-40 animate-bounce"></div>
        <div className="absolute top-[60%] left-[30%] w-1.5 h-1.5 rounded-full bg-yellow-400 opacity-50 animate-pulse"></div>
        <div className="absolute top-[30%] right-[10%] w-1 h-1 rounded-full bg-yellow-200 opacity-70 animate-ping"></div>
      </div>

      {/* Game Logo & Branding */}
      <div
        className="relative z-10 text-center px-6 pt-16 select-none"
        style={{
          paddingTop: "max(4.5rem, calc(env(safe-area-inset-top) + 2rem))",
        }}
      >
        <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-3.5 py-1.5 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          <span className="text-[10px] font-black text-yellow-400 tracking-[0.2em] uppercase">
            Premium Finance Arcade
          </span>
        </div>

        <h1
          className="text-[2.6rem] font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-100 to-yellow-500 font-sans"
          style={{ textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}
        >
          WEALTH WATERS
        </h1>
        <p className="text-[10px] font-extrabold tracking-[0.3em] text-blue-300 uppercase mt-2">
          Insurance Fishing Adventure
        </p>
      </div>

      {/* Yacht rocking dynamic illustration */}
      <div className="relative w-full h-44 z-10 flex items-end justify-center select-none overflow-visible">
        {/* Marina waves back */}
        <div className="absolute bottom-4 left-0 right-0 h-4 bg-blue-900/40 rounded-full blur-[2px]" />

        {/* Yacht Body */}
        <div
          className="w-48 h-20 relative transition-transform duration-1000 animate-[float_4s_ease-in-out_infinite]"
          style={{ transformOrigin: "center bottom" }}
        >
          {/* Hull */}
          <div className="absolute bottom-0 left-4 right-4 h-8 bg-gradient-to-r from-gray-100 to-white rounded-br-[2rem] rounded-bl-[1rem] shadow-xl border-b border-gray-300">
            {/* Metallic strip */}
            <div className="absolute top-1.5 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />
            {/* Windows */}
            <div className="absolute bottom-2 right-8 flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
          </div>

          {/* Cabin */}
          <div className="absolute bottom-8 left-12 right-12 h-8 bg-white border border-gray-200 rounded-tr-[1.5rem] rounded-tl-[0.5rem]">
            {/* Windshield */}
            <div className="absolute top-1.5 right-2 w-7 h-4 bg-slate-800 rounded-tr-lg transform skew-x-12" />
            {/* Cabin glow light */}
            <div className="absolute top-1.5 left-2 w-4 h-4 rounded bg-yellow-400/80 pulse-slow" />
          </div>

          {/* Radar / Sonar Antenna */}
          <div className="absolute bottom-16 left-16 w-1 h-4 bg-gray-400">
            <div className="absolute -top-1 -left-2 w-5 h-1.5 rounded-full bg-yellow-400" />
          </div>

          {/* Fishing rod sticking out */}
          <div className="absolute bottom-6 left-2 w-16 h-1 bg-yellow-600 origin-right -rotate-[35deg] rounded" />
        </div>

        {/* Waves front */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-blue-950 to-blue-900/80 backdrop-blur-[1px]" />
      </div>

      {/* Welcome footer & actions */}
      <div
        className="relative z-20 flex flex-col items-center px-6"
        style={{
          paddingBottom:
            "max(3rem, calc(env(safe-area-inset-bottom) + 1.5rem))",
        }}
      >
        <p className="text-gray-400 text-xs max-w-[19rem] text-center mb-6 leading-relaxed">
          Navigate the wealth ocean, cast down deep, net protection pearls, and
          shield your capital from sudden risk tides.
        </p>

        <button
          onClick={() => setShowHowTo(true)}
          className="btn-press w-full max-w-[18rem] min-h-[3.6rem] rounded-full text-[1.15rem] font-black uppercase tracking-[0.1em] text-white transition-all"
          style={{
            background: `linear-gradient(135deg, ${ORANGE}, #ea580c)`,
            boxShadow:
              "0 0.6rem 2rem rgba(242,101,34,0.45), inset 0 0.15rem 0 rgba(255,255,255,0.25)",
          }}
        >
          PLAY
        </button>
      </div>

      {/* How To Play instruction overlay */}
      {showHowTo && (
        <HowToPlayPopup
          onStart={() => {
            setShowHowTo(false);
            onPlay();
          }}
        />
      )}
    </div>
  );
};

export default IntroScreen;

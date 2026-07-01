import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
import MainScene from "../game/scenes/MainScene";
import PreloadScene from "../game/scenes/PreloadScene";
import { GameResult } from "../types";

interface Props {
  onGameEnd: (result: GameResult) => void;
}

const GameScreen: React.FC<Props> = ({ onGameEnd }) => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  // Sound state
  const [muted, setMuted] = useState(false);

  // HUD State synced from Phaser registry
  const [hud, setHud] = useState({
    score: 0,
    arrowsLeft: 8,
    familyShieldPct: 100,
    virusesNeutralized: 0,
    level: 1,
    windSpeed: 0,
    windDirection: '➔', // '➔' or '⬅' or 'N/A'
    arrowType: 'Term Plan', // 'Term Plan' | 'Critical Illness' | 'ULIP Rider'
    combo: 1,
    showFeedback: false,
    feedbackText: ''
  });

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let active = true;

    const initPhaser = () => {
      if (!active || !gameContainer.current) return;
      if (
        gameContainer.current.clientWidth === 0 ||
        gameContainer.current.clientHeight === 0
      )
        return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameContainer.current,
        backgroundColor: "#030F26",
        banner: false,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 300 }, // physics gravity for arrows
            debug: false,
          },
        },
        scene: [PreloadScene, MainScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 480,
          height: 640,
        },
      };

      game = new Phaser.Game(config);
      gameInstance.current = game;

      // Set registry callbacks immediately so that they are ready when MainScene initializes
      game.registry.set("onScoreUpdate", (metrics: typeof hud) => {
        if (active) setHud(metrics);
      });

      game.registry.set("onGameOver", (result: GameResult) => {
        if (active) onGameEnd(result);
      });
    };

    const timer = setTimeout(initPhaser, 50);

    return () => {
      active = false;
      clearTimeout(timer);
      if (game) {
        const g = game;
        if (g.loop) g.loop.sleep();
        setTimeout(() => {
          g.destroy(true);
        }, 0);
        gameInstance.current = null;
      }
    };
  }, [onGameEnd]);

  // Audio volume toggle
  const handleMuteToggle = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    if (gameInstance.current) {
      gameInstance.current.sound.mute = nextMute;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030F26] flex flex-col justify-between select-none">
      
      {/* 1. Upper HUD (sound, score, remaining arrows) */}
      <div className="absolute top-0 inset-x-0 p-4 pt-6 z-50 pointer-events-none flex justify-between items-center">
        {/* Sound toggle button */}
        <button
          onClick={handleMuteToggle}
          className="btn-press pointer-events-auto flex h-[2.2rem] min-w-[3.6rem] items-center justify-center rounded-full px-3 text-[10px] font-black uppercase text-white bg-white/10 border border-white/20"
        >
          {muted ? "Muted" : "Sound"}
        </button>

        {/* Score tracker */}
        <div className="text-center">
          <span className="text-[20px] font-black italic text-white leading-none tracking-tight block">
            {hud.score.toLocaleString("en-IN")}
          </span>
          <span className="text-[8px] font-bold text-blue-200/50 uppercase tracking-widest mt-0.5">
            Score
          </span>
        </div>

        {/* Arrows left display */}
        <div className="flex gap-1 justify-end min-w-[3.6rem] bg-white/10 px-3 py-1.5 rounded-full border border-white/20 text-white font-black text-xs">
          🏹 {hud.arrowsLeft}
        </div>
      </div>

      {/* 2. Middle HUD (wind speed and family shield meter) */}
      <div className="absolute top-16 inset-x-0 mx-4 z-50 pointer-events-none flex flex-col gap-2">
        {/* Family Shield Progress */}
        <div>
          <div className="flex justify-between text-[8px] font-bold text-blue-200/60 uppercase tracking-wider mb-1">
            <span>Family Shield Health</span>
            <span className="text-green-400 font-extrabold">{hud.familyShieldPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-[#EF4444] via-[#F97316] to-[#22C55E] rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              style={{ width: `${hud.familyShieldPct}%` }}
            />
          </div>
        </div>

        {/* Wind Speed and Direction Indicator */}
        <div className="flex items-center justify-between text-[8px] font-bold text-blue-200/60 uppercase tracking-wider">
          <span>Wind Conditions</span>
          <span className="bg-slate-900/60 border border-white/10 rounded-md px-2 py-0.5 text-white flex items-center gap-1.5">
            💨 {hud.windSpeed} m/s <span className="text-xs text-[#00AEEF] font-bold leading-none">{hud.windDirection}</span>
          </span>
        </div>
      </div>

      {/* 3. Phaser Canvas Container */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative">
        <div
          ref={gameContainer}
          className="w-full h-full flex items-center justify-center"
        />
      </div>

      {/* 4. Lower HUD (Level, Arrow Type, Combo Multiplier) */}
      <div className="absolute bottom-4 inset-x-0 px-4 z-50 pointer-events-none flex justify-between items-center gap-4">
        {/* Target */}
        <div className="px-3 py-1.5 rounded-xl border border-white/5 bg-slate-950/80 backdrop-blur-sm flex flex-col">
          <span className="text-[7px] font-black text-blue-300/40 uppercase tracking-wider">
            Target
          </span>
          <span className="text-xs font-black text-white">{hud.virusesNeutralized}/10 Risks</span>
        </div>

        {/* Active Arrow Type */}
        <div className="px-3 py-1.5 rounded-xl border border-white/5 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center">
          <span className="text-[7px] font-black text-blue-300/40 uppercase tracking-wider">
            Arrow Type
          </span>
          <span className="text-xs font-black text-[#00AEEF]">{hud.arrowType}</span>
        </div>

        {/* Combo Multiplier */}
        <div className="px-3 py-1.5 rounded-xl border border-white/5 bg-slate-950/80 backdrop-blur-sm flex flex-col text-right">
          <span className="text-[7px] font-black text-blue-300/40 uppercase tracking-wider">
            Multiplier
          </span>
          <span className={`text-xs font-black transition-all ${hud.combo > 1 ? 'text-[#FACC15] scale-110 animate-bounce' : 'text-white'}`}>
            {hud.combo}x
          </span>
        </div>
      </div>

      {/* 5. Educational banner feedback overlay */}
      {hud.showFeedback && (
        <div className="absolute top-32 inset-x-4 z-50 pointer-events-none px-4 py-3 rounded-2xl bg-slate-950/90 border border-[#00AEEF]/40 text-center animate-fade-in shadow-2xl">
          <div className="text-[9px] font-black text-[#00AEEF] uppercase tracking-widest mb-0.5">Insurance Cover Activated!</div>
          <div className="text-xs font-black text-white leading-tight">{hud.feedbackText}</div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;

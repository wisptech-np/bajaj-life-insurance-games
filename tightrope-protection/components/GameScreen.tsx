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

  // HUD State synced from Phaser
  const [hud, setHud] = useState({
    score: 0,
    distance: 0,
    coins: 0,
    lives: 3,
    shieldActive: false,
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
            gravity: { x: 0, y: 0 },
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

  // Target distance is 1000m. Progress bar sweeps to it
  const distancePct = Math.min(100, Math.max(0, (hud.distance / 1000) * 100));

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030F26] flex flex-col justify-between select-none">
      {/* 1. Upper HUD (sound, score, shield items) */}
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

        {/* Shield Covers (Lives) */}
        <div className="flex gap-1 justify-end min-w-[3.6rem]">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className="text-sm transition-all duration-200"
              style={{ opacity: i < hud.lives ? 1 : 0.2 }}
            >
              🛡️
            </span>
          ))}
        </div>
      </div>

      {/* 2. Middle HUD Progress bar */}
      <div className="absolute top-16 inset-x-0 mx-4 z-50 pointer-events-none">
        <div className="flex justify-between text-[8px] font-bold text-blue-200/60 uppercase tracking-wider mb-1">
          <span>Progress to Goal</span>
          <span>{Math.floor(hud.distance)}m / 1000m</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#00AEEF] to-[#22C55E] rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,174,239,0.5)]"
            style={{ width: `${distancePct}%` }}
          />
        </div>
      </div>

      {/* 3. Phaser Canvas Container */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative">
        <div
          ref={gameContainer}
          className="w-full h-full flex items-center justify-center"
        />
      </div>

      {/* 4. Lower HUD metrics layout */}
      <div className="absolute bottom-4 inset-x-0 px-4 z-50 pointer-events-none flex justify-between items-center gap-4">
        {/* Left: Distance */}
        <div className="px-3 py-1.5 rounded-xl border border-white/5 bg-slate-950/80 backdrop-blur-sm flex flex-col">
          <span className="text-[7.5px] font-black text-blue-300/40 uppercase tracking-wider">
            Distance
          </span>
          <span className="text-xs font-black text-white">{hud.distance}m</span>
        </div>

        {/* Right: Collected Savings */}
        <div className="px-3 py-1.5 rounded-xl border border-white/5 bg-slate-950/80 backdrop-blur-sm flex flex-col text-right">
          <span className="text-[7.5px] font-black text-blue-300/40 uppercase tracking-wider">
            Savings
          </span>
          <span className="text-xs font-black text-green-400">
            ₹{hud.coins * 100}
          </span>
        </div>
      </div>

      {/* 5. Mobile active shield flashing banner overlay */}
      {hud.shieldActive && (
        <div className="absolute top-24 inset-x-0 mx-auto w-fit z-50 pointer-events-none px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-[9px] font-black text-cyan-400 tracking-wider uppercase animate-pulse">
          🛡️ Shield Active
        </div>
      )}
    </div>
  );
};

export default GameScreen;

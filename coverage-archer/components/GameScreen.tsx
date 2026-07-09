import Phaser from 'phaser';
import React, { useEffect, useRef, useState } from 'react';
import MainScene from '../game/scenes/MainScene';
import PreloadScene from '../game/scenes/PreloadScene';
import { GameResult, HudState } from '../types';
import { DPR, GAME_CONFIG } from '../data';
import { setMuted as setAudioMuted, isMuted } from '../utils/audio';

interface Props {
  onGameEnd: (result: GameResult) => void;
}

/* ── SVG HUD icons (no emoji) ─────────────────────────────── */
function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="21" x2="17" y2="7" />
      <path d="M13 6h5v5" />
      <path d="M4 22l2-5" opacity="0.5" />
    </svg>
  );
}

function ClockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function WindArrow({ dir }: { dir: 'L' | 'R' | 'none' }) {
  if (dir === 'none') {
    return (
      <svg width="16" height="12" viewBox="0 0 24 16" fill="none" stroke="#9fc5ff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <line x1="6" y1="8" x2="18" y2="8" />
      </svg>
    );
  }
  const flip = dir === 'L' ? 'scale(-1,1) translate(-24,0)' : undefined;
  return (
    <svg width="18" height="12" viewBox="0 0 24 16" fill="none" stroke="#00AEEF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g transform={flip}>
        <line x1="3" y1="8" x2="19" y2="8" />
        <path d="M14 3l6 5-6 5" />
      </g>
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      <line x1="16" y1="9" x2="22" y2="15" />
      <line x1="22" y1="9" x2="16" y2="15" />
    </svg>
  );
}

const GameScreen: React.FC<Props> = ({ onGameEnd }) => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);
  const [muted, setMutedState] = useState(isMuted());

  const [hud, setHud] = useState<HudState>({
    score: 0,
    arrowsLeft: GAME_CONFIG.ARROWS_PER_SESSION,
    timeLeft: GAME_CONFIG.SESSION_SECONDS,
    wave: 1,
    waveTotal: GAME_CONFIG.WAVES.length,
    virusesLeft: 0,
    virusesTotal: 0,
    windLevel: 0,
    windDir: 'none',
    streak: 0,
    feedback: '',
  });

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let active = true;

    const initPhaser = () => {
      if (!active || !gameContainer.current) return;
      if (gameContainer.current.clientWidth === 0 || gameContainer.current.clientHeight === 0) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameContainer.current,
        backgroundColor: '#030F26',
        banner: false,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: GAME_CONFIG.GRAVITY_Y },
            debug: false,
          },
        },
        scene: [PreloadScene, MainScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          // Backing store at devicePixelRatio for crisp retina rendering;
          // scenes zoom the camera by DPR so world coords stay 480x640.
          width: GAME_CONFIG.WIDTH * DPR,
          height: GAME_CONFIG.HEIGHT * DPR,
        },
      };

      game = new Phaser.Game(config);
      gameInstance.current = game;

      game.registry.set('onHudUpdate', (metrics: HudState) => {
        if (active) setHud(metrics);
      });
      game.registry.set('onGameOver', (result: GameResult) => {
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

  const handleMuteToggle = () => {
    const next = !muted;
    setMutedState(next);
    setAudioMuted(next);
  };

  const minutes = Math.floor(hud.timeLeft / 60);
  const seconds = hud.timeLeft % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const timeCritical = hud.timeLeft <= 15;
  const arrowsCritical = hud.arrowsLeft <= 3;

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#030F26] flex flex-col justify-between select-none"
      style={{ touchAction: 'none' }}
    >
      {/* 1. Top HUD — sound / score / timer */}
      <div className="absolute top-0 inset-x-0 p-4 pt-5 z-50 pointer-events-none flex justify-between items-start">
        <button
          onClick={handleMuteToggle}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          className="btn-press pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-white bg-white/10 border border-white/20 backdrop-blur-sm"
        >
          {muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>

        {/* Score — always visible */}
        <div className="text-center">
          <span className="text-[22px] font-black italic text-white leading-none tracking-tight block" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            {hud.score.toLocaleString('en-IN')}
          </span>
          <span className="text-[8px] font-bold text-blue-200/50 uppercase tracking-widest mt-0.5 block">
            Score
          </span>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 min-w-[3.6rem] justify-center px-3 py-2 rounded-full border backdrop-blur-sm font-black text-xs transition-colors ${
            timeCritical ? 'bg-red-500/20 border-red-400/50 text-red-300 animate-pulse' : 'bg-white/10 border-white/20 text-white'
          }`}
        >
          <ClockIcon />
          {timeStr}
        </div>
      </div>

      {/* 2. Second row — arrows, wave, wind */}
      <div className="absolute top-[4.6rem] inset-x-0 px-4 z-50 pointer-events-none flex justify-between items-center gap-2">
        {/* Arrows left */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-sm ${arrowsCritical ? 'bg-orange-500/15 border-orange-400/40' : 'bg-slate-950/70 border-white/10'}`}>
          <span className={arrowsCritical ? 'text-[#F26522]' : 'text-[#00AEEF]'}>
            <ArrowIcon />
          </span>
          <span className={`text-xs font-black ${arrowsCritical ? 'text-[#F26522]' : 'text-white'}`}>
            {hud.arrowsLeft}
          </span>
          <span className="text-[7px] font-black text-blue-300/40 uppercase tracking-wider">Arrows</span>
        </div>

        {/* Wave progress */}
        <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-sm flex items-center gap-1.5">
          <span className="text-[7px] font-black text-blue-300/40 uppercase tracking-wider">Wave</span>
          <span className="text-xs font-black text-white">{hud.wave}/{hud.waveTotal}</span>
          <span className="text-[7px] font-black text-green-400/70 uppercase tracking-wider ml-1">
            {hud.virusesLeft} left
          </span>
        </div>

        {/* Wind indicator */}
        <div className="px-3 py-1.5 rounded-xl border border-white/10 bg-slate-950/70 backdrop-blur-sm flex items-center gap-1.5">
          <span className="text-[7px] font-black text-blue-300/40 uppercase tracking-wider">Wind</span>
          <WindArrow dir={hud.windDir} />
          <span className="flex gap-[2px] items-end" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <span
                key={lvl}
                className="w-[3px] rounded-sm"
                style={{
                  height: 3 + lvl * 1.4,
                  background: lvl <= hud.windLevel ? '#00AEEF' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </span>
        </div>
      </div>

      {/* 3. Phaser canvas */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative">
        <div ref={gameContainer} className="w-full h-full flex items-center justify-center" />
      </div>

      {/* 4. Streak chip */}
      {hud.streak >= 2 && (
        <div className="absolute bottom-5 right-4 z-50 pointer-events-none px-3 py-1.5 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/40 backdrop-blur-sm pop">
          <span className="text-xs font-black text-[#FACC15]">{hud.streak}x STREAK</span>
        </div>
      )}

      {/* 5. Feedback banner */}
      {hud.feedback && (
        <div className="absolute top-[7.4rem] inset-x-6 z-50 pointer-events-none px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-[#28A745]/40 text-center animate-fade-in shadow-2xl">
          <div className="text-[8px] font-black text-[#28A745] uppercase tracking-widest mb-0.5">Coverage Activated</div>
          <div className="text-xs font-black text-white leading-tight">{hud.feedback}</div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;

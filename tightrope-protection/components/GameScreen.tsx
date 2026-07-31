import Phaser from "phaser";
import React, { useEffect, useRef, useState } from "react";
import MainScene from "../game/scenes/MainScene";
import PreloadScene from "../game/scenes/PreloadScene";
import { GameResult } from "../types";
import { CoinIcon, PoleIcon, ShieldIcon, SoundOffIcon, SoundOnIcon } from "./Icons";

interface Props {
  onGameEnd: (result: GameResult) => void;
}

const GOAL_M = 1000;

const GameScreen: React.FC<Props> = ({ onGameEnd }) => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  const [muted, setMuted] = useState(false);

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
        backgroundColor: "#030913",
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

  const handleMuteToggle = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    if (gameInstance.current) {
      gameInstance.current.sound.mute = nextMute;
    }
  };

  const pct = Math.min(100, Math.max(0, (hud.distance / GOAL_M) * 100));

  return (
    <div
      className="tp-screen relative flex h-full w-full select-none flex-col justify-between overflow-hidden"
      style={{ background: "#030913" }}
    >
      {/* ── Top HUD: icon + number only ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between"
        style={{ padding: "var(--s4) var(--s4) 0" }}
      >
        <button
          onClick={handleMuteToggle}
          aria-label={muted ? "Unmute" : "Mute"}
          className="btn-press pointer-events-auto flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--tp-stroke)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {muted ? <SoundOffIcon size={20} /> : <SoundOnIcon size={20} />}
        </button>

        {/* Score — glyph + number, no word label */}
        <div className="flex items-center" style={{ gap: 7 }}>
          <PoleIcon size={19} color="#F26522" />
          <span
            style={{
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 2px 8px rgba(0,0,0,0.75)",
            }}
          >
            {hud.score.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Lives as shield pips; an active cover adds a pulsing ring */}
        <div
          className="flex items-center justify-end"
          style={{ gap: 4, minWidth: 44, height: 44, position: "relative" }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                transition: "opacity .25s ease, transform .25s ease",
                opacity: i < hud.lives ? 1 : 0.22,
                transform: i < hud.lives ? "none" : "scale(0.82)",
                filter:
                  i < hud.lives ? "drop-shadow(0 0 5px rgba(46,155,255,0.55))" : "none",
              }}
            >
              <ShieldIcon size={17} color={i < hud.lives ? "#2E9BFF" : "#7E97BB"} />
            </span>
          ))}
          {hud.shieldActive && (
            <span
              className="pulse-ripple"
              style={{
                width: 26,
                height: 26,
                right: 12,
                top: 9,
                borderColor: "#4FB4FF",
                borderWidth: 2,
              }}
            />
          )}
        </div>
      </div>

      {/* ── Rope meter: progress drawn as a cable with the walker on it ── */}
      <div
        className="pointer-events-none absolute inset-x-0 z-50"
        style={{ top: 62, padding: "0 var(--s4)" }}
      >
        <div className="relative" style={{ height: 22 }}>
          {/* cable */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 12,
              height: 3,
              borderRadius: 2,
              background: "rgba(126,151,187,0.28)",
            }}
          />
          {/* travelled section, lit */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 12,
              height: 3,
              width: `${pct}%`,
              borderRadius: 2,
              background: "linear-gradient(90deg,#003DA6 0%,#F26522 100%)",
              boxShadow: "0 0 8px rgba(242,101,34,0.65)",
              transition: "width .3s linear",
            }}
          />
          {/* walker marker */}
          <div
            style={{
              position: "absolute",
              top: 4,
              left: `${pct}%`,
              width: 19,
              height: 19,
              marginLeft: -9.5,
              borderRadius: "50%",
              background: "#F26522",
              border: "2px solid #04122B",
              boxShadow: "0 0 10px rgba(242,101,34,0.85)",
              transition: "left .3s linear",
            }}
          >
            {/* balance-pole tick through the marker */}
            <span
              style={{
                position: "absolute",
                left: -4,
                right: -4,
                top: 6.5,
                height: 2,
                background: "#04122B",
                borderRadius: 1,
              }}
            />
          </div>
          {/* goal pylon */}
          <div
            style={{
              position: "absolute",
              right: -2,
              top: 0,
              width: 4,
              height: 22,
              borderRadius: 2,
              background: "linear-gradient(180deg,#FFC845 0%,#0D2A58 100%)",
            }}
          />
        </div>
      </div>

      {/* ── Phaser canvas ── */}
      <div className="relative flex h-full w-full flex-1 items-center justify-center">
        <div
          ref={gameContainer}
          className="flex h-full w-full items-center justify-center"
        />
      </div>

      {/* ── Bottom HUD: savings, icon + number, no panel ── */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-between"
        style={{ padding: "0 var(--s4) var(--s4)" }}
      >
        <div className="flex items-center" style={{ gap: 6 }}>
          <CoinIcon size={20} />
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 1,
              color: "#FFC845",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {(hud.coins * 100).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex items-center" style={{ gap: 5 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 1,
              color: "#A9C2E8",
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {hud.distance}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#7E97BB",
            }}
          >
            M
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;

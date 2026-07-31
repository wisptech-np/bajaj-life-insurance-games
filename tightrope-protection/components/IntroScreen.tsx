import React, { useState } from "react";
import HowToPlayPopup from "./HowToPlayPopup";
import { CoinIcon, GustIcon, ShieldIcon } from "./Icons";

interface Props {
  onPlay: () => void;
}

const LEGEND: { icon: React.ReactNode; label: string }[] = [
  { icon: <CoinIcon size={20} />, label: "Collect" },
  { icon: <ShieldIcon size={20} />, label: "Shield" },
  { icon: <GustIcon size={20} />, label: "Avoid" },
];

const IntroScreen: React.FC<Props> = ({ onPlay }) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div
      className="tp-screen relative flex h-full w-full flex-col justify-between"
      style={{
        padding: "var(--s8) var(--s6) var(--s6)",
        backgroundImage: "url('/landing_bg.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Vignette keeps the type on quiet ground */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,9,19,0.88) 0%, rgba(4,18,43,0.35) 22%, rgba(4,18,43,0) 44%, rgba(4,18,43,0.55) 76%, rgba(1,4,10,0.94) 100%)",
        }}
      />

      {/* ── Title card ── */}
      <div
        className="pop tp-glass relative z-10 mx-auto w-full text-center"
        style={{ maxWidth: 320, padding: "var(--s5) var(--s5) var(--s6)" }}
      >
        <div
          className="mx-auto mb-3 inline-flex items-center rounded-full"
          style={{
            padding: "5px var(--s3)",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#FFB988",
            background: "rgba(242,101,34,0.14)",
            border: "1px solid rgba(242,101,34,0.42)",
          }}
        >
          Bajaj Allianz Life
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            lineHeight: 0.94,
            letterSpacing: "-0.03em",
            color: "#fff",
            textTransform: "uppercase",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}
        >
          Tightrope
          <br />
          <span
            style={{
              background: "linear-gradient(100deg,#FFB988 0%,#F26522 55%,#FF8A45 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Protection
          </span>
        </h1>

        {/* Rope rule — the shape motif, not a divider */}
        <div className="relative mx-auto mt-4" style={{ width: 168, height: 10 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 4,
              height: 3,
              borderRadius: 2,
              background:
                "linear-gradient(90deg,rgba(242,101,34,0) 0%,#F26522 30%,#FFB988 50%,#F26522 70%,rgba(242,101,34,0) 100%)",
            }}
          />
          <span
            className="float"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: 11,
              height: 11,
              marginLeft: -5.5,
              borderRadius: "50%",
              background: "#FFC845",
              boxShadow: "0 0 12px rgba(255,200,69,0.8)",
            }}
          />
        </div>

        <p
          style={{
            marginTop: "var(--s4)",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.5,
            color: "var(--tp-text-2)",
          }}
        >
          Cross the wire. Dodge the gusts.
          <br />
          Keep your cover intact.
        </p>
      </div>

      <div className="flex-1" style={{ minHeight: 96 }} />

      {/* ── Footer ── */}
      <div
        className="rise relative z-10 mx-auto flex w-full flex-col items-center"
        style={{ maxWidth: 320, gap: "var(--s4)" }}
      >
        {/* Icon legend — no sentences */}
        <div
          className="tp-glass flex w-full items-center justify-around"
          style={{ padding: "var(--s3) var(--s2)", borderRadius: "var(--tp-r)" }}
        >
          {LEGEND.map((l) => (
            <div key={l.label} className="flex flex-col items-center" style={{ gap: 5 }}>
              {l.icon}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--tp-text-2)",
                }}
              >
                {l.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowHowToPlay(true)}
          className="btn-press tp-btn tp-btn-rope pulse-cta"
        >
          Play Game
        </button>

        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--tp-text-3)",
          }}
        >
          Balance · Cover · Arrive
        </span>
      </div>

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

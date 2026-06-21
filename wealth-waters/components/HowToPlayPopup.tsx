import React from 'react';
import { ORANGE } from '../constants';

interface Props {
  onStart: () => void;
}

const HowToPlayPopup: React.FC<Props> = ({ onStart }) => (
  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-[4vw] py-[3vh]">
    <style>{`
      @keyframes tutorial-hook-timeline {
        /* Cycle 1: Shield swing & catch */
        0% { transform: rotate(-20deg); height: 35px; }
        10% { transform: rotate(20deg); height: 35px; }
        13% { transform: rotate(5deg); height: 35px; }
        14% { transform: rotate(5deg); height: 35px; }
        19% { transform: rotate(5deg); height: 120px; }
        25% { transform: rotate(5deg); height: 35px; }
        
        /* Cycle 2: Shark swing & catch */
        50% { transform: rotate(-20deg); height: 35px; }
        60% { transform: rotate(20deg); height: 35px; }
        63% { transform: rotate(-8deg); height: 35px; }
        64% { transform: rotate(-8deg); height: 35px; }
        69% { transform: rotate(-8deg); height: 125px; }
        75% { transform: rotate(-8deg); height: 35px; }
        
        100% { transform: rotate(-20deg); height: 35px; }
      }
      @keyframes tutorial-good-timeline {
        0% { left: -15%; bottom: 30px; opacity: 1; }
        14% { left: 30%; bottom: 30px; opacity: 1; }
        18.9% { left: 54%; bottom: 34px; opacity: 1; }
        19% { left: 54%; bottom: 34px; opacity: 0; }
        95% { left: -15%; bottom: 30px; opacity: 0; }
        100% { left: -15%; bottom: 30px; opacity: 1; }
      }
      @keyframes tutorial-bad-timeline {
        0% { left: 110%; bottom: 30px; opacity: 0; }
        49.9% { left: 110%; bottom: 30px; opacity: 0; }
        50% { left: 110%; bottom: 30px; opacity: 1; }
        64% { left: 66%; bottom: 30px; opacity: 1; }
        68.9% { left: 47%; bottom: 30px; opacity: 1; }
        69% { left: 47%; bottom: 30px; opacity: 0; }
        100% { left: 110%; bottom: 30px; opacity: 0; }
      }
      @keyframes tutorial-pop-good {
        0% { transform: scale(0); opacity: 0; }
        18% { transform: scale(0); opacity: 0; }
        19% { transform: scale(1); opacity: 1; }
        24% { transform: scale(1.2) translateY(-15px); opacity: 0; }
        100% { transform: scale(0); opacity: 0; }
      }
      @keyframes tutorial-pop-bad {
        0% { transform: scale(0); opacity: 0; }
        68% { transform: scale(0); opacity: 0; }
        69% { transform: scale(1); opacity: 1; }
        74% { transform: scale(1.2) translateY(-15px); opacity: 0; }
        100% { transform: scale(0); opacity: 0; }
      }
      @keyframes tutorial-hand-timeline {
        0% { transform: scale(1); opacity: 0; }
        9% { transform: scale(1); opacity: 0; }
        11% { transform: scale(1); opacity: 0.8; }
        13% { transform: scale(1); opacity: 0.8; }
        14% { transform: scale(0.8); opacity: 1; }
        16% { transform: scale(1); opacity: 0.8; }
        19% { transform: scale(1); opacity: 0; }
        
        59% { transform: scale(1); opacity: 0; }
        61% { transform: scale(1); opacity: 0.8; }
        63% { transform: scale(1); opacity: 0.8; }
        64% { transform: scale(0.8); opacity: 1; }
        66% { transform: scale(1); opacity: 0.8; }
        69% { transform: scale(1); opacity: 0; }
        100% { transform: scale(1); opacity: 0; }
      }
      @keyframes tutorial-ripple-timeline {
        0% { transform: scale(0); opacity: 0; }
        13% { transform: scale(0); opacity: 0; }
        14% { transform: scale(0.4); opacity: 1; }
        18% { transform: scale(1.6); opacity: 0; }
        
        63% { transform: scale(0); opacity: 0; }
        64% { transform: scale(0.4); opacity: 1; }
        68% { transform: scale(1.6); opacity: 0; }
        100% { transform: scale(0); opacity: 0; }
      }
      @keyframes tutorial-hooked-good-visibility {
        0% { opacity: 0; }
        18.9% { opacity: 0; }
        19% { opacity: 1; }
        25% { opacity: 1; }
        29.9% { opacity: 1; }
        30% { opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes tutorial-hooked-bad-visibility {
        0% { opacity: 0; }
        68.9% { opacity: 0; }
        69% { opacity: 1; }
        75% { opacity: 1; }
        79.9% { opacity: 1; }
        80% { opacity: 0; }
        100% { opacity: 0; }
      }
      .tutorial-hook-wrapper {
        position: absolute;
        top: 1.8rem;
        left: 55%;
        transform-origin: top center;
        animation: tutorial-hook-timeline 6s infinite ease-in-out;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 2;
      }
      .tutorial-rope {
        width: 1.5px;
        background: rgba(255,220,150,0.85);
        flex: 1;
      }
      .tutorial-hook-emoji {
        font-size: 1.3rem;
        line-height: 1;
        transform: translateY(-2px);
      }
      .tutorial-hooked-good {
        position: absolute;
        font-size: 1.2rem;
        top: 8px;
        left: 50%;
        transform: translate(-50%, 0) rotate(-15deg);
        animation: tutorial-hooked-good-visibility 6s infinite;
        pointer-events: none;
        opacity: 0;
      }
      .tutorial-hooked-bad {
        position: absolute;
        font-size: 1.2rem;
        top: 8px;
        left: 50%;
        transform: translate(-50%, 0) rotate(15deg);
        animation: tutorial-hooked-bad-visibility 6s infinite;
        pointer-events: none;
        opacity: 0;
      }
      .tutorial-item-good {
        position: absolute;
        font-size: 1.3rem;
        animation: tutorial-good-timeline 6s infinite ease-in-out;
        z-index: 3;
      }
      .tutorial-item-bad {
        position: absolute;
        font-size: 1.3rem;
        animation: tutorial-bad-timeline 6s infinite linear;
        z-index: 3;
        opacity: 0;
      }
      .tutorial-pop-good-text {
        position: absolute;
        left: 57%;
        bottom: 75px;
        color: #60A5FA;
        font-weight: 900;
        font-size: 1.2rem;
        z-index: 4;
        animation: tutorial-pop-good 6s infinite ease-out;
        text-shadow: 0 2px 5px rgba(0,0,0,0.9);
        opacity: 0;
      }
      .tutorial-pop-bad-text {
        position: absolute;
        left: 45%;
        bottom: 75px;
        color: #EF4444;
        font-weight: 900;
        font-size: 1.2rem;
        z-index: 4;
        animation: tutorial-pop-bad 6s infinite ease-out;
        text-shadow: 0 2px 5px rgba(0,0,0,0.9);
        opacity: 0;
      }
      .tutorial-hand-wrapper {
        position: absolute;
        left: 50%;
        top: 80%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5;
        opacity: 0;
      }
      .tutorial-hand-emoji {
        font-size: 2.2rem;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));
        animation: tutorial-hand-timeline 6s infinite ease-in-out;
      }
      .tutorial-ripple {
        position: absolute;
        width: 36px;
        height: 36px;
        border: 2px solid rgba(255,255,255,0.8);
        border-radius: 50%;
        animation: tutorial-ripple-timeline 6s infinite ease-out;
        pointer-events: none;
      }
      .tutorial-water {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 62%;
        background: linear-gradient(180deg, #092c4b 0%, #030a16 100%);
        border-top: 1px dashed rgba(255,255,255,0.2);
        z-index: 1;
      }
    `}</style>

    <div className="max-h-full w-full max-w-[22rem] overflow-y-auto rounded-[1.8rem] border border-white/10 bg-[#0b172a]/95 p-6 shadow-2xl backdrop-blur pop">
      <h2 className="mb-4 text-center text-xl font-black text-white">How to Play</h2>

      {/* Screen simulation box */}
      <div className="relative mb-5 h-[12rem] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#1e3a8a,#0f172a)] flex items-center justify-center select-none">
        
        {/* Simple explorer boat floating shape */}
        <div className="absolute top-4 left-1/3 w-20 h-6 bg-white rounded-br-lg rounded-bl shadow z-[2]" />
        
        {/* Animated swinging hook */}
        <div className="tutorial-hook-wrapper">
          <div className="tutorial-rope"></div>
          <div className="relative flex flex-col items-center justify-center">
            <span className="tutorial-hook-emoji text-white">🪝</span>
            {/* Hooked assets */}
            <span className="tutorial-hooked-good">🛡️</span>
            <span className="tutorial-hooked-bad">🦈</span>
          </div>
        </div>

        {/* Animated items floating in water */}
        <span className="tutorial-item-good">🛡️</span>
        <span className="tutorial-item-bad">🦈</span>

        {/* Animated floating numbers */}
        <div className="tutorial-pop-good-text">+20</div>
        <div className="tutorial-pop-bad-text">-20</div>

        {/* Hand pointer gesture */}
        <div className="tutorial-hand-wrapper">
          <span className="tutorial-hand-emoji">👆</span>
          <div className="tutorial-ripple"></div>
        </div>

        <div className="tutorial-water"></div>
      </div>

      {/* Instruction descriptions */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-400/30 flex items-center justify-center font-bold text-xs text-blue-400 flex-shrink-0">1</div>
          <p className="text-xs text-gray-300 leading-normal">
            <strong>Tap/Click</strong> anywhere to cast your hook down into the deep wealth ocean.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center font-bold text-xs text-emerald-400 flex-shrink-0">2</div>
          <p className="text-xs text-gray-300 leading-normal">
            Catch **Family Shields, Education Pearls, and Savings Pouches** to secure Protection Points.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-red-500/15 border border-red-400/30 flex items-center justify-center font-bold text-xs text-red-400 flex-shrink-0">3</div>
          <p className="text-xs text-gray-300 leading-normal">
            Avoid **Loan Sharks, Inflation Jellyfish, and Medical Debt Crabs** which drain your points.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-yellow-500/15 border border-yellow-400/30 flex items-center justify-center font-bold text-xs text-yellow-400 flex-shrink-0">4</div>
          <p className="text-xs text-gray-300 leading-normal">
            Upgrade your **Rod, Reel, Hook, and Sonar** at the bottom upgrade shop to reach the Abyss zone!
          </p>
        </div>
      </div>

      <button
        onClick={onStart}
        className="btn-press min-h-[3.2rem] w-full rounded-full text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-all"
        style={{ background: ORANGE, boxShadow: '0 0.5rem 1.5rem rgba(242,101,34,0.45)' }}
      >
        START ADVENTURE
      </button>
    </div>
  </div>
);

export default HowToPlayPopup;

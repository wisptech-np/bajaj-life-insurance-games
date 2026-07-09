// App.jsx — Home → How To Play → Game → Results (+ Lead) → (optional Slot) → ThankYou
import React, { useCallback, useState } from 'react';
import { incrementPlayCount } from './services/playCount';
import PremiumTiles from './PremiumTiles.jsx';
import { HomeScreen, HowToPlayScreen, ResultsScreen } from './Screens.jsx';
import LeadCaptureModal from './LeadCaptureModal.jsx';
import SlotBookingModal from './SlotBookingModal.jsx';
import ThankYouScreen from './ThankYouScreen.jsx';
import { LEAD_NO_KEY } from './api.js';
import { GAME_CONFIG } from './data.js';
import { unlockAudio, playUiTap } from './audio.js';

const THEME = {
  homeBg: 'linear-gradient(180deg, #060d1f 0%, #0b1d3f 60%, #003DA6 160%)',
  gameBg: 'linear-gradient(180deg, #060d1f 0%, #0a1a38 55%, #0d2b5e 100%)',
};

export default function App() {
  const [screen, setScreen] = useState('home'); // home | howtoplay | game | results | thankyou
  const [stats, setStats] = useState({});
  const [won, setWon] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [triggeredByBookSlot, setTriggeredByBookSlot] = useState(false);
  const [bookedDetails, setBookedDetails] = useState(null);

  const showHowToPlay = useCallback(() => {
    unlockAudio();
    playUiTap();
    setScreen('howtoplay');
  }, []);

  const startGame = useCallback(() => {
    unlockAudio();
    playUiTap();
    incrementPlayCount();
    setScreen('game');
    setGameKey((k) => k + 1);
  }, []);

  const goHome = useCallback(() => {
    setScreen('home');
    setBookedDetails(null);
  }, []);

  const finishRound = useCallback((nextStats, didWin) => {
    setStats(nextStats);
    setWon(didWin);
    setScreen('results');
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(false);
      setShowLeadModal(true);
    }
  }, []);

  const handleBookSlot = useCallback(() => {
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(true);
      setShowLeadModal(true);
    } else {
      setShowSlotModal(true);
    }
  }, []);

  const handleWin = useCallback((s) => finishRound(s, true), [finishRound]);
  const handleLose = useCallback((s) => finishRound(s, false), [finishRound]);

  const handleRetry = useCallback(() => {
    startGame();
  }, [startGame]);

  const handlePlayAgainFromThanks = useCallback(() => {
    setBookedDetails(null);
    startGame();
  }, [startGame]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      maxWidth: 430,
      margin: '0 auto',
      overflow: 'hidden',
      background: THEME.gameBg,
    }}>
      {screen === 'home' && (
        <HomeScreen onStart={showHowToPlay} theme={THEME} />
      )}

      {screen === 'howtoplay' && (
        <HowToPlayScreen onPlay={startGame} />
      )}

      {screen === 'game' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: THEME.gameBg,
          display: 'flex', flexDirection: 'column',
        }}>
          <PremiumTiles
            key={gameKey}
            config={GAME_CONFIG}
            onWin={handleWin}
            onLose={handleLose}
          />
        </div>
      )}

      {screen === 'results' && (
        <ResultsScreen
          stats={stats}
          won={won}
          onRetry={handleRetry}
          onHome={goHome}
          onBookSlot={handleBookSlot}
          retryLabel={won ? 'Play again' : 'Try again'}
        />
      )}

      {screen === 'thankyou' && (
        <ThankYouScreen
          details={bookedDetails}
          onPlayAgain={handlePlayAgainFromThanks}
          onHome={goHome}
        />
      )}

      {showLeadModal && (
        <LeadCaptureModal
          score={stats.score}
          onSubmitted={() => {
            setShowLeadModal(false);
            if (triggeredByBookSlot) {
              setShowSlotModal(true);
            }
          }}
        />
      )}

      {showSlotModal && (
        <SlotBookingModal
          score={stats.score}
          onConfirmed={(details) => {
            setShowSlotModal(false);
            setBookedDetails(details);
            setScreen('thankyou');
          }}
        />
      )}
    </div>
  );
}

// App.jsx — Home → How to play → Game → Lead → Results → (optional Slot) → ThankYou
// Screen flow per okf-brain/GAME_STANDARD.md §2 (guardian-shelter pattern).
import { incrementPlayCount } from './services/playCount';
import React, { useCallback, useState } from 'react';
import RiskRadarGame from './RiskRadarGame.jsx';
import { HomeScreen, ResultsScreen, HowToPlayScreen } from './Screens.jsx';
import LeadCaptureModal from './LeadCaptureModal.jsx';
import SlotBookingModal from './SlotBookingModal.jsx';
import ThankYouScreen from './ThankYouScreen.jsx';
import { LEAD_NO_KEY } from './api.js';
import { GAME_CONFIG } from './data.js';

const THEME = {
  // Home/results are bright glassmorphic; only the gameplay canvas is pitch dark.
  homeBg: 'radial-gradient(ellipse at 50% 26%, rgba(30,107,224,0.4), rgba(11,18,33,0.97) 70%), #0B1221',
  gameBg: 'linear-gradient(180deg, #05080F 0%, #070D1A 60%, #04060C 100%)',
};

export default function App() {
  const [screen, setScreen] = useState('home');     // home | howtoplay | game | results | thankyou
  const [stats, setStats] = useState({});
  const [won, setWon] = useState(false);
  const [endCause, setEndCause] = useState('');
  const [gameKey, setGameKey] = useState(0);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [triggeredByBookSlot, setTriggeredByBookSlot] = useState(false);
  const [bookedDetails, setBookedDetails] = useState(null);

  const showHowToPlay = useCallback(() => {
    setScreen('howtoplay');
  }, []);

  const startGame = useCallback(() => {
    incrementPlayCount();
    setScreen('game');
    setGameKey((k) => k + 1);
  }, []);

  const goHome = useCallback(() => {
    setScreen('home');
    setBookedDetails(null);
  }, []);

  const finishRound = useCallback((nextStats, didWin, cause) => {
    setStats(nextStats);
    setWon(didWin);
    setEndCause(cause || '');
    setScreen('results');
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(false);
      setShowLeadModal(true);
    }
  }, []);

  const handleWin = useCallback((s, cause) => finishRound(s, true, cause), [finishRound]);
  const handleLose = useCallback((s, cause) => finishRound(s, false, cause), [finishRound]);

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
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <RiskRadarGame
              key={gameKey}
              config={GAME_CONFIG}
              onWin={handleWin}
              onLose={handleLose}
            />
          </div>
        </div>
      )}

      {screen === 'results' && (
        <ResultsScreen
          stats={stats}
          won={won}
          endCause={endCause}
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

  function handleBookSlot() {
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(true);
      setShowLeadModal(true);
    } else {
      setShowSlotModal(true);
    }
  }
}

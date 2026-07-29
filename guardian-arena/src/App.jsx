// App.jsx — Home → How to Play → Game → Results (+ Lead) → (Book a Slot) → ThankYou
// Structure copied from the guardian-shelter gold standard.
import { incrementPlayCount } from './services/playCount';
import React, { useCallback, useState } from 'react';
import GuardianArenaGame from './GuardianArenaGame.jsx';
import { HomeScreen, ResultsScreen, HowToPlayScreen } from './Screens.jsx';
import LeadCaptureModal from './LeadCaptureModal.jsx';
import SlotBookingModal from './SlotBookingModal.jsx';
import ThankYouScreen from './ThankYouScreen.jsx';
import { LEAD_NO_KEY } from './api.js';
import { GAME_CONFIG } from './data.js';

const THEME = {
  gameBg: 'linear-gradient(180deg, #0B1221 0%, #0d2149 55%, #071630 100%)',
};

export default function App() {
  const [screen, setScreen] = useState('home');     // home | howtoplay | game | results | thankyou
  const [stats, setStats] = useState({});
  const [won, setWon] = useState(false);
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

  const finishRound = useCallback((nextStats, didWin) => {
    setStats(nextStats);
    setWon(didWin);
    setScreen('results');
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(false);
      setShowLeadModal(true);
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
        <HomeScreen onStart={showHowToPlay} />
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
            <GuardianArenaGame
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
          onRetry={handleRetry}
          onHome={goHome}
          onBookSlot={handleBookSlot}
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

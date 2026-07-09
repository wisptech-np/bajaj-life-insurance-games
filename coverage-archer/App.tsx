// App — home > howtoplay > game > results (+LeadCaptureModal) > [Book a Slot > SlotBookingModal] > thankyou
// Screen flow mirrors life-goals-bubble-shooter/src/App.jsx.
import React, { useCallback, useState } from 'react';
import { ScreenName, GameResult, BookedDetails } from './types';
import IntroScreen from './components/IntroScreen';
import HowToPlayPopup from './components/HowToPlayPopup';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';
import LeadCaptureModal from './components/LeadCaptureModal';
import SlotBookingModal from './components/SlotBookingModal';
import ThankYouScreen from './components/ThankYouScreen';
import { LEAD_NO_KEY } from './services/api';
import { incrementPlayCount } from './services/playCount';
import { playSynthSFX } from './utils/audio';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenName>('home');
  const [result, setResult] = useState<GameResult | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [triggeredByBookSlot, setTriggeredByBookSlot] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<BookedDetails | null>(null);

  const showHowToPlay = useCallback(() => {
    playSynthSFX('ui');
    setScreen('howtoplay');
  }, []);

  const startGame = useCallback(() => {
    playSynthSFX('ui');
    void incrementPlayCount();
    setScreen('game');
    setGameKey((k) => k + 1);
  }, []);

  const goHome = useCallback(() => {
    playSynthSFX('ui');
    setScreen('home');
    setBookedDetails(null);
  }, []);

  const handleGameEnd = useCallback((nextResult: GameResult) => {
    setResult(nextResult);
    setScreen('results');
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(false);
      setShowLeadModal(true);
    }
  }, []);

  const handleBookSlot = useCallback(() => {
    playSynthSFX('ui');
    if (!sessionStorage.getItem(LEAD_NO_KEY)) {
      setTriggeredByBookSlot(true);
      setShowLeadModal(true);
    } else {
      setShowSlotModal(true);
    }
  }, []);

  const handlePlayAgainFromThanks = useCallback(() => {
    setBookedDetails(null);
    startGame();
  }, [startGame]);

  return (
    <div className="game-wrap mx-auto">
      {screen === 'home' && <IntroScreen onPlay={showHowToPlay} />}

      {screen === 'howtoplay' && (
        <>
          <IntroScreen onPlay={showHowToPlay} />
          <HowToPlayPopup onStart={startGame} onBack={goHome} />
        </>
      )}

      {screen === 'game' && <GameScreen key={gameKey} onGameEnd={handleGameEnd} />}

      {screen === 'results' && result && (
        <ResultsScreen
          result={result}
          onRetry={startGame}
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
          score={result?.score}
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
          score={result?.score}
          onClose={() => setShowSlotModal(false)}
          onConfirmed={(details) => {
            setShowSlotModal(false);
            setBookedDetails(details);
            setScreen('thankyou');
          }}
        />
      )}
    </div>
  );
};

export default App;

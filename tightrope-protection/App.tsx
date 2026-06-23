import React, { useState, useCallback } from 'react';
import { Screen, GameResult, PlayerInfo } from './types';
import IntroScreen from './components/IntroScreen';
import GameScreen from './components/GameScreen';
import EnterDetailsScreen from './components/EnterDetailsScreen';
import ScoringScreen from './components/ScoringScreen';
import { incrementPlayCount } from './services/playCount';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.INTRO);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [player, setPlayer] = useState<PlayerInfo>({ name: '', mobile: '' });

  const handleGameStart = useCallback(() => {
    // Increment play count (guarded inside to trigger once per session)
    void incrementPlayCount();
    setScreen(Screen.GAME);
  }, []);

  const handleGameEnd = useCallback((result: GameResult) => {
    setGameResult(result);
    setScreen(Screen.DETAILS);
  }, []);

  const handleDetailsSubmit = useCallback((info: PlayerInfo) => {
    setPlayer(info);
    setScreen(Screen.SCORING);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameResult(null);
    setScreen(Screen.INTRO);
  }, []);

  return (
    <div className="game-wrap mx-auto">
      {screen === Screen.INTRO && (
        <IntroScreen onPlay={handleGameStart} />
      )}
      {screen === Screen.GAME && (
        <GameScreen onGameEnd={handleGameEnd} />
      )}
      {screen === Screen.DETAILS && gameResult && (
        <EnterDetailsScreen
          score={gameResult.score}
          onSubmit={handleDetailsSubmit}
        />
      )}
      {screen === Screen.SCORING && gameResult && (
        <ScoringScreen
          result={gameResult}
          playerName={player.name}
          playerMobile={player.mobile}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
};

export default App;

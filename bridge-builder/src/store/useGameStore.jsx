import React, { createContext, useContext, useState, useEffect } from 'react';

export const GAME_STATUS = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER',
    LEAD_CAPTURE: 'LEAD_CAPTURE',
    CTA: 'CTA',
    THANK_YOU: 'THANK_YOU'
};

const GameStoreContext = createContext(null);

export const GameStoreProvider = ({ children }) => {
    const [status, setStatusState] = useState(GAME_STATUS.START);
    const [score, setScoreState] = useState(0);
    const [coins, setCoins] = useState(100);
    const [shield, setShield] = useState(100); // Protection Cover
    const [level, setLevel] = useState(1);
    const [gameWon, setGameWon] = useState(false);
    const [highScore, setHighScore] = useState(() => {
        return parseInt(localStorage.getItem('bridgeBuilderHighScore') || '0');
    });
    const [leadData, setLeadData] = useState(null);
    const [toast, setToast] = useState(null);
    const [metrics, setMetrics] = useState({
        protectionScore: 0,
        planningScore: 0,
        safetyScore: 0,
        riskManagement: 0,
        financialWisdom: 0
    });

    const setStatus = (newStatus) => {
        setStatusState(newStatus);
        if (newStatus !== GAME_STATUS.PLAYING) {
            setToast(null);
        }
    };

    const setScore = (newScore) => {
        setScoreState(newScore);
        if (newScore > highScore) {
            localStorage.setItem('bridgeBuilderHighScore', newScore.toString());
            setHighScore(newScore);
        }
    };

    const showToast = (message, duration = 3000) => {
        setToast(message);
        setTimeout(() => setToast(null), duration);
    };

    const resetGame = () => {
        setStatusState(GAME_STATUS.PLAYING);
        setScoreState(0);
        setCoins(100);
        setShield(100);
        setGameWon(false);
        setToast(null);
        setMetrics({
            protectionScore: 0,
            planningScore: 0,
            safetyScore: 0,
            riskManagement: 0,
            financialWisdom: 0
        });
    };

    const value = {
        status,
        setStatus,
        score,
        setScore,
        coins,
        setCoins,
        shield,
        setShield,
        level,
        setLevel,
        gameWon,
        setGameWon,
        highScore,
        leadData,
        setLeadData,
        toast,
        showToast,
        resetGame,
        metrics,
        setMetrics
    };

    return (
        <GameStoreContext.Provider value={value}>
            {children}
        </GameStoreContext.Provider>
    );
};

export const useGameStore = () => {
    const context = useContext(GameStoreContext);
    if (!context) {
        throw new Error('useGameStore must be used within a GameStoreProvider');
    }
    return context;
};

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore, GAME_STATUS } from '../store/useGameStore';
import { Shield, ArrowRight, AlertTriangle, Coins, RefreshCw } from 'lucide-react';

const GameOverScreen = () => {
    const { shield, coins, level, setStatus, resetGame, gameWon } = useGameStore();

    // Determine the failure feedback message based on shield and level
    let title = "Journey Interrupted";
    let explanation = "The bridge collapsed under the weight of unexpected life events. Strengthening key supports is crucial.";
    let suggestion = "Tip: Allocate coins to protections rather than luxury decorations.";

    if (level === 1) {
        explanation = "A minor gust of wind snapped the basic wooden supports. Ropes and reinforcements provide the elasticity needed to bend without breaking.";
        suggestion = "Tip: Attach Emergency Fund ropes to absorb sudden wind stresses.";
    } else if (level === 2) {
        explanation = "During the rainstorm, a medical emergency struck the family. Without side supports and health protection, the family panicked and the structure failed.";
        suggestion = "Tip: Side supports mapped to Health Insurance keep the structure stable during health crises.";
    } else if (level === 3) {
        explanation = "The flash flood pushed floating debris against the main pillars, causing them to wash away. Steel and concrete are strong, but need property-level shields.";
        suggestion = "Tip: Add Concrete Pillars and Property Cover water barriers to divert river currents.";
    } else if (level === 4) {
        explanation = "Lightning struck the center deck and wood planks shattered. Without steel joints and safety nets, the family fell.";
        suggestion = "Tip: Use Steel Reinforcements and Accident Cover nets to catch family members in sudden snaps.";
    } else if (level === 5) {
        explanation = "The combined disasters of storm, flood, and accident overwhelmed the basic structure. Only a fully protected, well-reinforced bridge survives the ultimate test.";
        suggestion = "Tip: Distribute your 100-coin budget across all protection types and structural elements.";
    }

    return (
        <div 
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                backgroundColor: '#0B1221',
                boxSizing: 'border-box'
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    width: '100%',
                    maxWidth: '360px',
                    borderRadius: '40px',
                    backgroundColor: 'rgba(11, 18, 33, 0.8)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '32px 24px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    position: 'relative',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                }}
            >
                {/* Result Warning Icon */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-64px', marginBottom: '24px' }}>
                    <div 
                        style={{
                            backgroundColor: '#EF4444',
                            padding: '20px',
                            borderRadius: '24px',
                            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
                            transform: 'rotate(-3deg)'
                        }}
                    >
                        <AlertTriangle size={40} color="#FFFFFF" />
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 
                        style={{
                            fontSize: '26px',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            marginBottom: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '-0.02em',
                            fontFamily: 'Outfit, sans-serif'
                        }}
                    >
                        {title}
                    </h2>
                    <p 
                        style={{
                            color: '#D1D5DB',
                            fontSize: '13px',
                            fontWeight: 600,
                            lineHeight: '1.6',
                            padding: '0 8px',
                            margin: '0 0 16px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    >
                        "{explanation}"
                    </p>
                    <div 
                        style={{
                            backgroundColor: 'rgba(242, 101, 34, 0.1)',
                            border: '1px solid rgba(242, 101, 34, 0.2)',
                            borderRadius: '16px',
                            padding: '12px',
                            color: 'var(--color-orange)',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            lineHeight: '1.4',
                            textAlign: 'left'
                        }}
                    >
                        {suggestion}
                    </div>
                </div>

                {/* Level and Score Stats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <div 
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '16px',
                            padding: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', marginBottom: '4px' }}>
                            <Shield size={12} />
                            <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stress Level</span>
                        </div>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', margin: 0, fontFamily: 'Outfit, sans-serif' }}>Level {level}</p>
                    </div>
                    
                    <div 
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '16px',
                            padding: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF', marginBottom: '4px' }}>
                            <Coins size={12} />
                            <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leftover Budget</span>
                        </div>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-orange)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>{coins} Coins</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={() => setStatus(GAME_STATUS.LEAD_CAPTURE)}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '18px',
                            fontSize: '18px',
                            fontWeight: 900,
                            letterSpacing: '0.02em',
                            borderRadius: '16px',
                            color: '#FFFFFF',
                            backgroundColor: 'var(--color-primary)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 10px 20px rgba(0, 61, 166, 0.3)'
                        }}
                    >
                        CONTINUE TO RESULTS
                        <ArrowRight size={18} />
                    </button>
                    
                    <button
                        onClick={resetGame}
                        style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: '14px',
                            fontWeight: 900,
                            letterSpacing: '0.05em',
                            borderRadius: '16px',
                            color: '#FFFFFF',
                            backgroundColor: 'transparent',
                            border: '2px solid rgba(255, 255, 255, 0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FFFFFF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                    >
                        <RefreshCw size={14} />
                        RETRY LEVEL
                    </button>
                </div>
            </motion.div>

            <p style={{ marginTop: '32px', color: '#4B5563', fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
                Build Resilience Before Uncertainty Arrives
            </p>
        </div>
    );
};

export default GameOverScreen;

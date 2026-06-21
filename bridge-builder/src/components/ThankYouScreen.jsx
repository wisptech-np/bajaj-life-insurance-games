import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useGameStore, GAME_STATUS } from '../store/useGameStore';

const ThankYouScreen = () => {
    const { setStatus, resetGame } = useGameStore();

    const handlePlayAgain = () => {
        resetGame();
        setStatus(GAME_STATUS.START);
    };

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
                textAlign: 'center',
                boxSizing: 'border-box'
            }}
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ marginBottom: '32px' }}
            >
                <div style={{ position: 'relative' }}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            borderRadius: '50%',
                            filter: 'blur(16px)',
                        }}
                    />
                    <CheckCircle size={100} color="#22C55E" style={{ position: 'relative', zIndex: 10 }} />
                </div>
            </motion.div>

            <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    margin: '0 0 16px 0',
                    letterSpacing: '-0.02em',
                    fontFamily: 'Outfit, sans-serif'
                }}
            >
                THANK YOU!
            </motion.h2>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                    color: '#9CA3AF',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    marginBottom: '48px',
                    maxWidth: '280px',
                    margin: '0 auto 48px auto',
                    fontFamily: 'Inter, sans-serif'
                }}
            >
                We have received your details. Our financial expert will connect with you shortly to help plan your protection and future goals.
            </motion.p>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ width: '100%', maxWidth: '280px' }}
            >
                <button
                    onClick={handlePlayAgain}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '16px',
                        fontSize: '16px',
                        fontWeight: 900,
                        backgroundColor: 'transparent',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FFFFFF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                >
                    PLAY AGAIN
                    <ArrowRight size={18} />
                </button>
            </motion.div>
        </div>
    );
};

export default ThankYouScreen;

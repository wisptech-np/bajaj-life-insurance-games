import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore, GAME_STATUS } from '../store/useGameStore';
import { incrementPlayCount } from '../services/playCount';
import { Play, Shield } from 'lucide-react';

const WelcomeScreen = () => {
    const { setStatus } = useGameStore();

    const handlePlay = () => {
        incrementPlayCount();
        setStatus(GAME_STATUS.PLAYING);
    };

    return (
        <div 
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#090d16',
                overflow: 'hidden',
                padding: '32px 24px',
                boxSizing: 'border-box'
            }}
        >
            {/* Grid Blueprint Background */}
            <div 
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            {/* Glowing Lights */}
            <div 
                style={{
                    position: 'absolute',
                    top: '-10%',
                    left: '20%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 97, 242, 0.2) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
            <div 
                style={{
                    position: 'absolute',
                    bottom: '15%',
                    right: '-10%',
                    width: '250px',
                    height: '250px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(242, 101, 34, 0.1) 0%, transparent 70%)',
                    filter: 'blur(25px)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            {/* Title / Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    marginTop: '24px'
                }}
            >
                <div 
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(0, 61, 166, 0.2)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        marginBottom: '16px'
                    }}
                >
                    <Shield size={16} className="text-cyan-400" />
                    <span 
                        style={{
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.15em',
                            color: '#00F2FE',
                            textTransform: 'uppercase',
                            fontFamily: 'Outfit, sans-serif'
                        }}
                    >
                        Protection Game
                    </span>
                </div>
                <h1 
                    style={{
                        fontSize: '32px',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        lineHeight: '1.1',
                        margin: '0 0 4px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.02em',
                        fontFamily: 'Outfit, sans-serif'
                    }}
                >
                    Bridge Builder
                </h1>
                <p 
                    style={{
                        fontSize: '15px',
                        fontWeight: 'bold',
                        color: 'var(--color-orange)',
                        margin: 0,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontFamily: 'Outfit, sans-serif'
                    }}
                >
                    The Bridge of Protection
                </p>
            </motion.div>

            {/* Blueprint Sketch Image */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{
                    width: '100%',
                    maxWidth: '340px',
                    height: '200px',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 242, 254, 0.15)',
                    backgroundColor: 'rgba(10, 18, 36, 0.5)',
                }}
            >
                <img 
                    src="./assets/ui/blueprint_bridge.png" 
                    alt="Bridge Blueprint Sketch" 
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.85
                    }}
                />
                <div 
                    style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: '#00F2FE',
                        letterSpacing: '0.05em',
                        fontFamily: 'Outfit, sans-serif'
                    }}
                >
                    BLUEPRINT SCHEMATIC
                </div>
            </motion.div>

            {/* Description / Instruction Card */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{
                    width: '100%',
                    maxWidth: '360px',
                    borderRadius: '24px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    backdropFilter: 'blur(12px)',
                    padding: '20px 24px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 1,
                    marginBottom: '24px'
                }}
            >
                <p 
                    style={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        margin: 0,
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif'
                    }}
                >
                    A family's future lies across the valley. Construct a bridge and fortify it with strategic protections to safeguard them from life's unexpected disasters.
                </p>
                <div 
                    style={{
                        marginTop: '12px',
                        fontSize: '10px',
                        color: 'var(--color-orange)',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        fontFamily: 'Outfit, sans-serif'
                    }}
                >
                    💡 Luxury decorations look nice, but preparation saves lives.
                </div>
            </motion.div>

            {/* Play Button CTA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <button
                    onClick={handlePlay}
                    style={{
                        position: 'relative',
                        backgroundColor: 'var(--color-primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '24px',
                        padding: '18px 48px',
                        fontSize: '20px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        letterSpacing: '0.05em',
                        boxShadow: '0 8px 30px rgba(0, 61, 166, 0.4)',
                        transition: 'all 0.2s',
                        overflow: 'hidden',
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    className="group"
                >
                    {/* Reflection Highlight */}
                    <div 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)',
                            pointerEvents: 'none'
                        }}
                    />
                    <span>START GAME</span>
                    <Play size={20} fill="#FFFFFF" />
                </button>
            </motion.div>
        </div>
    );
};

export default WelcomeScreen;

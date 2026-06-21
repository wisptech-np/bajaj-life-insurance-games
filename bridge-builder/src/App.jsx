import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, GAME_STATUS } from './store/useGameStore';
import WelcomeScreen from './components/WelcomeScreen';
import GamePage from './components/GamePage';
import GameOverScreen from './components/GameOverScreen';
import LeadCaptureScreen from './components/LeadCaptureScreen';
import CTAResultScreen from './components/CTAResultScreen';
import ThankYouScreen from './components/ThankYouScreen';

const App = () => {
  const { status, toast } = useGameStore();

  return (
    <div 
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: '#050811',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0
      }}
    >
      {/* Max-width constraint: on desktop shows as a centered mobile-format portrait game */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          background: '#0B1221',
          boxShadow: '0 0 50px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <AnimatePresence mode="wait">
          {status === GAME_STATUS.START && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%', width: '100%' }}
            >
              <WelcomeScreen />
            </motion.div>
          )}

          {status === GAME_STATUS.PLAYING && (
            <motion.div
              key="gameplay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%', width: '100%' }}
            >
              <GamePage />
            </motion.div>
          )}

          {status === GAME_STATUS.GAMEOVER && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%', width: '100%' }}
            >
              <GameOverScreen />
            </motion.div>
          )}

          {status === GAME_STATUS.LEAD_CAPTURE && (
            <motion.div
              key="leadcapture"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              style={{ height: '100%', width: '100%' }}
            >
              <LeadCaptureScreen />
            </motion.div>
          )}

          {status === GAME_STATUS.CTA && (
            <motion.div
              key="cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%', width: '100%' }}
            >
              <CTAResultScreen />
            </motion.div>
          )}

          {status === GAME_STATUS.THANK_YOU && (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ height: '100%', width: '100%' }}
            >
              <ThankYouScreen />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local HUD Toasts */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -16, x: '-50%' }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                bottom: '180px',
                left: '50%',
                zIndex: 200,
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  padding: '12px 24px',
                  borderRadius: '16px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 900,
                  whiteSpace: 'nowrap',
                  background: 'rgba(10, 18, 36, 0.92)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  boxShadow: '0 4px 20px rgba(0, 242, 254, 0.25)',
                  fontFamily: 'Outfit, sans-serif'
                }}
              >
                {toast}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;

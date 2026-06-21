import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GameStoreProvider } from './store/useGameStore'
import { decryptToken } from './utils/crypto'

// Add Google Fonts dynamically
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=Inter:wght@400;600;700;800&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

// Initialize session data from URL & Token if present
; (() => {
  const params = new URLSearchParams(window.location.search);
  const basicKeys = ['userId', 'gameId', 'empName', 'empMobile', 'location', 'zone'];
  let hasParams = false;
  basicKeys.forEach(key => { 
    const v = params.get(key); 
    if (v) { 
      sessionStorage.setItem(`gamification_${key}`, v); 
      hasParams = true; 
    } 
  });
  
  // Normalize: URL param empMobile -> also write to snake_case key used by components
  const urlEmpMobile = sessionStorage.getItem('gamification_empMobile');
  if (urlEmpMobile) sessionStorage.setItem('gamification_emp_mobile', urlEmpMobile);
  
  const token = params.get('token');
  if (token) {
    hasParams = true;
    if (token !== 'GUEST_SESSION') {
      sessionStorage.setItem('gamification_rawToken', token);
      const payload = decryptToken(token);
      if (payload) {
        ['game_id', 'emp_id', 'emp_name', 'emp_mobile', 'location', 'zone'].forEach(k => { 
          if (payload[k] != null) sessionStorage.setItem(`gamification_${k}`, String(payload[k])); 
        });
        sessionStorage.setItem('gamification_referral', payload.referral || 'N');
      }
    }
  }
  if (hasParams) window.history.replaceState({}, '', window.location.pathname);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GameStoreProvider>
      <App />
    </GameStoreProvider>
  </React.StrictMode>,
)

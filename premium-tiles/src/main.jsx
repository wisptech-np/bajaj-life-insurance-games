import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { decryptToken } from './utils/crypto';

// Capture gamification URL params (userId, gameId, empName, etc.) into sessionStorage
// so the LMS lead/slot APIs can attribute leads to the right sales person.
(() => {
  const params = new URLSearchParams(window.location.search);
  const keys = ['userId', 'gameId', 'empName', 'empMobile', 'location', 'zone'];
  let hasParams = false;
  keys.forEach((k) => {
    const v = params.get(k);
    if (v) {
      sessionStorage.setItem(`gamification_${k}`, v);
      hasParams = true;
    }
  });
  // Mirror for snake_case consumers
  const empMobile = sessionStorage.getItem('gamification_empMobile');
  if (empMobile) sessionStorage.setItem('gamification_emp_mobile', empMobile);

  // Decrypt the AES gamification token and store the full payload.
  const token = params.get('token');
  if (token) {
    hasParams = true;
    if (token !== 'GUEST_SESSION') {
      sessionStorage.setItem('gamification_rawToken', token);
      const payload = decryptToken(token);
      if (payload) {
        ['game_id', 'emp_id', 'emp_name', 'emp_mobile', 'location', 'zone'].forEach((k) => {
          if (payload[k] != null) sessionStorage.setItem(`gamification_${k}`, String(payload[k]));
        });
        sessionStorage.setItem('gamification_referral', payload.referral || 'N');
      }
    }
  }
  if (hasParams) {
    window.history.replaceState({}, '', window.location.pathname);
  }
})();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

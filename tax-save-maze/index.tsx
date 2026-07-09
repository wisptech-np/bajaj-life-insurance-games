import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { decryptToken } from "./utils/crypto";

// Decrypt gamification token, store payload in sessionStorage & clean URL
(() => {
  const params = new URLSearchParams(window.location.search);
  const basicKeys = [
    "userId",
    "gameId",
    "empName",
    "empMobile",
    "location",
    "zone",
  ];
  let hasParams = false;
  basicKeys.forEach((key) => {
    const v = params.get(key);
    if (v) {
      sessionStorage.setItem(`gamification_${key}`, v);
      hasParams = true;
    }
  });

  const urlEmpMobile = sessionStorage.getItem("gamification_empMobile");
  if (urlEmpMobile) {
    sessionStorage.setItem("gamification_emp_mobile", urlEmpMobile);
  }

  // Set gameId if not exists
  if (!sessionStorage.getItem("gamification_gameId")) {
    sessionStorage.setItem("gamification_gameId", "GAME_TAX_MAZE");
  }

  const token = params.get("token");
  if (token) {
    hasParams = true;
    if (token !== "GUEST_SESSION") {
      sessionStorage.setItem("gamification_rawToken", token);
      const payload = decryptToken(token);
      if (payload) {
        [
          "game_id",
          "emp_id",
          "emp_name",
          "emp_mobile",
          "location",
          "zone",
        ].forEach((k) => {
          if (payload[k] != null) {
            sessionStorage.setItem(`gamification_${k}`, String(payload[k]));
            if (k === "game_id")
              sessionStorage.setItem("gamification_gameId", String(payload[k]));
            if (k === "emp_mobile")
              sessionStorage.setItem(
                "gamification_emp_mobile",
                String(payload[k]),
              );
          }
        });
        sessionStorage.setItem(
          "gamification_referral",
          payload.referral || "N",
        );
      }
    }
  }
  if (hasParams) window.history.replaceState({}, "", window.location.pathname);
})();

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

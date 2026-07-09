---
type: project
title: Retire Rich Clicker
description: An interactive retirement planning HTML5 clicker game featuring pension upgrades, protective riders, inflation shocks, and Bajaj Allianz Life Lead Management System integration.
resource: file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/retire-rich-clicker
tags:
  - game
  - javascript
  - tailwindcss
  - vite
  - clicker
  - pension
timestamp: 2026-07-08T08:43:23+05:30
---

# Retire Rich Clicker

An interactive HTML5 clicker game themed around retirement planning, pensions, tax-savings, and financial protection. It highlights the importance of guaranteed income streams and protective insurance riders to mitigate inflation shocks during post-retirement life.

## Core Concepts
- **Active Income**: Saving manual income per click through side-hustles and career promotions.
- **Passive Pension Income**: Building automated annuity streams via Deferred Annuity, Monthly Guaranteed Pension, Lifetime Annuity, and Joint Life Cover plans.
- **Riders & Protection**: Shielding retirement wealth against random events (e.g. Medical Inflation Shock, Critical Illness, Accident Liability) using insurance riders (Health Care, Critical Illness, Accidental Protection, Equity Shield).
- **Goal**: Reach ₹1 Crore (₹1,00,00,000) in savings before Age 60. If savings hit ₹0 due to unshielded inflation shocks, or if the player reaches Age 60 without hitting the target, they lose.

## Technical Details
- **Engine**: Self-contained Vanilla JavaScript
- **Styling**: TailwindCSS via CDN with premium dark-mode, custom gold/emerald gradients, and responsive layouts
- **Sound**: Synthesized chimes, warnings, coin-clicks, and fanfare using Web Audio API
- **Build System**: Vite 5 configured for dev and production deployments
- **LMS Integration**: Integrated Bajaj Allianz Life Lead Capture Form, Terms Consent, and Consultation Slot Booking which dynamically forwards data to BALIC Lead Management systems.

## Key Files
- [index.html](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/retire-rich-clicker/index.html): Full game UI, custom styling, game loop, Web Audio synthesizer, and form flows.
- [package.json](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/retire-rich-clicker/package.json): Dev server and build dependencies.
- [vite.config.js](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/retire-rich-clicker/vite.config.js): Base path configurations and environment variables defining.

# Bajaj Life Insurance Games Workspace Rules

This file defines guidelines and architectural structures for this repository.

## Project Structure & OKF Brain

This workspace uses the **Open Knowledge Format (OKF)** to structure repository information under a centralized directory, enabling progressive discovery by AI agents.

The workspace is organized as follows:
- [Workspace Root index.md](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/index.md): Entry point for workspace-level concepts.
- [Workspace Root log.md](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/log.md): Workspace chronological changes.
- Individual games (all BajajLife-approved; every other game was removed from this repo):
  - **Batch 1 — new builds**:
    - [Guardian Shelter](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/guardian-shelter/index.md) - Cover Orange style shield-placement physics puzzle.
    - [Secure Journey](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/secure-journey/index.md) - Forward-rail shooter against virus waves.
    - [Smart Match 3D](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/smart-match-3d/index.md) - Triple-tile life-goal matching.
    - [Risk Exit](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/risk-exit/index.md) - Arrow sliding escape puzzle.
    - [Life Soar](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/life-soar/index.md) - Hang-glider canyon flight.
  - **Revamps of existing games**:
    - [Coverage Archer](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/coverage-archer/index.md) - Phaser + React archery game (single-player virus targets).
    - [Tightrope Protection](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/tightrope-protection/index.md) - Phaser + React balance runner.
  - **Approved, not yet scaffolded**: `balance-block-journey`, `shield-cascade`.

## Guidelines for AI Agents

1. **Follow OKF Specifications**:
   - Maintain the `index.md` and `log.md` files under the centralized `okf-brain/` directory when creating new directories or making major modifications to files.
   - When referencing files in Markdown documents, use standard absolute/relative file links so agents and developers can navigate the codebase seamlessly.
2. **Game-Specific Tech Stacks**:
   - Keep game architectures isolated. Do not mix React 18 and React 19 dependencies across project directories.
   - Use the designated build commands (e.g., `pnpm dev`, `npm run dev`) appropriate to each folder.

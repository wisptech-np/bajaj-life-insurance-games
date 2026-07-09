# Bajaj Life Insurance Games Workspace Rules

This file defines guidelines and architectural structures for this repository.

## Project Structure & OKF Brain

This workspace uses the **Open Knowledge Format (OKF)** to structure repository information under a centralized directory, enabling progressive discovery by AI agents.

The workspace is organized as follows:
- [Workspace Root index.md](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/index.md): Entry point for workspace-level concepts.
- [Workspace Root log.md](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/log.md): Workspace chronological changes.
- Individual games:
  - **Original Games**:
    - [Coverage Archer](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/coverage-archer/index.md) - Phaser + React game.
    - [Life Goals Bubble Shooter](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/life-goals-bubble-shooter/index.md) - React game.
    - [Stackibility Stack](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/stackibility-stack/index.md) - HTML5 Canvas + TailwindCSS game.
    - [Tightrope Protection](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/tightrope-protection/index.md) - Phaser + React game.
  - **New Mobile-Polished Games**:
    - [Retire-Rich Clicker](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/retire-rich-clicker/index.md) - Clicker game themed around Annuity and Pension.
    - [EduRise Jumper](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/edurise-jumper/index.md) - Vertical jumper themed around Child Education Plans.
    - [Tax-Save Maze](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/tax-save-maze/index.md) - Path-finding maze themed around Section 80C/80D Tax Savings.
    - [SheShield Protector](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/she-shield-protector/index.md) - Falling catcher themed around Women's Critical Illness Cover.
    - [SafeStride Balancer](file:///C:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/okf-brain/safe-stride-balancer/index.md) - Physics balancer themed around Personal Accident Plans.

## Guidelines for AI Agents

1. **Follow OKF Specifications**:
   - Maintain the `index.md` and `log.md` files under the centralized `okf-brain/` directory when creating new directories or making major modifications to files.
   - When referencing files in Markdown documents, use standard absolute/relative file links so agents and developers can navigate the codebase seamlessly.
2. **Game-Specific Tech Stacks**:
   - Keep game architectures isolated. Do not mix React 18 and React 19 dependencies across project directories.
   - Use the designated build commands (e.g., `pnpm dev`, `npm run dev`) appropriate to each folder.

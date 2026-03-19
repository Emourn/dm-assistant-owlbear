# DM/GM ASSISTANT — COMPLETE BUILD ROADMAP

> **Who is this for?** You (the user) and any AI assistant (Antigravity or Gemini CLI) helping build this project.
> **Rule #1:** The user has zero coding experience. Every instruction must be crystal clear.
> **Rule #2:** After every phase, the user must be able to open the app and SEE something working.

---

## How This App Works (Plain English)

This app is a **website that runs on your computer**. It doesn't need the internet. You start it with one command, it opens in your browser (Chrome, Firefox, Edge, etc.), and everything you save stays on your computer.

Think of it like a digital DM screen — but smarter. It knows the rules, tracks everything automatically, and has buttons for every action your players can take.

---

## PROJECT STRUCTURE

```
dm-assistant/
├── gemini.md                  ← Prompt file for Gemini CLI
├── roadmap.md                 ← This file (build instructions)
├── package.json               ← Project configuration (don't edit manually)
├── tsconfig.json              ← TypeScript settings
├── tailwind.config.js         ← Theme colors and fonts
├── index.html                 ← Entry point
├── public/                    ← Static files (fonts, images)
│   └── fonts/
├── src/
│   ├── main.tsx               ← App entry point
│   ├── App.tsx                ← Main app component with routing
│   ├── index.css              ← Global styles and Tailwind imports
│   ├── types/                 ← Data type definitions
│   ├── data/                  ← Game rules and reference data
│   ├── store/                 ← State management
│   ├── engine/                ← Game logic (pure functions, no UI)
│   ├── components/            ← UI components (organized by feature)
│   └── pages/                 ← Top-level page components
```

---

## CURRENT STATUS: ALL ROADMAP PHASES COMPLETE ✅

The following phases have been successfully implemented and their features exist in the active codebase:
- **Phase 1:** Project Scaffolding & App Shell
- **Phase 2:** Character Profile System
- **Phase 3 (+ 3.x):** Action Button System, 5e.tools Integration, Homebrew Catalog
- **Phase 4 (+ 4.x):** Combat Mode, Overhaul, QoL, Encounter Builder
- **Phase 5 (+ 5.x):** Spell Management, Rest Automation, Combat Extras, Character Sheet Import, Campaign Management, QoL, Action Wizard
- **Phase 6 (+ 6.1):** Tactical Combat Map & Grid System
- **Phase 21 & 22:** Advanced Combat Rules & Full Systems Audit

**There are currently no outstanding features or build blocks on the roadmap. The core MVP for D&D 5e is fully built.**

---

## GENERAL RULES FOR ALL PHASES

1. **After every code change**, run `npm run dev` to make sure nothing is broken
2. **Every component** must have hover tooltips where applicable
3. **Every button** must have a disabled state with an explanatory tooltip
4. **All data** must persist in localStorage automatically
5. **The app must look premium** — no default browser styling, everything themed
6. **All text** must be readable (high contrast on dark backgrounds)
7. **Error states** must be handled gracefully (show a message, don't crash)
8. **Mobile-responsive** is nice but not a priority — this is a DM tool used on a laptop/desktop

---

## HOW TO TEST IF THINGS WORK (FOR THE USER)

Since you don't know how to code, here's how to check if things are working:

### Starting the App
1. Open PowerShell (press Windows key, type "PowerShell", click it)
2. Type: `cd C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant`
3. Type: `npm run dev`
4. Open Chrome/Edge/Firefox
5. Go to: `http://localhost:5173`
6. You should see the app!

### If Something Goes Wrong
- **Terminal shows red text?** Copy the error message and paste it to the AI
- **Page is blank?** Check the browser console (press F12, click "Console" tab), copy errors
- **Button doesn't work?** Describe what you clicked and what happened (or didn't happen)
- **Data disappeared?** You might have cleared browser data. Ask the AI about export/import

### Checking if Your Data Saved
1. Create a character
2. Close the browser tab
3. Open `http://localhost:5173` again
4. Your character should still be there
5. If it's not, something is broken with localStorage — report it

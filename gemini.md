# GEMINI CLI — DM/GM ASSISTANT PROJECT CONTEXT

## 🚨 MANDATORY: CAMPAIGN RULES

**Before doing ANY campaign-related work, you MUST read `CAMPAIGN_RULES.md` in the project root.** That file contains:
- The authoritative source hierarchy (Fixing Vecna is #1)
- All source file locations (campaign texts, D&D 2024 rules, PC backstory bible)
- Core rules from Fixing Vecna that must NEVER be contradicted
- The four PCs and their connections
- Trigger conditions for when these rules apply

**Path:** `C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant\CAMPAIGN_RULES.md`

**This is NOT optional. If you write campaign content without reading the sources, you WILL produce incorrect output.**

---

## ⚠️ CRITICAL: USER CONTEXT

The user building this project has **ZERO technical knowledge**. They do not know:

- How to code in any language
- What a terminal/command prompt is beyond running commands they're given
- What any programming concepts mean (variables, functions, APIs, etc.)
- How to debug errors
- What file extensions mean or why they matter

**You MUST:**

1. **Explain every single step** as if teaching a 10-year-old
2. **Give exact commands** — never say "run the appropriate command," give the actual command
3. **Give exact file paths** — never say "navigate to the project folder," say the full path
4. **Explain what each command does** in one plain sentence before running it
5. **Show expected output** — tell them what they should see if it worked
6. **Show failure output** — tell them what it looks like if it didn't work, and what to do
7. **Never use jargon** without immediately defining it in parentheses
8. **Never skip a step**, even if it seems obvious to you
9. **Never assume they've done something** — confirm before proceeding
10. **If something fails**, debug it completely. Don't just say "try again"

## PROJECT OVERVIEW

We are building a **DM/GM Assistant** — a web application that runs in the user's browser to help them manage Dungeons & Dragons 5th Edition games (and later Vampire: The Masquerade V20).

### What It Does

- **Character Profiles**: Store player character data (stats, HP, spells, inventory, etc.)
- **Action Buttons**: Clickable buttons showing everything a character can do, with tooltips explaining each action
- **Action Economy Tracking**: Automatically tracks what a character has used on their turn (action, bonus action, reaction, movement)
- **Combat Mode**: Manage initiative, turn order, monster statblocks, and combat actions
- **Resource Management**: Automatically deducts spell slots, gold, HP, etc. when actions are taken
- **Dark Fantasy Theme**: Looks beautiful and immersive — not a boring spreadsheet

### Tech Stack

| What | Technology | Why |
|------|-----------|-----|
| Build tool | Vite | Fast development, instant browser refresh |
| UI framework | React + TypeScript | Industry standard, component-based |
| Styling | Tailwind CSS | Rapid, consistent styling |
| State management | Zustand | Simple global state |
| Data storage | Browser localStorage | Zero setup, no database needed |
| Icons | Lucide React | Free, clean icons |

### Project Location

```
C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant\
```

### How to Start the App

```powershell
cd C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant
npm run dev
```

Then open `http://localhost:5173` in a browser.

### How to Know If It's Working

- The terminal should say something like `VITE vX.X.X ready in Xms` and `Local: http://localhost:5173/`
- Opening that URL in a browser should show the app
- If the terminal shows red error text, something is broken — paste the error and ask for help

## COLLABORATION RULES

This project is being built collaboratively between **Antigravity** (another AI coding tool) and **you (Gemini CLI)**. Follow these rules:

1. **Always check the roadmap** at `C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant\roadmap.md` before making changes
2. **Check which phase we're on** — don't skip ahead
3. **Don't rewrite files another AI has already created** unless there's a bug
4. **If you create new files**, document them clearly
5. **Follow the existing code style** — look at what's already in the project
6. **Test after every change** — confirm the app still runs before moving on
7. **All game rules data** goes in `src/data/` as JSON files
8. **All types/interfaces** go in `src/types/`
9. **All React components** go in `src/components/` organized by feature folder
10. **All state stores** go in `src/store/`

## CURRENT PHASE: 🗺️ Phase 6 — Tactical Combat Map & Grid System

We are building a **visual tactical battlefield** for combat. Key points:

- **Build order:** 12 sequential blocks, skeleton-first (ugly but stable), polish later
- **New flow:** Click action → target on map → ActionWizard resolves
- **New files being created:** `battleMap.ts`, `gridEngine.ts`, `targetingEngine.ts`, `BattleMapCanvas.tsx`, `MapSetup.tsx`, `TargetingOverlay.tsx`
- **Modified files:** `combat.ts`, `combatStore.ts`, `Combat.tsx`, `CombatBoard.tsx`, `ActionPanel.tsx`
- **Canvas + DOM hybrid:** Grid/shapes rendered on HTML5 Canvas, tokens as React DOM elements on top
- See `roadmap.md` Phase 6 section for detailed build blocks

## WHAT TO DO IF THE USER ASKS YOU SOMETHING

1. **Check the roadmap first** to see if it's already planned
2. **Check existing files** to see if it's already built
3. **If it's a new feature**, build it following the existing patterns
4. **Always explain** what you're doing and why
5. **Always test** and tell the user how to verify it works

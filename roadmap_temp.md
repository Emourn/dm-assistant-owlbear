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
│   │   ├── character.ts       ← Character data shape
│   │   ├── actions.ts         ← Action/ability data shape
│   │   ├── combat.ts          ← Combat state data shape
│   │   └── common.ts          ← Shared types (dice, conditions, etc.)
│   ├── data/                  ← Game rules and reference data
│   │   ├── dnd5e/
│   │   │   ├── actions.json       ← Standard actions (Attack, Dash, etc.)
│   │   │   ├── classes.json       ← Class features by level
│   │   │   ├── races.json         ← Racial traits
│   │   │   ├── spells.json        ← Spell compendium (SRD)
│   │   │   └── conditions.json    ← Condition effects
│   ├── store/                 ← State management
│   │   ├── characterStore.ts  ← Character CRUD + persistence
│   │   ├── combatStore.ts     ← Combat encounter state
│   │   └── appStore.ts        ← App-wide settings (theme, etc.)
│   ├── engine/                ← Game logic (pure functions, no UI)
│   │   ├── actionEngine.ts    ← Action validation + resource deduction
│   │   ├── combatEngine.ts    ← Initiative, turns, combat flow
│   │   ├── diceEngine.ts      ← Dice rolling logic
│   │   └── restEngine.ts      ← Short/long rest resource recovery
│   ├── components/            ← UI components (organized by feature)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── character/
│   │   │   ├── CharacterCard.tsx
│   │   │   ├── CharacterForm.tsx
│   │   │   ├── StatBlock.tsx
│   │   │   ├── ResourceTracker.tsx
│   │   │   ├── InventoryList.tsx
│   │   │   └── SpellPanel.tsx
│   │   ├── actions/
│   │   │   ├── ActionButton.tsx
│   │   │   ├── ActionPanel.tsx
│   │   │   └── ActionLog.tsx
│   │   ├── combat/
│   │   │   ├── CombatBoard.tsx
│   │   │   ├── InitiativeTracker.tsx
│   │   │   ├── TurnIndicator.tsx
│   │   │   ├── MonsterPanel.tsx
│   │   │   └── CombatLog.tsx
│   │   └── common/
│   │       ├── DiceRoller.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Modal.tsx
│   │       └── ConditionBadge.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Characters.tsx
│       ├── CharacterDetail.tsx
│       └── Combat.tsx
```

---

## PHASE 1 — PROJECT SCAFFOLDING & APP SHELL ✅ COMPLETE

### What We're Building
The foundation: a styled, empty app with navigation. After this phase, you open the app and see a beautiful dark fantasy interface with a sidebar and a dashboard page.

### Step-by-Step Instructions

**Step 1.1 — Create the project**

Open a terminal (PowerShell on Windows) and run:

```powershell
cd C:\Users\carlo\.gemini\antigravity\scratch\dm-assistant
npx -y create-vite@latest ./ --template react-ts
```

> **What this does:** Creates a new React project with TypeScript in the `dm-assistant` folder.
> **What you should see:** Files appearing in the folder, ending with "Done."

**Step 1.2 — Install dependencies**

```powershell
npm install
npm install zustand lucide-react react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

> **What this does:**
> - `zustand` = state management (how the app remembers things)
> - `lucide-react` = icon library (sword icons, shield icons, etc.)
> - `react-router-dom` = page navigation (clicking sidebar links)
> - `tailwindcss` = styling library (makes things look pretty)

**Step 1.3 — Configure Tailwind**

Update `vite.config.ts` to add the Tailwind plugin, and update `src/index.css` to import Tailwind.

**Step 1.4 — Build the theme**

Configure `tailwind.config.js` with our dark fantasy color palette:

| Color Name | Use | Value |
|-----------|-----|-------|
| `obsidian` | Backgrounds | Near-black with blue undertone |
| `slate-dark` | Card backgrounds | Dark gray-blue |
| `parchment` | Text, highlights | Warm off-white |
| `blood` | Accent, danger, HP | Deep crimson |
| `gold` | Headers, borders, XP | Warm amber-gold |
| `arcane` | Magic, spells | Deep purple |
| `veil` | Condition effects, secondary | Muted teal |

Fonts:
- **Headings:** Cinzel (Google Fonts — elegant, fantasy feel)
- **Body:** Inter (Google Fonts — clean, readable)

**Step 1.5 — Build the App Shell**

Create the layout components:
- `AppShell.tsx` — wrapper providing the sidebar + main content area
- `Sidebar.tsx` — navigation links: Dashboard, Characters, Combat
- `Header.tsx` — top bar with app title and settings

**Step 1.6 — Build the Dashboard page**

A landing page showing:
- App title with thematic styling
- Welcome message
- Quick stats cards (total characters, active campaigns — empty for now)
- A "Get Started" prompt guiding users to create their first character

### How to Test Phase 1

```powershell
npm run dev
```

Open `http://localhost:5173` in your browser. You should see:
- ✅ Dark fantasy themed interface
- ✅ Sidebar with navigation links
- ✅ Dashboard page with welcome content
- ✅ Clicking sidebar links changes the page (even if pages are empty)

---

## PHASE 2 — CHARACTER PROFILE SYSTEM ✅ COMPLETE

### What We're Building
The ability to create, edit, view, and delete player characters. Each character has a detailed profile showing their stats, resources, inventory, and more.

### Data Schema (What a Character Looks Like)

Every character is stored as a structured object:

```
Character:
  id .............. Unique identifier (auto-generated)
  name ............ "Gandalf", "Thorin", etc.
  playerName ...... Real name of the player

  D&D 5e Fields:
    race .......... "Human", "Elf", "Dwarf", etc.
    class ......... "Wizard", "Fighter", etc.
    subclass ...... "School of Evocation", etc.
    level ......... 1-20
    abilityScores . STR, DEX, CON, INT, WIS, CHA (each 1-30)
    savingThrows .. Which saves are proficient
    skills ........ Which skills are proficient/expert
    ac ............ Armor Class
    maxHp ......... Maximum Hit Points
    currentHp ..... Current Hit Points
    tempHp ........ Temporary Hit Points
    hitDice ....... Total and remaining
    speed ......... Movement speed
    initiative .... Initiative modifier
    proficiency ... Proficiency bonus
    spellcasting .. Spellcasting ability, DC, attack bonus
    spellSlots .... Array of max/current per level
    knownSpells ... List of spell names
    features ...... Class/race features with uses
    inventory ..... Items with quantity, weight, equipped status
    gold .......... Current gold pieces (and other currencies)
    conditions .... Active conditions (Poisoned, Stunned, etc.)
    deathSaves .... Successes and failures
    notes ......... Free text field

    generation .... Blood potency
    willpower ..... Current/max willpower
    virtues ....... Conscience, Self-Control, Courage
    humanity ...... Humanity score
```

### Step-by-Step Instructions

**Step 2.1 — Create type definitions**

Build the TypeScript interfaces in `src/types/character.ts` matching the schema above.

**Step 2.2 — Create the character store**

Build `src/store/characterStore.ts` with:
- `addCharacter(character)` — add a new character
- `updateCharacter(id, changes)` — edit a character
- `deleteCharacter(id)` — remove a character
- `getCharacter(id)` — get one character
- Auto-save to localStorage (data survives page refresh)
- Export all characters as JSON file download
- Import characters from JSON file

**Step 2.3 — Build the character creation form**

`CharacterForm.tsx` — a multi-section form:
- **Identity:** Name, player name, race, class, subclass, level
- **Ability Scores:** 6 number inputs with auto-calculated modifiers
- **Combat Stats:** AC, HP, speed, initiative
- **Skills:** Checkbox grid with proficiency/expertise toggles
- **Spellcasting:** Spell slots, known spells, spellcasting ability
- **Features:** Add/remove class and race features with usage limits
- **Inventory:** Add/remove items with gold tracking
- **Notes:** Free text area

The form must auto-calculate derived values:
- Ability modifier = floor((score - 10) / 2)
- Proficiency bonus from level
- Save modifiers
- Skill modifiers
- Spell save DC = 8 + proficiency + ability modifier
- Spell attack = proficiency + ability modifier

**Step 2.4 — Build character display components**

- `CharacterCard.tsx` — compact card showing name, class, level, HP, AC
- `StatBlock.tsx` — the 6 ability scores in a visual grid (score + modifier)
- `ResourceTracker.tsx` — visual bars/counters for HP, spell slots, features
- `InventoryList.tsx` — scrollable list of items with gold total

**Step 2.5 — Build the Characters page**

`Characters.tsx` — shows all character cards in a grid. Click one to open detail view.
`CharacterDetail.tsx` — full profile view with all components, edit button, delete button.

### How to Test Phase 2

1. Run `npm run dev` and open the app
2. Click "Characters" in the sidebar
3. Click "New Character" button
4. Fill in: Name = "Thorin", Class = "Fighter", Level = 5, STR = 18
5. Save the character
6. ✅ Character card should appear in the grid
7. Click the card
8. ✅ Full profile should display with correct modifiers (STR 18 = +4)
9. Refresh the page
10. ✅ Character should still be there (localStorage persistence)

---

## PHASE 3 — ACTION BUTTON SYSTEM ✅ COMPLETE

### What We're Building
Dynamic buttons that appear on each character's profile showing every action they can take. Hovering over a button shows a detailed tooltip. Clicking a button consumes the appropriate resources.

### How It Works (Plain English)

1. When you open a character's profile, the app reads their class, race, level, features, and items
2. It builds a list of every action they can take (Attack, Cast a Spell, Dash, Second Wind, etc.)
3. Each action becomes a button, color-coded by type:
   - 🔴 **Action** (red-gold border)
   - 🟡 **Bonus Action** (amber border)
   - 🔵 **Reaction** (blue border)
   - ⚪ **Free/Passive** (gray border)
4. Hovering over a button shows: description, cost, source, and what will happen
5. Clicking a button: validates the action is legal → deducts resources → logs it
6. If the action is illegal (already used your action this turn, no spell slots left), the button is **grayed out** with a tooltip explaining why

### Action Data Structure

```
Action:
  id .............. Unique identifier
  name ............ "Attack", "Second Wind", "Fireball"
  type ............ "action" | "bonus" | "reaction" | "free" | "movement"
  source .......... "Class: Fighter", "Race: Elf", "Item: Wand of Fireballs"
  description ..... Plain text explaining what it does
  costs ........... Array of resource costs:
                      { resource: "action", amount: 1 }
                      { resource: "spellSlot", level: 3, amount: 1 }
                      { resource: "gold", amount: 50 }
                      { resource: "featureUse", featureId: "xxx", amount: 1 }
  prerequisites ... Conditions that must be true:
                      { type: "hasResource", resource: "action" }
                      { type: "level", min: 5 }
                      { type: "notCondition", condition: "Incapacitated" }
  effects ......... What happens when used:
                      { type: "deductResource", ... }
                      { type: "addCondition", ... }
                      { type: "promptRoll", dice: "1d10+5" }
  rulesText ....... Official rules text for reference
```

### Step-by-Step Instructions

**Step 3.1 — Create action type definitions**

Build `src/types/actions.ts` with the interfaces above.

**Step 3.2 — Create D&D 5e action data**

Build JSON files in `src/data/dnd5e/`:
- `actions.json` — Standard actions available to ALL characters:
  - Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object, Grapple, Shove
- `class-features.json` — Class-specific actions organized by class and level:
  - Fighter: Second Wind (Lv1), Action Surge (Lv2), Extra Attack (Lv5)
  - Wizard: Arcane Recovery (Lv1), Spell Mastery (Lv18)
  - Rogue: Sneak Attack (Lv1), Cunning Action (Lv2), Uncanny Dodge (Lv5)
  - Cleric: Channel Divinity (Lv2), Turn Undead (Lv2)
  - (Cover all PHB classes at minimum)
- `racial-traits.json` — Race-specific actions:
  - Elf: Trance, Fey Ancestry
  - Dwarf: Dwarven Resilience, Stonecunning
  - Halfling: Lucky
  - (Cover all PHB races at minimum)

**Step 3.3 — Build the action generation engine**

`src/engine/actionEngine.ts`:
- `generateActions(character)` — reads the character and produces their full action list
- `validateAction(character, action, turnState)` — checks if an action is legal right now
- `executeAction(character, action)` — deducts resources, returns updated character + log entry
- `undoAction(character, logEntry)` — reverses the last action

**Step 3.4 — Build action UI components**

- `ActionButton.tsx` — individual button with:
  - Color-coded border by action type
  - Icon (sword for Attack, sparkle for spells, shield for Dodge, etc.)
  - Name text
  - Hover: expands to show full tooltip with description, cost, rules text
  - Click: executes the action (with confirmation for costly actions)
  - Disabled state: grayed out with reason tooltip
- `ActionPanel.tsx` — grid of all action buttons for a character, grouped by type
- `ActionLog.tsx` — scrollable timeline of actions taken, with undo button on the most recent

**Step 3.5 — Integrate with character profiles**

Add the `ActionPanel` to the `CharacterDetail.tsx` page. Add a turn tracker that shows what economy is remaining (action, bonus, reaction, movement).

### How to Test Phase 3

1. Open a character profile (e.g., Thorin the Level 5 Fighter)
2. ✅ You should see action buttons: Attack, Dash, Dodge, Help, Hide, Second Wind, Action Surge
3. Hover over "Second Wind"
4. ✅ Tooltip should show: "Regain 1d10 + 5 HP. Uses bonus action. 1 use per short rest."
5. Click "Attack"
6. ✅ The "Action" economy slot should show as used
7. ✅ The action log should show "Thorin used Attack"
8. Try clicking "Dash" (another Action)
9. ✅ Button should be grayed out — tooltip says "Action already used this turn"
10. Click "Next Turn" or "Reset Turn"
11. ✅ All economy resets, buttons are active again

---

## PHASE 3.5 — ADVANCED RULES ENGINE & 5e.tools ✅ COMPLETE

### What Was Built
- Upgraded `actionEngine.ts` to strict numeric economy tracking (actions, bonus actions, reactions)
- Implemented `fiveEToolsParser.ts` for automated spell fetching from 5e.tools GitHub mirror
- Built "5E Database Search" modal for importing spells into character spellbooks
- Added `customOverrides` to the Character interface for DM-specific rule modifications
- Added "Custom Action" instant button to ActionPanel
- Added "DM Override" toggle to bypass all economy validation
- Full codebase audit: fixed 6 bugs (spellSlots shared ref, CORS blocking, condition ordering, Action Surge no-op, spell slot deduction, school abbreviations)

---

## PHASE 3.6 — DEEP 5e.tools INTEGRATION ✅ COMPLETE

### What Was Built
Full 5e.tools integration across the entire app — information tooltips on everything, import buttons everywhere, and feat/race automation that modifies character stats automatically.

### Key Features

**A. Universal Info Tooltips**
Every label in the app (ability scores, skills, conditions, spells, items, actions) gets an `(i)` icon that, on hover, pulls and displays the official rules text from 5e.tools.

**B. Import Everywhere**
Every tab gets a "Search 5e.tools" button for its relevant data type:
- Features & Traits tab → import Feats
- Inventory tab → import Items (weapons, armor, magic items)
- Spellcasting tab → import Spells
- Core tab → smart Race/Class/Background pickers with choice wizards
- Combat tab → import Monsters

**C. Feat Automation**
Imported feats carry mechanical data:
- Ability score increases (e.g., +1 STR from Heavy Armor Master)
- Proficiency grants (e.g., Medium Armor from Moderately Armored)
- Skill proficiencies, languages, resistances
- These bonuses are automatically applied to stat calculations

**D. Expanded Parser**
The 5e.tools parser (`fiveEToolsParser.ts`) handles all data types:
- Spells, Feats, Items, Conditions, Races, Classes, Backgrounds, Subclasses, Monsters

---

## PHASE 3.7 — POLISH, HOMEBREW CATALOG & DM OVERRIDES ✅ COMPLETE

### What Was Built

**A. Bug Fixes & UI Polish**
- `InfoTooltip.tsx` — null-safe glow check, cleaner fallback text, color-coded source badges per sourcebook (PHB=red, XGE=purple, TCE=blue, DMG=indigo, HB=teal)
- `FiveEToolsModal.tsx` — keyboard nav no longer hijacks search input, Enter only imports from results (not while typing), added skeleton loading animation
- `ChoiceWizardModal.tsx` — "Selected X of Y" counter hidden on text steps, added step completion dots (gold=current, blood=completed, stone=upcoming)

**B. Browsable Community Homebrew Catalog**
- New engine: `homebrewCatalog.ts` — fetches homebrew pack listings from `TheGiddyLimit/homebrew` GitHub repository via API
- Categories: Spells, Feats, Items, Classes, Races, Monsters, Backgrounds, Subclasses
- The "Community Homebrew" tab in the search modal shows a filterable list of hundreds of community packs with author names
- Select a pack → Search/Fetch All → results display with teal HB badges
- Custom URL fallback preserved as collapsible secondary option

**C. DM Override Panel**
- Expanded `customOverrides` in `character.ts` with a generic `overrides[]` array supporting arbitrary field overrides
- New component: `DMOverridePanel.tsx` — collapsible panel on Core Identity tab with golden crown icon
- Add overrides for any mechanical field: AC, Max HP, Speed, Proficiency Bonus, Initiative, Spell Save DC, Spell Attack Modifier, Senses, Languages, Hit Dice, etc.
- Toggle overrides on/off individually with reason notes
- Overridden fields in CombatTab show golden ⚙️ badges and gold-tinted borders

### How to Test Phase 3.7

1. Open a character → Core Identity tab
2. ✅ "DM Overrides" panel visible with golden crown icon
3. Add AC override = 18 with reason "Plate Armor"
4. ✅ Override appears with toggle switch
5. Switch to Combat & Health tab
6. ✅ AC shows 18 with golden ⚙️ badge and gold border
7. Open 5e.tools search → switch to "Community Homebrew" tab
8. ✅ Pack list loads showing available homebrew packs
9. ✅ Filter bar and "Or paste a direct JSON URL" fallback present
10. Hover any skill tooltip → ✅ Appears without crash, source badge has color coding

---

## PHASE 3.8 — HOMEBREW FIX, SHOW ALL & AUDIT ✅ COMPLETE

### What Was Built

**A. Homebrew Import Pipeline Fix**
- `parseHomebrew()` was stripping raw data fields (`speed`, `ability`, `hd`, `skillProficiencies`) that the import wizards needed. Fixed by spreading the original object (`...r`, `...c`) so all raw 5e.tools fields are preserved alongside homebrew metadata.
- Added `Backgrounds` and `Subclasses` category handling to `parseHomebrew` — previously only Spells, Feats, Items, Classes, Races, and Monsters were supported.

**B. "Show All" Button**
- Added a dedicated "Show All" button alongside "Search" in `FiveEToolsModal.tsx`.
- Works in both Official 5e.tools and Community Homebrew tabs.
- Bypasses the empty-query validation so you can browse all content without typing.
- Styled with a subtle secondary color to differentiate from the primary "Search" button.

**C. React Crash Fix**
- Fixed a fatal React unmount crash caused by rendering raw JavaScript objects (like `speed: { walk: 30 }`) directly as JSX children.
- Added safe rendering guards in `renderResultMeta()` for Race speed (handles object vs number vs string) and Class hit dice (handles `hd.faces` vs `hitDice` string).

**D. Comprehensive Audit**
- Raised result cap from 20 → 50 across all search functions (`searchSpells`, `searchFeats`, `searchItems`, `searchConditions`, `searchRaces`, `searchClasses`, `searchBackgrounds`, `searchMonsters`).
- Added `skillProficiencies` forwarding in `searchRaces` — was missing, which would have broken race skill choice wizards.
- Fixed dev server port 5173 hang (killed ghost node process and restarted).
- TypeScript compiled with zero errors.

### How to Test Phase 3.8

1. Open a character → click "5e.tools lookup" next to Race
2. ✅ "Show All" button visible next to "Search"
3. Click "Show All" without typing anything
4. ✅ 50 official races load without crash
5. Switch to "Community Homebrew" tab → select any pack → click "Show All"
6. ✅ Homebrew results appear with teal HB badges
7. Click "+ Import" on a homebrew race
8. ✅ Race imports successfully (wizard opens if choices exist, otherwise imports directly)
9. Verify Race field updates on Core Identity tab

---

## PHASE 4 — COMBAT MODE

### What We're Building
A full combat management screen. Add players and monsters, roll initiative, run through turns with action tracking, and keep a complete combat log.

### How It Works (Plain English)

1. Click "Start Combat" from the combat page
2. Select which characters to include
3. Add monsters by entering their basic stats (or picking from a list)
4. Roll initiative for everyone (auto-roll for monsters, manual entry for players)
5. The app sorts everyone by initiative and shows a turn order bar
6. The current combatant is highlighted
7. Their action buttons appear in the action panel
8. When their turn is done, click "End Turn" to advance
9. The combat log records everything that happens
10. Combat ends when you click "End Combat"

### Monster Data

Monsters can be entered manually with:
```
Monster:
  name ............ "Goblin", "Dragon", etc.
  ac .............. Armor class
  maxHp ........... Hit points
  currentHp ....... Tracked during combat
  speed ........... Movement speed
  abilityScores ... STR/DEX/CON/INT/WIS/CHA
  actions ......... Array of attack/ability options
  legendaryActions  (Optional) Uses per round
  conditions ...... Active conditions
  initiativeMod ... Modifier for initiative roll
```
## PHASE 4 — COMBAT MODE ✅ COMPLETE
### What Was Built
**Goal:** Track initiative, HP, conditions, and turn order dynamically.

- [x] **Encounter Setup:** Pull characters from `characterStore` and ad-hoc monsters.
- [x] **Initiative Tracker:** Sort combatants, track whose turn it is.
- [x] **Combat Log:** Record attacks, damage, heals, and conditions.
- [x] **HP & State:** Apply damage/temp HP and track death saves.

### How to Test Phase 4

1. Navigate to Combat page
2. Click "New Encounter"
3. Add Thorin (Fighter 5) and Gandalf (Wizard 5)
4. Add a Goblin: AC 15, HP 7, DEX 14
5. Click "Roll Initiative"
6. ✅ All combatants get initiative scores
7. ✅ Turn order bar shows sorted order
8. ✅ First combatant is highlighted
9. Use Thorin's "Attack" action
10. ✅ Action logs to combat log
11. Click "End Turn"
12. ✅ Next combatant is highlighted
13. Continue until round ends
14. ✅ Round counter increments
15. Click "End Combat"
16. ✅ Combat summary displayed

---

## PHASE 4B — COMBAT ACTION SYSTEM OVERHAUL ✅ COMPLETE

### What Was Built
Overhauled the combat tracker into an interactive, card-game-style combat minigame where every entity's actions, spells, items, and abilities are visible as clickable buttons with tooltip descriptions and automated dice rolls.

**A. Monster Data Pipeline Fix**
- `searchMonsters()` now preserves raw action/trait data (`...m` spread) so `action`, `trait`, `legendary`, `reaction`, `bonus`, and ability scores flow through.
- `handleImportMonster()` extracts speed, ability scores, proficiency bonus, saving throw proficiencies, and legendary action counts.

**B. Combat Action Engine (`combatActions.ts`)**
- `getPlayerCombatActions(character)` — extracts weapon attacks, spells by level, features, and items.
- `getMonsterCombatActions(monsterData)` — parses 5e.tools `action`, `trait`, `legendary`, `reaction`, `bonus` arrays.
- `parseMonsterEntry(entries)` — extracts `+toHit`, damage dice, damage type from 5e.tools formatted entries.
- 11 generic standard D&D 5e actions pre-loaded (Attack, Dodge, Dash, Disengage, Help, Hide, Ready, Use an Object, Grapple, Shove, Offhand Attack).

**C. Action Panel (`ActionPanel.tsx`)**
- Full-width tabbed panel grouped by: Attacks, Spells, Features, Items, Traits, Legendary, Reactions, Standard.
- Saving throw quick-buttons with proficiency highlighting.
- Action economy enforcement (Action/Bonus/Reaction consumed on click).
- Auto-rolled attack + damage dice with critical hit detection.

**D. Store Updates (`combatStore.ts`)**
- `consumeAction()`, `consumeBonusAction()`, `consumeReaction()` methods.
- `useLegendaryAction(id)` for legendary action tracking.
- `useSpellSlot(id, level)` with sync to `characterStore`.

---

## PHASE 4B.1 — COMBAT QUALITY OF LIFE ✅ COMPLETE

### What Was Built

**A. End Combat Bug Fix**
- Replaced the native `window.confirm` popup (which automated tools auto-dismiss) with a custom in-app modal (`showEndConfirm` state) featuring Cancel and End Combat buttons with thematic styling.

**B. Manual Initiative Input**
- Built a "Determine Initiative" screen displayed before combat starts.
- Each combatant has a number input field for manual initiative scores.
- "Roll Missing Initiatives" only rolls for combatants whose `initiativeScore === null`.
- Full hybrid workflow: type values for some, auto-roll for the rest.

---

## PHASE 4B.2 — ENCOUNTER BUILDER, TOOLTIPS & QoL OVERHAUL ✅ COMPLETE

### What Was Built
A professional-grade encounter builder with saved templates, DMG difficulty calculations, bulletproof tooltips, source provenance on all data, and Alt-hold tooltip interaction across the entire app.

**A. Tooltip Portal Fix & Alt-Hold Interaction**
- ActionPanel tooltips ported to `createPortal` with `z-[99999]` to prevent clipping.
- `useAltKey` hook added to `ActionPanel.tsx` — tooltips now persist while Alt is held, become scrollable (`pointer-events-auto`), and show "Hold [ALT] to interact & scroll" hint.
- All three tooltip components (`InfoTooltip.tsx`, `ActionButton.tsx`, `ActionPanel.tsx`) now share identical Alt-hold behavior.

**B. Source Provenance**
- `CombatAction` interface updated with optional `source` field.
- Source badges (PHB, MM, etc.) displayed on action cards and tooltips with color-coded styling.
- `getSourceBadgeColor()` exported from `InfoTooltip.tsx` for consistent badge colors.

**C. Encounter Difficulty Calculator (`encounterDifficulty.ts`)**
- `CR_TO_XP` mapping for all challenge ratings.
- `XP_THRESHOLDS` per character level (Easy/Medium/Hard/Deadly).
- `getEncounterMultiplier()` based on monster count and party size.
- `calculateEncounterDifficulty()` returns total XP, adjusted XP, difficulty, thresholds, daily budget.
- `getDifficultyColor()` for styling difficulty badges.

**D. Encounter Pre-Builder & Library**
- `SavedEncounter` type added to `combat.ts`.
- `combatStore.ts` updated with `savedEncounters` state + `saveEncounterTemplate()`, `deleteSavedEncounter()`, `loadSavedEncounter()` methods with persist-safe fallbacks.
- `EncounterLibrary.tsx` component — grid of saved encounters with Load/Delete buttons, difficulty badges, XP totals.
- Delete uses inline React confirmation (no browser dialogs).

**E. Combat Setup QoL**
- "Clear Encounter" button with inline "Clear all? Yes / Cancel" confirmation (React state, no `window.confirm`).
- "Save as Template" button with "✓ Saved!" visual feedback for 2 seconds (no `window.prompt`).
- `clearCombatants()` store action for atomic encounter clearing.
- CR badges, source badges, and XP per monster on the monster list.
- CR input changed from `type="number"` to `type="text"` to support D&D fractions (1/8, 1/4).
- Encounter difficulty dashboard with Easy/Medium/Hard/Deadly threshold visualization.

**F. Bug Fixes**
- Fixed `window.confirm`/`window.prompt` being silently blocked by Chromium browsers, causing buttons to appear completely dead with zero errors.
- Fixed Zustand persist merge not initializing `savedEncounters` from older localStorage data (added `|| []` fallbacks).
- Added `type="button"` to all action buttons to prevent accidental form submissions.
- Fixed `.sort()` array mutation in EncounterLibrary by using spread copy.

### How to Test Phase 4B.2

1. Navigate to Combat page → create a new encounter
2. Add characters and a monster (try typing `1/4` in the CR field)
3. ✅ Difficulty dashboard shows with thresholds
4. Click "Save as Template"
5. ✅ Button briefly shows "✓ Saved!"
6. Click "Clear" → ✅ Inline "Clear all? Yes / Cancel" appears
7. Click "Yes" → ✅ All combatants removed
8. End combat → go back to Combat page
9. ✅ "Saved Encounters" section shows saved template with Load/Delete
10. Enter combat → hover an action card
11. ✅ Tooltip appears with "Hold [ALT] to interact & scroll" hint
12. Hold Alt → move mouse away → ✅ Tooltip stays pinned and is scrollable
13. Release Alt → ✅ Tooltip closes

---

## PHASE 5 — ADVANCED FEATURES (FUTURE)

These are built **after the core is stable**:

### 5A — Spell Management
- Full spell panel on character profile
- Spell slot tracking with visual indicators
- Spell search and add from SRD compendium
- Concentration tracking with visual indicator
- Casting a spell auto-deducts correct slot level

### 5B — Rest Automation
- "Short Rest" button: roll hit dice to heal, reset short rest features
- "Long Rest" button: full HP, reset all spell slots, reset long rest features
- Prompts and confirmation before applying

### 5B — Rest Automation & Camp Panel (BUILT)
- Full Camp dashboard for managing the party.
- `restEngine.ts` handling exact 5e rules for short/long rests.
- Short Rest: Roll hit dice, heal + CON mod, reset short-rest abilities.
- Long Rest: Max HP, all spell slots, half hit dice, reset all abilities, clear death saves, reduce exhaustion.
- Visual, interactive spell slot pips on character pages with "Reset All" button.

### 5C — Enhanced Combat Features (BUILT)
- Condition duration countdown (auto-decrements each round, removes at 0)
- Death save tracking with UI (Player panel replaces actions at 0 HP)
- Legendary/Lair action tracking (Init 20 Lair Action entity)
- Surprise round support (Toggle "Surprised" during setup to skip first turn)
- Ready action queueing (Dedicated button to store readied actions & triggers)

### 5D — Character Sheet Import
- Upload a PDF character sheet
- Use pdf.js (in-browser, no Python needed) to extract text
- Parse known character sheet layouts (D&D Beyond, standard 5e sheet)
- Pre-fill the character form with extracted data
- User reviews and confirms before saving


### 5F — Campaign Management
- Multiple campaigns
- Session notes with date tracking
- Party summary screen
- In-game clock (day/night cycle, spell durations)
- Combat encounter history per campaign

### 5G — Quality of Life
- Random encounter generator
- Undo last action (with stack)
- Export combat logs as text/PDF
- Damage type tracking (fire, cold, etc.)
- Resistance/immunity auto-calculation
- Keyboard shortcuts

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

---

## STATUS TRACKER

- [x] Phase 1 — Project Scaffolding & App Shell
- [x] Phase 2 — Character Profile System
- [x] Phase 3 — Action Button System
- [x] ✨ Phase 3.5: Advanced Rules Engine & 5e.tools Integration
- [x] 🎯 Phase 3.6: Deep 5e.tools Integration
- [x] 🎨 Phase 3.7: Polish, Homebrew Catalog & DM Overrides
- [x] 🐞 Phase 3.8: Homebrew Import Fix, Show All & Comprehensive Audit
- [x] ⚔️ Phase 4: Combat Mode
- [x] 🎮 Phase 4B: Combat Action System Overhaul
- [x] 🛠️ Phase 4B.1: Combat QoL (Manual Initiative, End Combat Fix)
- [x] 🏗️ Phase 4B.2: Encounter Builder, Tooltips & QoL Overhaul
- [x] ✨ Phase 5A: Spell Management
- [x] Phase 5B — Rest Automation
- [x] Phase 5C — Enhanced Combat (Condition Timers, Death Saves, Lair Actions)
- [ ] Phase 5D — Character Sheet Import
- [ ] Phase 5F — Campaign Management
- [ ] Phase 5G — Quality of Life
- [ ] 🤖 Phase 6 — AI Assistant Integration (Smart Import & Ruling Lookup)

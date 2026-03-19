# Owlbear DM Assistant Redesign Plan

## Purpose

This document defines the redesign path for turning DM Assistant into a lightweight, Owlbear-native extension instead of a compressed port of the standalone app.

The target product is:

- a compact Owlbear companion for GM runtime use
- a token-aware sheet/combat/rest tool that stays supportive of Owlbear's map-first workflow
- a focused extension that complements Smoke & Specter!, Embers, and similar tools instead of competing with them

## Problem Statement

The current extension works, but it still behaves like "the app inside Owlbear" rather than "an Owlbear extension with DM Assistant features."

### Current UX failures

- The default popover is too dense and page-like.
- The information architecture mirrors the full app instead of Owlbear usage patterns.
- Important token workflows are hidden behind general navigation.
- Character creation, import, linking, and assignment feel like separate subsystems instead of one guided flow.
- The panel wastes space on overview content that is less important than the current scene, current selection, or current turn.
- The visual language is heavy and dashboard-oriented, which makes a 560x760 popover feel cramped.
- Runtime tasks and authoring tasks are mixed together.
- The extension does not feel selection-first or tabletop-first.

## Product Principles

### 1. Map first

Owlbear owns the tabletop.

DM Assistant should never feel like it is replacing the map, scene, fog, token handling, or extension ecosystem.

### 2. Selection first

The extension should primarily answer:

- what token is selected
- what character is linked
- what action is available right now
- what combat/rest/note operation is most relevant

### 3. Runtime before authoring

The default popover should prioritize live play.

Heavy authoring flows such as full sheet editing and PDF import should be reachable, but not be the default shell.

### 4. One-step handoffs

The main loop should be smooth:

1. import or create a sheet
2. link it to a selected token
3. assign it to a player
4. use it in combat/rest/spell workflows

### 5. Extension-native UI density

The UI should be compact, legible, fast, and useful within Owlbear's popover constraints.

## Redesign Goal

Shift from:

- multi-page workbench
- overview/dashboard defaults
- large card-based navigation
- app-level campaign framing

To:

- quick runtime command surface
- contextual token inspector
- focused task panels
- progressive disclosure for advanced editing

## Scope Boundary

### Keep in extension

- character sheets
- PDF import for supported sheets
- manual sheet creation and editing
- token linking
- player assignment
- room sync
- initiative/combat integration
- camp workflow
- DM notes relevant to scene, token, and encounter runtime
- Embers bridge for mapped spell effects
- Smoke profile generation and token-level vision intent support

### Keep out of the default runtime surface

- broad campaign administration
- large dashboard summaries
- deep page-level navigation for every subsystem
- app-like hero views

### Do not replace Owlbear features

- maps
- fog
- core token movement
- scene lighting ownership
- effect overlays owned by other extensions

## Target Information Architecture

The extension should expose three UX surfaces.

### Surface A: Action popover

This is the main extension button in Owlbear.

It should act as a compact command center and selection inspector.

Default sections:

- Scene snapshot
- Selection inspector
- Active encounter strip
- Quick actions

Primary actions:

- `Open token tools`
- `Open combat`
- `Import/create sheet`
- `Run rest`

Optional secondary actions:

- `Open notes`
- `Open full editor`
- `Publish/sync`

### Surface B: Context menu actions

These should become the primary token workflow entry points.

Token context menu items:

- `Link to character`
- `Open linked sheet`
- `Assign linked character`
- `Import to combat`
- `Copy Smoke profile`
- `Cast mapped spell via Embers` where applicable

This is where the extension starts to feel native.

### Surface C: Focused secondary panels

Open only when explicitly needed.

Examples:

- Sheet import modal
- Character editor modal
- Assignment modal
- Combat detail panel
- Camp/rest panel
- Notes panel

These can still be richer, but they should not be the default landing experience.

## Core User Journeys

### Journey 1: First-time GM setup

Desired flow:

1. Open extension
2. See `No characters yet` focused empty state
3. Choose `Import PDF` or `Create character`
4. Save character
5. Select token on map
6. Click `Link token`
7. Click `Assign player`
8. Done

Required UX changes:

- replace overview hero with a setup-focused empty state
- chain import -> save -> link -> assign in one guided flow

### Journey 2: Runtime token use

Desired flow:

1. Select token
2. Open extension or right-click token
3. Immediately see linked character, key resources, active conditions, and combat state
4. Trigger spell effect, HP edit, condition update, or rest action

Required UX changes:

- selection inspector becomes primary
- token-scoped actions move out of generic pages

### Journey 3: Combat use

Desired flow:

1. Start or import combat from selected tokens
2. See compact initiative strip and active combatant
3. Access attacks, spells, Embers effects, HP, conditions, and concentration quickly

Required UX changes:

- combat should become a compact command surface, not a mini app page
- emphasis on current turn, selected target, and action resolution

### Journey 4: Player support

Desired flow:

1. GM assigns character
2. Player selects token or opens extension
3. Player sees a clean read-only sheet view

Required UX changes:

- player view stays minimal
- no GM chrome leaks into player view
- room assignment refresh must be reactive and fast

## New Runtime Layout

### GM popover structure

The GM popover should be reorganized into this order:

1. `Selection Header`
2. `Quick Actions Row`
3. `Context Panel`
4. `Encounter Strip`
5. `Secondary Tools Drawer`

#### Selection Header

Shows:

- selected token portrait
- token/character name
- linked or unlinked state
- owner/player tag
- AC / HP / initiative summary

If nothing is selected:

- show current scene status and active encounter

#### Quick Actions Row

Use compact segmented buttons:

- `Link`
- `Sheet`
- `Combat`
- `Rest`
- `Notes`

#### Context Panel

Contents depend on current state.

Cases:

- selected token + linked character
- selected token + no link
- no selection
- active combatant selected

#### Encounter Strip

Compact horizontal strip:

- round
- active combatant
- next combatants
- quick import button

#### Secondary Tools Drawer

Collapsed by default.

Contains:

- roster
- import center
- room sync
- advanced editor

## Visual Direction

### Desired feel

- practical
- instrument-like
- quiet confidence
- more "tactical console" than "fantasy dashboard"

### Styling goals

- tighter spacing
- less vertical hero content
- fewer oversized cards
- higher information density
- fewer decorative gradients in runtime screens
- more Owlbear-compatible neutral surfaces

### Visual system

Use three layers:

- `base surface`
- `focus surface`
- `action accents`

Recommended UI treatment:

- light border hierarchy
- restrained color accents for state only
- smaller headings
- denser row components
- compact icon buttons

### Theme integration

Adopt Owlbear theme values where possible through the Theme API so the extension feels more native in dark/light contexts.

## Architecture Changes

## 1. Separate runtime shell from authoring shell

Current:

- one full workbench shell for everything

Target:

- `RuntimePopoverApp`
- `AuthoringPanel`
- `CombatPanel`
- `PlayerSheetPanel`

Suggested file split:

- `src/owlbear/runtime/RuntimeHome.tsx`
- `src/owlbear/runtime/SelectionInspector.tsx`
- `src/owlbear/runtime/QuickActionBar.tsx`
- `src/owlbear/runtime/EncounterStrip.tsx`
- `src/owlbear/runtime/EmptyStatePanel.tsx`
- `src/owlbear/authoring/CharacterImportPanel.tsx`
- `src/owlbear/authoring/CharacterRosterDrawer.tsx`
- `src/owlbear/authoring/CharacterEditorModal.tsx`

## 2. Create an Owlbear-specific view model layer

The extension currently pulls from app stores and routes directly.

That is too app-centric.

Introduce a lightweight Owlbear runtime view model:

- current room
- current role
- current selection
- selected linked character
- current encounter summary
- token-link status
- actionable quick actions

Suggested modules:

- `src/owlbear/runtime/runtimeSelectors.ts`
- `src/owlbear/runtime/runtimeTypes.ts`
- `src/owlbear/runtime/runtimeController.ts`

## 3. Move token actions to context menus and compact popovers

Keep the large workbench only for advanced editing.

Token linking, combat import, assignment, and smoke sync should be token-first.

## 4. Lazy-load heavy subsystems

Heavy areas:

- PDF import
- full character editor
- campaign navigator
- full combat setup

These should load on demand rather than on initial popover open.

## Component Mapping

### Keep and adapt

- [PdfImportModal.tsx](/C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/src/components/character/PdfImportModal.tsx)
- [CharacterForm.tsx](/C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/src/components/character/CharacterForm.tsx)
- [OwlbearRoomPage.tsx](/C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/src/owlbear/OwlbearRoomPage.tsx)
- [OwlbearCombatRoute.tsx](/C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/src/owlbear/OwlbearCombatRoute.tsx)
- [ActionPanel.tsx](/C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/src/components/combat/ActionPanel.tsx)

### Retire from default runtime

- [OwlbearOverviewPage.tsx](/C:/Users/carlo/.gemini/antigravity/scratch/dm-assistant/src/owlbear/OwlbearOverviewPage.tsx)
- dashboard-like hero cards in the default popover
- full tab-nav shell as the first interaction

### Build new

- `SelectionInspector`
- `LinkedTokenCard`
- `CharacterImportLauncher`
- `AssignmentQuickSheet`
- `TokenActionMenu`
- `EncounterStrip`
- `CompactCampPanel`
- `SceneNotesPanel`

## Interaction Changes

### Character import

Current:

- open characters page
- click import
- parse PDF
- enter editor
- save
- go elsewhere to link

Target:

- `Import Sheet` is visible from first-run and from token context
- after import, show immediate next actions:
  - `Save`
  - `Link to selected token`
  - `Assign to player`

### Token linking

Current:

- navigate to sync page
- pick character
- link selection

Target:

- right-click token -> `Link to Character`
- or select token -> open extension -> `Link token`

### Player assignment

Current:

- hidden in sync page

Target:

- quick assign from linked token card
- quick assign from roster row

### Camp

Current:

- full page

Target:

- compact rest panel with:
  - short rest
  - long rest
  - selected party subset
  - resource preview before confirm

### Notes

Current:

- buried in campaign navigator concepts

Target:

- scene note
- token note
- encounter note

Each should be quick-editable from runtime.

## Compatibility Strategy

### Smoke & Specter!

Do not attempt to take over Smoke's internal state unless a stable public API exists.

Continue with:

- token-linked smoke profile generation
- contextual sync aids
- visibility in the token inspector

Potential enhancement:

- if Smoke later exposes a supported write path, bridge through a dedicated adapter module

### Embers

Continue spell-to-effect mapping, but move the main controls into:

- token inspector
- combat action rows
- quick spell strip for linked casters

### Other Owlbear extensions

Preserve strict metadata isolation.

Never overwrite other extension namespaces.

## Performance Plan

### Startup budget

Initial popover open should avoid:

- full page routing work
- full character editor mount
- heavy PDF/parser code
- campaign-wide content mount

### Performance actions

- lazy import PDF flows
- lazy import CharacterForm
- lazy import CampaignNavigator
- cache room/selection summaries
- precompute linked token summaries on room publish

## Accessibility and Responsiveness

Requirements:

- runtime usable at 400-560 width
- no critical action below the fold on first paint
- keyboard reachable primary actions
- visual state should not depend only on color
- compact player view should still be readable on smaller windows

## Delivery Roadmap

### Phase 1: UX skeleton reset

Deliverables:

- replace overview-first default
- add runtime home and selection inspector
- simplify header and remove dashboard hero from default flow

Acceptance criteria:

- GM sees meaningful scene/selection info immediately
- no dashboard-style landing screen on normal open

### Phase 2: Guided character flow

Deliverables:

- first-run empty state
- import/create launcher
- post-import action chain
- quick token link and player assignment

Acceptance criteria:

- GM can import, save, link, assign in one continuous flow

### Phase 3: Token-native actions

Deliverables:

- expanded token context menu actions
- token inspector actions
- compact roster drawer

Acceptance criteria:

- most token-related operations start from selection or right-click

### Phase 4: Combat redesign

Deliverables:

- encounter strip
- compact active combatant surface
- combat quick actions
- Embers actions in combat surface

Acceptance criteria:

- active-turn use is possible without navigating through large sections

### Phase 5: Camp and notes compression

Deliverables:

- compact rest panel
- scene/token/encounter notes

Acceptance criteria:

- runtime support tools feel like quick overlays, not separate app pages

### Phase 6: Visual polish and theme integration

Deliverables:

- Owlbear-aware theme tokens
- compact spacing scale
- row-driven visual system
- reduced decorative chrome

Acceptance criteria:

- extension feels native and uncluttered in Owlbear

### Phase 7: Performance pass

Deliverables:

- lazy-loaded heavy features
- startup optimization
- smaller first paint surface

Acceptance criteria:

- extension open feels fast and lightweight

## Success Metrics

Qualitative:

- "feels like an Owlbear extension"
- "I can do the obvious token thing immediately"
- "I stay on the map while using it"

Behavioral:

- import -> link -> assign takes under one minute for a new character
- token import to combat takes one context-menu action
- active-turn spell action to Embers takes one click from combat

Technical:

- no role misrouting on startup
- no dead context-menu actions
- reduced initial popover mount weight

## Immediate Next Build Recommendation

Start with the runtime-shell rewrite before any more feature additions.

If new features are layered onto the current shell first, the extension will continue to feel cramped no matter how many patches are added.

### Recommended next engineering task

Implement a new Owlbear-native runtime shell with:

- selection inspector
- quick action bar
- compact encounter strip
- first-run import/create empty state
- authoring drawer instead of top-level full-page navigation

That should become the new foundation for all later extension work.

## Source References

Official Owlbear references used for this plan:

- [Getting Started](https://docs.owlbear.rodeo/extensions/getting-started/)
- [Action API](https://docs.owlbear.rodeo/extensions/apis/action/)
- [Popover API](https://docs.owlbear.rodeo/extensions/apis/popover/)
- [Context Menu API](https://docs.owlbear.rodeo/extensions/apis/context-menu/)
- [Party API](https://docs.owlbear.rodeo/extensions/apis/party/)
- [Theme API](https://docs.owlbear.rodeo/extensions/apis/theme/)
- [Extension Verification](https://docs.owlbear.rodeo/extensions/tutorial-sharing-your-extension/extension-verification/)

Supporting ecosystem examples:

- [Smoke & Specter!](https://extensions.owlbear.rodeo/smoke)
- [Auras and Emanations](https://extensions.owlbear.rodeo/auras-and-emanations)
- [Dashboard Maker](https://extensions.owlbear.rodeo/dashboard-maker)
- [Owlbear initiative tracker example](https://github.com/owlbear-rodeo/initiative-tracker)

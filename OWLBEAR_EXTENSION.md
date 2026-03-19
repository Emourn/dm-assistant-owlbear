# Owlbear Rodeo D&D Assistant

## What ships

This project now builds a brand-new Owlbear Rodeo Dungeons & Dragons extension.

Key build outputs:

- `dist/owlbear-manifest.json`
- `dist/owlbear.html`
- `dist/owlbear-workbench.html`
- `dist/owlbear-background.html`

Current rebuild slice:

- brand-new extension namespace and manifest identity
- new Owlbear-native runtime shell
- selection-aware popover shell
- lightweight context-menu open action
- clean domain / Owlbear adapter / UI separation for future Phase 1 work

## Compatibility posture

The new D&D Assistant does not try to replace Owlbear's map stack.

The extension is designed to coexist with scene and ambience extensions such as:

- Smoke & Specter!
- Embers
- Other token, lighting, and effect extensions

Why this is compatible:

- The new extension uses its own metadata namespace: `com.antigravity.dnd-assistant`
- It does not take ownership of maps, fog, lighting, particles, or other extension state
- The current rebuild slice does not yet write character or encounter metadata

## Build

```bash
npm install
npm run build
```

## Local testing

For the Owlbear popover entry:

```bash
npm run dev:owlbear
```

Owlbear Rodeo can install directly from the local manifest while the dev server is running:

```text
http://localhost:5173/owlbear-manifest.json
```

The Vite dev server is configured with Owlbear Rodeo CORS support so this URL can be used during incremental feature testing of the rebuild.

For the production bundle:

```bash
npm run build
```

Then serve the `dist/` folder with any static host.

## Recommended incremental testing loop

1. Start the local dev server.
2. In Owlbear Rodeo, add the extension from `http://localhost:5173/owlbear-manifest.json`.
3. Enable the extension in a test room.
4. Rebuild or refresh after each slice and verify the exact runtime flow on the tabletop.
5. For shared testing, push the branch and let GitHub Pages publish the built `dist/` bundle.

## Hosting for Owlbear import

Owlbear Rodeo imports extensions by manifest URL.

The canonical repo-backed manifest for this project is the jsDelivr GitHub CDN URL:

```text
https://cdn.jsdelivr.net/gh/Emourn/dm-assistant-owlbear/public/owlbear-manifest-cdn.json
```

This path serves directly from the Git repository and does not depend on GitHub Pages being enabled.

GitHub Pages can still be enabled later if desired, but it is not required for extension installs.

## Recommended incremental testing loop

1. Start the local dev server.
2. In Owlbear Rodeo, install from `http://localhost:5173/owlbear-manifest.json`.
3. Open the extension in a test room.
4. Confirm the new rebuild shell loads instead of the old DM Assistant workbench.
5. Verify room role, selection summary, and context-menu open action.
6. Only after that, add the next Phase 1 slice.

For shared repo-backed testing, install from:

```text
https://cdn.jsdelivr.net/gh/Emourn/dm-assistant-owlbear/public/owlbear-manifest-cdn.json
```

## Important constraints

- This extension is being rebuilt from scratch.
- The old DM Assistant Owlbear implementation is no longer the intended foundation.
- Owlbear remains the map engine.
- Phase 1 character-sheet systems will be reintroduced incrementally on top of the new shell.

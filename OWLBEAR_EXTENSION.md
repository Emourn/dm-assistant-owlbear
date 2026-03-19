# Owlbear Rodeo Extension Packaging

## What ships

This project now builds an Owlbear Rodeo extension alongside the standalone app.

Key build outputs:

- `dist/owlbear-manifest.json`
- `dist/owlbear.html`
- `dist/owlbear-workbench.html`
- `dist/owlbear-background.html`

Core Owlbear-facing features implemented:

- GM popover for quick room control
- Full-screen DM workbench modal
- Owlbear background page with context menu import
- Token-to-character linking using item metadata
- Shared room state publishing using Owlbear room metadata
- Player assignment registry for Owlbear room participants
- Player-facing read-only sheet view from linked or assigned tokens
- Combat token import that uses Owlbear selection and skips the internal map editor

## Compatibility posture

DM Assistant does not try to replace Owlbear's map stack.

The extension is designed to coexist with scene and ambience extensions such as:

- Smoke & Specter!
- Embers
- Other token, lighting, and effect extensions

Why this is compatible:

- DM Assistant only writes to its own metadata namespace: `com.antigravity.dm-assistant`
- Character sheet links are stored as token metadata under that namespace
- The extension does not overwrite scene lighting, fog, particles, or effect data owned by other extensions

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

For the production bundle:

```bash
npm run build
```

Then serve the `dist/` folder with any static host.

## Hosting for Owlbear import

Owlbear Rodeo imports extensions by manifest URL, not by a raw git repository URL.

That means the repository should host the built files somewhere public, for example:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting

The URL you will paste into Owlbear is the hosted manifest, for example:

```text
https://<your-host>/<path>/owlbear-manifest.json
```

## Recommended GitHub Pages flow

1. Create a repository and push this project.
2. Build the project.
3. Publish the contents of `dist/` to GitHub Pages.
4. Use the public `owlbear-manifest.json` URL in Owlbear Rodeo.

Because the Vite config now uses a relative base path, the built extension assets can be hosted from a repository subpath.

## Current Owlbear workflow

### GM workflow

1. Open the DM Assistant popover from Owlbear.
2. Open the DM workbench for campaigns, characters, combat, and rests.
3. Link selected Owlbear tokens to character sheets from the `Owlbear` tab.
4. Assign Owlbear players to characters.
5. Publish room state.
6. Import selected Owlbear tokens into combat whenever needed.

### Player workflow

1. GM assigns the player to a character.
2. GM links the character to a tabletop token.
3. Player selects that token or uses their assigned token.
4. Player opens the extension popover to view a read-only sheet.

## Important constraints

- The old internal tactical map editor is intentionally not part of the Owlbear flow.
- Owlbear remains the map engine.
- DM Assistant handles sheet state, campaign state, rests, and combat logic around Owlbear.
- Very large full-sheet sharing is handled through token metadata links, not by trying to cram full data into room metadata.

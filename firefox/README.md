# Gemini Pro Auto Default (Firefox Extension)

This Firefox extension automatically switches the selected model on `https://gemini.google.com/`.

## What It Does

- Runs on every page view at `gemini.google.com`.
- Lets you choose a forced mode: `Pro` or `Thinking`.
- Detects whether the active model already matches the selected mode.
- If not, it opens the model picker and selects a matching entry.
- Works with SPA navigation.
- If the target mode is unavailable, it fails silently and logs to DevTools console only.

## Firefox Settings (Pro / Thinking)

### Quick Switch from Toolbar Icon

1. Click the extension icon in Firefox toolbar.
2. Select `Force Pro` or `Force Thinking` in the popup.
3. Reload `https://gemini.google.com/` if needed.

### Open Full Options Page

1. Open `about:addons`.
2. Find this extension and open its preferences/options.
3. Select one mode:
   - `Force Pro`
   - `Force Thinking`
4. Reload `https://gemini.google.com/`.

## Install (Temporary Add-on)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `firefox/manifest.json` from this folder.
4. Open `https://gemini.google.com/` and verify the model switches to the selected mode.

## Files

- `manifest.json`: Firefox extension manifest (MV3).
- `extension-api.js`: runtime + storage compatibility adapter.
- `content.js`: DOM observer + model-switch logic.
- `popup.html`: toolbar popup for quick mode switching.
- `popup.js`: popup read/save logic via adapter-backed storage.
- `popup.css`: popup styling.
- `options.html`: extension options page.
- `options.js`: options read/save logic via adapter-backed storage.
- `options.css`: options page styling.
- `icons/.gitkeep`: placeholder folder for optional future icons.

## Debugging

1. Open Gemini page.
2. Open DevTools Console.
3. Filter logs by prefix: `[gemini-pro-auto-default]`.

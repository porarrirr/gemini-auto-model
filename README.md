# Gemini Pro Auto Default (Chrome/Firefox Extension)

This extension automatically switches the selected model on `https://gemini.google.com/`.

## What It Does

- Runs on every page view at `gemini.google.com`.
- Chrome version lets you choose a forced mode: `Pro` or `Thinking`.
- Detects whether the active model already matches the selected mode.
- If not, it opens the model picker and selects a matching entry.
- Works with SPA navigation (for example, creating a new chat without full reload).
- If the target mode is unavailable, it fails silently and logs to DevTools console only.

## Install (Chrome, Unpacked)

1. Open `chrome://extensions`.
2. Enable `Developer mode` (top-right).
3. Click `Load unpacked`.
4. Select this folder: `geminicom`.
5. Open `https://gemini.google.com/` and verify the model switches to `Pro`.

## Chrome Settings (Pro / Thinking)

### Quick Switch from Toolbar Icon

1. Click the extension icon in Chrome toolbar.
2. Select `Force Pro` or `Force Thinking` in the popup.
3. Reload `https://gemini.google.com/` if needed.

### Open Full Options Page

1. Open `chrome://extensions`.
2. Find this extension and click **Details**.
3. Click **Extension options**.
4. Select one mode:
   - `Force Pro`
   - `Force Thinking`
5. Reload `https://gemini.google.com/`.

## Install (Firefox, Temporary Add-on)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select this file: `firefox/manifest.json`.
4. Open `https://gemini.google.com/` and verify the model switches to `Pro` (Firefox build remains Pro-only).

## Files

- `manifest.json`: MV3 extension manifest.
- `content.js`: DOM observer + model-switch logic.
- `popup.html`: toolbar popup for quick mode switching.
- `popup.js`: popup read/save logic via `chrome.storage.sync`.
- `popup.css`: popup styling.
- `options.html`: Chrome extension options page.
- `options.js`: options read/save logic via `chrome.storage.sync`.
- `options.css`: options page styling.
- `icons/.gitkeep`: placeholder folder for optional future icons.
- `firefox/manifest.json`: MV3 manifest for Firefox.
- `firefox/content.js`: Firefox runtime logic (Pro-only behavior).

## Notes and Limits

- Gemini UI changes can break selectors; update candidate selectors in `content.js` if needed.
- No notifications are shown for failures by design.
- This extension does not store personal data.

## Debugging

1. Open Gemini page.
2. Open DevTools Console.
3. Filter logs by prefix: `[gemini-pro-auto-default]`.

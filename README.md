# Gemini Pro Auto Default (Chrome/Firefox Extension)

This extension automatically switches the selected model to `Pro` on `https://gemini.google.com/`.

## What It Does

- Runs on every page view at `gemini.google.com`.
- Detects whether the active model already contains `Pro`.
- If not, it opens the model picker and selects a `Pro` entry.
- Works with SPA navigation (for example, creating a new chat without full reload).
- If `Pro` is unavailable, it fails silently and logs to DevTools console only.

## Install (Chrome, Unpacked)

1. Open `chrome://extensions`.
2. Enable `Developer mode` (top-right).
3. Click `Load unpacked`.
4. Select this folder: `geminicom`.
5. Open `https://gemini.google.com/` and verify the model switches to `Pro`.

## Install (Firefox, Temporary Add-on)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select this file: `firefox/manifest.json`.
4. Open `https://gemini.google.com/` and verify the model switches to `Pro`.

## Files

- `manifest.json`: MV3 extension manifest.
- `content.js`: DOM observer + model-switch logic.
- `icons/.gitkeep`: placeholder folder for optional future icons.
- `firefox/manifest.json`: MV3 manifest for Firefox.
- `firefox/content.js`: Firefox runtime logic (same behavior as Chrome version).

## Notes and Limits

- Gemini UI changes can break selectors; update candidate selectors in `content.js` if needed.
- No notifications are shown for failures by design.
- This extension does not store personal data.

## Debugging

1. Open Gemini page.
2. Open DevTools Console.
3. Filter logs by prefix: `[gemini-pro-auto-default]`.

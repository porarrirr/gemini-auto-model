# Gemini Pro Auto Default (Firefox Extension)

This Firefox extension automatically switches the selected model to `Pro` on `https://gemini.google.com/`.

## Install (Temporary Add-on)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `firefox/manifest.json` from this folder.
4. Open `https://gemini.google.com/` and verify the model switches to `Pro`.

## Files

- `manifest.json`: Firefox extension manifest (MV3).
- `content.js`: DOM observer + model-switch logic.
- `icons/.gitkeep`: placeholder folder for optional future icons.

## Debugging

1. Open Gemini page.
2. Open DevTools Console.
3. Filter logs by prefix: `[gemini-pro-auto-default]`.

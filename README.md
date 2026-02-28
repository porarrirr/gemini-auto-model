# Gemini Pro Auto Default (Chrome / Firefox / Safari iOS build-ready)

This extension automatically switches the selected Gemini model on `https://gemini.google.com/`.

## What it does

- Runs on every page at `gemini.google.com`.
- Lets you choose a forced mode: `Pro` or `Thinking`.
- Detects current model and only opens the picker if a switch is needed.
- Re-checks on SPA navigation and DOM changes.
- Fails silently when target mode is missing (console logs only).

## Browser installs

### Chrome (unpacked)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click **Load unpacked** and choose this repo folder.
4. Open `https://gemini.google.com/` and verify behavior.

### Firefox (temporary add-on)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `firefox/manifest.json`.
4. Open `https://gemini.google.com/` and verify behavior.

## iOS Safari packaging (iPhone, iOS 17+)

This repo includes macOS scripts and CI workflow to generate an unsigned iOS archive for a Safari Web Extension host app.

- Local docs: `docs/ios-safari.md`
- CI workflow: `.github/workflows/ios-unsigned-build.yml`
- Converter/build scripts:
  - `scripts/ios/prepare-safari-project.sh`
  - `scripts/ios/build-unsigned-archive.sh`

### Quick local commands (macOS)

```bash
bash scripts/ios/prepare-safari-project.sh
bash scripts/ios/build-unsigned-archive.sh
```

Default output:

- `build/ios/geminicom-ios17-unsigned.xcarchive`
- `build/ios/xcodebuild.log`

## Settings UI

- Toolbar popup: quick `Pro` / `Thinking` toggle
- Options page: persistent setting with auto-save
- Storage behavior: tries `sync`, falls back to `local` automatically for compatibility

## Files

- `manifest.json`: Chrome/WebExtension manifest (MV3)
- `extension-api.js`: runtime + storage compatibility adapter (`browser`/`chrome`, `sync`/`local`)
- `content.js`: model detection and auto-switch runtime logic
- `popup.*`: toolbar popup UI and logic
- `options.*`: options page UI and logic
- `firefox/`: Firefox manifest + same runtime/UI scripts
- `docs/ios-safari.md`: iPhone Safari setup and troubleshooting guide
- `scripts/ios/`: Safari converter + unsigned archive scripts

## Debugging

1. Open Gemini page.
2. Open DevTools/Web Inspector console.
3. Filter logs by `[gemini-pro-auto-default]`.

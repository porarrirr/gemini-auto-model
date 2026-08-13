# Gemini Auto Model

English | [日本語](README.ja.md)

A browser extension that keeps a selected Gemini model mode active on `gemini.google.com`. Choose Pro or Thinking once, and the extension checks the current selection as you navigate Gemini.

## Features

- Force either Pro or Thinking mode
- Re-check after Gemini's in-page navigation and interface updates
- Avoid opening the model picker when the requested mode is already active
- Configure the mode from the toolbar popup or options page
- Support Chrome, Firefox, and an iOS Safari host-app build workflow

## Install

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this repository.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `firefox/manifest.json`.

Packaged builds may be published on [GitHub Releases](https://github.com/porarrirr/gemini-auto-model/releases). iOS Safari build instructions are available in [`docs/ios-safari.md`](docs/ios-safari.md).

## Permissions and privacy

The extension uses browser storage to remember the selected mode and page access to `https://gemini.google.com/*` so it can operate the model picker. It adds no analytics, telemetry, or separate remote server.

This is an independent, unofficial extension and is not made, endorsed, or supported by Google or the Gemini team. Gemini interface changes may break its behavior.

## License

No license is currently granted for this repository's original code.

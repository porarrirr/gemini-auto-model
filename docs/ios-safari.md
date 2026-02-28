# iOS Safari Extension Guide (iPhone, iOS 17+)

This repository includes scripts to package the existing Web Extension as a Safari extension host app project for iOS.

## Requirements

- macOS with Xcode and Command Line Tools
- iPhone running iOS 17 or newer
- Apple ID signing flow suitable for your personal distribution method (for example AltStore workflows)

## Generate the iOS Host Project

From the repository root:

```bash
bash scripts/ios/prepare-safari-project.sh
```

Environment overrides:

- `EXTENSION_DIR`: Extension source directory (default: repo root)
- `IOS_PROJECT_DIR`: Output folder for generated project (default: `ios/`)
- `IOS_APP_NAME`: Host app display name (default: `Gemini Mode Switcher`)
- `IOS_BUNDLE_ID`: Bundle ID for generated host app (default: `com.example.geminimodeswitcher`)

## Build Unsigned Archive

```bash
bash scripts/ios/build-unsigned-archive.sh
```

Output defaults:

- Archive: `build/ios/geminicom-ios17-unsigned.xcarchive`
- Build log: `build/ios/xcodebuild.log`

Environment overrides:

- `IOS_PROJECT_PATH`: Explicit `.xcodeproj` path
- `IOS_MIN_VERSION`: Deployment target (default: `17.0`)
- `IOS_TARGET_DEVICE_FAMILY`: `1` for iPhone-only (default), `1,2` for iPhone+iPad
- `ARCHIVE_PATH`: Custom archive output path
- `BUILD_LOG_PATH`: Custom build log path

## Enable in iPhone Safari

1. Install and trust the built app payload using your chosen side-load route.
2. On iPhone, open **Settings > Safari > Extensions**.
3. Enable the extension host app.
4. Open extension permissions and allow access for `gemini.google.com`.
5. Launch Safari and open `https://gemini.google.com/`.

## Manual Verification Checklist

- Initial page load switches to the selected mode (`Pro` or `Thinking`)
- Mode selection in popup/options persists across reloads
- SPA navigation on Gemini triggers re-check behavior
- If target mode is unavailable, no UI breakage occurs and only console logs appear

## Troubleshooting

- Extension does not appear in Safari:
  - Confirm the host app is installed and trusted on the device.
  - Reopen Settings > Safari > Extensions after first app launch.
- Mode does not switch:
  - Confirm site access permission includes `gemini.google.com`.
  - Open Safari Web Inspector and filter logs by `[gemini-pro-auto-default]`.
- Build fails in CI:
  - Review `build/ios/xcodebuild.log`.
  - Confirm Xcode image supports the converter and iOS SDK.


#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXTENSION_DIR="${EXTENSION_DIR:-$ROOT_DIR}"
IOS_PROJECT_DIR="${IOS_PROJECT_DIR:-$ROOT_DIR/ios}"
IOS_APP_NAME="${IOS_APP_NAME:-Gemini Mode Switcher}"
IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-com.example.geminimodeswitcher}"
PROJECT_PATH_FILE="$IOS_PROJECT_DIR/.project-path"

if [[ ! -f "$EXTENSION_DIR/manifest.json" ]]; then
  echo "manifest.json was not found under EXTENSION_DIR: $EXTENSION_DIR" >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required to run safari-web-extension-converter." >&2
  exit 1
fi

mkdir -p "$IOS_PROJECT_DIR"

existing_project="$(find "$IOS_PROJECT_DIR" -maxdepth 4 -name "*.xcodeproj" -print -quit || true)"
if [[ -n "$existing_project" ]]; then
  echo "Rebuilding existing Safari extension project: $existing_project"
  xcrun safari-web-extension-converter --rebuild-project "$existing_project"
else
  echo "Creating a new Safari extension iOS host project under: $IOS_PROJECT_DIR"
  xcrun safari-web-extension-converter "$EXTENSION_DIR" \
    --project-location "$IOS_PROJECT_DIR" \
    --app-name "$IOS_APP_NAME" \
    --bundle-identifier "$IOS_BUNDLE_ID" \
    --force \
    --no-open
fi

project_path="$(find "$IOS_PROJECT_DIR" -maxdepth 4 -name "*.xcodeproj" -print -quit || true)"
if [[ -z "$project_path" ]]; then
  echo "No .xcodeproj was generated in $IOS_PROJECT_DIR" >&2
  exit 1
fi

echo "$project_path" > "$PROJECT_PATH_FILE"
echo "Prepared Xcode project: $project_path"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "project_path=$project_path" >> "$GITHUB_OUTPUT"
fi


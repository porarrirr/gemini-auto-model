#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_PROJECT_DIR="${IOS_PROJECT_DIR:-$ROOT_DIR/ios}"
PROJECT_PATH_FILE="$IOS_PROJECT_DIR/.project-path"

IOS_PROJECT_PATH="${IOS_PROJECT_PATH:-}"
if [[ -z "$IOS_PROJECT_PATH" && -f "$PROJECT_PATH_FILE" ]]; then
  IOS_PROJECT_PATH="$(cat "$PROJECT_PATH_FILE")"
fi
if [[ -z "$IOS_PROJECT_PATH" ]]; then
  IOS_PROJECT_PATH="$(find "$IOS_PROJECT_DIR" -maxdepth 4 -name "*.xcodeproj" -print -quit || true)"
fi
if [[ -z "$IOS_PROJECT_PATH" ]]; then
  echo "No Xcode project found. Run scripts/ios/prepare-safari-project.sh first." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required to build the iOS archive." >&2
  exit 1
fi

IOS_MIN_VERSION="${IOS_MIN_VERSION:-17.0}"
IOS_TARGET_DEVICE_FAMILY="${IOS_TARGET_DEVICE_FAMILY:-1}"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT_DIR/build/ios/geminicom-ios17-unsigned.xcarchive}"
BUILD_LOG_PATH="${BUILD_LOG_PATH:-$ROOT_DIR/build/ios/xcodebuild.log}"

mkdir -p "$(dirname "$ARCHIVE_PATH")"

scheme_guess_json="$(xcodebuild -list -json -project "$IOS_PROJECT_PATH")"
IOS_SCHEME="${IOS_SCHEME:-$(python3 - "$scheme_guess_json" <<'PY'
import json
import sys

data = json.loads(sys.argv[1])
schemes = data.get("project", {}).get("schemes", [])
if not schemes:
    print("")
    sys.exit(0)

preferred = ""
for name in schemes:
    lowered = name.lower()
    if "ios" in lowered and "extension" not in lowered:
        preferred = name
        break

print(preferred or schemes[0])
PY
)}"

if [[ -z "$IOS_SCHEME" ]]; then
  echo "No build scheme found in $IOS_PROJECT_PATH" >&2
  exit 1
fi

echo "Building unsigned archive"
echo "Project: $IOS_PROJECT_PATH"
echo "Scheme: $IOS_SCHEME"
echo "Archive: $ARCHIVE_PATH"

set -o pipefail
xcodebuild \
  -project "$IOS_PROJECT_PATH" \
  -scheme "$IOS_SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  IPHONEOS_DEPLOYMENT_TARGET="$IOS_MIN_VERSION" \
  TARGETED_DEVICE_FAMILY="$IOS_TARGET_DEVICE_FAMILY" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  archive \
  -archivePath "$ARCHIVE_PATH" | tee "$BUILD_LOG_PATH"

if [[ ! -d "$ARCHIVE_PATH" ]]; then
  echo "Archive was not generated: $ARCHIVE_PATH" >&2
  exit 1
fi

echo "Build log: $BUILD_LOG_PATH"
echo "Unsigned archive: $ARCHIVE_PATH"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "archive_path=$ARCHIVE_PATH" >> "$GITHUB_OUTPUT"
  echo "build_log_path=$BUILD_LOG_PATH" >> "$GITHUB_OUTPUT"
fi


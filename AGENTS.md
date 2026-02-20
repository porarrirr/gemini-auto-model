# Repository Guidelines

## Project Structure & Module Organization
- `manifest.json`: Chrome Extension Manifest V3 configuration (permissions, content script registration).
- `content.js`: Core runtime logic for detecting the current Gemini model and switching to `Pro`.
- `icons/`: Extension icon assets (`.gitkeep` is currently a placeholder).
- `README.md`: User-facing install, behavior, and debugging notes.

Keep new runtime logic in `content.js` unless adding a clearly separate concern (for example, shared helpers in a new `src/` folder).

## Build, Test, and Development Commands
- `node --check content.js`: Fast syntax validation for the content script.
- `npm --version`: Confirms Node/npm toolchain is available locally (no npm scripts are defined yet).
- Load extension for manual testing:
  1. Open `chrome://extensions`
  2. Enable Developer mode
  3. Click **Load unpacked** and select this repository
  4. Open `https://gemini.google.com/` and verify model auto-switch behavior

## Coding Style & Naming Conventions
- Use 2-space indentation, semicolons, and strict mode patterns already used in `content.js`.
- Prefer `const` by default; use `let` only when reassignment is required.
- Naming:
  - `UPPER_SNAKE_CASE` for constants (`MAX_RETRIES`)
  - `camelCase` for functions/variables (`ensureProSelected`)
  - descriptive regex names (`MODEL_TARGET_REGEX`)
- Keep logging prefixed with `[gemini-pro-auto-default]` for searchable debug output.

## Testing Guidelines
- No automated test suite is currently configured; use repeatable manual checks.
- Validate these scenarios before opening a PR:
  - Initial page load switches to `Pro` when available
  - SPA navigation still triggers re-checks
  - Missing `Pro` option fails silently (console-only warnings/debug)
- Use DevTools Console filtering by `[gemini-pro-auto-default]` to confirm behavior.

## Commit & Pull Request Guidelines
- Repository has no commit history yet; use Conventional Commits going forward:
  - `feat: improve model option scoring`
  - `fix: guard against hidden menu options`
- PRs should include:
  - concise problem/solution summary
  - manual test steps and observed result
  - screenshots or short screen recordings when UI behavior changes
  - linked issue (if applicable)

## Security & Configuration Tips
- Keep permissions minimal in `manifest.json` (`https://gemini.google.com/*` only unless required).
- Do not add data collection, remote code loading, or unnecessary external network access.

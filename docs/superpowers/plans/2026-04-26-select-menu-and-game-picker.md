# SELECT Menu + Game Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, single session). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-game pause menu (opened by SELECT) and a top-level Game Picker that auto-skips with a single registered game.

**Architecture:** Lift navigation state in `App.jsx` to a tiny screen state machine: `picker | mode-select | playing`. Boot logic checks games registry; with one game, `picker` is bypassed entirely. SELECT now opens a `PauseMenu` overlay layered inside `Screen`, which freezes the game (sets paused state) and exposes Resume / Restart / Change Mode / Quit / Mute. Hold piece relocates to Y face button (no long-press needed; Y previously mirrored B).

**Tech Stack:** React 19, Vite, Vitest (existing engine tests run in node), `@testing-library/react` + jsdom for component tests via per-file `// @vitest-environment jsdom` directive.

---

## Design Choices (locked, document in PR)

1. **Hold piece relocation:** Move HOLD to **Y face button** (was mirror of B/rotate-left). B retains rotate-left; A and X retain rotate-right. Keyboard `c` still triggers HOLD. No long-press complexity.
2. **Game Picker single-game behavior:** When only 1 game is registered, the Game Picker screen is **never shown** (boot goes to Mode Select; menu "Quit" goes to Mode Select). Menu label is **"Quit Game"** so it isn't misleading. When 2+ games are registered, Quit goes to the Game Picker.

---

## Task 1: Test infra — add @testing-library/react and jsdom

**Files:**
- Modify: `package.json`
- Create: `src/test/setup.js`

- [ ] Install deps: `npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event`
- [ ] Verify `jsdom` is already in devDependencies (it is per `package.json`)
- [ ] Component tests use per-file `// @vitest-environment jsdom` directive (no global config change needed)
- [ ] Commit: `chore: add @testing-library/react for component tests`

## Task 2: Games registry (pure data + selector)

**Files:**
- Create: `src/games/registry.js`
- Create: `src/games/registry.test.js`

- [ ] **RED:** Write `registry.test.js`:
  - imports `GAMES` array and `getDefaultGame`, `shouldShowPicker`
  - asserts `GAMES` is an array of `{ id, name, description, icon, modeSelectKey }`
  - asserts `shouldShowPicker(games)` → false for length 1, true for length ≥ 2
  - asserts `getDefaultGame(games)` returns the first registered game
- [ ] Run tests, see FAIL
- [ ] **GREEN:** Implement `registry.js` with single Tetris entry and helpers
- [ ] Run tests, see PASS
- [ ] Commit: `feat: add games registry with single-game seamless path`

## Task 3: GamePicker component

**Files:**
- Create: `src/components/GamePicker.jsx`
- Create: `src/components/GamePicker.test.jsx`
- Modify: `src/App.css` (add `.game-picker` block)

- [ ] **RED:** Component test (jsdom):
  - renders one card per game in registry (mock 2 games)
  - card click invokes `onPick(gameId)`
  - shows name, description, icon
- [ ] Run tests, see FAIL
- [ ] **GREEN:** Implement `GamePicker` as a card grid using existing `.mode-list`/`.mode-item` styling vocabulary
- [ ] Add `.game-picker` styles (mobile-first card grid, skin-aware via existing CSS vars)
- [ ] Run tests, see PASS
- [ ] Commit: `feat: add GamePicker component with skin-aware card grid`

## Task 4: PauseMenu overlay component

**Files:**
- Create: `src/components/PauseMenu.jsx`
- Create: `src/components/PauseMenu.test.jsx`
- Modify: `src/App.css` (add `.pause-menu` block)

- [ ] **RED:** Component tests (jsdom):
  - renders 5 options: Resume, Restart, Change Mode, Quit Game, Mute (label switches to Unmute when muted)
  - each option calls correct callback
  - click on backdrop invokes `onClose`
  - role=dialog, aria-modal=true, focus trap basics
- [ ] Run tests, see FAIL
- [ ] **GREEN:** Implement `PauseMenu` with backdrop + centered card. Skin-aware via CSS vars
- [ ] Add `.pause-menu` styles
- [ ] Run tests, see PASS
- [ ] Commit: `feat: add PauseMenu overlay component`

## Task 5: Wire it all together in App.jsx

**Files:**
- Modify: `src/App.jsx` (introduce `screen` state, add menu open/close, repurpose SELECT, repurpose Y)
- Modify: `src/components/Screen.jsx` (no change expected; PauseMenu rendered as child of Game)

- [ ] **RED:** Add an integration-style test `src/App.test.jsx` (jsdom):
  - With 1 game registered: app boots to mode-select (skips picker)
  - Picking a mode renders TetrisScreen
  - Pressing keyboard `Enter` (proxy for SELECT — bind SELECT to a new key OR fire on `Escape`) opens the menu
  - Menu Resume closes and resumes the game
  - Menu "Quit Game" returns to mode-select (1-game state)
- [ ] **Decision on SELECT keyboard mapping:** `Escape` opens menu (universal "menu" key) AND on-screen SELECT button opens menu. Document in code comment. Original `Enter`/`p`/`P` retains pause toggle (low-friction quick pause).
- [ ] Run test, see FAIL
- [ ] **GREEN:** 
  - Lift `screen` state: `'picker' | 'mode-select' | 'playing'`
  - Initial screen = `shouldShowPicker(GAMES) ? 'picker' : 'mode-select'`
  - Add `menuOpen` state. When opened, dispatch `PAUSE` to game (if playing). When closed via Resume, dispatch `PAUSE` again to resume.
  - SELECT button (touch) → toggle menuOpen
  - Keyboard `Escape` → toggle menuOpen
  - Y face button → dispatch HOLD (was rotate-left)
  - Menu options:
    - Resume: close menu (auto-resumes via PAUSE toggle)
    - Restart: dispatch RESET, close menu
    - Change Mode: setScreen('mode-select'), close menu
    - Quit Game: setScreen(shouldShowPicker(GAMES) ? 'picker' : 'mode-select'), close menu
    - Mute: toggle muted via existing setter, keep menu open
- [ ] Run tests, see PASS
- [ ] Commit: `feat: wire SELECT to pause menu, relocate HOLD to Y, lift screen state`

## Task 6: Full suite + lint

- [ ] Run `npm test` — confirm ALL tests pass (engine + new component tests)
- [ ] Run `npm run lint` — confirm clean
- [ ] Run `npm run build` — confirm builds successfully
- [ ] If any failures, return to Task 5 step that introduced them

## Task 7: PR + verify

- [ ] Push branch, open PR with title "SELECT pause menu + Game Picker (registry-driven)"
- [ ] PR body documents both design choices (hold relocation, picker single-game behavior)
- [ ] Wait for CI / merge to main
- [ ] Wait 3 min for Vercel deploy
- [ ] Verify live URL with preview tools (mobile viewport):
  - boots to mode select
  - SELECT opens menu, all 5 options work
  - Quit returns to mode select (single-game state)
  - Skin switching mid-game keeps menu styling correct
  - Y button holds piece
- [ ] Report back: PR URL, design choices, prod verification result

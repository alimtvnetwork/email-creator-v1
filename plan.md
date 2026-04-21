# Project Tasks

## Task 21 — Browser Form Automation (Email Sequence Filler)

- **Spec**: `spec/21-browser-form-automation/spec.md`
- **Code**: `scripts/21-browser-form-automation/`
- **Build**: `scripts/21-browser-form-automation/run.ps1`
- **Outputs**: `dist/bundle.js` (paste into DevTools), `dist/bookmarklet.txt`

### Status

- [x] Spec authored
- [x] TS project scaffolded (tsconfig, package.json, esbuild)
- [x] Embedded operator's `XPathUtils` IIFE verbatim in `src/xpath/vendor.ts`
- [x] Core modules: `EmailSequenceGenerator`, `ReactInputSetter`, `DelayController`, `StepRunner`, `SequenceOrchestrator`, `Logger`
- [x] Floating Shadow-DOM panel with editable XPaths/delays/range, auto + manual modes, live log, draggable header
- [x] `run.ps1` (git pull → npm install → build)
- [x] Typecheck + bundle verified locally
- [x] **v0.2** — Multi-profile localStorage manager, JSON import/export, explicit Save/Save As/Delete/Defaults buttons, in-panel toast feedback
- [x] **v0.3** — Global hotkey `Ctrl+Shift+X` to toggle panel visibility (persisted in localStorage)
- [x] **v0.4** — CycleLedger tracks every cycle (email/status/timestamp/error); Results section with live counts, Download CSV, and Clear buttons
- [x] **v0.5** — Pause/Resume distinct from Stop (cursor preserved); progress indicator (`cursor / total · state`) live in controls row
- [x] **v0.6** — Per-step retry with exponential backoff (`retryAttempts`, `retryBackoffMs`); element resolution wrapped in RetryPolicy
- [x] **v0.7** — Dry-run mode: `runtime.dryRun` flag resolves + highlights target elements (amber outline, 600 ms) without issuing clicks or value-sets; toggle in Runtime section
- [x] **v0.8** — Loader bookmarklet (`dist/loader.txt`, ~500 bytes) that fetches `bundle.js` from a hosted URL, bypassing the inline bookmarklet size limit; inline `bookmarklet.txt` retained for small-bundle fallback
- [x] **v0.9** — Run-control hotkeys: Space = pause/resume, Esc = stop, Enter = start/next; HotkeyController ignores events from panel inputs/textareas/selects and contenteditable targets

### Open follow-ups (non-manual)

- _(none — all non-manual tasks complete)_

### Open follow-ups (manual, on hold)

- Manual smoke test against the real target page.

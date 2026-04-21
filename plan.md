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

### Open follow-ups (non-manual, in priority order)

- Dry-run mode — resolve + highlight elements, skip clicks/fills.
- Loader bookmarklet to avoid the ~160 KB inline limit.

### Open follow-ups (manual, on hold)

- Manual smoke test against the real target page.

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

### Open follow-ups

- Manual smoke test against the real target page.
- Optional: export generated emails as CSV from the panel.
- Optional: keyboard shortcut to toggle the panel.

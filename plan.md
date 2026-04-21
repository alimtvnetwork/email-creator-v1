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
- [x] **v0.10** — XPath validator: each XPath field has a Validate button (plus Validate-all); resolves the XPath, scroll-into-view + green/red flash on the hit, inline status (`✓ <input> visible` / `✗ no match`)
- [x] **v0.11** — Structured execution log: `StepEventLog` records every step (found/missing, attempts used, delay applied, error, cycleIndex, email, ISO timestamp); panel shows event counter under the live log with **Export log JSON** + **Clear events** buttons; bounded ring buffer (2000 entries)
- [x] **v0.12** — Chrome MV3 extension wrapper (`extension/manifest.json`, click-to-inject background SW via `chrome.scripting.executeScript` in MAIN world, popup with Activate button + version stamp). `run.ps1 -D` deploy flag: reads `powershell.json`, resolves Chrome.exe + user-data-dir, kills bound Chrome processes (WMI command-line filter), relaunches with `--profile-directory --load-extension`. Modular ps-modules (`utils.ps1`, `browser-profiles.ps1`, `browser-deploy.ps1`) mirror macro-ahk-v21 layout. Build copies `bundle.js` → `extension/` and emits `version.json`.
- [x] **v0.13** — Configurable hotkey remapping with conflict detection: Hotkeys section in panel lets operator override Space/Esc/Enter; persisted in localStorage; flags risky bindings (typing-prone keys, browser/system shortcuts) with ⚠ badge + tooltip reason.
- [x] **v0.14** — Pre-run CSV exports (`ConfigCsvExporter`): three buttons in Sequence section — **Export emails CSV** (planned email list), **Export config CSV** (xpaths + delays + sequence + runtime as section/key/value rows), **Export combined CSV** (single file with both blocks). Distinct from existing post-run results CSV.
- [x] **v0.15** — Extension load reliability fix: replaced invalid JPEG-encoded `extension/icon.png` with a real PNG icon so Chrome can load/list XP21 from `--load-extension`.

### Open follow-ups (non-manual)

- _(none — all non-manual tasks complete)_

### Open follow-ups (manual, on hold)

- Manual smoke test against the real target page.

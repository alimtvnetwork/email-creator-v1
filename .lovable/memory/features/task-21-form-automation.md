---
name: Task 21 — browser form automation
description: Injectable browser script + Chrome MV3 extension wrapper that fills a 3-step form for a sequence of generated emails. Versioned milestones tracked in plan.md.
type: feature
---

Folder: `scripts/21-browser-form-automation/` · Spec: `spec/21-browser-form-automation/spec.md` · Build: `run.ps1` (esbuild IIFE → `dist/bundle.js` + `extension/bundle.js`).

Single source of truth: `AutomationConfig` (sequence, xpaths, delays, runtime). Persisted in `localStorage` under `xp21.config.v1`; named profiles under `xp21.profiles.v1`.

UI sections (Shadow-DOM panel):
- Profiles · Sequence (with pre-run CSV exports v0.14) · XPaths · Delays · Runtime · Controls · Results (post-run CSV) · Execution Log (events JSON).

CSV exports:
- **Post-run**: `CsvExporter` → cycle results (index, email, status, timestamp, error). Button in Results section.
- **Pre-run** (v0.14): `ConfigCsvExporter` → Export emails CSV, Export config CSV, Export combined CSV. Buttons in Sequence section.

Hotkeys remappable (v0.13) with conflict warnings (typing-prone / browser-shortcut detection, ⚠ badge + tooltip).

Extension wrapper requires `extension/icon.png` to be a true PNG file; Chrome can reject/list nothing when the icon extension and actual encoding mismatch.

Versioning: bump both `package.json` and `extension/manifest.json` on each milestone. Current: v0.15.0.

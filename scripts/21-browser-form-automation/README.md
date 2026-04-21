# scripts/21 — Browser Form Automation

Injectable script that fills a 3-step form (email → generate password →
create) for a sequence of generated email addresses, with a floating UI
to tweak XPaths, delays, and the sequence pattern at runtime.

## Build

```powershell
./run.ps1
```

Produces:

- `dist/bundle.js` — paste into DevTools console
- `dist/bookmarklet.txt` — drag the contents to your bookmark bar

## Configuration

See `spec/21-browser-form-automation/spec.md` for the full schema. The
panel persists edits in `localStorage` under `xp21.config.v1`.

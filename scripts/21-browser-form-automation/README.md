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
- `dist/bookmarklet.txt` — inline bookmarklet (works only while the bundle
  stays under the browser's URL limit, typically ~160 KB after encoding)
- `dist/loader.txt` — **recommended**: tiny loader bookmarklet (~500 bytes)
  that fetches `bundle.js` from a hosted URL. Edit `BUNDLE_URL_PLACEHOLDER`
  in `build.mjs` (or hand-edit `loader.txt`) to point at your hosted copy
  (GitHub raw, GitHub Pages, local static server, etc.), then drag the
  contents of `loader.txt` to your bookmark bar.

## Configuration

See `spec/21-browser-form-automation/spec.md` for the full schema. The
panel persists edits in `localStorage` under `xp21.config.v1`.

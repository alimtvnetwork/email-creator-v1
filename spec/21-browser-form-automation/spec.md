# Spec 21 — Browser Form Automation (Email Sequence Filler)

## 1. Goal

Provide a browser-injectable script that automates a 3-step form
(email field → password generate button → create button) for a
user-defined sequence of generated email addresses. The script must
expose a small floating UI so a non-developer operator can:

- edit XPaths without touching code,
- define an email pattern with a `$$$` placeholder,
- choose a numeric range and zero-padding width,
- tune per-step delay and a randomized post-create delay,
- run in fully automatic loop mode or manual step mode,
- start, stop, and observe progress via a live log.

## 2. Deliverables

| Path | Purpose |
|------|---------|
| `scripts/21-browser-form-automation/src/**` | TypeScript source |
| `scripts/21-browser-form-automation/build.mjs` | esbuild bundler |
| `scripts/21-browser-form-automation/dist/bundle.js` | IIFE for DevTools paste |
| `scripts/21-browser-form-automation/dist/bookmarklet.txt` | URL-encoded `javascript:` one-liner |
| `scripts/21-browser-form-automation/run.ps1` | `git pull` + install + build |

## 3. Configuration JSON (single source of truth)

```jsonc
{
  "sequence": {
    "pattern": "loveable.engineer.v$$$", // $$$ is a literal placeholder marker
    "padding": 3,                         // zero-pad width, independent of $$$ count
    "domain": "gmail.com",                // appended as @<domain>
    "rangeStart": 5,                 // next numeric value to run
    "rangeEnd": 29,                  // derived: rangeStart + count - 1
    "count": 25                      // how many emails to run this batch
  },
  "xpaths": {
    "emailField":      "/html/body/div[2]/.../input",
    "passwordField":   "/html/body/div[2]/.../input",
    "passwordGenerate":"/html/body/div[2]/.../button[2]",
    "createButton":    "/html/body/div[2]/.../button[1]"
  },
  "delays": {
    "betweenStepsMs": 200,         // applied after every step
    "postCreateMinMs": 500,        // randomized wait after create button
    "postCreateMaxMs": 700
  },
  "runtime": {
    "mode": "auto",                // "auto" | "manual"
    "reactAware": true             // use native value setter + input/change
  }
}
```

The placeholder marker `$$$` is **literal** — its presence in the
pattern is required, but the number of `$` characters does **not**
control padding; padding comes from `sequence.padding`. Example:
pattern `loveable.engineer.v$$$`, padding `3`, next number `5`, count `6`, domain
`gmail.com` →

```
loveable.engineer.v005@gmail.com
loveable.engineer.v006@gmail.com
...
loveable.engineer.v010@gmail.com
```

## 4. Run modes

- **auto**: orchestrator iterates the full sequence; for each email it
  fills, clicks generate, captures the password field, clicks create, then
  sleeps a jittered `[postCreateMinMs, postCreateMaxMs]` before advancing.
- **manual**: orchestrator processes exactly one email per Next click;
  Start primes the queue, Next advances by one full cycle.
- After a prepared batch finishes, `rangeStart` advances by the number of
  attempted emails and `rangeEnd` is recalculated, so the next run does not
  repeat the same addresses.

## 5. Steps per cycle

1. Resolve `emailField` XPath, click it (React-aware), wait `betweenStepsMs`.
2. Set the input value via the native setter; dispatch `input`, `change`,
   `blur`. Wait `betweenStepsMs`.
3. Resolve `passwordGenerate`, click, wait `betweenStepsMs`.
4. Resolve `passwordField`, read its generated value for CSV results.
5. Resolve `createButton`, scroll/focus/click via React events and native
   `HTMLElement.click()`, then wait jitter `[postCreateMinMs, postCreateMaxMs]`.

Any missing element aborts the current cycle, logs a warning, and (in
auto mode) continues with the next email so a flaky page does not stop
the whole batch.

## 6. UI surface (floating panel, Shadow DOM)

- Header: title, drag handle, collapse, close.
- Section *Sequence*: pattern, padding, domain, next number (`rangeStart`),
  how many emails (`count`), derived range end, preview of first/last generated email,
  plus pre-run CSV export buttons:
  **Export emails CSV** (planned list), **Export config CSV** (xpaths +
  delays + sequence + runtime snapshot), **Export combined CSV** (both
  in one file). Distinct from the post-run results CSV in §Results.
- Section *XPaths*: four textareas (emailField, passwordField, passwordGenerate, createButton).
- Section *Delays*: betweenStepsMs, postCreateMinMs, postCreateMaxMs.
- Section *Runtime*: mode toggle (auto/manual), reactAware checkbox.
- Controls: Start, Stop, Next (manual only), Reset.
- Live log (max 200 lines, newest on top).
- **Profiles section** (added in v0.2):
  - Dropdown listing all named profiles, with the active one selected.
  - Save (overwrite active), Save As… (prompt for new name), Delete, Defaults
    (reset working copy to `DEFAULT_CONFIG`), Export (download JSON), Import
    (file picker → merge into working copy).
  - Toast feedback on each action (success/error/info).

The panel persists working config in `localStorage` under `xp21.config.v1`.
Named profiles live under `xp21.profiles.v1` (a single JSON object) and the
active profile pointer under `xp21.activeProfile.v1`.

## 7. Code conventions

- Class-based modules, methods ≤ 10 lines where practical.
- No magic strings/numbers in logic — read from the config object.
- Public class API documented with a one-line JSDoc comment.
- `src/xpath/vendor.ts` embeds the user's verbatim `XPathUtils` IIFE
  and re-exports a typed wrapper.
- Build target: ES2020, IIFE, no external runtime dependencies.

## 8. Build / run

`run.ps1` performs:

1. `git pull --ff-only`
2. `npm install --no-audit --no-fund` (idempotent)
3. `node build.mjs` → writes `dist/bundle.js`, `dist/bookmarklet.txt`,
   `dist/loader.txt`, and refreshes `extension/bundle.js` + `extension/version.json`
4. Prints absolute paths of all artifacts.

### 8.1 Chrome extension wrapper

`extension/` contains an MV3 wrapper around the same `bundle.js`:

| File | Purpose |
|------|---------|
| `manifest.json` | MV3, `action` toolbar button, no auto content script |
| `background.js` | Service worker; on `action.onClicked`, injects `bundle.js` into the active tab via `chrome.scripting.executeScript` (file: `bundle.js`, world `MAIN`) |
| `popup.html` / `popup.js` | Optional popup with **Activate panel on this tab** + version stamp from `version.json` |
| `bundle.js` | Copied from `dist/bundle.js` at build time |
| `icon.png` | Valid PNG toolbar icon (Chrome rejects mismatched image formats) |

The panel never auto-injects: it appears only when the operator clicks the
toolbar icon (or the popup button). One-time `Ctrl+Shift+X` toggle still
works once mounted. The bundle's existing `__xp21Mounted` guard prevents
double-mount when the icon is clicked twice.

### 8.2 `-D` / `-Deploy` flag

`run.ps1 -D` runs the normal build, then deploys the extension to a
configured Chrome profile by:

1. Reading `powershell.json` for browser exe path overrides, user-data-dir,
   and target profile name (default `Default`).
2. Resolving Chrome.exe (PATH lookup → standard install paths).
3. Killing Chrome processes that are bound to the resolved user-data-dir
   (so `--load-extension` can attach cleanly).
4. Relaunching Chrome with
   `--profile-directory=<name> --load-extension=<absolute extension path>`.

Re-running `run.ps1 -D` reloads the extension (Chrome re-reads files on
relaunch). `-D` implies a build unless `-S` (skip-build) is also passed.

`powershell.json` (committed example, all keys optional):

```jsonc
{
  "browser": "chrome",                       // "chrome" | "edge"
  "profile": "Default",                      // Chrome profile directory name
  "chromeExePath": "",                       // explicit override; "" = auto-detect
  "edgeExePath": "",
  "chromeUserDataDir": "",                   // "" = %LOCALAPPDATA%\Google\Chrome\User Data
  "edgeUserDataDir": "",
  "killBeforeLaunch": true,                  // close existing Chrome bound to that user-data dir
  "extraChromeArgs": []                      // appended to the launch command
}
```

## 9. Out of scope

- No network calls, telemetry, or remote config.
- No CAPTCHA solving.
- No persistence of generated emails outside local browser state and exported CSV.
- No automated reload while Chrome stays open (the relaunch *is* the reload).

## 10. v0.16 behavior update

- Added **How many emails** batch size control.
- Completed batches advance the next number to prevent repeated email addresses across runs.
- Results CSV includes a `password` column populated from `xpaths.passwordField`.
- Create button click now scrolls/focuses first, dispatches React click events,
  and follows with native `HTMLElement.click()` for stubborn buttons.


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
    "rangeStart": 5,
    "rangeEnd": 10
  },
  "xpaths": {
    "emailField":      "/html/body/div[2]/.../input",
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
pattern `loveable.engineer.v$$$`, padding `3`, range `5..10`, domain
`gmail.com` →

```
loveable.engineer.v005@gmail.com
loveable.engineer.v006@gmail.com
...
loveable.engineer.v010@gmail.com
```

## 4. Run modes

- **auto**: orchestrator iterates the full sequence; for each email it
  fills, clicks generate, clicks create, then sleeps a jittered
  `[postCreateMinMs, postCreateMaxMs]` before advancing.
- **manual**: orchestrator processes exactly one email per Next click;
  Start primes the queue, Next advances by one full cycle.

## 5. Steps per cycle

1. Resolve `emailField` XPath, click it (React-aware), wait `betweenStepsMs`.
2. Set the input value via the native setter; dispatch `input`, `change`,
   `blur`. Wait `betweenStepsMs`.
3. Resolve `passwordGenerate`, click, wait `betweenStepsMs`.
4. Resolve `createButton`, click, wait jitter `[postCreateMinMs, postCreateMaxMs]`.

Any missing element aborts the current cycle, logs a warning, and (in
auto mode) continues with the next email so a flaky page does not stop
the whole batch.

## 6. UI surface (floating panel, Shadow DOM)

- Header: title, drag handle, collapse, close.
- Section *Sequence*: pattern, padding, domain, rangeStart, rangeEnd,
  preview of first/last generated email.
- Section *XPaths*: three textareas (emailField, passwordGenerate, createButton).
- Section *Delays*: betweenStepsMs, postCreateMinMs, postCreateMaxMs.
- Section *Runtime*: mode toggle (auto/manual), reactAware checkbox.
- Controls: Start, Stop, Next (manual only), Reset.
- Live log (max 200 lines, newest on top).

The panel persists config in `localStorage` under
`xp21.config.v1` so reloading the page keeps the operator's setup.

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
3. `node build.mjs` → writes `dist/bundle.js` and `dist/bookmarklet.txt`
4. Prints absolute paths of both artifacts.

## 9. Out of scope

- No network calls, telemetry, or remote config.
- No CAPTCHA solving.
- No persistence of generated emails — operator copies from log if needed.

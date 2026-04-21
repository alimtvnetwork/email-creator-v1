// Bundles src/runtime/main.ts into a single IIFE and emits three artifacts:
//   dist/bundle.js       — paste-into-DevTools IIFE
//   dist/bookmarklet.txt — legacy inline bookmarklet (may exceed browser URL limits)
//   dist/loader.txt      — tiny loader bookmarklet that fetches bundle.js from a URL
// The loader is the recommended delivery path once the bundle grows past the
// ~160 KB inline ceiling. Operator edits BUNDLE_URL_PLACEHOLDER in loader.txt
// to point at wherever bundle.js is hosted (GitHub raw, Pages, local server…).
import { build } from "esbuild";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "dist");
mkdirSync(distDir, { recursive: true });

const bundlePath = resolve(distDir, "bundle.js");
const bookmarkletPath = resolve(distDir, "bookmarklet.txt");
const loaderPath = resolve(distDir, "loader.txt");

await build({
  entryPoints: [resolve(here, "src/runtime/main.ts")],
  outfile: bundlePath,
  bundle: true,
  format: "iife",
  target: "es2020",
  platform: "browser",
  legalComments: "none",
  minify: false,
  banner: { js: "/* scripts/21-browser-form-automation — paste into DevTools */" },
});

const bundleSrc = readFileSync(bundlePath, "utf8");
const bundleBytes = statSync(bundlePath).size;

// Legacy inline bookmarklet (kept for small bundles / quick paste tests).
const inline =
  "javascript:(function(){var s=document.createElement('script');" +
  "s.textContent=decodeURIComponent('" + encodeURIComponent(bundleSrc) + "');" +
  "document.documentElement.appendChild(s);})();";
writeFileSync(bookmarkletPath, inline, "utf8");

// Loader bookmarklet — ~300 bytes, independent of bundle size. Edit the URL
// placeholder to point at the hosted copy of dist/bundle.js.
const BUNDLE_URL_PLACEHOLDER = "https://REPLACE-ME/bundle.js";
const loaderBody =
  "(function(){" +
  "var u='" + BUNDLE_URL_PLACEHOLDER + "?t='+Date.now();" +
  "fetch(u,{cache:'no-store'}).then(function(r){" +
  "if(!r.ok)throw new Error('xp21 loader: HTTP '+r.status);" +
  "return r.text();" +
  "}).then(function(src){" +
  "var s=document.createElement('script');s.textContent=src;" +
  "document.documentElement.appendChild(s);" +
  "}).catch(function(e){console.error('[xp21 loader]',e);alert('xp21 loader failed: '+e.message);});" +
  "})();";
const loader = "javascript:" + encodeURIComponent(loaderBody);
writeFileSync(loaderPath, loader, "utf8");

const kb = (n) => (n / 1024).toFixed(1) + " KB";
console.log("bundle:      " + bundlePath + "  (" + kb(bundleBytes) + ")");
console.log("bookmarklet: " + bookmarkletPath + "  (inline, " + kb(inline.length) + ")");
console.log("loader:      " + loaderPath + "  (fetches bundle from " + BUNDLE_URL_PLACEHOLDER + ")");

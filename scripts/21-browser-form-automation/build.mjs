// Bundles src/runtime/main.ts into a single IIFE plus a bookmarklet wrapper.
// No external runtime deps; everything is inlined for paste-into-DevTools use.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "dist");
mkdirSync(distDir, { recursive: true });

const bundlePath = resolve(distDir, "bundle.js");
const bookmarkletPath = resolve(distDir, "bookmarklet.txt");

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
const bookmarklet =
  "javascript:(function(){" +
  encodeURIComponent(bundleSrc) +
  ";var s=document.createElement('script');s.textContent=decodeURIComponent('" +
  encodeURIComponent(bundleSrc) +
  "');document.documentElement.appendChild(s);})();";
writeFileSync(bookmarkletPath, bookmarklet, "utf8");

console.log("bundle:     " + bundlePath);
console.log("bookmarklet:" + bookmarkletPath);

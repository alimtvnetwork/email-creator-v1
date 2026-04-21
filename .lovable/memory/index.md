# Project Memory

## Core
External tooling/scripts live under `scripts/<NN>-<slug>/` (TS + esbuild IIFE bundle for browser injection).
Specs live under `spec/<NN>-<slug>/spec.md`. Always create the spec before implementing.
Class-based modules, methods ≤10 lines, no magic strings/numbers — config comes from a single JSON object.
Embed user-supplied helper code verbatim; do not rewrite it.

## Memories
- [Task 21 — browser form automation](mem://features/task-21-form-automation) — Email-sequence filler script: config schema, folder layout, build flow, CSV exports (pre-run + post-run), hotkey remapping.

// Global keyboard shortcuts. Panel visibility toggle (Ctrl+Shift+X) plus
// run-control hotkeys (Space = pause/resume, Esc = stop, Enter = start/next).
// Events originating from the panel's own form fields are ignored so typing
// into inputs never triggers a shortcut.
import { Logger } from "./Logger";
import { SequenceOrchestrator } from "./SequenceOrchestrator";

const TOGGLE_COMBO = { ctrl: true, shift: true, key: "x" } as const;
const VISIBILITY_KEY = "xp21.panelVisible.v1";
const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export class HotkeyController {
  private host: HTMLElement | null = null;

  constructor(
    private readonly log: Logger,
    private readonly orchestrator?: SequenceOrchestrator,
  ) {}

  /** Bind the host element and start listening for shortcuts. */
  attach(host: HTMLElement): void {
    this.host = host;
    this.applyStoredVisibility();
    window.addEventListener("keydown", (ev) => this.handleKey(ev), true);
    this.log.info("hotkey", "Toggle: Ctrl+Shift+X · Space=pause/resume · Esc=stop · Enter=start/next");
  }

  /** Toggle visibility immediately; useful for the close button too. */
  toggle(): void {
    if (!this.host) return;
    const next = this.host.style.display === "none" ? "" : "none";
    this.host.style.display = next;
    this.persist(next !== "none");
    this.log.info("hotkey", "Panel " + (next === "none" ? "hidden" : "shown"));
  }

  private handleKey(ev: KeyboardEvent): void {
    if (this.matchesToggle(ev)) { this.consume(ev); this.toggle(); return; }
    if (!this.orchestrator || this.isTyping(ev)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.code === "Space")   { this.consume(ev); this.handleSpace(); }
    else if (ev.key === "Escape") { this.consume(ev); this.handleEsc(); }
    else if (ev.key === "Enter")  { this.consume(ev); this.handleEnter(); }
  }

  private handleSpace(): void {
    const snap = this.orchestrator!.snapshot();
    if (snap.state === "running") { this.orchestrator!.pause(); this.log.info("hotkey", "Pause (Space)"); }
    else if (snap.state === "paused") { void this.orchestrator!.resume(); this.log.info("hotkey", "Resume (Space)"); }
  }

  private handleEsc(): void {
    const snap = this.orchestrator!.snapshot();
    if (snap.state === "running" || snap.state === "pausing" || snap.state === "paused") {
      this.orchestrator!.stop();
      this.log.info("hotkey", "Stop (Esc)");
    }
  }

  private handleEnter(): void {
    const snap = this.orchestrator!.snapshot();
    if (snap.state === "idle") { void this.orchestrator!.start(); this.log.info("hotkey", "Start (Enter)"); }
    else if (snap.state === "paused") { void this.orchestrator!.resume(); this.log.info("hotkey", "Resume (Enter)"); }
  }

  private matchesToggle(ev: KeyboardEvent): boolean {
    return ev.ctrlKey === TOGGLE_COMBO.ctrl
      && ev.shiftKey === TOGGLE_COMBO.shift
      && ev.key.toLowerCase() === TOGGLE_COMBO.key;
  }

  private isTyping(ev: KeyboardEvent): boolean {
    const path = (ev.composedPath && ev.composedPath()) || [];
    for (const node of path) {
      const el = node as HTMLElement;
      if (!el || !el.tagName) continue;
      if (TYPING_TAGS.has(el.tagName)) return true;
      if (el.isContentEditable) return true;
    }
    return false;
  }

  private consume(ev: KeyboardEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
  }

  private applyStoredVisibility(): void {
    if (!this.host) return;
    const stored = this.safeRead();
    if (stored === "false") this.host.style.display = "none";
  }

  private persist(visible: boolean): void {
    try { window.localStorage.setItem(VISIBILITY_KEY, String(visible)); }
    catch { /* ignore quota / privacy mode */ }
  }

  private safeRead(): string | null {
    try { return window.localStorage.getItem(VISIBILITY_KEY); }
    catch { return null; }
  }
}

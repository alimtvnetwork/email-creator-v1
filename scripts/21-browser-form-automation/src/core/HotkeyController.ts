// Global keyboard shortcut to toggle panel visibility without unmounting.
// Visibility is persisted in localStorage so reloading the page preserves it.
import { Logger } from "./Logger";

const TOGGLE_COMBO = { ctrl: true, shift: true, key: "x" } as const;
const VISIBILITY_KEY = "xp21.panelVisible.v1";

export class HotkeyController {
  private host: HTMLElement | null = null;

  constructor(private readonly log: Logger) {}

  /** Bind the host element and start listening for the toggle combo. */
  attach(host: HTMLElement): void {
    this.host = host;
    this.applyStoredVisibility();
    window.addEventListener("keydown", (ev) => this.handleKey(ev), true);
    this.log.info("hotkey", "Toggle panel: Ctrl+Shift+X");
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
    if (!this.matches(ev)) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.toggle();
  }

  private matches(ev: KeyboardEvent): boolean {
    return ev.ctrlKey === TOGGLE_COMBO.ctrl
      && ev.shiftKey === TOGGLE_COMBO.shift
      && ev.key.toLowerCase() === TOGGLE_COMBO.key;
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

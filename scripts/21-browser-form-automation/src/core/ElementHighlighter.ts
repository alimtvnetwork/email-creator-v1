// On-page visual indicator for the element currently being acted on.
// Each step (email/password/generate/create) gets a distinct color so the
// operator can see exactly which XPath resolved to which element in real
// time. A small floating label sits at the top-left of the highlighted box
// with the step name + action verb.
//
// The overlay is appended to <body> (NOT to the panel's shadow root) so it
// can sit precisely over the target element in page coordinates. It auto-
// removes after HIGHLIGHT_MS unless replaced by a newer highlight.

export type HighlightStep =
  | "emailField"
  | "passwordField"
  | "passwordGenerate"
  | "createButton";

export type HighlightAction = "resolve" | "click" | "fill" | "capture";

const HIGHLIGHT_MS = 1400;
const COLORS: Record<HighlightStep, { border: string; bg: string; label: string }> = {
  emailField:       { border: "#3b82f6", bg: "rgba(59,130,246,.18)",  label: "Email field" },
  passwordField:    { border: "#f59e0b", bg: "rgba(245,158,11,.18)",  label: "Password field" },
  passwordGenerate: { border: "#a855f7", bg: "rgba(168,85,247,.20)",  label: "Generate" },
  createButton:     { border: "#22c55e", bg: "rgba(34,197,94,.20)",   label: "Create" },
};
const ACTION_VERB: Record<HighlightAction, string> = {
  resolve: "found",
  click:   "click",
  fill:    "fill",
  capture: "read",
};

export class ElementHighlighter {
  private overlay: HTMLDivElement | null = null;
  private label: HTMLDivElement | null = null;
  private timer: number | null = null;

  /** Briefly outline `el` with the color/label associated with `step`. */
  highlight(step: HighlightStep, action: HighlightAction, el: Element): void {
    const html = el as HTMLElement;
    if (!html.getBoundingClientRect) return;
    this.ensureNodes();
    const rect = html.getBoundingClientRect();
    const palette = COLORS[step];
    this.position(rect, palette);
    this.label!.textContent = palette.label + " · " + ACTION_VERB[action];
    this.scheduleHide();
  }

  /** Remove any active overlay immediately. */
  clear(): void {
    if (this.timer !== null) { window.clearTimeout(this.timer); this.timer = null; }
    this.overlay?.remove();
    this.label?.remove();
    this.overlay = null;
    this.label = null;
  }

  private ensureNodes(): void {
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.setAttribute("data-xp21-overlay", "");
      this.applyBaseStyle(this.overlay);
      document.body.appendChild(this.overlay);
    }
    if (!this.label) {
      this.label = document.createElement("div");
      this.label.setAttribute("data-xp21-overlay-label", "");
      this.applyLabelStyle(this.label);
      document.body.appendChild(this.label);
    }
  }

  private applyBaseStyle(node: HTMLDivElement): void {
    Object.assign(node.style, {
      position: "fixed", pointerEvents: "none", zIndex: "2147483646",
      border: "2px solid transparent", borderRadius: "4px",
      transition: "all 120ms ease-out",
    } as Partial<CSSStyleDeclaration>);
  }

  private applyLabelStyle(node: HTMLDivElement): void {
    Object.assign(node.style, {
      position: "fixed", pointerEvents: "none", zIndex: "2147483647",
      padding: "2px 6px", borderRadius: "3px",
      font: "11px ui-monospace, Menlo, monospace", color: "#0b1220",
      background: "#fde68a", border: "1px solid rgba(0,0,0,.2)",
      boxShadow: "0 2px 6px rgba(0,0,0,.25)", whiteSpace: "nowrap",
    } as Partial<CSSStyleDeclaration>);
  }

  private position(rect: DOMRect, palette: { border: string; bg: string; label: string }): void {
    const ov = this.overlay!;
    ov.style.left   = rect.left   + "px";
    ov.style.top    = rect.top    + "px";
    ov.style.width  = rect.width  + "px";
    ov.style.height = rect.height + "px";
    ov.style.borderColor = palette.border;
    ov.style.background  = palette.bg;
    ov.style.boxShadow   = "0 0 0 4px " + palette.bg;
    const lb = this.label!;
    lb.style.left = rect.left + "px";
    lb.style.top  = Math.max(0, rect.top - 22) + "px";
    lb.style.background = palette.border;
    lb.style.color = "#fff";
  }

  private scheduleHide(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.clear(), HIGHLIGHT_MS);
  }
}

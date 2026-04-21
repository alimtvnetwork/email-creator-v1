// Resolves an XPath against the live DOM, briefly highlights the hit, and
// returns a structured result for the panel to render. Pure read-side: no
// clicks, no value-sets — safe to call at any time, even mid-run.
import { XPathResolver } from "../xpath/resolver";

const HIGHLIGHT_MS = 900;
const HIGHLIGHT_OUTLINE = "2px solid #22c55e";
const HIGHLIGHT_OUTLINE_FAIL = "2px solid #f87171";
const HIGHLIGHT_SHADOW = "0 0 0 3px rgba(34,197,94,.35)";

export interface ValidationResult {
  ok: boolean;
  message: string;       // human-readable summary, e.g. "✓ <input> visible"
  tagName?: string;
  visible?: boolean;
}

export class XPathValidator {
  constructor(private readonly resolver: XPathResolver) {}

  /** Resolve `xpath`; on hit, scroll into view + highlight; return status. */
  validate(xpath: string): ValidationResult {
    const trimmed = xpath.trim();
    if (!trimmed) return { ok: false, message: "✗ empty XPath" };
    let el: Element | null = null;
    try { el = this.resolver.resolve(trimmed); }
    catch (err) { return { ok: false, message: "✗ " + (err as Error).message }; }
    if (!el) { return { ok: false, message: "✗ no match" }; }
    return this.describeHit(el);
  }

  private describeHit(el: Element): ValidationResult {
    const tag = el.tagName.toLowerCase();
    const visible = this.isVisible(el);
    this.flash(el, visible);
    const vis = visible ? "visible" : "hidden";
    return { ok: true, message: "✓ <" + tag + "> " + vis, tagName: tag, visible };
  }

  private isVisible(el: Element): boolean {
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el as HTMLElement);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  private flash(el: Element, ok: boolean): void {
    const html = el as HTMLElement;
    const prevOutline = html.style.outline;
    const prevShadow = html.style.boxShadow;
    html.style.outline = ok ? HIGHLIGHT_OUTLINE : HIGHLIGHT_OUTLINE_FAIL;
    html.style.boxShadow = HIGHLIGHT_SHADOW;
    try { html.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { /* noop */ }
    window.setTimeout(() => {
      html.style.outline = prevOutline;
      html.style.boxShadow = prevShadow;
    }, HIGHLIGHT_MS);
  }
}

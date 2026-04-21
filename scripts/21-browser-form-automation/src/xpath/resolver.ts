// Typed wrapper around the embedded XPathUtils IIFE. Installs the IIFE on
// first use, then exposes a small surface area used by the rest of the script.
import { XPATH_UTILS_SOURCE } from "./vendor";

interface XPathUtilsApi {
  getByXPath(xpath: string): Element | null;
  reactClick(el: Element, xpath?: string): void;
  setLogger(
    log: (scope: string, msg: string) => void,
    sub: (scope: string, msg: string) => void,
    warn: (scope: string, msg: string) => void,
  ): void;
}

declare global {
  interface Window { XPathUtils?: XPathUtilsApi; }
}

export class XPathResolver {
  private api: XPathUtilsApi;

  constructor() {
    this.api = this.ensureInstalled();
  }

  /** Install the XPathUtils IIFE exactly once per page. */
  private ensureInstalled(): XPathUtilsApi {
    if (!window.XPathUtils) {
      const tag = document.createElement("script");
      tag.textContent = XPATH_UTILS_SOURCE;
      document.documentElement.appendChild(tag);
      tag.remove();
    }
    if (!window.XPathUtils) throw new Error("XPathUtils failed to install");
    return window.XPathUtils;
  }

  /** Resolve an XPath to an element, or null if not found. */
  resolve(xpath: string): Element | null {
    return this.api.getByXPath(xpath);
  }

  /** Dispatch a React-friendly click sequence on an element. */
  click(el: Element, xpath?: string): void {
    this.api.reactClick(el, xpath);
  }

  /** Wire the vendor logger to our log sink. */
  attachLogger(sink: (scope: string, msg: string, level: "info" | "warn") => void): void {
    this.api.setLogger(
      (scope, msg) => sink(scope, msg, "info"),
      (scope, msg) => sink(scope, msg, "info"),
      (scope, msg) => sink(scope, msg, "warn"),
    );
  }
}

// Verifies that the "Create" click actually produced a server-side account
// creation, instead of being silently swallowed by validation, a stale modal,
// or a duplicate-name error. Strategy:
//   1. Snapshot the email field's current value before verification starts.
//   2. Poll up to VERIFY_TIMEOUT_MS for any positive signal:
//        - a visible success notice (text matches SUCCESS_PATTERNS), OR
//        - the email field disappears, OR
//        - the email field clears / is reset to empty.
//   3. While polling, also scan for visible error notices; if found and no
//      success signal, treat as failure and surface the message.
//   4. After every cycle (success or failure) try to dismiss leftover modal
//      "close" buttons so the next cycle starts on a clean slate.
import type { XPathConfig } from "../config/types";
import { XPathResolver } from "../xpath/resolver";
import { Logger } from "./Logger";
import { StepEventLog } from "./StepEventLog";

const VERIFY_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 250;
const SUCCESS_PATTERNS = [
  /success:\s*you created/i,           // exact cPanel toast: "Success: You created ..."
  /you\s+created\s+["“']?[^"”']+@/i,   // "You created \"foo@bar\""
  /successfully\s+created/i,
  /has been created/i,
  /account.*(created|added)/i,
];
const SUCCESS_CONTAINER_SELECTORS = [
  ".alert-success", ".cjt-notice-success", ".notice-success",
  "[role='alert'].alert-success",
];
const ERROR_PATTERNS = [
  /\berror\b/i,
  /failed/i,
  /already exists/i,
  /invalid/i,
  /not allowed/i,
  /cannot/i,
];
const ERROR_CONTAINER_SELECTORS = [
  ".alert-danger", ".alert-error", ".alert-warning",
  ".cjt-notice-danger", ".cjt-notice-error", ".cjt-notice-warn",
  ".notice-danger", ".notice-error",
];
const NOTICE_SELECTORS = [
  ".alert-success", ".alert-danger", ".alert-warning", ".alert-error",
  "[role='alert']", ".cjt-notice", ".notice", ".toast",
];
const DISMISS_SELECTORS = [
  ".modal.in .close", ".modal.show .close",
  ".ui-dialog .ui-dialog-titlebar-close",
  "[role='dialog'] [aria-label='Close']",
  ".cjt-pagenotice-close",
];

export interface VerificationResult {
  ok: boolean;
  reason: string;
}

export class CreateVerifier {
  constructor(
    private readonly xpaths: () => XPathConfig,
    private readonly resolver: XPathResolver,
    private readonly log: Logger,
    private readonly events: StepEventLog,
  ) {}

  /** Wait for a success signal; surface any error message we observe. */
  async verify(): Promise<VerificationResult> {
    const beforeValue = this.readEmailFieldValue();
    const deadline = Date.now() + VERIFY_TIMEOUT_MS;
    let lastError: string | null = null;
    while (Date.now() < deadline) {
      const success = this.findSuccessSignal(beforeValue);
      if (success) return this.recordOk(success);
      const err = this.findErrorSignal();
      if (err) lastError = err;
      await this.sleep(POLL_INTERVAL_MS);
    }
    return this.recordFail(lastError ?? "no success signal within " + VERIFY_TIMEOUT_MS + "ms");
  }

  /** Best-effort: dismiss leftover modals/dialogs so next cycle is clean. */
  dismissLeftoverDialogs(): void {
    for (const sel of DISMISS_SELECTORS) {
      const nodes = document.querySelectorAll<HTMLElement>(sel);
      nodes.forEach((node) => {
        if (this.isVisible(node)) {
          this.log.info("verify", "Dismissing leftover dialog: " + sel);
          try { node.click(); } catch { /* ignore */ }
        }
      });
    }
  }

  private findSuccessSignal(beforeValue: string | null): string | null {
    const inSuccessBox = this.matchInContainers(SUCCESS_CONTAINER_SELECTORS, SUCCESS_PATTERNS);
    if (inSuccessBox) return "success notice: " + inSuccessBox;
    const generic = this.matchInContainers(NOTICE_SELECTORS, SUCCESS_PATTERNS);
    if (generic) return "notice: " + generic;
    const fieldGone = this.emailFieldDisappearedOrCleared(beforeValue);
    if (fieldGone) return fieldGone;
    return null;
  }

  private findErrorSignal(): string | null {
    const inErrorBox = this.matchInContainers(ERROR_CONTAINER_SELECTORS, [/.+/]);
    if (inErrorBox) return inErrorBox;
    return this.matchInContainers(NOTICE_SELECTORS, ERROR_PATTERNS);
  }

  private matchInContainers(selectors: string[], patterns: RegExp[]): string | null {
    for (const sel of selectors) {
      const nodes = document.querySelectorAll<HTMLElement>(sel);
      for (const node of Array.from(nodes)) {
        if (!this.isVisible(node)) continue;
        const text = (node.textContent || "").trim();
        if (!text) continue;
        if (patterns.some((rx) => rx.test(text))) return text.slice(0, 200);
      }
    }
    return null;
  }

  private emailFieldDisappearedOrCleared(beforeValue: string | null): string | null {
    const el = this.resolver.resolve(this.xpaths().emailField);
    if (!el) return "email field removed from DOM";
    if (!this.isVisible(el as HTMLElement)) return "email field hidden";
    const current = (el as HTMLInputElement).value ?? "";
    if (beforeValue && current === "" && beforeValue !== "") return "email field cleared after submit";
    return null;
  }

  private readEmailFieldValue(): string | null {
    const el = this.resolver.resolve(this.xpaths().emailField);
    if (!el) return null;
    return (el as HTMLInputElement).value ?? "";
  }

  private isVisible(el: Element): boolean {
    const html = el as HTMLElement;
    if (!html.offsetParent && html.tagName !== "BODY") return false;
    const rect = html.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private recordOk(reason: string): VerificationResult {
    this.log.info("verify", "Create verified: " + reason);
    this.events.record({ step: "verifyCreate", status: "captured", value: reason });
    return { ok: true, reason };
  }

  private recordFail(reason: string): VerificationResult {
    this.log.warn("verify", "Create NOT verified: " + reason);
    this.events.record({ step: "verifyCreate", status: "missing", error: reason });
    return { ok: false, reason };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

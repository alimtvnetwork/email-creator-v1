// Captures the generated password after the Generate button runs. Values that
// existed before Generate, placeholders, and the typed email are rejected so
// stale/static strings cannot be saved as successful passwords.
import type { XPathConfig } from "../config/types";
import { XPathResolver } from "../xpath/resolver";
import { Logger } from "./Logger";
import { RetryPolicy } from "./RetryPolicy";
import { StepEventLog } from "./StepEventLog";
import { LiveCapture } from "./LiveCapture";

const PASSWORD_WAIT_MS = 3000;
const PASSWORD_POLL_MS = 100;
const SCAN_WAIT_MS = 3000;
const SCAN_POLL_MS = 150;
const PASSWORD_MIN_LEN = 6;
const PASSWORD_MAX_LEN = 128;
const STATIC_PASSWORDS = /^(fakepassword\d*|password\d*|changeme|example|test123?|123456)$/i;

export interface PasswordBaseline { values: Set<string>; }

export class PasswordCapture {
  constructor(
    private readonly xpaths: () => XPathConfig,
    private readonly resolver: XPathResolver,
    private readonly log: Logger,
    private readonly retry: RetryPolicy,
    private readonly events: StepEventLog,
    private readonly live: LiveCapture,
  ) {}

  snapshotBeforeGenerate(): PasswordBaseline {
    const values = new Set<string>();
    this.addResolved(values, this.xpaths().passwordField);
    this.addResolved(values, this.xpaths().passwordFieldFallback || "");
    this.scanValues().forEach((value) => values.add(value));
    return { values };
  }

  async capture(before: PasswordBaseline): Promise<string> {
    const primary = this.xpaths().passwordField;
    const fallback = (this.xpaths().passwordFieldFallback || "").trim();
    const primaryResult = await this.tryCaptureFrom("passwordField", primary, before);
    if (primaryResult.value) return this.recordCaptured(primaryResult);
    if (fallback && fallback !== primary) return this.captureFallback(fallback, before, primaryResult.attempts);
    return this.captureByScan(before, primaryResult.attempts);
  }

  private async captureFallback(fallback: string, before: PasswordBaseline, attempts: number): Promise<string> {
    this.log.warn("step", "Primary password XPath empty/stale — trying fallback");
    const fallbackResult = await this.tryCaptureFrom("passwordFieldFallback", fallback, before);
    if (fallbackResult.value) return this.recordCaptured(fallbackResult);
    return this.captureByScan(before, attempts + fallbackResult.attempts);
  }

  private async captureByScan(before: PasswordBaseline, attempts: number): Promise<string> {
    this.log.warn("step", "Configured XPaths empty/stale — scanning nearby fields");
    const scanned = await this.scanForPassword(before);
    if (scanned) return this.recordCaptured({ name: "heuristic-scan", value: scanned, attempts: 1 });
    this.events.record({ step: "capturePassword", status: "missing", attempts, error: "no changed generated password found" });
    throw new Error("No changed generated password found after Generate");
  }

  private async tryCaptureFrom(name: string, xpath: string, before: PasswordBaseline): Promise<{ name: string; value: string; attempts: number }> {
    try {
      const { el, attempts } = await this.resolveStep(name, xpath);
      const value = await this.waitForNewPassword(el, xpath, before);
      return { name, value, attempts };
    } catch (err) {
      this.log.warn("step", name + " unavailable: " + (err as Error).message);
      return { name, value: "", attempts: 0 };
    }
  }

  private recordCaptured(r: { name: string; value: string; attempts: number }): string {
    this.events.record({ step: "capturePassword", status: "captured", attempts: r.attempts });
    this.log.info("step", "Password captured via " + r.name + " (" + r.value.length + " chars)");
    this.live.setPassword(r.value, r.name);
    return r.value;
  }

  private async waitForNewPassword(initial: Element, xpath: string, before: PasswordBaseline): Promise<string> {
    const deadline = Date.now() + PASSWORD_WAIT_MS;
    let el: Element | null = initial;
    while (Date.now() < deadline) {
      const value = el ? this.readValue(el) : "";
      if (this.looksLikePassword(value, this.lastEmailTyped(), before)) return value;
      await this.sleep(PASSWORD_POLL_MS);
      el = this.resolver.resolve(xpath);
    }
    return "";
  }

  private async scanForPassword(before: PasswordBaseline): Promise<string> {
    const emailTyped = this.lastEmailTyped();
    const deadline = Date.now() + SCAN_WAIT_MS;
    while (Date.now() < deadline) {
      const value = this.scanOnce(emailTyped, before);
      if (value) return value;
      await this.sleep(SCAN_POLL_MS);
    }
    return "";
  }

  private scanOnce(emailTyped: string, before: PasswordBaseline): string {
    for (const value of this.scanValues()) {
      if (this.looksLikePassword(value, emailTyped, before)) return value;
    }
    return "";
  }

  private scanValues(): string[] {
    const root = this.scanRoot();
    if (!root) return [];
    return this.valueNodes(root).map((node) => this.readValue(node)).filter(Boolean);
  }

  private valueNodes(root: Element): Element[] {
    const fields = Array.from(root.querySelectorAll("input, textarea"));
    const text = Array.from(root.querySelectorAll("span, code, div, p")).filter((el) => el.children.length === 0);
    return fields.concat(text);
  }

  private scanRoot(): Element | null {
    const generate = this.resolver.resolve(this.xpaths().passwordGenerate);
    if (!generate) return document.body;
    return generate.closest("form") || generate.closest("section") || document.body;
  }

  private looksLikePassword(value: string, emailTyped: string, before: PasswordBaseline): boolean {
    const v = value.trim();
    if (!v || before.values.has(v) || STATIC_PASSWORDS.test(v)) return false;
    if (v.length < PASSWORD_MIN_LEN || v.length > PASSWORD_MAX_LEN) return false;
    if (/\s/.test(v) || v === emailTyped || v.includes("@")) return false;
    return true;
  }

  private async resolveStep(name: string, xpath: string): Promise<{ el: Element; attempts: number }> {
    const outcome = await this.retry.run("resolve " + name, () => this.requireEl(name, xpath));
    this.events.record({ step: "capturePassword", status: "found", attempts: outcome.attempts });
    return { el: outcome.value, attempts: outcome.attempts };
  }

  private addResolved(values: Set<string>, xpath: string): void {
    const el = xpath.trim() ? this.resolver.resolve(xpath) : null;
    const value = el ? this.readValue(el) : "";
    if (value) values.add(value);
  }

  private lastEmailTyped(): string {
    const el = this.resolver.resolve(this.xpaths().emailField);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
    return "";
  }

  private readValue(el: Element): string {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value.trim();
    return (el.textContent || "").trim();
  }

  private requireEl(name: string, xpath: string): Element {
    const el = this.resolver.resolve(xpath);
    if (!el) throw new Error('Element "' + name + '" not found via XPath');
    return el;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}
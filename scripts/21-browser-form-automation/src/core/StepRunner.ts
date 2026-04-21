// Encapsulates the primitive operations: resolve, click, fill, capture.
// Element resolution is wrapped in RetryPolicy so transient DOM churn
// (React renders, modals, etc.) doesn't kill an entire cycle.
// In dry-run mode, elements are resolved and briefly highlighted, but
// no click or value-set side effects are performed.
// Each step pushes a structured record into StepEventLog for debugging.
import type { RuntimeConfig, XPathConfig } from "../config/types";
import { XPathResolver } from "../xpath/resolver";
import { ReactInputSetter } from "./ReactInputSetter";
import { DelayController } from "./DelayController";
import { Logger } from "./Logger";
import { RetryPolicy } from "./RetryPolicy";
import { StepEventLog } from "./StepEventLog";
import { LiveCapture } from "./LiveCapture";
import { PasswordCapture } from "./PasswordCapture";

const HIGHLIGHT_MS = 600;
const HIGHLIGHT_STYLE = "2px solid #f59e0b";
const HIGHLIGHT_SHADOW = "0 0 0 3px rgba(245,158,11,.35)";

export class StepRunner {
  private readonly passwordCapture: PasswordCapture;

  constructor(
    private readonly xpaths: () => XPathConfig,
    private readonly runtime: () => RuntimeConfig,
    private readonly resolver: XPathResolver,
    private readonly setter: ReactInputSetter,
    private readonly delays: DelayController,
    private readonly log: Logger,
    private readonly retry: RetryPolicy,
    private readonly events: StepEventLog,
    live: LiveCapture,
  ) {
    this.passwordCapture = new PasswordCapture(xpaths, resolver, log, retry, events, live);
  }

  /** Click the email field, type the address, then wait the inter-step delay. */
  async fillEmail(email: string): Promise<void> {
    const { el, attempts } = await this.resolveStep("fillEmail", "emailField", this.xpaths().emailField);
    if (this.isDryRun()) return this.skipWithDelay(el, "fillEmail", attempts, 'would fill email "' + email + '"');
    this.clickElement(el, this.xpaths().emailField);
    await this.delays.betweenSteps();
    this.setter.setValue(el, email);
    this.setter.blur(el);
    this.log.info("step", 'Email set to "' + email + '"');
    const delayMs = await this.delays.betweenSteps();
    this.events.record({ step: "fillEmail", status: "filled", attempts, delayMs });
  }

  /** Click the password generate button, then capture the generated password. */
  async clickGeneratePassword(): Promise<string> {
    const { el, attempts } = await this.resolveStep("clickGeneratePassword", "passwordGenerate", this.xpaths().passwordGenerate);
    if (this.isDryRun()) return this.skipWithDelay(el, "clickGeneratePassword", attempts, "would click passwordGenerate").then(() => "");
    const before = this.passwordCapture.snapshotBeforeGenerate();
    this.clickElement(el, this.xpaths().passwordGenerate);
    const delayMs = await this.delays.betweenSteps();
    this.events.record({ step: "clickGeneratePassword", status: "clicked", attempts, delayMs });
    return this.passwordCapture.capture(before);
  }

  /** Click the create button, then wait the randomized post-create delay. */
  async clickCreate(): Promise<void> {
    const { el, attempts } = await this.resolveStep("clickCreate", "createButton", this.xpaths().createButton);
    if (this.isDryRun()) {
      this.highlight(el, "would click createButton");
      const delayMs = await this.delays.postCreate();
      this.events.record({ step: "clickCreate", status: "skipped-dryrun", attempts, delayMs });
      return;
    }
    this.clickElement(el, this.xpaths().createButton);
    const delayMs = await this.delays.postCreate();
    this.events.record({ step: "clickCreate", status: "clicked", attempts, delayMs });
  }


  private async skipWithDelay(el: Element, step: string, attempts: number, note: string): Promise<void> {
    this.highlight(el, note);
    const delayMs = await this.delays.betweenSteps();
    this.events.record({ step, status: "skipped-dryrun", attempts, delayMs });
  }

  private clickElement(el: Element, xpath: string): void {
    const html = el as HTMLElement;
    if (html.scrollIntoView) html.scrollIntoView({ block: "center", inline: "center" });
    if (typeof html.focus === "function") html.focus({ preventScroll: true });
    this.resolver.click(el, xpath);
    if (typeof html.click === "function") html.click();
  }

  private async resolveStep(
    step: string, name: string, xpath: string,
  ): Promise<{ el: Element; attempts: number }> {
    try {
      const outcome = await this.retry.run("resolve " + name, () => this.requireEl(name, xpath));
      this.events.record({ step, status: "found", attempts: outcome.attempts });
      return { el: outcome.value, attempts: outcome.attempts };
    } catch (err) {
      const message = (err as Error).message;
      this.events.record({ step, status: "missing", error: message });
      throw err;
    }
  }

  private isDryRun(): boolean {
    return this.runtime().dryRun === true;
  }

  private highlight(el: Element, note: string): void {
    const html = el as HTMLElement;
    const prevOutline = html.style.outline;
    const prevShadow = html.style.boxShadow;
    html.style.outline = HIGHLIGHT_STYLE;
    html.style.boxShadow = HIGHLIGHT_SHADOW;
    this.log.info("dry-run", note);
    window.setTimeout(() => {
      html.style.outline = prevOutline;
      html.style.boxShadow = prevShadow;
    }, HIGHLIGHT_MS);
  }

  private requireEl(name: string, xpath: string): Element {
    const el = this.resolver.resolve(xpath);
    if (!el) throw new Error('Element "' + name + '" not found via XPath');
    return el;
  }
}

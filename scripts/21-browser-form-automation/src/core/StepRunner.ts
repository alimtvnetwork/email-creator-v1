// Encapsulates the three primitive operations: resolve, click, fill.
// Element resolution is wrapped in RetryPolicy so transient DOM churn
// (React renders, modals, etc.) doesn't kill an entire cycle.
import type { XPathConfig } from "../config/types";
import { XPathResolver } from "../xpath/resolver";
import { ReactInputSetter } from "./ReactInputSetter";
import { DelayController } from "./DelayController";
import { Logger } from "./Logger";
import { RetryPolicy } from "./RetryPolicy";

export class StepRunner {
  constructor(
    private readonly xpaths: () => XPathConfig,
    private readonly resolver: XPathResolver,
    private readonly setter: ReactInputSetter,
    private readonly delays: DelayController,
    private readonly log: Logger,
    private readonly retry: RetryPolicy,
  ) {}

  /** Click the email field, type the address, then wait the inter-step delay. */
  async fillEmail(email: string): Promise<void> {
    const el = await this.resolveWithRetry("emailField", this.xpaths().emailField);
    this.resolver.click(el, this.xpaths().emailField);
    await this.delays.betweenSteps();
    this.setter.setValue(el, email);
    this.setter.blur(el);
    this.log.info("step", 'Email set to "' + email + '"');
    await this.delays.betweenSteps();
  }

  /** Click the password generate button, then wait the inter-step delay. */
  async clickGeneratePassword(): Promise<void> {
    const el = await this.resolveWithRetry("passwordGenerate", this.xpaths().passwordGenerate);
    this.resolver.click(el, this.xpaths().passwordGenerate);
    await this.delays.betweenSteps();
  }

  /** Click the create button, then wait the randomized post-create delay. */
  async clickCreate(): Promise<void> {
    const el = await this.resolveWithRetry("createButton", this.xpaths().createButton);
    this.resolver.click(el, this.xpaths().createButton);
    await this.delays.postCreate();
  }

  private resolveWithRetry(name: string, xpath: string): Promise<Element> {
    return this.retry.run("resolve " + name, () => this.requireEl(name, xpath));
  }

  private requireEl(name: string, xpath: string): Element {
    const el = this.resolver.resolve(xpath);
    if (!el) throw new Error('Element "' + name + '" not found via XPath');
    return el;
  }
}

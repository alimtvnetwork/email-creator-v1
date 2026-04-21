// Generic retry-with-exponential-backoff helper. Pure logic; the timing
// source is injected so tests can stub it. Returns the value plus the
// attempt count so callers can record observability metrics.
import type { DelayConfig } from "../config/types";
import { Logger } from "./Logger";

export interface RetryOutcome<T> {
  value: T;
  attempts: number;   // total attempts used (1 = succeeded first try)
}

export class RetryPolicy {
  constructor(
    private readonly getConfig: () => DelayConfig,
    private readonly log: Logger,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
  ) {}

  /** Run `task`; on throw, wait backoff and retry up to retryAttempts. */
  async run<T>(label: string, task: () => Promise<T> | T): Promise<RetryOutcome<T>> {
    const attempts = Math.max(1, this.getConfig().retryAttempts);
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const value = await task();
        return { value, attempts: attempt };
      } catch (err) {
        lastError = err;
        if (attempt === attempts) break;
        await this.waitBefore(label, attempt, err);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async waitBefore(label: string, attempt: number, err: unknown): Promise<void> {
    const base = Math.max(0, this.getConfig().retryBackoffMs);
    const wait = base * Math.pow(2, attempt - 1);
    const reason = err instanceof Error ? err.message : String(err);
    this.log.warn("retry", label + " attempt " + attempt + " failed (" + reason + "), retrying in " + wait + "ms");
    await this.sleep(wait);
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

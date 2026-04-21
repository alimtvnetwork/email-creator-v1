// Centralizes wait logic so every step pulls timing from one place.
// Each method resolves with the actual ms slept so callers can record it.
import type { DelayConfig } from "../config/types";

export class DelayController {
  constructor(private config: DelayConfig) {}

  /** Update the timing source without recreating the controller. */
  update(config: DelayConfig): void { this.config = config; }

  /** Sleep the fixed inter-step delay; resolves with the ms slept. */
  async betweenSteps(): Promise<number> {
    const ms = Math.max(0, this.config.betweenStepsMs);
    await this.sleep(ms);
    return ms;
  }

  /** Sleep a uniformly random delay within the post-create window; resolves with the ms slept. */
  async postCreate(): Promise<number> {
    const { postCreateMinMs: lo, postCreateMaxMs: hi } = this.config;
    const min = Math.min(lo, hi);
    const max = Math.max(lo, hi);
    const ms = Math.max(0, min + Math.floor(Math.random() * (max - min + 1)));
    await this.sleep(ms);
    return ms;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

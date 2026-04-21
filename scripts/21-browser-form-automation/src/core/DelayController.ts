// Centralizes wait logic so every step pulls timing from one place.
import type { DelayConfig } from "../config/types";

export class DelayController {
  constructor(private config: DelayConfig) {}

  /** Update the timing source without recreating the controller. */
  update(config: DelayConfig): void { this.config = config; }

  /** Sleep the fixed inter-step delay. */
  betweenSteps(): Promise<void> {
    return this.sleep(this.config.betweenStepsMs);
  }

  /** Sleep a uniformly random delay within the post-create window. */
  postCreate(): Promise<void> {
    const { postCreateMinMs: lo, postCreateMaxMs: hi } = this.config;
    const min = Math.min(lo, hi);
    const max = Math.max(lo, hi);
    const ms = min + Math.floor(Math.random() * (max - min + 1));
    return this.sleep(ms);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
  }
}

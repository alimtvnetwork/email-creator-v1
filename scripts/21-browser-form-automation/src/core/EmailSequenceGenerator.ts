// Expands a SequenceConfig into the concrete list of email addresses.
// $$$ is treated as a literal placeholder; padding controls zero-fill width.
import type { SequenceConfig } from "../config/types";
import { PLACEHOLDER_TOKEN } from "../config/defaults";

export class EmailSequenceGenerator {
  constructor(private readonly config: SequenceConfig) {}

  /** Validate config and return the planned batch. Throws on invalid input. */
  generate(): string[] {
    this.assertValid();
    const result: string[] = [];
    for (let offset = 0; offset < this.batchCount(); offset++) {
      result.push(this.formatOne(this.startNumber() + offset));
    }
    return result;
  }

  /** Build a single email for a specific sequence number. */
  formatOne(n: number): string {
    const numeric = String(Math.floor(n)).padStart(this.config.padding, "0");
    const local = this.config.pattern.split(PLACEHOLDER_TOKEN).join(numeric);
    return local + "@" + this.config.domain;
  }

  private assertValid(): void {
    if (!this.config.pattern.includes(PLACEHOLDER_TOKEN)) {
      throw new Error('Pattern must contain the placeholder "' + PLACEHOLDER_TOKEN + '"');
    }
    if (this.batchCount() < 1) throw new Error("count must be >= 1");
    if (this.config.padding < 0) throw new Error("padding must be >= 0");
    if (!this.config.domain.trim()) throw new Error("domain is required");
  }

  private batchCount(): number {
    return Math.floor(Math.max(0, Number(this.config.count)));
  }

  private startNumber(): number {
    return Math.floor(Number(this.config.rangeStart));
  }
}

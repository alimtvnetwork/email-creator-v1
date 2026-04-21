// Expands a SequenceConfig into the concrete list of email addresses.
// $$$ is treated as a literal placeholder; padding controls zero-fill width.
import type { SequenceConfig } from "../config/types";
import { PLACEHOLDER_TOKEN } from "../config/defaults";

export class EmailSequenceGenerator {
  constructor(private readonly config: SequenceConfig) {}

  /** Validate config and return the full sequence. Throws on invalid input. */
  generate(): string[] {
    this.assertValid();
    const result: string[] = [];
    for (let n = this.config.rangeStart; n <= this.config.rangeEnd; n++) {
      result.push(this.formatOne(n));
    }
    return result;
  }

  /** Build a single email for a specific sequence number. */
  formatOne(n: number): string {
    const numeric = String(n).padStart(this.config.padding, "0");
    const local = this.config.pattern.split(PLACEHOLDER_TOKEN).join(numeric);
    return local + "@" + this.config.domain;
  }

  private assertValid(): void {
    if (!this.config.pattern.includes(PLACEHOLDER_TOKEN)) {
      throw new Error('Pattern must contain the placeholder "' + PLACEHOLDER_TOKEN + '"');
    }
    if (this.config.rangeEnd < this.config.rangeStart) {
      throw new Error("rangeEnd must be >= rangeStart");
    }
    if (this.config.padding < 0) throw new Error("padding must be >= 0");
    if (!this.config.domain.trim()) throw new Error("domain is required");
  }
}

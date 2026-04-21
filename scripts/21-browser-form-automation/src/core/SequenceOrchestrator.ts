// Drives the email queue in either auto-loop or manual-step mode.
// Stop is cooperative: the running cycle finishes, then the loop exits.
import type { AutomationConfig } from "../config/types";
import { EmailSequenceGenerator } from "./EmailSequenceGenerator";
import { StepRunner } from "./StepRunner";
import { Logger } from "./Logger";

export type RunState = "idle" | "running" | "stopping";

export class SequenceOrchestrator {
  private queue: string[] = [];
  private cursor = 0;
  private state: RunState = "idle";

  constructor(
    private readonly getConfig: () => AutomationConfig,
    private readonly runner: StepRunner,
    private readonly log: Logger,
  ) {}

  /** Build the queue from current config and (in auto mode) start looping. */
  async start(): Promise<void> {
    if (this.state !== "idle") return;
    this.queue = new EmailSequenceGenerator(this.getConfig().sequence).generate();
    this.cursor = 0;
    this.log.info("orchestrator", "Queue prepared: " + this.queue.length + " emails");
    if (this.getConfig().runtime.mode === "auto") await this.runUntilDone();
  }

  /** Process exactly one email; only meaningful in manual mode. */
  async next(): Promise<void> {
    if (this.state === "running") return;
    if (this.cursor >= this.queue.length) { this.log.info("orchestrator", "Queue empty"); return; }
    this.state = "running";
    await this.runOne(this.queue[this.cursor]);
    this.cursor++;
    this.state = "idle";
  }

  /** Request a cooperative stop after the current cycle. */
  stop(): void {
    if (this.state === "running") this.state = "stopping";
  }

  /** Reset queue and cursor to a fresh idle state. */
  reset(): void {
    this.queue = []; this.cursor = 0; this.state = "idle";
    this.log.info("orchestrator", "Reset");
  }

  private async runUntilDone(): Promise<void> {
    this.state = "running";
    while (this.cursor < this.queue.length && this.state === "running") {
      await this.runOne(this.queue[this.cursor]);
      this.cursor++;
    }
    this.log.info("orchestrator", "Loop ended at index " + this.cursor);
    this.state = "idle";
  }

  private async runOne(email: string): Promise<void> {
    this.log.info("cycle", "Begin " + email);
    try {
      await this.runner.fillEmail(email);
      await this.runner.clickGeneratePassword();
      await this.runner.clickCreate();
      this.log.info("cycle", "Done " + email);
    } catch (err) {
      this.log.error("cycle", "Failed " + email + ": " + (err as Error).message);
    }
  }
}

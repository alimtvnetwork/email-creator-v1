// Drives the email queue in auto-loop or manual-step mode.
// State machine: idle → running ↔ pausing/paused, with a stopping shortcut.
// All transitions out of "running" are cooperative — the in-flight cycle
// finishes first, then the loop honors the requested next state.
import type { AutomationConfig } from "../config/types";
import { EmailSequenceGenerator } from "./EmailSequenceGenerator";
import { StepRunner } from "./StepRunner";
import { Logger } from "./Logger";
import { CycleLedger } from "./CycleLedger";
import { StepEventLog } from "./StepEventLog";

export type RunState = "idle" | "running" | "pausing" | "paused" | "stopping";

export interface Progress {
  cursor: number;
  total: number;
  state: RunState;
}

type ProgressListener = (p: Progress) => void;

export class SequenceOrchestrator {
  private queue: string[] = [];
  private cursor = 0;
  private state: RunState = "idle";
  private listeners = new Set<ProgressListener>();

  constructor(
    private readonly getConfig: () => AutomationConfig,
    private readonly runner: StepRunner,
    private readonly log: Logger,
    private readonly ledger: CycleLedger,
    private readonly events: StepEventLog,
  ) {}

  /** Subscribe to progress changes; returns an unsubscribe function. */
  subscribe(fn: ProgressListener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  /** Current cursor / total / state snapshot. */
  snapshot(): Progress {
    return { cursor: this.cursor, total: this.queue.length, state: this.state };
  }

  /** Start a fresh run, or resume from paused if applicable. */
  async start(): Promise<void> {
    if (this.state === "paused") return this.resume();
    if (this.state !== "idle") return;
    this.prepareQueue();
    if (this.getConfig().runtime.mode === "auto") await this.runUntilHalt();
  }

  /** Process exactly one email; only meaningful in manual mode. */
  async next(): Promise<void> {
    if (this.state === "running") return;
    if (this.queue.length === 0) this.prepareQueue();
    if (this.cursor >= this.queue.length) return this.finishManualQueue();
    this.transition("running");
    await this.runOne(this.queue[this.cursor]);
    this.cursor++;
    this.advanceRangeIfDone();
    this.transition("idle");
  }

  /** Request a cooperative pause after the current cycle. */
  pause(): void {
    if (this.state === "running") { this.transition("pausing"); this.log.info("orchestrator", "Pause requested"); }
  }

  /** Resume an auto-mode loop from the current cursor. */
  async resume(): Promise<void> {
    if (this.state !== "paused") return;
    this.log.info("orchestrator", "Resuming at index " + this.cursor);
    if (this.getConfig().runtime.mode === "auto") await this.runUntilHalt();
    else this.transition("idle");
  }

  /** Request a cooperative stop after the current cycle. */
  stop(): void {
    if (this.state === "running" || this.state === "pausing") {
      this.transition("stopping");
    }
  }

  /** Reset queue/cursor and rewind next email to the configured initial value. */
  reset(): void {
    this.queue = []; this.cursor = 0;
    this.syncRangeEnd();
    this.transition("idle");
    this.log.info("orchestrator", "Reset");
  }

  private prepareQueue(): void {
    this.syncRangeEnd();
    this.queue = new EmailSequenceGenerator(this.getConfig().sequence).generate();
    this.cursor = 0;
    this.log.info("orchestrator", "Queue prepared: " + this.queue.length + " emails");
    this.emit();
  }

  private async runUntilHalt(): Promise<void> {
    this.transition("running");
    while (this.cursor < this.queue.length && this.state === "running") {
      await this.runOne(this.queue[this.cursor]);
      this.cursor++;
      this.emit();
    }
    this.settleAfterLoop();
  }

  private settleAfterLoop(): void {
    if (this.state === "pausing") {
      this.transition("paused");
      this.log.info("orchestrator", "Paused at index " + this.cursor);
    } else {
      this.advanceRangeIfDone();
      this.transition("idle");
      this.log.info("orchestrator", "Loop ended at index " + this.cursor);
    }
  }

  private async runOne(email: string): Promise<void> {
    const cycleIndex = this.cursor + 1;
    this.events.beginCycle(cycleIndex, email);
    this.events.record({ step: "cycle", status: "cycle-start" });
    this.log.info("cycle", "Begin " + email);
    try {
      await this.runner.fillEmail(email);
      const password = await this.runner.clickGeneratePassword();
      await this.runner.clickCreate();
      this.log.info("cycle", "Done " + email);
      this.ledger.record({ email, password, status: "success" });
      this.events.record({ step: "cycle", status: "cycle-success" });
    } catch (err) {
      const message = (err as Error).message;
      this.log.error("cycle", "Failed " + email + ": " + message);
      this.ledger.record({ email, status: "failure", error: message });
      this.events.record({ step: "cycle", status: "cycle-failure", error: message });
    } finally {
      this.events.endCycle();
    }
  }

  private advanceRangeIfDone(): void {
    if (this.cursor < this.queue.length) return;
    const seq = this.getConfig().sequence;
    seq.rangeStart = Math.floor(seq.rangeStart + this.queue.length);
    this.syncRangeEnd();
    this.queue = [];
  }

  private finishManualQueue(): void {
    this.log.info("orchestrator", "Queue empty");
    this.advanceRangeIfDone();
    this.transition("idle");
  }

  private syncRangeEnd(): void {
    const seq = this.getConfig().sequence;
    seq.count = Math.max(1, Math.floor(Number(seq.count) || 1));
    seq.rangeStart = Math.floor(Number(seq.rangeStart) || 0);
    seq.rangeEnd = seq.rangeStart + seq.count - 1;
  }

  private transition(next: RunState): void {
    this.state = next;
    this.emit();
  }

  private emit(): void {
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}

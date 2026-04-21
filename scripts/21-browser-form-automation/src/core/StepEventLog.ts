// Structured per-step event log. Parallel to the human-readable Logger:
// each call to record() appends one machine-readable row that the panel
// can serialize as JSON for offline debugging.
//
// The log is bounded (LRU-style) so a long auto-loop doesn't blow up
// memory; oldest entries are dropped first.

const MAX_EVENTS = 2000;

export type StepStatus =
  | "found"          // element resolved successfully
  | "missing"        // element resolution failed (after retries)
  | "clicked"
  | "filled"
  | "skipped-dryrun"
  | "cycle-start"
  | "cycle-success"
  | "cycle-failure";

export interface StepEvent {
  timestamp: number;     // epoch ms
  iso: string;           // ISO timestamp for human-readable JSON
  cycleIndex: number;    // 1-based; 0 = no cycle context (e.g., boot)
  email: string | null;
  step: string;          // "fillEmail" | "clickGeneratePassword" | "clickCreate" | "cycle"
  status: StepStatus;
  attempts?: number;     // total attempts used (1 = first try)
  delayMs?: number;      // delay applied immediately after this step
  error?: string;
}

type Listener = (events: ReadonlyArray<StepEvent>) => void;

export class StepEventLog {
  private events: StepEvent[] = [];
  private listeners = new Set<Listener>();
  private cycleIndex = 0;
  private email: string | null = null;

  /** Set the active cycle context; subsequent record() calls inherit it. */
  beginCycle(cycleIndex: number, email: string): void {
    this.cycleIndex = cycleIndex;
    this.email = email;
  }

  /** Clear cycle context (called between cycles for safety). */
  endCycle(): void {
    this.cycleIndex = 0;
    this.email = null;
  }

  /** Append one structured event. */
  record(entry: Omit<StepEvent, "timestamp" | "iso" | "cycleIndex" | "email">): void {
    const ts = Date.now();
    const full: StepEvent = {
      ...entry,
      timestamp: ts,
      iso: new Date(ts).toISOString(),
      cycleIndex: this.cycleIndex,
      email: this.email,
    };
    this.events.push(full);
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
    this.emit();
  }

  /** Read-only snapshot for UI/export. */
  snapshot(): ReadonlyArray<StepEvent> { return this.events.slice(); }

  /** Drop all entries. */
  clear(): void {
    this.events = [];
    this.emit();
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const view = this.events.slice();
    this.listeners.forEach((fn) => fn(view));
  }
}

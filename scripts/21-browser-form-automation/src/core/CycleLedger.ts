// In-memory ledger of every cycle the orchestrator runs. The panel reads
// this to render counts and export CSV; the orchestrator pushes entries.

export type CycleStatus = "success" | "failure";

export interface CycleRecord {
  index: number;       // 1-based position in the run
  email: string;
  status: CycleStatus;
  timestamp: number;   // epoch ms
  error?: string;
}

type Listener = (records: ReadonlyArray<CycleRecord>) => void;

export class CycleLedger {
  private records: CycleRecord[] = [];
  private listeners = new Set<Listener>();

  /** Append one cycle outcome; returns the assigned index. */
  record(entry: Omit<CycleRecord, "index" | "timestamp">): CycleRecord {
    const full: CycleRecord = {
      ...entry,
      index: this.records.length + 1,
      timestamp: Date.now(),
    };
    this.records.push(full);
    this.emit();
    return full;
  }

  /** Read-only snapshot for UI rendering and CSV export. */
  snapshot(): ReadonlyArray<CycleRecord> { return this.records.slice(); }

  /** Empty the ledger; useful before starting a fresh batch. */
  clear(): void { this.records = []; this.emit(); }

  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const view = this.records.slice();
    this.listeners.forEach((fn) => fn(view));
  }
}

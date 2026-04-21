// Holds the most recent values captured during the active cycle so the
// panel can show the operator exactly what was filled / read off the page
// before the Create button fires. State resets at every cycle start.
export interface LiveCaptureState {
  cycleIndex: number;
  email: string;
  password: string;
  passwordSource: string;  // "passwordField" | "passwordFieldFallback" | "heuristic-scan" | ""
  updatedAt: number;
}

type Listener = (state: LiveCaptureState) => void;

const EMPTY: LiveCaptureState = {
  cycleIndex: 0, email: "", password: "", passwordSource: "", updatedAt: 0,
};

export class LiveCapture {
  private state: LiveCaptureState = { ...EMPTY };
  private listeners = new Set<Listener>();

  snapshot(): LiveCaptureState { return { ...this.state }; }

  beginCycle(cycleIndex: number, email: string): void {
    this.state = { ...EMPTY, cycleIndex, email, updatedAt: Date.now() };
    this.emit();
  }

  setPassword(password: string, source: string): void {
    this.state = { ...this.state, password, passwordSource: source, updatedAt: Date.now() };
    this.emit();
  }

  clear(): void { this.state = { ...EMPTY }; this.emit(); }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const view = this.snapshot();
    this.listeners.forEach((fn) => fn(view));
  }
}

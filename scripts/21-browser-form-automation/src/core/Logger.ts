// Tiny pub-sub logger so the UI can subscribe without coupling to DOM.
import { LOG_MAX_LINES } from "../config/defaults";

export type LogLevel = "info" | "warn" | "error";
export interface LogLine { ts: number; level: LogLevel; scope: string; msg: string; }
type Listener = (line: LogLine) => void;

export class Logger {
  private buffer: LogLine[] = [];
  private listeners = new Set<Listener>();

  info(scope: string, msg: string): void { this.push("info", scope, msg); }
  warn(scope: string, msg: string): void { this.push("warn", scope, msg); }
  error(scope: string, msg: string): void { this.push("error", scope, msg); }

  /** Subscribe to new log lines; returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Snapshot of the in-memory ring buffer (oldest first). */
  snapshot(): LogLine[] { return this.buffer.slice(); }

  private push(level: LogLevel, scope: string, msg: string): void {
    const line: LogLine = { ts: Date.now(), level, scope, msg };
    this.buffer.push(line);
    if (this.buffer.length > LOG_MAX_LINES) this.buffer.shift();
    this.listeners.forEach((fn) => fn(line));
  }
}

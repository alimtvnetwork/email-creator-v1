// Persists AutomationConfig to localStorage so operator edits survive reloads.
import type { AutomationConfig } from "./types";
import { DEFAULT_CONFIG, STORAGE_KEY } from "./defaults";

export class ConfigStore {
  /** Load saved config or fall back to defaults. */
  load(): AutomationConfig {
    const raw = this.safeRead();
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = this.safeParse(raw);
    return parsed ? this.merge(parsed) : structuredClone(DEFAULT_CONFIG);
  }

  /** Persist a config snapshot; failures are non-fatal. */
  save(config: AutomationConfig): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* quota or privacy mode — ignore */
    }
  }

  private safeRead(): string | null {
    try { return window.localStorage.getItem(STORAGE_KEY); }
    catch { return null; }
  }

  private safeParse(raw: string): Partial<AutomationConfig> | null {
    try { return JSON.parse(raw) as Partial<AutomationConfig>; }
    catch { return null; }
  }

  private merge(partial: Partial<AutomationConfig>): AutomationConfig {
    const base = structuredClone(DEFAULT_CONFIG);
    const sequence = { ...base.sequence, ...(partial.sequence ?? {}) };
    if (!partial.sequence || partial.sequence.count === undefined) {
      sequence.count = Math.max(1, sequence.rangeEnd - sequence.rangeStart + 1);
    }
    sequence.rangeEnd = sequence.rangeStart + sequence.count - 1;
    return {
      sequence,
      xpaths:   { ...base.xpaths,   ...(partial.xpaths   ?? {}) },
      delays:   { ...base.delays,   ...(partial.delays   ?? {}) },
      runtime:  { ...base.runtime,  ...(partial.runtime  ?? {}) },
    };
  }
}

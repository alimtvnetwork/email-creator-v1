// Import/export AutomationConfig as a JSON file. Validation only checks
// the top-level shape; the panel's existing inputs handle field-level edits.
import type { AutomationConfig } from "./types";
import { DEFAULT_CONFIG } from "./defaults";

export class ConfigFileIO {
  /** Trigger a download of the config as a pretty-printed JSON file. */
  exportToFile(config: AutomationConfig, filename: string): void {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  /** Open a file picker and resolve with the parsed config. */
  importFromFile(): Promise<AutomationConfig> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "application/json,.json";
      input.addEventListener("change", () => this.handlePick(input, resolve, reject));
      input.click();
    });
  }

  private handlePick(
    input: HTMLInputElement,
    resolve: (c: AutomationConfig) => void,
    reject: (e: Error) => void,
  ): void {
    const file = input.files && input.files[0];
    if (!file) return reject(new Error("No file selected"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => this.tryParse(String(reader.result ?? ""), resolve, reject);
    reader.readAsText(file);
  }

  private tryParse(
    text: string,
    resolve: (c: AutomationConfig) => void,
    reject: (e: Error) => void,
  ): void {
    try {
      const parsed = JSON.parse(text) as Partial<AutomationConfig>;
      resolve(this.merge(parsed));
    } catch (err) {
      reject(new Error("Invalid JSON: " + (err as Error).message));
    }
  }

  private merge(partial: Partial<AutomationConfig>): AutomationConfig {
    const base = structuredClone(DEFAULT_CONFIG);
    return {
      sequence: { ...base.sequence, ...(partial.sequence ?? {}) },
      xpaths:   { ...base.xpaths,   ...(partial.xpaths   ?? {}) },
      delays:   { ...base.delays,   ...(partial.delays   ?? {}) },
      runtime:  { ...base.runtime,  ...(partial.runtime  ?? {}) },
    };
  }
}

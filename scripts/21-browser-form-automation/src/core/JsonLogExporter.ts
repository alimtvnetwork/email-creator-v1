// Serializes a StepEventLog snapshot to a downloadable JSON file. Wraps the
// array in an envelope with metadata so the export is self-describing.
import type { StepEvent } from "./StepEventLog";

interface ExportEnvelope {
  schema: "xp21.step-events";
  version: 1;
  exportedAt: string;
  count: number;
  events: ReadonlyArray<StepEvent>;
}

export class JsonLogExporter {
  /** Trigger a browser download of the events as pretty-printed JSON. */
  download(events: ReadonlyArray<StepEvent>, filename: string): void {
    const envelope: ExportEnvelope = {
      schema: "xp21.step-events",
      version: 1,
      exportedAt: new Date().toISOString(),
      count: events.length,
      events,
    };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  }
}

// Convert a CycleLedger snapshot into a CSV blob and trigger a download.
// Strings are quoted only when needed so the file stays human-friendly.
import type { CycleRecord } from "./CycleLedger";

const HEADER = ["index", "email", "password", "status", "timestamp_iso", "error"] as const;

export class CsvExporter {
  /** Trigger a browser download of the records as CSV. */
  download(records: ReadonlyArray<CycleRecord>, filename: string): void {
    const csv = this.serialize(records);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  /** Serialize records to a CSV string (header + one row per record). */
  serialize(records: ReadonlyArray<CycleRecord>): string {
    const lines = [HEADER.join(",")];
    for (const r of records) lines.push(this.toRow(r));
    return lines.join("\n") + "\n";
  }

  private toRow(r: CycleRecord): string {
    const iso = new Date(r.timestamp).toISOString();
    return [
      String(r.index),
      this.escape(r.email),
      this.escape(r.password ?? ""),
      r.status,
      iso,
      this.escape(r.error ?? ""),
    ].join(",");
  }

  /** RFC 4180 quoting: wrap in quotes only if the field needs it. */
  private escape(value: string): string {
    if (!/[",\n\r]/.test(value)) return value;
    return '"' + value.replace(/"/g, '""') + '"';
  }
}

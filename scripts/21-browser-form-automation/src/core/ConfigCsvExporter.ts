// Pre-run CSV exports: planned email list and a config snapshot.
// Distinct from CsvExporter (post-run cycle results) — these capture
// what *will* run, useful for archival, sharing, and audit.
import type { AutomationConfig } from "../config/types";
import { EmailSequenceGenerator } from "./EmailSequenceGenerator";

const EMAILS_HEADER = ["index", "email"] as const;
const CONFIG_HEADER = ["section", "key", "value"] as const;

export interface ExportSummary {
  filename: string;
  rowCount: number;
}

export class ConfigCsvExporter {
  /** Download a CSV of the planned email sequence (index, email). */
  exportPlannedEmails(config: AutomationConfig, filename: string): ExportSummary {
    const emails = new EmailSequenceGenerator(config.sequence).generate();
    const csv = this.serializeEmails(emails);
    this.triggerDownload(csv, filename);
    return { filename, rowCount: emails.length };
  }

  /** Download a CSV snapshot of xpaths/delays/sequence/runtime. */
  exportConfigSnapshot(config: AutomationConfig, filename: string): ExportSummary {
    const rows = this.flattenConfig(config);
    const csv = this.serializeConfig(rows);
    this.triggerDownload(csv, filename);
    return { filename, rowCount: rows.length };
  }

  /** Download a single CSV containing config block + planned emails block. */
  exportCombined(config: AutomationConfig, filename: string): ExportSummary {
    const emails = new EmailSequenceGenerator(config.sequence).generate();
    const rows = this.flattenConfig(config);
    const csv = this.serializeCombined(rows, emails);
    this.triggerDownload(csv, filename);
    return { filename, rowCount: rows.length + emails.length };
  }

  private serializeEmails(emails: ReadonlyArray<string>): string {
    const lines = [EMAILS_HEADER.join(",")];
    emails.forEach((e, i) => lines.push(String(i + 1) + "," + this.escape(e)));
    return lines.join("\n") + "\n";
  }

  private serializeConfig(rows: ReadonlyArray<[string, string, string]>): string {
    const lines = [CONFIG_HEADER.join(",")];
    for (const [s, k, v] of rows) {
      lines.push([this.escape(s), this.escape(k), this.escape(v)].join(","));
    }
    return lines.join("\n") + "\n";
  }

  private serializeCombined(
    rows: ReadonlyArray<[string, string, string]>,
    emails: ReadonlyArray<string>,
  ): string {
    const parts = [
      "# Config snapshot",
      this.serializeConfig(rows).trimEnd(),
      "",
      "# Planned emails",
      this.serializeEmails(emails).trimEnd(),
    ];
    return parts.join("\n") + "\n";
  }

  /** Flatten the config into [section,key,value] rows for CSV export. */
  private flattenConfig(config: AutomationConfig): Array<[string, string, string]> {
    const rows: Array<[string, string, string]> = [];
    const push = (section: string, obj: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(obj)) rows.push([section, k, String(v)]);
    };
    push("sequence", config.sequence as unknown as Record<string, unknown>);
    push("xpaths",   config.xpaths   as unknown as Record<string, unknown>);
    push("delays",   config.delays   as unknown as Record<string, unknown>);
    push("runtime",  config.runtime  as unknown as Record<string, unknown>);
    return rows;
  }

  private triggerDownload(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  private escape(value: string): string {
    if (!/[",\n\r]/.test(value)) return value;
    return '"' + value.replace(/"/g, '""') + '"';
  }
}

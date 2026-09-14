import { reportToMarkdown } from "../core/markdown";
import type { SavedAuditV1 } from "./audit-state";

export interface HistoricalAuditExportV1 {
  schemaVersion: 1;
  kind: "historical-audit";
  freshness: "historical";
  savedAt?: string;
  target: SavedAuditV1["target"];
  provenance: SavedAuditV1["provenance"];
  report: SavedAuditV1["report"];
}

export type HistoricalAuditSource = Pick<SavedAuditV1, "target" | "provenance" | "report"> & { savedAt?: string };

export function historicalAuditContent(audit: HistoricalAuditSource, format: "json" | "markdown"): string {
  if (format === "markdown") {
    return `> Historical audit from ${audit.report.generatedAt}. The current design has not been verified. Refresh in Design Passport before applying fixes or certifying.\n\n${reportToMarkdown(audit.report)}`;
  }
  const envelope: HistoricalAuditExportV1 = {
    schemaVersion: 1,
    kind: "historical-audit",
    freshness: "historical",
    ...(audit.savedAt ? { savedAt: audit.savedAt } : {}),
    target: audit.target,
    provenance: audit.provenance,
    report: audit.report,
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

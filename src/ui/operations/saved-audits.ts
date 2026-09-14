import type { AuditViewState } from "../../plugin/audit-state";
import type { ReadinessReport } from "../../core/contracts";

export type RestoreRequest = "startup" | { id: string } | null;

/** A late startup response must never replace an audit the designer just requested. */
export function shouldRestoreAudit(request: RestoreRequest, id: string): boolean {
  return request === "startup" || (request !== null && request.id === id);
}

export function defaultAuditView(): AuditViewState {
  return {
    activeTab: "overview",
    showPassing: false,
    axisFilter: "all",
    pageFilter: "all",
    rootFilter: "all",
    variantFilter: "all",
  };
}

export function reportTargetIdentity(report: ReadinessReport): string {
  return JSON.stringify([report.target.scope, [...new Set(report.target.rootIds)].sort()]);
}

export function batchCompletionNotice(result: { completed: number; total: number; skipped: number; cancelled: boolean }): string {
  const skipped = result.skipped > 0 ? ` ${result.skipped} empty page${result.skipped === 1 ? " was" : "s were"} skipped.` : "";
  return `${result.cancelled ? "Page review stopped" : "Page review complete"}: ${result.completed} of ${result.total} pages audited.${skipped} Completed results remain available.`;
}

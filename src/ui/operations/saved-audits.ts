import type { AuditViewState } from "../../plugin/audit-state";
import type { ReadinessReport } from "../../core/contracts";

export type RestoreRequest = "startup" | { id: string } | null;

/** A late startup response must never replace an audit the designer just requested. */
export function shouldRestoreAudit(request: RestoreRequest, id: string): boolean {
  return request === "startup" || (request !== null && request.id === id);
}

export function defaultAuditView(): AuditViewState {
  return {
    activeTab: "report",
    reportSection: "summary",
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
  const skipped = result.skipped > 0 ? ` ${result.skipped} page${result.skipped === 1 ? " was" : "s were"} skipped because no audit targets were found.` : "";
  return `${result.cancelled ? "Page review stopped" : "Page review complete"}: ${result.completed} of ${result.total} pages audited.${skipped} Saved results remain available within this device’s local storage limit.`;
}

export function normalizeAuditView(view: AuditViewState): AuditViewState {
  const sections = { overview: "summary", findings: "issues", modules: "modules", guidance: "guidance" } as const;
  const section = sections[view.activeTab as keyof typeof sections];
  return section ? { ...view, activeTab: "report", reportSection: section } : view;
}

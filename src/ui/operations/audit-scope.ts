import type { GradeLetter, ScanProgress, ScanScope } from "../../core/contracts";
import type { SelectionSummary } from "../../figma/adapter";
import type { AuditTargetSummary } from "../../plugin/messages";

export const AUDIT_CANCELLED_NOTICE = "Audit cancelled. Any completed cleanup remains applied.";

export interface AuditProgressPresentation {
  headline: string;
  detail: string;
}

export interface AuditedTargetSummary {
  countLabel: string;
  names: string[];
  remainingCount: number;
}

export interface SelectionEligibility {
  canAudit: boolean;
  guidance?: string;
}

export type ScanLifecycleEvent =
  | "local-scan"
  | "audit-started"
  | "progress"
  | "scan-result"
  | "error"
  | "scan-cancelled"
  | "profile-saved"
  | "profile-invalidated";

function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
  return value === 1 ? singular : pluralForm;
}

function auditHeadline(target: AuditTargetSummary): string {
  if (target.scope === "selection") {
    return target.selectionCount === undefined
      ? "Auditing selection"
      : `Auditing selection (${target.selectionCount})`;
  }
  return target.scope === "page" ? "Auditing current page" : "Auditing source frames";
}

function contextBoundary(scope: ScanScope): string {
  if (scope === "selection") return "Only your selection will be graded.";
  if (scope === "page") return "Only targets on the current page will be graded.";
  return "Only source frames will be graded.";
}

function analyzingDetail(scope: ScanScope): string {
  if (scope === "selection") return "Checking the selected frames and components.";
  if (scope === "page") return "Checking source targets on the current page.";
  return "Checking source frames across the file.";
}

export function auditProgressPresentation(
  progress: Pick<ScanProgress, "phase" | "completed" | "total">,
  target: AuditTargetSummary,
): AuditProgressPresentation {
  const headline = auditHeadline(target);
  if (progress.phase === "analyzing") return { headline, detail: analyzingDetail(target.scope) };
  if (progress.phase === "complete") return { headline, detail: "Finishing the audit." };

  const total = Math.max(0, progress.total);
  const completed = Math.min(Math.max(0, progress.completed), total);
  const count = total > 0 ? ` · ${completed} of ${total} pages checked` : "";
  return {
    headline,
    detail: `Preparing supporting file context${count}. ${contextBoundary(target.scope)}`,
  };
}

export function scanInFlightAfter(current: boolean, event: ScanLifecycleEvent): boolean {
  if (event === "local-scan" || event === "audit-started" || event === "progress") return true;
  if (event === "scan-result" || event === "error" || event === "scan-cancelled" || event === "profile-saved" || event === "profile-invalidated") return false;
  return current;
}

export function isAuditInterruptible(progress: Pick<ScanProgress, "phase"> | undefined): boolean {
  return progress?.phase === "loading-pages" || progress?.phase === "indexing";
}

export function selectionEligibility(summary: SelectionSummary): SelectionEligibility {
  if (summary.unsupportedCount > 0) {
    const noun = plural(summary.unsupportedCount, "unsupported item");
    return {
      canAudit: false,
      guidance: `Remove ${summary.unsupportedCount} ${noun}. Only frames, components, and component sets can be audited.`,
    };
  }
  if (summary.eligibleCount === 0) {
    return {
      canAudit: false,
      guidance: "Select at least one frame, component, or component set to audit.",
    };
  }
  return { canAudit: true };
}

export function auditedTargetSummary(scope: ScanScope, rootNames: readonly string[]): AuditedTargetSummary {
  const count = rootNames.length;
  const countLabel = scope === "selection"
    ? `${count} selected ${plural(count, "target")}`
    : scope === "page"
      ? `${count} current-page ${plural(count, "target")}`
      : `${count} source ${plural(count, "frame")}`;
  const names = rootNames.slice(0, 3);
  return { countLabel, names, remainingCount: Math.max(0, count - names.length) };
}

export function auditCompletionNotice(scope: ScanScope, grade: GradeLetter, ready: boolean): string {
  const target = scope === "selection" ? "Selection" : scope === "page" ? "Current-page" : "Source-frame";
  return `${target} audit complete: ${grade} · ${ready ? "ready" : "not ready"}`;
}

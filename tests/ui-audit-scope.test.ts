import { describe, expect, it } from "vitest";
import type { ScanProgress } from "../src/core/contracts";
import {
  AUDIT_CANCELLED_NOTICE,
  auditCompletionNotice,
  auditProgressPresentation,
  auditedTargetSummary,
  isAuditInterruptible,
  scanInFlightAfter,
  selectionEligibility,
} from "../src/ui/operations/audit-scope";

describe("scoped audit UI presentation", () => {
  it("allows only non-empty selections without unsupported items", () => {
    expect(selectionEligibility({ eligibleCount: 2, unsupportedCount: 0 })).toEqual({ canAudit: true });
    expect(selectionEligibility({ eligibleCount: 0, unsupportedCount: 0 })).toEqual({
      canAudit: false,
      guidance: "Select at least one frame, component, or component set to audit.",
    });
    expect(selectionEligibility({ eligibleCount: 2, unsupportedCount: 1 })).toEqual({
      canAudit: false,
      guidance: "Remove 1 unsupported item. Only frames, components, and component sets can be audited.",
    });
    expect(selectionEligibility({ eligibleCount: 0, unsupportedCount: 3 })).toEqual({
      canAudit: false,
      guidance: "Remove 3 unsupported items. Only frames, components, and component sets can be audited.",
    });
  });

  it("presents context progress without exposing raw page or adapter copy", () => {
    const progress: ScanProgress = {
      phase: "loading-pages",
      completed: 3,
      total: 12,
      pageName: "Confidential explorations",
      message: "Loading Confidential explorations",
    };
    const presentation = auditProgressPresentation(progress, { scope: "selection", selectionCount: 2 });

    expect(presentation).toEqual({
      headline: "Auditing selection (2)",
      detail: "Preparing supporting file context · 3 of 12 pages checked. Only your selection will be graded.",
    });
    expect(JSON.stringify(presentation)).not.toContain(progress.pageName);
    expect(JSON.stringify(presentation)).not.toContain(progress.message);
  });

  it("uses quiet scope-specific copy for every progress phase", () => {
    expect(auditProgressPresentation(
      { phase: "indexing", completed: 9, total: 4 },
      { scope: "page" },
    )).toEqual({
      headline: "Auditing current page",
      detail: "Preparing supporting file context · 4 of 4 pages checked. Only targets on the current page will be graded.",
    });
    expect(auditProgressPresentation(
      { phase: "analyzing", completed: 0, total: 8 },
      { scope: "file" },
    )).toEqual({
      headline: "Auditing source frames",
      detail: "Checking source frames across the file.",
    });
    expect(auditProgressPresentation(
      { phase: "complete", completed: 1, total: 1 },
      { scope: "selection", selectionCount: 1 },
    )).toEqual({
      headline: "Auditing selection (1)",
      detail: "Finishing the audit.",
    });
  });

  it("keeps an audit in flight through every progress phase until a terminal message", () => {
    expect(scanInFlightAfter(false, "local-scan")).toBe(true);
    expect(scanInFlightAfter(false, "audit-started")).toBe(true);
    expect(scanInFlightAfter(false, "progress")).toBe(true);
    expect(scanInFlightAfter(true, "scan-result")).toBe(false);
    expect(scanInFlightAfter(true, "error")).toBe(false);
    expect(scanInFlightAfter(true, "scan-cancelled")).toBe(false);
    expect(scanInFlightAfter(true, "profile-saved")).toBe(false);
    expect(scanInFlightAfter(true, "profile-invalidated")).toBe(false);
  });

  it("offers cancellation only while file context preparation is interruptible", () => {
    expect(isAuditInterruptible({ phase: "loading-pages" })).toBe(true);
    expect(isAuditInterruptible({ phase: "indexing" })).toBe(true);
    expect(isAuditInterruptible({ phase: "analyzing" })).toBe(false);
    expect(isAuditInterruptible({ phase: "complete" })).toBe(false);
    expect(isAuditInterruptible(undefined)).toBe(false);
  });

  it("summarizes the audited target with at most three names", () => {
    expect(auditedTargetSummary("selection", ["Button", "Card", "Navigation", "Footer"])).toEqual({
      countLabel: "4 selected targets",
      names: ["Button", "Card", "Navigation"],
      remainingCount: 1,
    });
    expect(auditedTargetSummary("file", ["Checkout"])).toEqual({
      countLabel: "1 source frame",
      names: ["Checkout"],
      remainingCount: 0,
    });
  });

  it("makes completion notices explicit about scope", () => {
    expect(auditCompletionNotice("selection", "B", true)).toBe("Selection audit complete: B · ready");
    expect(auditCompletionNotice("page", "C", false)).toBe("Current-page audit complete: C · not ready");
    expect(auditCompletionNotice("file", "A", true)).toBe("Source-frame audit complete: A · ready");
  });

  it("does not imply that cancelling an audit rolls back prior cleanup", () => {
    expect(AUDIT_CANCELLED_NOTICE).toBe("Audit cancelled. Any completed cleanup remains applied.");
  });
});

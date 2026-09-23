import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildReadinessReport } from "../src/core/report";
import { Guidance } from "../src/ui/components/Guidance";
import { Overview, type OverviewProps } from "../src/ui/components/Overview";
import { PageBatch } from "../src/ui/components/PageBatch";
import { SavedAudits } from "../src/ui/components/SavedAudits";
import { batchCompletionNotice, defaultAuditView, reportTargetIdentity, shouldRestoreAudit } from "../src/ui/operations/saved-audits";
import { healthyGraph, profile } from "./fixtures";

const noop = () => {};

function overview(overrides: Partial<OverviewProps> = {}): string {
  const auditProfile = profile();
  const report = buildReadinessReport({ graph: healthyGraph(auditProfile), profile: auditProfile, scope: "page", targetRootIds: ["root:desktop"] });
  return renderToStaticMarkup(createElement(Overview, {
    report,
    selectionSummary: { eligibleCount: 1, unsupportedCount: 0 },
    stale: true,
    canMutateDocument: false,
    scanning: false,
    actionsBlocked: true,
    onScan: noop,
    onCertify: noop,
    onCertifyComponents: noop,
    onExport: noop,
    ...overrides,
  }));
}

function button(markup: string, text: string): string | undefined {
  return markup.match(new RegExp(`<button[^>]*>${text}</button>`))?.[0];
}

describe("persistent audit presentation", () => {
  it("allows historical export with invalid setup, Dev Mode, stale context, and a refresh in flight", () => {
    const markup = overview({ historical: true, scanning: true });
    expect(markup).toContain("Historical readiness");
    expect(button(markup, "Export historical JSON")).toBeDefined();
    expect(button(markup, "Export historical JSON")).not.toContain("disabled");
    expect(button(markup, "Export historical Markdown")).not.toContain("disabled");
    expect(button(markup, "Refresh audit to certify")).toContain("disabled");
    expect(markup).not.toContain("Certify source frames");
  });

  it("retains the current-report export gate", () => {
    expect(button(overview({ historical: false, stale: false }), "Export JSON")).toContain("disabled");
    expect(button(overview({ historical: false, stale: false, actionsBlocked: false }), "Export JSON")).not.toContain("disabled");
  });

  it("allows historical export of a stale unsaved in-memory result even during a new scan with invalid setup", () => {
    const markup = overview({ historical: false, stale: true, scanning: true, actionsBlocked: true });
    expect(button(markup, "Export historical JSON")).toBeDefined();
    expect(button(markup, "Export historical JSON")).not.toContain("disabled");
    expect(button(markup, "Export historical Markdown")).not.toContain("disabled");
    expect(button(markup, "Refresh audit to certify")).toContain("disabled");
  });

  it("shows historical advisory insights without offering contributions or labeling current packs as their source", () => {
    const markup = renderToStaticMarkup(createElement(Guidance, {
      insights: [{ id: "saved-insight", origin: "reference", domain: "accessibility", title: "Focus treatment", message: "Use the original focus treatment.", targetNodeId: "node:1" }] as Parameters<typeof Guidance>[0]["insights"],
      hasReport: true,
      historical: true,
      canContribute: false,
      contribution: undefined,
      projectStyleGuide: { state: "active", persistent: true, packVersion: "new-pack", digest: "new-digest", projectScope: "project:test", sourceId: "source:test" },
      onNavigate: noop,
      onPreviewContribution: noop,
      onExportContribution: noop,
      onCancelContribution: noop,
    }));
    expect(markup).toContain("Use the original focus treatment.");
    expect(markup).not.toContain("Run an audit to evaluate");
    expect(markup).not.toContain("new-pack");
    expect(button(markup, "Show layer")).not.toContain("disabled");
    expect(button(markup, "Preview contribution")).toContain("disabled");
  });

  it("lists saved targets with their grades and timestamps and exposes file cache controls", () => {
    const markup = renderToStaticMarkup(createElement(SavedAudits, {
      audits: [{ id: "saved:1", label: "Buttons", target: { scope: "page", pageId: "page:1" }, generatedAt: "2026-09-14T12:00:00.000Z", grade: { letter: "B", score: 83 }, lastViewedAt: "2026-09-14T12:10:00.000Z" }],
      activeId: "saved:1",
      status: { state: "saved" },
      disabled: false,
      onOpen: noop,
      onForget: noop,
      onClear: noop,
    }));
    expect(markup).toContain("Buttons · B ·");
    expect(markup).toContain("2026");
    expect(markup).toContain('value="saved:1" selected=""');
    expect(markup).toContain("Saved on this device");
    expect(button(markup, "Delete saved report")).not.toContain("disabled");
    expect(markup).toContain("Clear rebuildable context");
    expect(markup).toContain("keeps saved reports and view preferences");
  });

  it("offers all 65 pages for a batch and requires a page selection before starting", () => {
    const pages = Array.from({ length: 65 }, (_, index) => ({ id: `page:${index}`, name: `Page ${index + 1}` }));
    const markup = renderToStaticMarkup(createElement(PageBatch, { pages, disabled: false, onReview: noop }));
    expect(markup.match(/type="checkbox"/g)).toHaveLength(66);
    expect(markup).toContain("Select all (65)");
    expect(markup).toContain("Page 65");
    expect(button(markup, "Review selected pages \\(0\\)")).toContain("disabled");
    expect(markup).toContain("stop between pages");
  });

  it("prevents page batches without persistent file identity while explaining the single-audit fallback", () => {
    const markup = renderToStaticMarkup(createElement(PageBatch, { pages: [{ id: "page:1", name: "Buttons" }], disabled: false, canSave: false, onReview: noop }));
    expect(markup).toContain("page batches are unavailable");
    expect(markup).toContain("Run individual audits and export their results before closing");
    expect(markup).toContain('<fieldset class="page-batch-list" disabled=""');
    expect(button(markup, "Review selected pages \\(0\\)")).toContain("disabled");
  });

  it("rejects delayed startup and superseded picker responses after a new audit is requested", () => {
    expect(shouldRestoreAudit("startup", "saved:old")).toBe(true);
    expect(shouldRestoreAudit(null, "saved:old")).toBe(false);
    expect(shouldRestoreAudit({ id: "saved:new" }, "saved:old")).toBe(false);
    expect(shouldRestoreAudit({ id: "saved:new" }, "saved:new")).toBe(true);
  });

  it("retains view preferences for reordered targets and resets them when the target or scope changes", () => {
    const auditProfile = profile();
    const report = buildReadinessReport({ graph: healthyGraph(auditProfile), profile: auditProfile, scope: "selection", targetRootIds: ["root:desktop", "root:mobile"] });
    const initial = reportTargetIdentity(report);
    report.target.rootIds.reverse();
    expect(reportTargetIdentity(report)).toBe(initial);
    report.target.rootIds = ["root:desktop"];
    expect(reportTargetIdentity(report)).not.toBe(initial);
    const selection = reportTargetIdentity(report);
    report.target.scope = "page";
    expect(reportTargetIdentity(report)).not.toBe(selection);
  });

  it("restores a useful display default without mutation drafts or acknowledgements", () => {
    expect(defaultAuditView()).toEqual({ activeTab: "overview", showPassing: false, axisFilter: "all", pageFilter: "all", rootFilter: "all", variantFilter: "all" });
    expect(JSON.stringify(defaultAuditView())).not.toMatch(/waiver|token|acknowledged|profile/i);
  });

  it("explains skipped and cancelled pages without claiming an interrupted batch will resume", () => {
    expect(batchCompletionNotice({ completed: 3, total: 65, skipped: 1, cancelled: true })).toBe("Page review stopped: 3 of 65 pages audited. 1 page was skipped because no audit targets were found. Saved results remain available within this device’s local storage limit.");
    expect(batchCompletionNotice({ completed: 63, total: 65, skipped: 2, cancelled: false })).toBe("Page review complete: 63 of 65 pages audited. 2 pages were skipped because no audit targets were found. Saved results remain available within this device’s local storage limit.");
  });
});

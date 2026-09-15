import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { reportToMarkdown } from "../src/core/markdown";
import { buildReadinessReport } from "../src/core/report";
import { Findings, type FindingsProps } from "../src/ui/components/Findings";
import { buildFindingGroups } from "../src/core/finding-groups";
import { Modules } from "../src/ui/components/Modules";
import { Overview, type OverviewProps } from "../src/ui/components/Overview";
import { actionableIssueSummary, reportBreakdown } from "../src/ui/operations/breakdown";
import { healthyGraph, profile, syntheticFinding } from "./fixtures";

function reportFixture() {
  const p = profile();
  const report = buildReadinessReport({ graph: healthyGraph(p), profile: p, scope: "selection", targetRootIds: ["root:desktop", "root:mobile"], now: new Date("2026-09-14T10:00:00Z") });
  report.findings = [
    syntheticFinding({ id: "a", nodeId: "left", rootId: "root:desktop", status: "fail" }),
    syntheticFinding({ id: "b", nodeId: "right", rootId: "root:desktop", status: "fail" }),
    syntheticFinding({ id: "c", nodeId: "third", rootId: "root:mobile", status: "fail" }),
    syntheticFinding({ id: "d", nodeId: "override", rootId: "root:desktop", status: "needs-review", category: "recommendation", scoreImpact: false }),
    syntheticFinding({ id: "e", nodeId: "unknown", rootId: "root:desktop", status: "needs-review", category: "recommendation", scoreImpact: false }),
  ];
  report.issueGroups = [
    { id: "issue:source", kind: "source", primaryFindingId: "a", findingIds: ["a", "b", "c"], occurrenceCount: 3, sourceNodeId: "source", sourceLabel: "Button / Padding", property: "paddingBottom" },
    { id: "issue:related", kind: "related", primaryFindingId: "d", findingIds: ["d", "e"], occurrenceCount: 2 },
  ];
  return report;
}

function overviewProps(): OverviewProps {
  return { report: reportFixture(), selectionSummary: { eligibleCount: 9, unsupportedCount: 0 }, stale: false, canMutateDocument: true, scanning: false, actionsBlocked: false, onScan: vi.fn(), onCertify: vi.fn(), onCertifyComponents: vi.fn(), onExport: vi.fn() };
}

function buttons(tree: ReactNode): Array<ReactElement<{ children?: ReactNode; onClick?: () => void }>> {
  return Children.toArray(tree).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child)) return [];
    return child.type === "button" ? [child] : buttons(child.props.children);
  });
}

function click(tree: ReactNode, label: string): void {
  const button = buttons(tree).find((item) => item.props.children === label);
  expect(button).toBeDefined();
  button!.props.onClick!();
}

describe("source issue presentation and historical compatibility", () => {
  it("deduplicates only proven sources across modules and retains related occurrences as individual issues", () => {
    const report = reportFixture();
    const original = JSON.stringify(report);
    expect(actionableIssueSummary(report)).toEqual({ actionableCount: 3, occurrenceCount: 5, relatedGroupCount: 1 });
    const page = reportBreakdown(report)[0]!;
    expect(page).toMatchObject({ actionableCount: 3, occurrenceCount: 5, relatedGroupCount: 1 });
    expect(page.modules.find((module) => module.rootId === "root:desktop")).toMatchObject({ actionableCount: 3, occurrenceCount: 4, relatedGroupCount: 1 });
    expect(page.modules.find((module) => module.rootId === "root:mobile")).toMatchObject({ actionableCount: 1, occurrenceCount: 1, relatedGroupCount: 0 });
    expect(JSON.stringify(report)).toBe(original);
  });

  it("does not count the same related occurrence twice when audited through overlapping roots", () => {
    const report = reportFixture();
    const repeated = { ...report.findings[3]!, id: "same-layer-another-root", rootId: "root:mobile" };
    report.findings.push(repeated);
    report.issueGroups![1]!.findingIds.push(repeated.id);
    expect(actionableIssueSummary(report)).toEqual({ actionableCount: 3, occurrenceCount: 5, relatedGroupCount: 1 });
    expect(reportToMarkdown(report)).toContain("3 actionable issues · 5 affected occurrences");
  });

  it("preserves historical v1 counts and avoids inventing source or category evidence", () => {
    const report = reportFixture();
    report.schemaVersion = 1;
    expect(actionableIssueSummary(report)).toEqual({ actionableCount: 5, occurrenceCount: 5, relatedGroupCount: 0 });
    const markdown = reportToMarkdown(report);
    expect(markdown).toContain("2026-09-14T10:00:00");
    expect(markdown).toContain("Report schema: 1");
    expect(markdown).not.toContain("## Actionable issues and occurrences");
    expect(markdown).not.toContain("Category:");
    expect(markdown).not.toContain("Verified source");
  });

  it("preserves style identity in exports and navigates to the currently displayed affected layer", () => {
    const report = reportFixture();
    const styleId = "S:body-style:1";
    report.findings = ["text:a", "text:b"].map((nodeId) => syntheticFinding({ id: `finding:${nodeId}`, nodeId, nodePath: `Page / ${nodeId}`, status: "needs-review", category: "requirement", provenance: { kind: "style", sourceStyleId: styleId, sourceLabel: "Type / Body", property: "fontSize", contextKey: "same-context" } }));
    report.issueGroups = buildFindingGroups(report.findings);
    const onNavigate = vi.fn();
    const noop = () => undefined;
    const props: FindingsProps = { findings: report.findings, groups: report.issueGroups, frames: report.frames, showPassing: false, axisFilter: "all", pageFilter: "all", rootFilter: "all", variantFilter: "all", expanded: report.findings[1]!.id, collections: [], tokenWizard: undefined, waiverDraft: undefined, disabled: false, canMutateDocument: true,
      onTogglePassing: noop, onAxisFilter: noop, onPageFilter: noop, onRootFilter: noop, onVariantFilter: noop, onExpand: noop, onNavigate, onWaiverDraft: noop, onWaive: noop, onClearWaiver: noop, onConfirmPattern: noop, onTokenWizard: noop, onCreateToken: noop };
    click(Findings(props), "Show layer using this style");
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("text:b");
    const markup = renderToStaticMarkup(createElement(Findings, props));
    expect(markup).toContain(`Style ID: ${styleId}`);
    expect(markup).not.toContain("Go to source");
    expect(markup).not.toContain("Open style editor");
    expect(JSON.parse(JSON.stringify(report)).issueGroups[0].sourceStyleId).toBe(styleId);
    expect(reportToMarkdown(report)).toContain(`Style ID: ${styleId}`);
    // Filtering must keep style identity and select a member still in view.
    onNavigate.mockClear();
    click(Findings({ ...props, findings: [report.findings[0]!], expanded: report.issueGroups[0]!.id }), "Show layer using this style");
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("text:a");
  });

  it("uses explicit owning-instance provenance to navigate rendered descendants", () => {
    const report = reportFixture();
    const rendered = report.findings.find((finding) => finding.id === "d")!;
    rendered.nodePath = "Page / Placed button / Label";
    rendered.provenance = { kind: "unknown", navigationNodeId: "instance:button", relatedComponentId: "component:button", property: "textColor", contextKey: "placed-white" };
    const onNavigate = vi.fn();
    const noop = () => undefined;
    const props: FindingsProps = { findings: report.findings, groups: report.issueGroups!, frames: report.frames, showPassing: false, axisFilter: "all", pageFilter: "all", rootFilter: "all", variantFilter: "all", expanded: "issue:related", collections: [], tokenWizard: undefined, waiverDraft: undefined, disabled: false, canMutateDocument: true,
      onTogglePassing: noop, onAxisFilter: noop, onPageFilter: noop, onRootFilter: noop, onVariantFilter: noop, onExpand: noop, onNavigate, onWaiverDraft: noop, onWaive: noop, onClearWaiver: noop, onConfirmPattern: noop, onTokenWizard: noop, onCreateToken: noop };
    click(Findings(props), rendered.nodePath);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("instance:button");
    expect(reportToMarkdown(report)).toContain("Navigation node: instance:button");
  });

  it("exports v2 categories, score effects, group relationships, and safe evidence", () => {
    const report = reportFixture();
    report.findings[3]!.evidence.measured = { field: "paddingBottom", raw: "<script>[link](javascript:alert(1))" };
    const markdown = reportToMarkdown(report);
    expect(markdown).toContain("3 actionable issues · 5 affected occurrences");
    expect(markdown).toContain("Verified source");
    expect(markdown).toContain("Related; review each occurrence");
    expect(markdown).toContain("Category: recommendation");
    expect(markdown).toContain("does not affect grade");
    expect(markdown).toContain("Evidence:");
    expect(markdown).toContain("&lt;script&gt;");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("[link](javascript:");
  });
});

describe("captured-target verification controls", () => {
  it("rechecks captured changes or the full context without resubmitting the current selection", () => {
    const props = overviewProps();
    const onRecheck = vi.fn();
    const tree = Overview({ ...props, onRecheck });
    click(tree, "Recheck changes");
    click(tree, "Rescan entire file");
    expect(onRecheck.mock.calls).toEqual([[{ mode: "changes" }], [{ mode: "full" }]]);
    expect(props.onScan).not.toHaveBeenCalled();
  });

  it("disables verification while blocked and keeps historical export available", () => {
    const markup = renderToStaticMarkup(createElement(Overview, { ...overviewProps(), onRecheck: vi.fn(), recheckDisabled: true, historical: true, stale: true }));
    expect(markup).toMatch(/<button[^>]+disabled=""[^>]*>Recheck changes<\/button>/);
    expect(markup).toMatch(/<button[^>]+disabled=""[^>]*>Rescan entire file<\/button>/);
    expect(markup).toMatch(/<button class="button">Export historical JSON<\/button>/);
    expect(markup).toContain("related group needs individual review");
    expect(markup).toContain("3 actionable issues");
  });

  it("targets the displayed component id and honors the module recheck gate", () => {
    const onRecheck = vi.fn();
    const report = reportFixture();
    report.frames = report.frames.filter((frame) => frame.rootId === "root:desktop");
    const props = { report, onRecheck, recheckDisabled: false, onNavigate: vi.fn(), onViewFindings: vi.fn(), onViewVariantFindings: vi.fn() };
    click(Modules(props), "Recheck this component");
    expect(onRecheck).toHaveBeenCalledExactlyOnceWith({ mode: "component", componentId: "root:desktop" });
    const markup = renderToStaticMarkup(createElement(Modules, { ...props, recheckDisabled: true }));
    expect(markup).toMatch(/<button[^>]+disabled=""[^>]*>Recheck this component<\/button>/);
    expect(markup).toContain("affected occurrences");
    expect(markup).toContain("shared fix is unverified");
  });
});

import { describe, expect, it } from "vitest";
import { buildReadinessReport } from "../src/core/report";
import { captureRecheckFindings, recheckCounts } from "../src/plugin/recheck";
import { syntheticFinding, healthyGraph, node, profile } from "./fixtures";

const finding = (overrides: Parameters<typeof syntheticFinding>[0]) => syntheticFinding({ status: "fail", ...overrides });

function fixture() {
  const inputProfile = profile();
  const graph = healthyGraph(inputProfile);
  graph.nodes["component"] = node({ id: "component", rootId: "root:desktop", parentId: "root:desktop", type: "COMPONENT", childIds: ["text"] });
  graph.nodes["text"] = node({ id: "text", rootId: "root:desktop", parentId: "component", type: "TEXT" });
  graph.nodes["unrelated"] = node({ id: "unrelated", rootId: "other-root", type: "COMPONENT" });
  const report = buildReadinessReport({ graph, profile: inputProfile, scope: "selection", targetRootIds: ["root:desktop"] });
  report.findings = [finding({ id: "a", nodeId: "component" }), finding({ id: "b", nodeId: "text" }), finding({ id: "c", nodeId: "other" }), finding({ id: "pass", nodeId: "text", status: "pass" })];
  report.issueGroups = [{ id: "group", kind: "source", primaryFindingId: "a", findingIds: ["a", "b"], occurrenceCount: 2 }];
  return { graph, report };
}

describe("captured audit rechecks", () => {
  it("validates occurrence-backed groups and reports only that issue's resolved and remaining counts", () => {
    const { graph, report } = fixture();
    const captured = captureRecheckFindings({ mode: "issue", issueId: "group" }, report, graph, false);
    expect(captured.findingIds).toEqual(["a", "b"]);
    const changed = { ...report, findings: [report.findings[1]!, report.findings[2]!, finding({ id: "unrelated-new" })] };
    expect(recheckCounts(captured, changed)).toEqual({ resolvedCount: 1, remainingCount: 1 });
    expect(captureRecheckFindings({ mode: "issue", issueId: "b" }, report, graph, false).findingIds).toEqual(["b"]);
    expect(() => captureRecheckFindings({ mode: "issue", issueId: "forged" }, report, graph, false)).toThrow("does not belong");
  });

  it("counts a component and its descendants while rejecting foreign canvas components", () => {
    const { graph, report } = fixture();
    const captured = captureRecheckFindings({ mode: "component", componentId: "component" }, report, graph, false);
    expect(captured.findingIds).toEqual(["a", "b"]);
    expect(recheckCounts(captured, { ...report, findings: [report.findings[1]!, finding({ id: "new", nodeId: "text" })] })).toEqual({ resolvedCount: 1, remainingCount: 2 });
    for (const componentId of ["unrelated", "text", "missing"]) expect(() => captureRecheckFindings({ mode: "component", componentId }, report, graph, false)).toThrow("does not belong");
  });

  it("permits full historical refresh without accepting historical finding IDs as current authority", () => {
    const { report } = fixture();
    expect(captureRecheckFindings({ mode: "changes" }, report, undefined, true).findingIds).toEqual(["a", "b", "c"]);
    expect(captureRecheckFindings({ mode: "full" }, report, undefined, true).request.mode).toBe("full");
    expect(() => captureRecheckFindings({ mode: "issue", issueId: "group" }, report, undefined, true)).toThrow("historical");
    expect(() => captureRecheckFindings({ mode: "changes" }, undefined, undefined, false)).toThrow("Run an audit");
  });

  it("accepts the selected nested component when its capture root is an outer section", () => {
    const { graph, report } = fixture();
    graph.nodes["section"] = node({ id: "section", type: "SECTION" });
    graph.nodes["component"]!.rootId = "section";
    graph.nodes["component"]!.parentId = "section";
    report.target.rootIds = ["component"];
    expect(captureRecheckFindings({ mode: "component", componentId: "component" }, report, graph, false).findingIds).toEqual(["a", "b"]);
  });
});

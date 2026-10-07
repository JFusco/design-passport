import { describe, expect, it } from "vitest";
import { stableIssueKey } from "../src/core/issue-key";
import { evaluateNamingRules } from "../src/core/rules/naming";
import { evaluateStructureRules } from "../src/core/rules/structure";
import { buildReadinessReport } from "../src/core/report";
import { applyWaivers, reanchorWaivers } from "../src/core/waivers";
import { mergeIssueReview, resolvedIssueKeys } from "../src/plugin/issue-review";
import { healthyGraph, node, profile, syntheticFinding } from "./fixtures";

describe("semantic obligation identity", () => {
  it("keeps default-name and Auto Layout aggregates unresolved as representatives change", () => {
    const p = profile(), graph = healthyGraph(p), root = graph.nodes["root:desktop"]!;
    const first = node({ id: "a", rootId: root.id, name: "Frame 1" });
    const second = node({ id: "b", rootId: root.id, name: "Frame 2" });
    const naming = () => evaluateNamingRules(graph, root, [root, first, second]).find((row) => row.ruleId === "naming.default-critical")!;
    const old = naming(); first.name = "Card"; const next = naming();
    expect(next.status).toBe("fail"); expect(next.nodeId).not.toBe(old.nodeId); expect(stableIssueKey(next)).toBe(stableIssueKey(old));
    const children = [node({ id: "child:a", rootId: root.id }), node({ id: "child:b", rootId: root.id })];
    first.childIds = children.map((child) => child.id); second.childIds = children.map((child) => child.id);
    first.layout = { ...root.layout!, mode: "NONE" }; second.layout = { ...root.layout!, mode: "NONE" };
    const layout = () => evaluateStructureRules(root, [root, first, second, ...children]).find((row) => row.ruleId === "structure.auto-layout-coverage")!;
    const before = layout(); first.layout.mode = "HORIZONTAL"; const after = layout();
    expect(after.status).toBe("fail"); expect(after.nodeId).not.toBe(before.nodeId); expect(stableIssueKey(after)).toBe(stableIssueKey(before));
  });

  it("separates multiple literal buckets and reanchors legacy waivers without awarding points", () => {
    const first = syntheticFinding({ id: "old", rootId: "root:desktop", nodeId: "root:desktop", ruleId: "token.application.repeated-literal", status: "fail", evidence: { summary: "Repeated", measured: { field: "itemSpacing", rawValue: 8 } } });
    const next = { ...first, id: "new", nodeId: "different-representative" };
    const other = { ...next, evidence: { ...next.evidence, measured: { field: "itemSpacing", rawValue: 16 } } };
    expect(stableIssueKey(next)).toBe(stableIssueKey(first)); expect(stableIssueKey(other)).not.toBe(stableIssueKey(first));
    const waiver = { reason: "Accepted", createdBy: "Designer", createdAt: new Date().toISOString() };
    const waivers = reanchorWaivers({ old: waiver, unmatched: waiver }, [first]);
    expect(waivers.unmatched).toEqual(waiver); expect(waivers.old).toBeUndefined();
    const waived = applyWaivers([next], waivers)[0]!; expect(waived.status).toBe("waived");
    const p = profile(), graph = healthyGraph(p); graph.nodes[next.nodeId] = node({ id: next.nodeId, rootId: "root:desktop" });
    const report = (findings: typeof first[]) => buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: [first.rootId], findings: [...buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: [first.rootId] }).findings, ...findings] });
    expect(report([waived]).grade).toEqual(report([first]).grade);
    const state = mergeIssueReview(undefined, report([first]), report([waived]), [stableIssueKey(first)]);
    expect(state.records[0]?.outcome).toBe("unresolved");
  });

  it("unhides a recurring actionable issue and never lets Clear remove its current obligation", () => {
    const p = profile(), graph = healthyGraph(p), finding = syntheticFinding({ rootId: "root:desktop", nodeId: "root:desktop", ruleId: "naming.default-node", status: "fail" });
    const report = (findings: typeof finding[]) => buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: [finding.rootId], findings: [...buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: [finding.rootId] }).findings, ...findings] });
    const key = stableIssueKey(finding), failed = report([finding]), fixed = report([{ ...finding, status: "pass" }]);
    const resolved = mergeIssueReview(undefined, failed, fixed, [key]); resolved.clearedKeys = [key];
    expect(resolvedIssueKeys(resolved, fixed).has(key)).toBe(true);
    const recurring = mergeIssueReview(resolved, fixed, failed, [key]);
    expect(recurring.clearedKeys).toEqual([]); expect(recurring.records[0]?.outcome).toBe("unresolved");
    expect(resolvedIssueKeys(recurring, failed).size).toBe(0);
  });
});

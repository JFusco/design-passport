import { describe, expect, it } from "vitest";
import { attachFindingProvenance, buildFindingGroups, groupsForFindings } from "../src/core/finding-groups";
import { affectsScore, blocksReadiness, classifyFinding } from "../src/core/finding-policy";
import { axisScores } from "../src/core/grading";
import { buildMultiFileReviewReport } from "../src/core/knowledge-loop";
import { hashValue } from "../src/core/stable";
import { buildReadinessReport } from "../src/core/report";
import { validateContract } from "../src/core/schema";
import { healthyGraph, node, profile, syntheticFinding } from "./fixtures";

const recommendationRules = ["accessibility.target-preferred", "token.application.unique-inference", "token.application.ambiguous-inference", "token.application.repeated-literal", "component.repeated-candidate", "token.application.typography-review"];

describe("central finding policy", () => {
  it.each(recommendationRules)("keeps %s advisory regardless of severity/status", (ruleId) => {
    const finding = classifyFinding(syntheticFinding({ ruleId, status: "fail", severity: 4, hardBlocker: true }));
    expect(finding).toMatchObject({ category: "recommendation", status: "needs-review", scoreImpact: false, hardBlocker: false });
    expect(affectsScore(finding)).toBe(false);
    expect(blocksReadiness(finding)).toBe(false);
  });
  it("preserves naming failures and contextual confirmation while separating novel terminology", () => {
    expect(classifyFinding(syntheticFinding({ ruleId: "naming.pattern-novel" })).category).toBe("governance");
    expect(classifyFinding(syntheticFinding({ ruleId: "naming.pattern-contextual" })).category).toBe("requirement");
    const waived = classifyFinding(syntheticFinding({ status: "waived", hardBlocker: true }));
    expect(blocksReadiness(waived)).toBe(true);
    expect(axisScores([waived])[0]?.score).toBe(0);
  });
});

describe("occurrence-backed source groups", () => {
  function fixture() {
    const graph = healthyGraph();
    graph.nodes["source"] = node({ id: "source", type: "COMPONENT", rootId: "source" });
    graph.nodes["instance"] = node({ id: "instance", type: "INSTANCE", rootId: "instance", instance: { mainComponentId: "source", detached: false, overridesKnown: true, directOverrideFields: [], scaleFactor: 1 } });
    const findings = ["source", "instance"].map((id) => syntheticFinding({ id: `finding:${id}`, ruleId: "token.application.repeated-literal", nodeId: id, rootId: id, status: "needs-review", evidence: { summary: "Repeated fill", measured: { field: "fills", value: "white" } } }));
    return { graph, findings };
  }
  it("groups verified direct instance roots without replacing raw IDs or changing scores", () => {
    const { graph, findings } = fixture();
    const original = JSON.stringify(findings);
    const enriched = findings.map((finding) => attachFindingProvenance(finding, graph));
    const groups = buildFindingGroups(enriched);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "source", sourceNodeId: "source", occurrenceCount: 2 });
    expect(groups[0]?.findingIds.sort()).toEqual(findings.map((item) => item.id).sort());
    expect(axisScores(enriched)).toEqual(axisScores(findings));
    expect(JSON.stringify(findings)).toBe(original);
    expect(groupsForFindings([enriched[1]!], groups)[0]).toMatchObject({ occurrenceCount: 1, findingIds: [enriched[1]!.id] });
  });
  it("does not promise a shared fix for overridden, scaled or nested correspondence", () => {
    for (const reason of ["override", "style-override", "scale", "nested"] as const) {
      const { graph, findings } = fixture();
      const instance = graph.nodes["instance"]!;
      if (reason === "override") instance.instance!.directOverrideFields = ["fills"];
      if (reason === "style-override") instance.instance!.directOverrideFields = ["fillStyleId"];
      if (reason === "scale") instance.instance!.scaleFactor = 2;
      if (reason === "nested") { instance.owningInstanceId = "owner"; instance.evidenceRole = "instance-descendant"; }
      const enriched = findings.map((finding) => attachFindingProvenance(finding, graph));
      const groups = buildFindingGroups(enriched);
      expect(groups.every((group) => group.kind === "related")).toBe(true);
      expect(groups.every((group) => group.sourceNodeId === undefined)).toBe(true);
      if (reason === "nested") expect(enriched.find((finding) => finding.nodeId === "instance")?.provenance?.navigationNodeId).toBe("owner");
    }
  });
  it("keeps different contrast contexts and independent variants out of common-source groups", () => {
    const { graph, findings } = fixture();
    const enriched = findings.map((finding, index) => attachFindingProvenance({ ...finding, evidence: { summary: "contrast", measured: { field: "textColor", background: index ? "black" : "white" } } }, graph));
    const groups = buildFindingGroups(enriched);
    expect(groups.some((group) => group.kind === "source" && group.findingIds.length > 1)).toBe(false);
    graph.nodes["instance"]!.instance!.mainComponentId = "another-component";
    expect(buildFindingGroups(findings.map((finding) => attachFindingProvenance(finding, graph)))).toHaveLength(2);
  });
  it("keeps equal-valued explicit typography bindings ahead of shared style provenance", () => {
    const graph = healthyGraph();
    const style = { id: "style:body", status: "resolved" as const, controlledFields: ["fontSize" as const], overriddenFields: [] };
    const findings = ["body", "action"].map((id) => {
      graph.nodes[id] = node({ id, type: "TEXT", boundFields: ["fontSize"], boundVariableIds: { fontSize: [`variable:${id}`] },
        text: { fontSize: 16, charactersLength: 3, contentHash: id, backgroundResolvable: false, style } });
      return attachFindingProvenance(syntheticFinding({ id: `finding:${id}`, nodeId: id, ruleId: "token.application.review", status: "needs-review", evidence: { summary: "Typography review", measured: { field: "fontSize", value: 16 } } }), graph);
    });
    expect(findings.every((finding) => finding.provenance?.kind === "direct" && !finding.provenance.sourceStyleId)).toBe(true);
    expect(buildFindingGroups(findings)).toHaveLength(2);
    for (const id of ["body", "action"]) { graph.nodes[id]!.boundFields = []; graph.nodes[id]!.boundVariableIds = {}; }
    const styleFindings = findings.map(({ provenance: _provenance, ...finding }) => attachFindingProvenance(finding, graph));
    expect(styleFindings.every((finding) => finding.provenance?.kind === "style")).toBe(true);
    expect(buildFindingGroups(styleFindings)).toHaveLength(1);
  });
  it.each(["wrong-node", "wrong-style", "related-style", "mixed-property", "mixed-context", "unproven-source"] as const)("rejects a %s common-source claim", (change) => {
    const p = profile();
    const report = buildReadinessReport({ graph: healthyGraph(p), profile: p, scope: "file", targetRootIds: ["root:desktop"] });
    const findings = ["text:a", "text:b"].map((nodeId) => syntheticFinding({ id: `finding:${nodeId}`, nodeId, status: "needs-review", category: "requirement", provenance: { kind: "style", sourceStyleId: "S:body", sourceLabel: "Body", property: "fontSize", contextKey: "same-context" } }));
    report.findings = findings;
    report.issueGroups = buildFindingGroups(findings);
    expect(report.issueGroups[0]?.sourceStyleId).toBe("S:body");
    expect(validateContract("readiness-report", report).valid).toBe(true);
    const group = report.issueGroups[0]!;
    if (change === "wrong-node") { delete group.sourceStyleId; group.sourceNodeId = "different-node"; }
    if (change === "wrong-style") group.sourceStyleId = "S:other";
    if (change === "related-style") group.kind = "related";
    if (change === "mixed-property") findings[1]!.provenance!.property = "lineHeight";
    if (change === "mixed-context") findings[1]!.provenance!.contextKey = "other-background";
    if (change === "unproven-source") { delete group.sourceStyleId; delete group.sourceLabel; }
    expect(validateContract("readiness-report", report).valid).toBe(false);
  });
  it("applies source relationship validation inside companion multi-file reports", () => {
    const p = profile();
    const report = buildReadinessReport({ graph: healthyGraph(p), profile: p, scope: "file", targetRootIds: ["root:desktop"] });
    const wrapper = buildMultiFileReviewReport({ projectScope: "project:qa", targets: [{ source: {
      schemaVersion: 1, sourceId: "source:qa", projectScope: "project:qa", role: "target", contentDigest: hashValue("qa"), completeness: { complete: true, availableDomains: ["layout"], warnings: [] },
    }, report }] });
    expect(validateContract("multi-file-review-report", wrapper).valid).toBe(true);
    const declaredSource = report.issueGroups!.find((group) => group.sourceNodeId)!;
    declaredSource.sourceNodeId = "unrelated-node";
    const result = validateContract("multi-file-review-report", wrapper);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.startsWith("/targets/0/report/issueGroups/"))).toBe(true);
  });
  it("validates v2 reference/count/category invariants while leaving v1 readable", () => {
    const p = profile();
    const report = buildReadinessReport({ graph: healthyGraph(p), profile: p, scope: "file", targetRootIds: ["root:desktop"] });
    expect(validateContract("readiness-report", report).valid).toBe(true);
    const corrupt = structuredClone(report);
    corrupt.issueGroups![0]!.findingIds.push("unknown-finding");
    expect(validateContract("readiness-report", corrupt).valid).toBe(false);
    const scoringAdvisory = structuredClone(report);
    scoringAdvisory.findings[0]!.category = "governance";
    scoringAdvisory.findings[0]!.scoreImpact = true;
    expect(validateContract("readiness-report", scoringAdvisory).valid).toBe(false);
    const legacy = structuredClone(report);
    legacy.schemaVersion = 1;
    delete legacy.issueGroups;
    for (const finding of legacy.findings) { delete finding.category; delete finding.provenance; }
    expect(validateContract("readiness-report", legacy).valid).toBe(true);
  });
});

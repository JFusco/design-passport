import { describe, expect, it } from "vitest";
import { buildReadinessReport } from "../src/core/report";
import { evaluateRules } from "../src/core/rules";
import { evaluateComponentRules } from "../src/core/rules/component";
import { evaluateStructureRules } from "../src/core/rules/structure";
import { resolveTargetRoots } from "../src/core/operations/graph";
import { isSemanticVariableName } from "../src/core/operations/semantic-variable";
import { tokenCoverageGroupPage, tokenCoverageSummary } from "../src/core/operations/node-fields";
import { parseStoredProfile } from "../src/figma/operations/shared-data";
import { healthyGraph, node, profile } from "./fixtures";

describe("designer-feedback hardening", () => {
  it("reconciles direct, inherited, ignored, and missing coverage while bounding samples", () => {
    const bound = node({ id: "bound", path: "Screen / Bound", layout: undefined });
    const styled = node({
      id: "styled", path: "Screen / Styled", type: "TEXT", layout: undefined,
      fills: [], boundFields: [], boundVariableIds: {},
      text: { fontSize: 16, charactersLength: 4, contentHash: "text", backgroundResolvable: false,
        style: { status: "resolved", controlledFields: ["fontSize"], overriddenFields: [] } },
    });
    const percentage = node({
      id: "percentage", path: "Screen / Percentage", type: "TEXT", layout: undefined,
      fills: [], boundFields: [], boundVariableIds: {},
      text: { fontSize: 16, lineHeightPx: 24, lineHeight: { unit: "PERCENT", value: 150 }, charactersLength: 4, contentHash: "percent", backgroundResolvable: false },
    });
    const hidden = node({ id: "hidden", path: "Screen / Hidden", visible: false, renderVisible: false });
    const missing = Array.from({ length: 55 }, (_, index) => node({
      id: `missing:${index}`, path: `Screen / Missing ${index}`, layout: undefined,
      fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 0, b: 0 }, inferredVariableIds: [] }],
      boundFields: [], boundVariableIds: {},
    }));
    const summary = tokenCoverageSummary([bound, styled, percentage, hidden, ...missing]);
    expect(summary.counts.bound).toBeGreaterThan(0);
    expect(summary.counts.inherited).toBeGreaterThan(0);
    expect(summary.counts.ignored).toBeGreaterThan(0);
    expect(summary.counts.missing).toBeGreaterThanOrEqual(55);
    expect(summary.applicable).toBe(summary.counts.bound + summary.counts.inherited + summary.counts.missing);
    expect(summary.coverage).toBeCloseTo((summary.counts.bound + summary.counts.inherited) / summary.applicable * 100);
    expect(summary.groups).toContainEqual(expect.objectContaining({ disposition: "ignored", field: "lineHeight", reason: "unsupported-unit" }));
    expect(summary.groups.find((group) => group.disposition === "missing" && group.field === "fills")).toMatchObject({ count: 55, truncated: true, samples: expect.any(Array) });
    expect(summary.groups.find((group) => group.disposition === "missing" && group.field === "fills")?.samples).toHaveLength(50);
  });

  it("pages every live match while keeping persisted evidence samples bounded", () => {
    const graph = healthyGraph();
    const root = graph.nodes["root:desktop"]!;
    const missing = Array.from({ length: 55 }, (_, index) => node({
      id: `missing:${index}`, rootId: root.id, pageId: root.pageId, parentId: root.id,
      path: `Desktop / Missing ${String(index).padStart(2, "0")}`, layout: undefined,
      fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 0, b: 0 }, inferredVariableIds: [] }],
      boundFields: [], boundVariableIds: {},
    }));
    for (const candidate of missing) graph.nodes[candidate.id] = candidate;
    root.childIds = missing.map((candidate) => candidate.id);
    const stored = tokenCoverageSummary([root, ...missing]);
    expect(stored.groups.find((group) => group.disposition === "missing" && group.field === "fills")?.samples).toHaveLength(50);
    const first = tokenCoverageGroupPage(graph, { rootIds: [root.id], disposition: "missing", field: "fills", reason: "unbound", offset: 0, limit: 20 });
    const last = tokenCoverageGroupPage(graph, { rootIds: [root.id], disposition: "missing", field: "fills", reason: "unbound", offset: 40, limit: 20 });
    expect(first).toMatchObject({ totalSamples: 55, samples: expect.arrayContaining([expect.objectContaining({ nodeId: "missing:0" })]) });
    expect(first.samples).toHaveLength(20);
    expect(last.samples).toHaveLength(15);
    expect(new Set([...first.samples, ...last.samples].map((sample) => sample.nodeId)).size).toBe(35);
  });

  it("accepts semantic category paths and rejects raw literal paths", () => {
    expect(["padding/xs", "stack/md", "layout/gutter", "semantic/space", "type/body/font-size", "color/brand", "motion/fast"].every(isSemanticVariableName)).toBe(true);
    expect(["16", "padding/16", "space/8px", "#fff/background", "gutter"].some(isSemanticVariableName)).toBe(false);
  });

  it("makes convention modes required, advisory, or one not-applicable summary without changing locked rules", () => {
    const graph = healthyGraph();
    graph.nodes["text:1"]!.name = "Text 1";
    const required = profile();
    const advisory = profile({ ruleModes: { ...required.ruleModes, "layer-naming": "advisory" } });
    const off = profile({ ruleModes: { ...required.ruleModes, "layer-naming": "off" } });
    const requiredFindings = evaluateRules(graph, required, ["root:desktop"]);
    const advisoryFindings = evaluateRules(graph, advisory, ["root:desktop"]);
    const offFindings = evaluateRules(graph, off, ["root:desktop"]);
    expect(requiredFindings.find((finding) => finding.ruleId === "naming.default-node")).toMatchObject({ status: "fail", category: "requirement", scoreImpact: false });
    expect(advisoryFindings.find((finding) => finding.ruleId === "naming.default-node")).toMatchObject({ status: "needs-review", category: "recommendation", scoreImpact: false, hardBlocker: false });
    expect(offFindings.filter((finding) => finding.evidence.measured.policyId === "layer-naming")).toHaveLength(1);
    expect(offFindings.find((finding) => finding.evidence.measured.policyId === "layer-naming")).toMatchObject({ status: "not-applicable", scoreImpact: false });
    expect(offFindings.find((finding) => finding.ruleId === "accessibility.target-minimum")?.category).toBe("requirement");
  });

  it("targets nested component sources instead of an unmarked documentation wrapper", () => {
    const p = profile({ artifactKind: "library", pageRoles: { foundations: { pageIds: [], externalLibraryKeys: [] }, components: { pageIds: ["page:components"], externalLibraryKeys: [] }, screens: { pageIds: [], externalLibraryKeys: [] } } });
    const graph = healthyGraph(p);
    graph.pages = [{ id: "page:components", name: "Components", role: "components", loaded: true, nodeCount: 4, rootNodeIds: ["wrapper"] }];
    graph.nodes = {
      wrapper: node({ id: "wrapper", rootId: "wrapper", pageId: "page:components", parentId: "page:components", name: "Hero documentation", childIds: ["set", "standalone", "visual"] }),
      set: node({ id: "set", rootId: "set", pageId: "page:components", parentId: "wrapper", type: "COMPONENT_SET", component: { kind: "component-set", descriptionLength: 10, documentationLinkCount: 0, propertyDefinitions: [] } }),
      standalone: node({ id: "standalone", rootId: "standalone", pageId: "page:components", parentId: "wrapper", type: "COMPONENT", component: { kind: "component", descriptionLength: 10, documentationLinkCount: 0, propertyDefinitions: [] } }),
      visual: node({ id: "visual", rootId: "wrapper", pageId: "page:components", parentId: "wrapper", name: "Hero" }),
    };
    graph.sourceFrameIds = ["set", "standalone"];
    expect(resolveTargetRoots("selection", graph, "", ["wrapper"])).toEqual({ rootIds: ["set", "standalone"], mode: "component-sources", requestedNodeIds: ["wrapper"], excludedNodeIds: ["wrapper"] });
    graph.nodes.wrapper!.childIds = ["visual"];
    expect(resolveTargetRoots("selection", graph, "", ["wrapper"])).toEqual({ rootIds: ["set", "standalone"], mode: "component-sources", requestedNodeIds: ["wrapper"], excludedNodeIds: ["wrapper"] });
    graph.nodes.wrapper!.sourceMarked = true;
    expect(resolveTargetRoots("selection", graph, "", ["wrapper"]).rootIds).toEqual(["wrapper"]);
    expect(resolveTargetRoots("page", graph, "page:components", []).rootIds).toEqual(["set", "standalone"]);
  });

  it("reviews detached designs per node and honors typed standalone acknowledgements", () => {
    const graph = healthyGraph();
    const root = graph.nodes["root:desktop"]!;
    const detached = node({ id: "detached", rootId: root.id, parentId: root.id, instance: { detached: true }, hasAnnotations: true });
    const unresolved = evaluateComponentRules(graph, root, [root, detached]).find((finding) => finding.ruleId === "component.detached-design" && finding.nodeId === detached.id);
    expect(unresolved).toMatchObject({ status: "needs-review", evidence: { measured: { acknowledged: false, hasAnnotations: true } } });
    detached.intentionalDetachment = { nodeId: detached.id, acknowledgedAt: "2026-09-23T12:00:00.000Z" };
    expect(evaluateComponentRules(graph, root, [root, detached]).find((finding) => finding.nodeId === detached.id)).toMatchObject({ status: "pass", evidence: { measured: { acknowledged: true } } });
  });

  it("accepts empty FILL spacers and keeps fixed spacers as advisory by default", () => {
    const root = node({ id: "root", rootId: "root", childIds: ["fill", "fixed"], layout: { mode: "VERTICAL", primarySizing: "FIXED", counterSizing: "FIXED", itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, inferredAvailable: false } });
    const fill = node({ id: "fill", rootId: root.id, parentId: root.id, name: "Typography spacer", fills: [], strokes: [], effects: [], layout: undefined, layoutItem: { verticalSizing: "FILL" }, boundFields: [], boundVariableIds: {} });
    const fixed = node({ id: "fixed", rootId: root.id, parentId: root.id, name: "Column spacer", fills: [], strokes: [], effects: [], layout: undefined, layoutItem: { verticalSizing: "FIXED" }, boundFields: [], boundVariableIds: {} });
    const findings = evaluateStructureRules(root, [root, fill, fixed]).filter((finding) => finding.ruleId === "structure.spacer-layer");
    expect(findings.find((finding) => finding.nodeId === fill.id)).toMatchObject({ status: "pass", evidence: { measured: { sizingReason: "fill" } } });
    expect(findings.find((finding) => finding.nodeId === fixed.id)).toMatchObject({ status: "fail", evidence: { measured: { sizingReason: "fixed-unbound" } } });
  });

  it("migrates profile-v1 defaults and emits a verifiable report-v3 producer and ledger", () => {
    const current = profile();
    const { ruleModes: _ruleModes, ...legacyFields } = current;
    const migrated = parseStoredProfile(JSON.stringify({ ...legacyFields, schemaVersion: 1 }));
    expect(migrated).toMatchObject({ schemaVersion: 2, ruleModes: current.ruleModes });
    const report = buildReadinessReport({ graph: healthyGraph(current), profile: current, scope: "selection", targetRootIds: ["root:desktop"] });
    expect(report).toMatchObject({ schemaVersion: 3, producer: { pluginVersion: "0.4.0", rulesetVersion: "1.0.0-beta.4", channel: "development" }, frames: [{ tokenCoverage: expect.any(Object) }] });
    expect(report.frames[0]!.tokenCoverage!.applicable).toBe(report.frames[0]!.tokenCoverage!.counts.bound + report.frames[0]!.tokenCoverage!.counts.inherited + report.frames[0]!.tokenCoverage!.counts.missing);
  });
});

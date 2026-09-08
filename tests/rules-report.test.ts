import { describe, expect, it } from "vitest";
import { buildReadinessReport } from "../src/core/report";
import { evaluateRules } from "../src/core/rules";
import { validateContract } from "../src/core/schema";
import { healthyGraph, node, profile } from "./fixtures";

describe("rule engine and report", () => {
  it("produces a schema-valid ready report from complete whole-file evidence", () => {
    const p = profile();
    const graph = healthyGraph(p);
    const report = buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"], now: new Date("2026-09-07T13:00:00.000Z") });
    expect(validateContract("readiness-report", report)).toEqual({ valid: true, errors: [] });
    expect(report.ready).toBe(true);
    expect(report.grade.letter).toMatch(/[AB]/);
    expect(report.target).toMatchObject({ knowledgeComplete: true, rootIds: ["root:desktop"] });
    expect(report.axes).toHaveLength(8);
  });

  it("exposes the fixed rule inventory across all eight axes", () => {
    const p = profile();
    const rules = [...new Set(evaluateRules(healthyGraph(p), p, ["root:desktop"]).map((finding) => finding.ruleId))];
    expect(rules).toEqual([
      "accessibility.behavior-review",
      "accessibility.target-minimum",
      "accessibility.target-preferred",
      "accessibility.text-contrast",
      "component.documentation",
      "component.instances-attached",
      "naming.default-critical",
      "naming.default-healthy",
      "naming.source-unique",
      "pipeline.annotation",
      "pipeline.certification-freshness",
      "pipeline.code-connect",
      "pipeline.consumable-root",
      "pipeline.dev-resource",
      "pipeline.export-names",
      "pipeline.file-knowledge",
      "pipeline.literal-styling",
      "responsive.binding-parity",
      "responsive.collisions",
      "responsive.completeness",
      "responsive.content-parity",
      "responsive.signal",
      "structure.auto-layout-coverage",
      "structure.clipping",
      "token.application.breakpoint-tier",
      "token.application.excellent",
      "token.application.minimum",
      "token.application.started",
      "token.application.strong",
      "token.application.substantial",
      "token.foundation.alias-layer",
      "token.foundation.metadata",
      "token.foundation.semantic",
      "token.foundation.sources",
    ]);
  });

  it("blocks certification when whole-file context is incomplete", () => {
    const p = profile();
    const graph = { ...healthyGraph(p), complete: false, cancelled: true, loadedPageCount: 0 };
    const report = buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"] });
    expect(report.ready).toBe(false);
    expect(report.findings.find((finding) => finding.ruleId === "pipeline.file-knowledge")).toMatchObject({ status: "fail", hardBlocker: true });
  });

  it("detects a wholly literal target as a hard blocker", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:desktop"] = node({
      ...graph.nodes["root:desktop"],
      id: "root:desktop",
      boundFields: [],
      fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 }, inferredVariableIds: [] }],
    });
    graph.nodes["text:1"] = node({ ...graph.nodes["text:1"], id: "text:1", boundFields: [], fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 0.05, g: 0.06, b: 0.05 }, inferredVariableIds: [] }] });
    graph.nodes["button:1"] = node({ ...graph.nodes["button:1"], id: "button:1", boundFields: [], fills: [{ type: "SOLID", visible: true, opacity: 1, color: { r: 0.1, g: 0.3, b: 0.1 }, inferredVariableIds: [] }] });
    const finding = evaluateRules(graph, p, ["root:desktop"]).find((item) => item.ruleId === "pipeline.literal-styling");
    expect(finding).toMatchObject({ status: "fail", hardBlocker: true });
  });

  it("detects responsive collisions and no-responsive-signal blockers", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.responsiveFamilies[0] = { ...graph.responsiveFamilies[0]!, hasCollision: true };
    expect(evaluateRules(graph, p, ["root:desktop"]).find((item) => item.ruleId === "responsive.collisions")).toMatchObject({ status: "fail", hardBlocker: true });

    const isolated = healthyGraph(p);
    isolated.nodes["root:desktop"] = node({ ...isolated.nodes["root:desktop"], id: "root:desktop", width: 1000, name: "Checkout source" });
    isolated.responsiveFamilies = [];
    isolated.variables = isolated.variables.map((variable) => ({ ...variable, modeNames: [] }));
    expect(evaluateRules(isolated, p, ["root:desktop"]).find((item) => item.ruleId === "responsive.signal")).toMatchObject({ status: "fail", hardBlocker: true });
  });

  it("grades every source frame independently and takes the limiting frame", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:mobile"] = node({ ...graph.nodes["root:mobile"], id: "root:mobile", name: "Frame 42", boundFields: [], width: 375 });
    const report = buildReadinessReport({ graph, profile: p, scope: "file", targetRootIds: ["root:desktop", "root:mobile"] });
    expect(report.frames).toHaveLength(2);
    expect(report.grade.score).toBe(Math.min(...report.frames.map((frame) => frame.grade.score)));
  });

  it("detects a certificate made against an older whole-file snapshot", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:desktop"]!.certification = {
      schemaVersion: 1,
      grade: "A",
      score: 95,
      rulesetVersion: "1.0.0-beta.1",
      catalogVersion: "1.17.0",
      certifiedAt: "2026-09-07T12:00:00.000Z",
      snapshotHash: "old-report",
      knowledgeSnapshotHash: "old-knowledge",
    };
    expect(evaluateRules(graph, p, ["root:desktop"]).find((item) => item.ruleId === "pipeline.certification-freshness")).toMatchObject({ status: "needs-review" });
  });

  it("honors a designer-confirmed contextual pattern for the pinned catalog version", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["button:1"] = node({
      ...graph.nodes["button:1"],
      id: "button:1",
      name: "Label",
      component: { kind: "component", descriptionLength: 20, documentationLinkCount: 1, propertyDefinitions: [] },
      confirmedPattern: { canonicalName: "Label", sourceName: "Label", catalogVersion: "1.17.0" },
    });
    expect(evaluateRules(graph, p, ["root:desktop"]).find((item) => item.ruleId === "naming.pattern-contextual")).toMatchObject({ status: "pass", patternResolution: { canonicalName: "Label", requiresConfirmation: false } });
  });
});

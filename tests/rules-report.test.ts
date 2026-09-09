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
    expect(report.frames[0]).toMatchObject({ pageId: "page:1", pageName: "Screens", rootType: "FRAME" });
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

  it("treats 95% complete token metadata as B-ready foundation evidence", () => {
    const p = profile();
    const graph = healthyGraph(p);
    const source = graph.variables[0]!;
    graph.variables = Array.from({ length: 20 }, (_, index) => {
      const candidate = { ...source, id: `var:${index}`, key: `var:${index}:key` };
      if (index !== 19) return candidate;
      const { webSyntax: _webSyntax, ...withoutWebSyntax } = candidate;
      return withoutWebSyntax;
    });
    expect(evaluateRules(graph, p, ["root:desktop"]).find((finding) => finding.ruleId === "token.foundation.metadata")).toMatchObject({
      status: "pass",
      evidence: { measured: { metadataCoverage: 95 } },
    });
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

  it("records every direct component-set variant and attributes descendant findings", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:desktop"] = node({
      ...graph.nodes["root:desktop"],
      id: "root:desktop",
      type: "COMPONENT_SET",
      childIds: ["variant:default", "variant:disabled"],
      component: { kind: "component-set", descriptionLength: 20, documentationLinkCount: 0, propertyDefinitions: [] },
    });
    graph.nodes["variant:default"] = node({
      id: "variant:default",
      rootId: "root:desktop",
      parentId: "root:desktop",
      path: "Screens / Button / state=Default",
      name: "state=Default",
      type: "COMPONENT",
      childIds: ["text:1"],
      variantProperties: { state: "Default" },
      component: { kind: "component", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });
    graph.nodes["variant:disabled"] = node({
      id: "variant:disabled",
      rootId: "root:desktop",
      parentId: "root:desktop",
      path: "Screens / Button / state=Disabled",
      name: "state=Disabled",
      type: "COMPONENT",
      childIds: ["button:1"],
      variantProperties: { state: "Disabled" },
      component: { kind: "component", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });
    graph.nodes["text:1"]!.parentId = "variant:default";
    graph.nodes["text:1"]!.name = "Frame 42";
    graph.nodes["button:1"]!.parentId = "variant:disabled";
    const report = buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"] });
    expect(report.frames[0]?.variantCoverage).toEqual([
      expect.objectContaining({ variantId: "variant:default", variantProperties: { state: "Default" }, nodeCount: 2 }),
      expect.objectContaining({ variantId: "variant:disabled", variantProperties: { state: "Disabled" }, nodeCount: 2 }),
    ]);
    const defaultCoverage = report.frames[0]?.variantCoverage?.[0];
    expect(defaultCoverage?.findingIds.some((id) => report.findings.find((finding) => finding.id === id)?.nodeId === "text:1")).toBe(true);
    expect(validateContract("readiness-report", report)).toEqual({ valid: true, errors: [] });
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

  it("accepts state as a semantic component property while rejecting numbered defaults", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:desktop"]!.component = {
      kind: "component-set",
      descriptionLength: 20,
      documentationLinkCount: 0,
      propertyDefinitions: [
        { name: "state", type: "VARIANT", values: ["empty", "filled"] },
        { name: "State 1", type: "VARIANT", values: ["empty", "filled"] },
      ],
    };
    const propertyFindings = evaluateRules(graph, p, ["root:desktop"])
      .filter((finding) => finding.ruleId === "naming.component-property");
    expect(propertyFindings.find((finding) => finding.evidence.measured.propertyName === "state")?.status).toBe("pass");
    expect(propertyFindings.find((finding) => finding.evidence.measured.propertyName === "State 1")?.status).toBe("fail");
  });

  it("accepts common variant property names and readable human-facing values", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:desktop"]!.component = {
      kind: "component-set",
      descriptionLength: 20,
      documentationLinkCount: 0,
      propertyDefinitions: [
        { name: "variant", type: "VARIANT", values: ["Neutral", "Critical"] },
        { name: "position", type: "VARIANT", values: ["Top start", "Bottom end"] },
      ],
    };
    const findings = evaluateRules(graph, p, ["root:desktop"]);
    expect(findings.filter((finding) => finding.ruleId === "naming.component-property").map((finding) => finding.status)).toEqual(["pass", "pass"]);
    expect(findings.filter((finding) => finding.ruleId === "naming.component-value").map((finding) => finding.status)).toEqual(["pass", "pass"]);
  });

  it("keeps unresolved transparent-surface contrast visible without treating it as a failure", () => {
    const p = profile();
    const graph = healthyGraph(p);
    const { backgroundColor: _backgroundColor, ...textWithoutBackground } = graph.nodes["text:1"]!.text!;
    graph.nodes["text:1"]!.text = {
      ...textWithoutBackground,
      backgroundResolvable: false,
    };
    const contrast = evaluateRules(graph, p, ["root:desktop"])
      .find((finding) => finding.ruleId === "accessibility.text-contrast");
    expect(contrast).toMatchObject({ status: "needs-review", scoreImpact: false });
    expect(buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"] }).ready).toBe(true);
  });

  it("does not require Auto Layout for geometry-only icon wrappers", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["icon:wrapper"] = node({
      id: "icon:wrapper",
      rootId: "root:desktop",
      pageId: "page:1",
      parentId: "root:desktop",
      name: "Search icon",
      type: "FRAME",
      childIds: ["icon:lens", "icon:handle"],
      layout: { mode: "NONE", inferredAvailable: false },
    });
    graph.nodes["icon:lens"] = node({ id: "icon:lens", rootId: "root:desktop", pageId: "page:1", parentId: "icon:wrapper", name: "Search lens", type: "VECTOR" });
    graph.nodes["icon:handle"] = node({ id: "icon:handle", rootId: "root:desktop", pageId: "page:1", parentId: "icon:wrapper", name: "Search handle", type: "VECTOR" });
    graph.nodes["root:desktop"]!.childIds.push("icon:wrapper");
    const finding = evaluateRules(graph, p, ["root:desktop"])
      .find((candidate) => candidate.ruleId === "structure.auto-layout-coverage");
    expect(finding?.status).toBe("pass");
    expect(finding?.evidence.measured.withoutAutoLayoutCount).toBe(0);
  });

  it("treats Code Connect as opt-in profile evidence", () => {
    const optionalProfile = profile({ requireCodeConnect: false });
    const optionalFinding = evaluateRules(healthyGraph(optionalProfile), optionalProfile, ["root:desktop"])
      .find((finding) => finding.ruleId === "pipeline.code-connect");
    expect(optionalFinding).toMatchObject({ status: "not-applicable", evidence: { measured: { required: false } } });

    const requiredProfile = profile({ requireCodeConnect: true });
    const requiredGraph = healthyGraph(requiredProfile);
    requiredGraph.nodes["button:1"]!.component = { kind: "component", descriptionLength: 20, documentationLinkCount: 0, propertyDefinitions: [] };
    requiredGraph.componentIds = ["button:1"];
    const requiredFinding = evaluateRules(requiredGraph, requiredProfile, ["root:desktop"])
      .find((finding) => finding.ruleId === "pipeline.code-connect");
    expect(requiredFinding).toMatchObject({ status: "fail", evidence: { measured: { required: true } } });
  });
});

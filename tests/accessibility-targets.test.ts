import { describe, expect, it } from "vitest";
import { evaluateAccessibilityRules } from "../src/core/rules/accessibility";
import { contrastRatio } from "../src/core/contrast";
import { healthyGraph, node } from "./fixtures";

function targetGraph() {
  const graph = healthyGraph();
  for (const candidate of Object.values(graph.nodes)) candidate.hasPointerInteraction = false;
  const target = graph.nodes["button:1"]!;
  target.hasPointerInteraction = true;
  target.absoluteBounds = { x: 0, y: 0, width: 24, height: 24 };
  return { graph, target, root: graph.nodes["root:desktop"]! };
}

describe("evidenced target bounds and spacing", () => {
  it("does not fail mixed large text using an assumed small-text threshold", () => {
    const { graph, root } = targetGraph();
    const text = Object.values(graph.nodes).find((value) => value.type === "TEXT")!;
    delete text.text!.fontSize;
    text.text!.mixedFields = ["fontSize"];
    text.text!.textColor = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const findings = evaluateAccessibilityRules(graph, root, [root, text]);
    expect(findings.find((finding) => finding.ruleId === "accessibility.contrast-unresolved")).toMatchObject({ status: "needs-review", scoreImpact: false, evidence: { measured: { thresholdUnresolved: true } } });
    expect(findings.find((finding) => finding.ruleId === "accessibility.text-contrast")).toMatchObject({ status: "needs-review", scoreImpact: false });
    expect(findings.some((finding) => finding.ruleId === "accessibility.text-contrast-node")).toBe(false);
  });
  it("accepts the exact 24×24 boundary and keeps 44×44 advisory", () => {
    const { graph, root, target } = targetGraph();
    const findings = evaluateAccessibilityRules(graph, root, [root, target]);
    expect(findings.find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "pass" });
    expect(findings.find((finding) => finding.ruleId === "accessibility.target-preferred")).toMatchObject({ status: "needs-review", scoreImpact: false, category: "recommendation" });
  });

  it("does not treat a small named decorative child as its own target", () => {
    const { graph, root, target } = targetGraph();
    graph.nodes.icon = node({ id: "icon", parentId: target.id, type: "VECTOR", name: "Button", width: 12, height: 12 });
    expect(evaluateAccessibilityRules(graph, root, [root, target, graph.nodes.icon!]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "pass", evidence: { measured: { interactiveCount: 1 } } });
  });

  it("treats names without actual pointer evidence as non-scoring review", () => {
    const { graph, root, target } = targetGraph();
    target.hasPointerInteraction = false;
    target.width = 10;
    target.height = 10;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "needs-review", scoreImpact: false });
  });

  it("accepts separated undersized targets at the exact circle boundary", () => {
    const { graph, root, target } = targetGraph();
    target.absoluteBounds = { x: 0, y: 0, width: 20, height: 20 };
    graph.nodes.neighbor = node({ id: "neighbor", parentId: root.id, name: "Button / Secondary", hasPointerInteraction: true, absoluteBounds: { x: 24, y: 0, width: 20, height: 20 } });
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "pass", evidence: { measured: { spacingExceptionCount: 1 } } });
    graph.nodes.neighbor.absoluteBounds!.x = 23.99;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "fail", scoreImpact: true });
  });

  it("uses circle-to-rectangle distance for a neighboring full-size target", () => {
    const { graph, root, target } = targetGraph();
    target.absoluteBounds = { x: 0, y: 0, width: 20, height: 20 };
    graph.nodes.neighbor = node({ id: "neighbor", parentId: root.id, name: "Button / Secondary", hasPointerInteraction: true, absoluteBounds: { x: 22, y: 0, width: 44, height: 44 } });
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "pass" });
    graph.nodes.neighbor.absoluteBounds!.x = 21.99;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "fail" });
  });

  it("checks the actual target as well as the circle for a long, undersized neighbor", () => {
    const { graph, root, target } = targetGraph();
    target.absoluteBounds = { x: 0, y: 0, width: 20, height: 20 };
    graph.nodes.neighbor = node({ id: "neighbor", parentId: root.id, hasPointerInteraction: true, absoluteBounds: { x: 20, y: 0, width: 100, height: 16 } });
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "fail", evidence: { measured: { undersizedCount: 1 } } });
    graph.nodes.neighbor.absoluteBounds!.x = 22;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "pass" });
  });

  it.each(["circle", "rounded", "overlap", "clipped", "inline"])("reviews a %s target whose bounding box cannot prove the hit region", (reason) => {
    const { graph, root, target } = targetGraph();
    if (reason === "circle") target.type = "ELLIPSE";
    if (reason === "rounded") target.cornerRadius = 12;
    if (reason === "overlap") graph.nodes.neighbor = node({ id: "neighbor", hasPointerInteraction: true, absoluteBounds: { x: 12, y: 0, width: 24, height: 24 } });
    if (reason === "clipped") { root.clipsContent = true; root.absoluteBounds = { x: 0, y: 0, width: 12, height: 12 }; }
    if (reason === "inline") target.type = "TEXT";
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "needs-review", scoreImpact: false });
  });

  it("accepts a rounded target with an evidenced central 24×24 square", () => {
    const { graph, root, target } = targetGraph();
    target.absoluteBounds = { x: 0, y: 0, width: 48, height: 48 };
    target.cornerRadius = 6;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "pass" });
  });

  it("does not grant a spacing exception after an unreadable neighboring interaction", () => {
    const { graph, root, target } = targetGraph();
    target.absoluteBounds = { x: 0, y: 0, width: 20, height: 20 };
    delete root.hasPointerInteraction;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "needs-review", scoreImpact: false });
  });

  it("reviews incomplete context, unknown geometry, and definition placement", () => {
    const { graph, root, target } = targetGraph();
    target.absoluteBounds = { x: 0, y: 0, width: 20, height: 20 };
    graph.complete = false;
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "needs-review", scoreImpact: false });
    graph.complete = true;
    target.type = "COMPONENT";
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "needs-review", scoreImpact: false });
  });

  it("does not invent a white background in the calculation or snapshot rule", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, { r: 1, g: 1, b: 1, a: 0.5 })).toBeNaN();
    const { graph, root } = targetGraph();
    const text = graph.nodes["text:1"]!;
    delete text.text!.backgroundColor;
    text.text!.backgroundResolvable = true;
    expect(evaluateAccessibilityRules(graph, root, [root, text]).find((finding) => finding.ruleId === "accessibility.text-contrast")).toMatchObject({ status: "needs-review", scoreImpact: false });
    expect(evaluateAccessibilityRules(graph, root, [root, text]).find((finding) => finding.ruleId === "accessibility.contrast-unresolved")).toBeDefined();
  });
});

describe("target rendering and definition scope", () => {
  it("excludes descendants hidden by an ancestor", () => {
    const { graph, root, target } = targetGraph();
    root.visible = false;
    expect(evaluateAccessibilityRules(graph, root, [root, target, graph.nodes["text:1"]!]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "not-applicable" });
    expect(evaluateAccessibilityRules(graph, root, [root, target, graph.nodes["text:1"]!]).find((finding) => finding.ruleId === "accessibility.text-contrast")).toMatchObject({ status: "not-applicable" });
  });

  it("does not claim consumer spacing for a target inside a component definition", () => {
    const { graph, root, target } = targetGraph();
    root.type = "COMPONENT";
    target.absoluteBounds = { x: 0, y: 0, width: 20, height: 20 };
    expect(evaluateAccessibilityRules(graph, root, [root, target]).find((finding) => finding.ruleId === "accessibility.target-minimum")).toMatchObject({ status: "needs-review", scoreImpact: false });
  });
});

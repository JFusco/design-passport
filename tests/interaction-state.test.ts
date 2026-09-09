import { describe, expect, it } from "vitest";
import { evaluateAccessibilityRules } from "../src/core/rules/accessibility";
import {
  hasInactiveVariantState,
  isWithinInactiveComponent,
  variantProperties,
} from "../src/core/operations/interaction-state";
import { healthyGraph, node } from "./fixtures";

describe("component interaction state", () => {
  it("parses Figma variant assignments without treating prose as state", () => {
    expect([...variantProperties("Variant=Primary, Size=Large, Disabled=True")]).toEqual([
      ["variant", "primary"],
      ["size", "large"],
      ["disabled", "true"],
    ]);
    expect(hasInactiveVariantState("Variant=Primary, Disabled=True")).toBe(true);
    expect(hasInactiveVariantState("state=disabled, size=small")).toBe(true);
    expect(hasInactiveVariantState("state=Disabled off")).toBe(true);
    expect(hasInactiveVariantState("status=Unavailable-item")).toBe(true);
    expect(hasInactiveVariantState("isEnabled=false")).toBe(true);
    expect(hasInactiveVariantState("Disabled button guidance")).toBe(false);
    expect(hasInactiveVariantState("Disabled=False, State=Default")).toBe(false);
  });

  it("inherits inactive state only from a component-like ancestor", () => {
    const graph = healthyGraph();
    graph.nodes["variant:disabled"] = node({
      id: "variant:disabled",
      rootId: "root:desktop",
      parentId: "root:desktop",
      type: "COMPONENT",
      name: "Variant=Primary, Disabled=True",
      childIds: ["disabled:label"],
    });
    graph.nodes["disabled:label"] = node({
      id: "disabled:label",
      rootId: "root:desktop",
      parentId: "variant:disabled",
      type: "TEXT",
      name: "label",
    });
    graph.nodes["prose:label"] = node({
      id: "prose:label",
      rootId: "root:desktop",
      parentId: "root:desktop",
      type: "TEXT",
      name: "Disabled=True example",
    });

    expect(isWithinInactiveComponent(graph, graph.nodes["disabled:label"]!)).toBe(true);
    expect(isWithinInactiveComponent(graph, graph.nodes["prose:label"]!)).toBe(false);
  });

  it("uses structured variant properties for placed instances", () => {
    const graph = healthyGraph();
    graph.nodes["instance:disabled"] = node({
      id: "instance:disabled",
      rootId: "root:desktop",
      parentId: "root:desktop",
      type: "INSTANCE",
      name: "Button",
      variantProperties: { Variant: "Primary", Disabled: "True" },
      childIds: ["instance:label"],
    });
    graph.nodes["instance:label"] = node({
      id: "instance:label",
      rootId: "root:desktop",
      parentId: "instance:disabled",
      type: "TEXT",
      name: "label",
    });

    expect(isWithinInactiveComponent(graph, graph.nodes["instance:label"]!)).toBe(true);
  });

  it("exempts inactive-control text while retaining active contrast failures", () => {
    const graph = healthyGraph();
    const failingText = {
      charactersLength: 6,
      contentHash: "low-contrast",
      fontSize: 16,
      fontWeight: 400,
      textColor: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
      backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
      backgroundResolvable: true,
    };
    graph.nodes["root:desktop"]!.childIds.push("variant:disabled", "active:label");
    graph.nodes["variant:disabled"] = node({
      id: "variant:disabled",
      rootId: "root:desktop",
      parentId: "root:desktop",
      type: "COMPONENT",
      name: "Variant=Primary, Size=Large, Disabled=True",
      childIds: ["disabled:label"],
    });
    graph.nodes["disabled:label"] = node({
      id: "disabled:label",
      rootId: "root:desktop",
      parentId: "variant:disabled",
      type: "TEXT",
      name: "label",
      text: failingText,
    });
    graph.nodes["active:label"] = node({
      id: "active:label",
      rootId: "root:desktop",
      parentId: "root:desktop",
      type: "TEXT",
      name: "label",
      text: failingText,
    });

    const findings = evaluateAccessibilityRules(graph, graph.nodes["root:desktop"]!, [
      graph.nodes["root:desktop"]!,
      graph.nodes["variant:disabled"]!,
      graph.nodes["disabled:label"]!,
      graph.nodes["active:label"]!,
    ]);
    const nodeFailures = findings.filter((finding) => finding.ruleId === "accessibility.text-contrast-node");
    expect(nodeFailures.map((finding) => finding.nodeId)).toEqual(["active:label"]);
    expect(findings.find((finding) => finding.ruleId === "accessibility.text-contrast")).toMatchObject({
      status: "fail",
      evidence: { measured: { textNodeCount: 2, activeTextNodeCount: 1, inactiveTextNodeCount: 1, failures: 1 } },
    });
  });
});

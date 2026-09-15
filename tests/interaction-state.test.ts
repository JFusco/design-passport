import { describe, expect, it } from "vitest";
import { evaluateAccessibilityRules } from "../src/core/rules/accessibility";
import {
  hasInactiveVariantState,
  isWithinInactiveComponent,
  interactionState,
  variantProperties,
} from "../src/core/operations/interaction-state";
import { interactionPropertiesSnapshot } from "../src/figma/operations/interaction-state";
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
    expect(hasInactiveVariantState("status=Unavailable-item")).toBe(false);
    expect(hasInactiveVariantState("State=Inactive")).toBe(false);
    expect(hasInactiveVariantState("Selected=False, Checked=False")).toBe(false);
    expect(hasInactiveVariantState("Disabled=true, Enabled=true")).toBe(false);
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

describe("captured Boolean control evidence", () => {
  it("takes actual Figma Boolean values into the disabled rule", () => {
    const graph = healthyGraph();
    const properties = interactionPropertiesSnapshot({
      type: "INSTANCE",
      componentProperties: { "Disabled#12:4": { type: "BOOLEAN", value: true }, "State": { type: "VARIANT", value: "Default" }, "Label#9:1": { type: "TEXT", value: "Disabled=false" } },
    } as unknown as SceneNode);
    graph.nodes.control = node({ id: "control", type: "INSTANCE", interactionProperties: properties });
    expect(properties).toEqual({ "Disabled#12:4": "true", State: "Default" });
    expect(interactionState(graph, graph.nodes.control!)).toEqual({ state: "disabled", evidence: [{ nodeId: "control", property: "disabled", value: "true", disabled: true }] });
  });

  it("does not read forbidden variant property definitions", () => {
    const variant = { type: "COMPONENT", parent: { type: "COMPONENT_SET" }, variantProperties: { State: "Disabled" }, get componentPropertyDefinitions() { throw new Error("Cannot access variant property definitions"); } } as unknown as SceneNode;
    expect(interactionPropertiesSnapshot(variant)).toEqual({ State: "Disabled" });
  });

  it("reviews conflicting state instead of failing or exempting contrast", () => {
    const graph = healthyGraph();
    const root = graph.nodes["root:desktop"]!;
    root.type = "INSTANCE";
    root.interactionProperties = { Disabled: "true", Enabled: "true" };
    const text = graph.nodes["text:1"]!;
    text.text!.textColor = { r: 1, g: 1, b: 1, a: 1 };
    const findings = evaluateAccessibilityRules(graph, root, [root, text]);
    expect(findings.find((finding) => finding.ruleId === "accessibility.text-contrast")).toMatchObject({ status: "needs-review", scoreImpact: false });
    expect(findings.find((finding) => finding.ruleId === "accessibility.contrast-unresolved")).toMatchObject({ evidence: { measured: { interactionState: "conflicting" } } });
    expect(findings.some((finding) => finding.ruleId === "accessibility.contrast-disabled")).toBe(false);
  });

  it.each(["Inactive", "Unavailable", "Unselected", "Unchecked"])("continues to evaluate %s controls", (state) => {
    const graph = healthyGraph();
    const root = graph.nodes["root:desktop"]!;
    root.type = "INSTANCE";
    root.interactionProperties = { State: state };
    const text = graph.nodes["text:1"]!;
    text.text!.textColor = { r: 1, g: 1, b: 1, a: 1 };
    expect(evaluateAccessibilityRules(graph, root, [root, text]).find((finding) => finding.ruleId === "accessibility.text-contrast")).toMatchObject({ status: "fail", scoreImpact: true });
  });
});

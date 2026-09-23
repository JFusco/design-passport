import { describe, expect, it } from "vitest";
import { finalizeKnowledgeGraph } from "../src/core/knowledge";
import { evaluateComponentRules } from "../src/core/rules/component";
import { healthyGraph, node, profile } from "./fixtures";

function componentDescriptionFinding(nodes: ReturnType<typeof node>[]) {
  const source = healthyGraph(profile());
  const graph = finalizeKnowledgeGraph({
    ...source,
    nodes: Object.fromEntries(nodes.map((item) => [item.id, item])),
    componentIds: nodes.filter((item) => item.component).map((item) => item.id),
    instanceIds: [],
    sourceFrameIds: ["root:desktop"],
  }, profile());
  const root = graph.nodes["root:desktop"]!;
  return evaluateComponentRules(graph, root, Object.values(graph.nodes))
    .find((finding) => finding.ruleId === "component.description");
}

describe("component description rule", () => {
  it("inherits descriptions from a described component set for its variants", () => {
    const root = node({ id: "root:desktop", rootId: "root:desktop", childIds: ["set:button"] });
    const componentSet = node({
      id: "set:button",
      rootId: root.id,
      parentId: root.id,
      type: "COMPONENT_SET",
      name: "Button",
      childIds: ["variant:primary", "variant:secondary"],
      component: { kind: "component-set", descriptionLength: 24, documentationLinkCount: 0, propertyDefinitions: [] },
    });
    const primary = node({
      id: "variant:primary",
      rootId: root.id,
      parentId: componentSet.id,
      type: "COMPONENT",
      name: "variant=primary",
      component: { kind: "component", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });
    const secondary = node({
      id: "variant:secondary",
      rootId: root.id,
      parentId: componentSet.id,
      type: "COMPONENT",
      name: "variant=secondary",
      component: { kind: "component", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });

    expect(componentDescriptionFinding([root, componentSet, primary, secondary])).toMatchObject({
      status: "pass",
      evidence: { measured: { componentCount: 3, undescribedCount: 0 } },
    });
  });

  it("does not inherit documentation from an undocumented component set", () => {
    const root = node({ id: "root:desktop", rootId: "root:desktop", childIds: ["set:button"] });
    const componentSet = node({
      id: "set:button",
      rootId: root.id,
      parentId: root.id,
      type: "COMPONENT_SET",
      childIds: ["variant:primary"],
      component: { kind: "component-set", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });
    const primary = node({
      id: "variant:primary",
      rootId: root.id,
      parentId: componentSet.id,
      type: "COMPONENT",
      component: { kind: "component", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });

    expect(componentDescriptionFinding([root, componentSet, primary])).toMatchObject({
      status: "fail",
      evidence: { measured: { componentCount: 2, undescribedCount: 2 } },
    });
  });

  it("keeps standalone undocumented components accountable", () => {
    const root = node({ id: "root:desktop", rootId: "root:desktop", childIds: ["component:button"] });
    const standalone = node({
      id: "component:button",
      rootId: root.id,
      parentId: root.id,
      type: "COMPONENT",
      component: { kind: "component", descriptionLength: 0, documentationLinkCount: 0, propertyDefinitions: [] },
    });

    expect(componentDescriptionFinding([root, standalone])).toMatchObject({
      status: "fail",
      evidence: { measured: { componentCount: 1, undescribedCount: 1 } },
    });
  });
});

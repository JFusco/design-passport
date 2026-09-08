import type { DesignKnowledgeGraph, Finding, NodeSnapshot } from "../contracts";
import { createFinding } from "./finding";

function hasDocumentation(node: NodeSnapshot): boolean {
  return (node.component?.descriptionLength ?? 0) > 0
    || (node.component?.documentationLinkCount ?? 0) > 0;
}

function inheritsComponentSetDocumentation(node: NodeSnapshot, nodesById: ReadonlyMap<string, NodeSnapshot>): boolean {
  if (node.component?.kind !== "component" || !node.parentId) return false;
  const parent = nodesById.get(node.parentId);
  return parent?.component?.kind === "component-set" && hasDocumentation(parent);
}

function isDocumentedComponent(node: NodeSnapshot, nodesById: ReadonlyMap<string, NodeSnapshot>): boolean {
  return hasDocumentation(node) || inheritsComponentSetDocumentation(node, nodesById);
}

export function evaluateComponentRules(
  graph: DesignKnowledgeGraph,
  root: NodeSnapshot,
  nodes: NodeSnapshot[],
): Finding[] {
  const output: Finding[] = [];
  const instances = nodes.filter((node) => node.instance);
  const detached = instances.filter((node) => node.instance?.detached);
  output.push(createFinding(
    "component.instances-attached",
    "component-hygiene",
    4,
    root,
    detached[0] ?? root,
    detached.length === 0 ? "pass" : "fail",
    "Attached component instances",
    detached.length === 0
      ? "No detached instances were measured."
      : `${detached.length} detached instances weaken source traceability.`,
    { instanceCount: instances.length, detachedCount: detached.length },
  ));
  const components = nodes.filter((node) => node.component);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const undocumented = components.filter((node) => !isDocumentedComponent(node, nodesById));
  output.push(createFinding(
    "component.documentation",
    "component-hygiene",
    2,
    root,
    undocumented[0] ?? root,
    components.length === 0 ? "not-applicable" : undocumented.length === 0 ? "pass" : "fail",
    "Component documentation",
    components.length === 0
      ? "No component definitions are in this target."
      : undocumented.length === 0
        ? "Every component has a description or documentation link."
        : `${undocumented.length} of ${components.length} components lack descriptions and documentation links.`,
    { componentCount: components.length, undocumentedCount: undocumented.length },
  ));

  const localNodeIds = new Set(nodes.map((node) => node.id));
  const relatedGroups = graph.repeatedStructureGroups.filter((group) => (
    group.nodeIds.some((id) => localNodeIds.has(id))
  ));
  for (const group of relatedGroups) {
    if (graph.responsiveFamilies.some((family) => group.nodeIds.every((id) => family.memberIds.includes(id)))) {
      continue;
    }
    const candidates = group.nodeIds
      .map((id) => graph.nodes[id])
      .filter((node): node is NodeSnapshot => Boolean(node));
    if (candidates.some((node) => node.component || node.instance)) continue;
    const target = candidates.find((node) => localNodeIds.has(node.id));
    if (!target) continue;
    output.push(createFinding(
      "component.repeated-candidate",
      "component-hygiene",
      2,
      root,
      target,
      "needs-review",
      "Repeated component candidate",
      `${candidates.length} structurally equivalent nodes occur across the file; review them as a component family.`,
      { occurrenceCount: candidates.length, nodeIds: candidates.map((node) => node.id).slice(0, 50) },
      { confidence: 0.75, discriminator: group.signature },
    ));
  }
  return output;
}

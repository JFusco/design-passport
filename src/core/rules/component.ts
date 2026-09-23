import type { DesignKnowledgeGraph, Finding, NodeSnapshot } from "../contracts";
import { bindingCoverage } from "../operations/node-fields";
import { createFinding } from "./finding";

function hasDescription(node: NodeSnapshot): boolean {
  return (node.component?.descriptionLength ?? 0) > 0;
}

function inheritsComponentSetDescription(node: NodeSnapshot, nodesById: ReadonlyMap<string, NodeSnapshot>): boolean {
  if (node.component?.kind !== "component" || !node.parentId) return false;
  const parent = nodesById.get(node.parentId);
  return parent?.component?.kind === "component-set" && hasDescription(parent);
}

function isDescribedComponent(node: NodeSnapshot, nodesById: ReadonlyMap<string, NodeSnapshot>): boolean {
  return hasDescription(node) || inheritsComponentSetDescription(node, nodesById);
}

function subtree(node: NodeSnapshot, nodesById: ReadonlyMap<string, NodeSnapshot>): NodeSnapshot[] {
  const output: NodeSnapshot[] = [];
  const pending = [node.id];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const current = nodesById.get(id);
    if (!current) continue;
    output.push(current);
    pending.push(...current.childIds);
  }
  return output;
}

export function evaluateComponentRules(
  graph: DesignKnowledgeGraph,
  root: NodeSnapshot,
  nodes: NodeSnapshot[],
): Finding[] {
  const output: Finding[] = [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const instances = nodes.filter((node) => node.instance);
  const detached = instances.filter((node) => node.instance?.detached);
  if (detached.length === 0) {
    output.push(createFinding(
      "component.detached-design", "component-hygiene", 2, root, root, "pass",
      "Detached design review", "No detached designs were measured.",
      { instanceCount: instances.length, detachedCount: 0 },
    ));
  }
  for (const node of detached) {
    const authored = subtree(node, nodesById);
    const coverage = bindingCoverage(authored);
    const componentCount = authored.filter((candidate) => Boolean(candidate.component)).length;
    const propertyCount = authored.reduce((sum, candidate) => sum + (candidate.component?.propertyDefinitions.length ?? 0), 0);
    const acknowledged = node.intentionalDetachment?.nodeId === node.id;
    output.push(createFinding(
      "component.detached-design",
      "component-hygiene",
      2,
      root,
      node,
      acknowledged ? "pass" : "needs-review",
      acknowledged ? "Intentional standalone design" : "Detached design needs intent review",
      acknowledged
        ? `“${node.name}” is explicitly acknowledged as an intentional standalone design.`
        : `“${node.name}” is detached. Review its components, properties, notes, and token evidence, then mark it intentional when this is deliberate.`,
      {
        acknowledged,
        acknowledgedAt: node.intentionalDetachment?.acknowledgedAt ?? null,
        componentCount,
        propertyCount,
        hasAnnotations: node.hasAnnotations,
        tokenCoverage: coverage.coverage,
        tokenEligibleCount: coverage.eligible,
      },
      { discriminator: node.id },
    ));
  }
  const components = nodes.filter((node) => node.component);
  const undescribed = components.filter((node) => !isDescribedComponent(node, nodesById));
  output.push(createFinding(
    "component.description",
    "component-hygiene",
    2,
    root,
    undescribed[0] ?? root,
    components.length === 0 ? "not-applicable" : undescribed.length === 0 ? "pass" : "fail",
    "Component description",
    components.length === 0
      ? "No component definitions are in this target."
      : undescribed.length === 0
        ? "Every component has a description, directly or from its component set."
        : `${undescribed.length} of ${components.length} components lack descriptions. External documentation links are not required.`,
    { componentCount: components.length, undescribedCount: undescribed.length },
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

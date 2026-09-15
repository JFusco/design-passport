import type { BindableField, DesignKnowledgeGraph, Finding, FindingGroup, FindingProvenance, NodeSnapshot } from "./contracts";
import { isActionableFinding } from "./finding-policy";
import { propertyBindingEvidence } from "./operations/node-fields";
import { hashValue, stableStringify } from "./stable";

const PROPERTY_BY_RULE: Readonly<Record<string, string>> = {
  "naming.whitespace": "name",
  "naming.pattern-alias": "name",
  "naming.pattern-canonical": "name",
  "naming.pattern-contextual": "name",
  "naming.pattern-novel": "name",
  "pipeline.annotation": "annotations",
  "accessibility.text-contrast-node": "textColor",
  "accessibility.contrast-unresolved": "textColor",
};

function propertyForFinding(finding: Finding): string | undefined {
  const field = finding.evidence.measured.field;
  return typeof field === "string" ? field : PROPERTY_BY_RULE[finding.ruleId];
}

function relatedComponent(graph: DesignKnowledgeGraph, node: NodeSnapshot): string | undefined {
  let current: NodeSnapshot | undefined = node;
  let componentId: string | undefined;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.instance?.mainComponentId) return current.instance.mainComponentId;
    if (current.type === "COMPONENT_SET") return current.id;
    if (current.type === "COMPONENT") componentId = current.id;
    current = current.parentId ? graph.nodes[current.parentId] : undefined;
  }
  return componentId;
}

/** Only documented root correspondence proves inheritance; nested IDs/names are never parsed. */
function inheritedRootSource(graph: DesignKnowledgeGraph, node: NodeSnapshot, property: string): NodeSnapshot | undefined {
  const instance = node.instance;
  if (node.type !== "INSTANCE" || node.owningInstanceId || !instance?.overridesKnown || instance.scaleFactor !== 1
    || !["fills", "strokes", "cornerRadius", "strokeWeight"].includes(property)
    || instance.directOverrideFields?.some((field) => field === property || field === "boundVariables"
      || (property === "fills" && field === "fillStyleId")
      || (property === "strokes" && field === "strokeStyleId")
      || (property === "cornerRadius" && ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"].includes(field))
      || (property === "strokeWeight" && ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"].includes(field)))) return undefined;
  const source = instance.mainComponentId ? graph.nodes[instance.mainComponentId] : undefined;
  if (!source || source.type !== "COMPONENT") return undefined;
  const value = (item: NodeSnapshot) => ({
    value: item[property as "fills" | "strokes" | "cornerRadius" | "strokeWeight"],
    corners: property === "cornerRadius" ? item.cornerRadii : undefined,
    sides: property === "strokeWeight" ? item.strokeWeights : undefined,
    bindings: item.boundVariableIds[property as "fills" | "strokes" | "cornerRadius" | "strokeWeight"],
    opacity: item.opacity,
  });
  return stableStringify(value(node)) === stableStringify(value(source)) ? source : undefined;
}

export function attachFindingProvenance(finding: Finding, graph: DesignKnowledgeGraph): Finding {
  if (finding.provenance) return finding;
  const node = graph.nodes[finding.nodeId];
  if (!node) return finding;
  const property = propertyForFinding(finding);
  const relatedComponentId = relatedComponent(graph, node);
  const contextKey = hashValue({
    rule: finding.ruleId,
    // Different measured backgrounds, modes, values or proposed bindings are different fix conditions.
    measured: finding.evidence.measured,
    suggested: finding.suggestedValue,
    status: finding.status,
    category: finding.category,
  });
  const base: FindingProvenance = {
    kind: node.evidenceRole === "instance-descendant" ? "unknown" : "direct",
    ...(node.owningInstanceId ? { navigationNodeId: node.owningInstanceId } : {}),
    ...(property ? { property } : {}),
    contextKey,
    ...(relatedComponentId ? { relatedComponentId } : {}),
  };
  const inherited = property ? inheritedRootSource(graph, node, property) : undefined;
  if (inherited) {
    return { ...finding, provenance: { ...base, kind: "inherited", sourceNodeId: inherited.id, sourceLabel: inherited.path } };
  }
  const style = node.text?.style;
  if (property && style?.status === "resolved" && style.id && propertyBindingEvidence(node, property as BindableField) !== "variable"
    && style.controlledFields.some((field) => field === property) && !style.overriddenFields.some((field) => field === property)) {
    return { ...finding, provenance: { ...base, kind: "style", sourceStyleId: style.id, sourceLabel: style.name ?? style.id } };
  }
  return {
    ...finding,
    provenance: {
      ...base,
      ...(base.kind === "direct" ? { sourceNodeId: node.id, sourceLabel: node.path } : {}),
    },
  };
}

function group(members: Finding[], kind: FindingGroup["kind"], key: string): FindingGroup {
  const ordered = [...members].sort((left, right) =>
    Number(right.nodeId === right.provenance?.sourceNodeId) - Number(left.nodeId === left.provenance?.sourceNodeId)
    || left.id.localeCompare(right.id));
  const primary = ordered[0]!;
  const source = primary.provenance;
  return {
    id: `issue:${hashValue({ kind, key })}`,
    kind,
    primaryFindingId: primary.id,
    findingIds: ordered.map((finding) => finding.id),
    occurrenceCount: new Set(ordered.map((finding) => finding.nodeId)).size,
    ...(kind === "source" && source?.sourceNodeId ? { sourceNodeId: source.sourceNodeId } : {}),
    ...(kind === "source" && source?.sourceStyleId ? { sourceStyleId: source.sourceStyleId } : {}),
    ...(kind === "source" && source?.sourceLabel ? { sourceLabel: source.sourceLabel } : {}),
    ...(source?.property ? { property: source.property } : {}),
    ...(source?.contextKey ? { contextKey: source.contextKey } : {}),
  };
}

export function buildFindingGroups(findings: readonly Finding[]): FindingGroup[] {
  const sourceGroups = new Map<string, Finding[]>();
  for (const finding of findings.filter(isActionableFinding)) {
    const source = finding.provenance;
    const sourceKey = source?.sourceStyleId ?? source?.sourceNodeId ?? finding.nodeId;
    const key = stableStringify({ rule: finding.ruleId, source: sourceKey, property: source?.property, context: source?.contextKey });
    const members = sourceGroups.get(key) ?? [];
    members.push(finding);
    sourceGroups.set(key, members);
  }
  const output: FindingGroup[] = [];
  const related = new Map<string, Finding[]>();
  for (const [key, members] of sourceGroups) {
    const finding = members[0]!;
    const source = finding.provenance;
    if (members.length === 1 && source?.relatedComponentId && source.property) {
      const relatedKey = stableStringify({ rule: finding.ruleId, property: source.property, component: source.relatedComponentId,
        // Related findings are explicitly not a shared fix; retain distinct values/overrides in each occurrence.
        category: finding.category, status: finding.status });
      const groupMembers = related.get(relatedKey) ?? [];
      groupMembers.push(finding);
      related.set(relatedKey, groupMembers);
    } else output.push(group(members, source?.kind === "unknown" ? "related" : "source", key));
  }
  for (const [key, members] of related) {
    output.push(group(members, members.length > 1 || members[0]!.provenance?.kind === "unknown" ? "related" : "source", key));
  }
  return output.sort((left, right) => left.id.localeCompare(right.id));
}

export function groupsForFindings(findings: readonly Finding[], groups: readonly FindingGroup[] = []): FindingGroup[] {
  const remaining = new Set(findings.map((finding) => finding.id));
  const byId = new Map(findings.map((finding) => [finding.id, finding]));
  const output = groups.flatMap((item) => {
    const findingIds = item.findingIds.filter((id) => remaining.has(id));
    if (findingIds.length === 0) return [];
    findingIds.forEach((id) => remaining.delete(id));
    return [{ ...item, findingIds, primaryFindingId: findingIds.includes(item.primaryFindingId) ? item.primaryFindingId : findingIds[0]!,
      occurrenceCount: new Set(findingIds.map((id) => byId.get(id)!.nodeId)).size }];
  });
  for (const finding of findings) if (remaining.has(finding.id)) output.push({
    id: finding.id, kind: "source", primaryFindingId: finding.id, findingIds: [finding.id], occurrenceCount: 1,
  });
  const order = new Map(findings.map((finding, index) => [finding.id, index]));
  const first = (item: FindingGroup) => item.findingIds.reduce((lowest, id) => Math.min(lowest, order.get(id)!), Infinity);
  return output.sort((a, b) => first(a) - first(b));
}

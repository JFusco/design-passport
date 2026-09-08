import type { DesignKnowledgeGraph, NodeSnapshot, ReadinessProfile, ResponsiveFamily } from "./contracts";
import { hashValue } from "./stable";

export interface ResponsiveName {
  artifact: string;
  breakpoint: string;
  width: number;
}

export function parseResponsiveName(name: string): ResponsiveName | undefined {
  const parts = name.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3) return undefined;
  const width = Number(parts.at(-1));
  const breakpoint = parts.at(-2);
  const artifact = parts.slice(0, -2).join(" / ");
  if (!Number.isFinite(width) || width <= 0 || !breakpoint || !artifact) return undefined;
  return { artifact, breakpoint, width };
}

export function deriveResponsiveFamilies(nodes: Record<string, NodeSnapshot>, profile: ReadinessProfile): ResponsiveFamily[] {
  const candidates = Object.values(nodes).filter((node) => ["FRAME", "COMPONENT", "COMPONENT_SET"].includes(node.type));
  const groups = new Map<string, Array<{ node: NodeSnapshot; parsed: ResponsiveName }>>();
  for (const node of candidates) {
    const parsed = parseResponsiveName(node.name);
    if (!parsed) continue;
    const key = `${node.pageId}:${node.parentId ?? "page"}:${parsed.artifact.toLocaleLowerCase("en-US")}`;
    groups.set(key, [...(groups.get(key) ?? []), { node, parsed }]);
  }
  const breakpointOrder = new Map(profile.breakpoints.map((breakpoint, index) => [breakpoint.name.toLocaleLowerCase("en-US"), index]));
  return [...groups.values()].map((unsortedMembers) => {
    const members = [...unsortedMembers].sort((left, right) => {
      const leftOrder = breakpointOrder.get(left.parsed.breakpoint.toLocaleLowerCase("en-US")) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = breakpointOrder.get(right.parsed.breakpoint.toLocaleLowerCase("en-US")) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || right.parsed.width - left.parsed.width || left.node.id.localeCompare(right.node.id);
    });
    const names = members.map((member) => member.parsed.breakpoint.toLocaleLowerCase("en-US"));
    const widths = members.map((member) => member.parsed.width);
    const pairKeys = members.map((member) => `${member.parsed.breakpoint.toLocaleLowerCase("en-US")}:${member.parsed.width}`);
    const configured = new Map(profile.breakpoints.map((breakpoint) => [breakpoint.name.toLocaleLowerCase("en-US"), breakpoint.width]));
    const hasMislabel = members.some((member) => configured.has(member.parsed.breakpoint.toLocaleLowerCase("en-US"))
      && configured.get(member.parsed.breakpoint.toLocaleLowerCase("en-US")) !== member.parsed.width);
    const contentSignatures = new Set(members.map((member) => member.node.contentSignature).filter(Boolean));
    const bindingSets = members.map((member) => JSON.stringify(bindingSignature(nodes, member.node)));
    return {
      artifact: members[0]?.parsed.artifact ?? "Unknown",
      memberIds: members.map((member) => member.node.id),
      breakpointNames: members.map((member) => member.parsed.breakpoint),
      widths,
      hasCollision: new Set(pairKeys).size !== pairKeys.length || new Set(names).size !== names.length || new Set(widths).size !== widths.length || hasMislabel,
      contentSignaturesMatch: contentSignatures.size <= 1,
      bindingParity: new Set(bindingSets).size <= 1,
    };
  }).sort((left, right) => left.artifact.localeCompare(right.artifact));
}

function normalizedResponsiveRootName(name: string): string {
  const parsed = parseResponsiveName(name);
  return parsed?.artifact ?? name;
}

function bindingSignature(nodes: Record<string, NodeSnapshot>, root: NodeSnapshot): string[] {
  const pending: Array<{ id: string; path: string }> = [{ id: root.id, path: normalizedResponsiveRootName(root.name) }];
  const visited = new Set<string>();
  const signature: string[] = [];
  while (pending.length > 0) {
    const entry = pending.pop();
    if (!entry || visited.has(entry.id)) continue;
    visited.add(entry.id);
    const node = nodes[entry.id];
    if (!node) continue;
    for (const [field, ids] of Object.entries(node.boundVariableIds).sort(([left], [right]) => left.localeCompare(right))) {
      signature.push(`${entry.path}:${field}:${[...(ids ?? [])].sort().join(",")}`);
    }
    node.effects.forEach((effect, index) => {
      signature.push(`${entry.path}:effect:${index}:${effect.boundVariableIds.slice().sort().join(",")}`);
    });
    for (let index = node.childIds.length - 1; index >= 0; index -= 1) {
      const childId = node.childIds[index];
      const child = childId ? nodes[childId] : undefined;
      if (child) pending.push({ id: child.id, path: `${entry.path}/${child.name}` });
    }
  }
  return signature.sort();
}

export function deriveRepeatedStructures(nodes: Record<string, NodeSnapshot>): Array<{ signature: string; nodeIds: string[] }> {
  const groups = new Map<string, string[]>();
  for (const node of Object.values(nodes)) {
    if (!node.structuralSignature || !["FRAME", "GROUP", "COMPONENT"].includes(node.type)) continue;
    groups.set(node.structuralSignature, [...(groups.get(node.structuralSignature) ?? []), node.id]);
  }
  return [...groups.entries()]
    .filter(([, nodeIds]) => nodeIds.length >= 3)
    .map(([signature, nodeIds]) => ({ signature, nodeIds }))
    .sort((left, right) => right.nodeIds.length - left.nodeIds.length || left.signature.localeCompare(right.signature));
}

export function finalizeKnowledgeGraph(graph: Omit<DesignKnowledgeGraph, "responsiveFamilies" | "repeatedStructureGroups" | "snapshotHash">, profile: ReadinessProfile): DesignKnowledgeGraph {
  const responsiveFamilies = deriveResponsiveFamilies(graph.nodes, profile);
  const repeatedStructureGroups = deriveRepeatedStructures(graph.nodes);
  const snapshotMaterial = {
    complete: graph.complete,
    profile,
    pages: graph.pages.map(({ id, name, role, loaded, nodeCount, rootNodeIds }) => ({ id, name, role, loaded, nodeCount, rootNodeIds })),
    nodes: Object.values(graph.nodes).map((node) => ({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      type: node.type,
      width: node.width,
      height: node.height,
      x: node.x,
      y: node.y,
      opacity: node.opacity,
      rotation: node.rotation,
      childIds: node.childIds,
      boundFields: node.boundFields,
      boundVariableIds: node.boundVariableIds,
      inferredBindings: node.inferredBindings,
      fills: node.fills,
      strokes: node.strokes,
      effects: node.effects,
      cornerRadius: node.cornerRadius,
      strokeWeight: node.strokeWeight,
      layout: node.layout,
      text: node.text,
      component: node.component,
      instance: node.instance,
      hasAnnotations: node.hasAnnotations,
      devResourceCount: node.devResourceCount,
      exportSettings: node.exportSettings,
      contentSignature: node.contentSignature,
      confirmedPattern: node.confirmedPattern,
    })).sort((left, right) => left.id.localeCompare(right.id)),
    variables: graph.variables.map(({ id, key, name, collectionKey, type, remote, evidenceLevel, semantic, aliased, scopes, modeNames, webSyntax }) => ({ id, key, name, collectionKey, type, remote, evidenceLevel, semantic, aliased, scopes, modeNames, webSyntax }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    componentIds: graph.componentIds.slice().sort(),
    instanceIds: graph.instanceIds.slice().sort(),
    sourceFrameIds: graph.sourceFrameIds.slice().sort(),
    codeConnect: graph.codeConnect,
  };
  return { ...graph, responsiveFamilies, repeatedStructureGroups, snapshotHash: hashValue(snapshotMaterial) };
}

export function replaceCodeConnectEvidence(graph: DesignKnowledgeGraph, codeConnect: DesignKnowledgeGraph["codeConnect"], profile: ReadinessProfile): DesignKnowledgeGraph {
  const { responsiveFamilies: _responsive, repeatedStructureGroups: _repeated, snapshotHash: _snapshotHash, ...base } = graph;
  return finalizeKnowledgeGraph({ ...base, codeConnect }, profile);
}

export function isKnowledgeFresh(graph: DesignKnowledgeGraph, now = Date.now(), maximumAgeMs = 15 * 60 * 1000): boolean {
  const builtAt = Date.parse(graph.builtAt);
  return maximumAgeMs >= 0
    && graph.complete
    && !graph.cancelled
    && graph.loadedPageCount === graph.pageCount
    && Number.isFinite(builtAt)
    && builtAt <= now
    && now - builtAt <= maximumAgeMs;
}

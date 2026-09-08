import { resolvePattern } from "../core/catalog";
import type { DesignKnowledgeGraph } from "../core/contracts";
import type { KnowledgeSummary } from "./messages";

export function buildKnowledgeSummary(value: DesignKnowledgeGraph): KnowledgeSummary {
  const inventory = new Map<string, { label: string; kind: string; definitions: number; instances: number }>();
  const addPattern = (name: string, field: "definitions" | "instances", confirmedName?: string) => {
    const resolution = resolvePattern(name);
    const label = confirmedName ?? resolution.canonicalName ?? (resolution.candidates?.join(" / ") || name.split("/")[0]?.trim() || "Unnamed");
    const kind = confirmedName ? "confirmed" : resolution.kind;
    const key = `${kind}:${label.toLocaleLowerCase("en-US")}`;
    const current = inventory.get(key) ?? { label, kind, definitions: 0, instances: 0 };
    current[field] += 1;
    inventory.set(key, current);
  };
  for (const node of Object.values(value.nodes)) {
    if (node.component) addPattern(node.name, "definitions", node.confirmedPattern?.canonicalName);
    if (node.instance?.mainComponentName) addPattern(node.instance.mainComponentName, "instances", value.nodes[node.instance.mainComponentId ?? ""]?.confirmedPattern?.canonicalName);
  }
  const tokenCollections = new Map<string, { name: string; remote: boolean; variableCount: number }>();
  for (const variable of value.variables) {
    const key = `${variable.remote}:${variable.collectionKey}`;
    const current = tokenCollections.get(key) ?? { name: variable.collectionName, remote: variable.remote, variableCount: 0 };
    current.variableCount += 1;
    tokenCollections.set(key, current);
  }
  return {
    complete: value.complete,
    cancelled: value.cancelled,
    builtAt: value.builtAt,
    snapshotHash: value.snapshotHash,
    pageCount: value.pageCount,
    loadedPageCount: value.loadedPageCount,
    nodeCount: Object.keys(value.nodes).length,
    componentCount: value.componentIds.length,
    instanceCount: value.instanceIds.length,
    responsiveFamilyCount: value.responsiveFamilies.length,
    repeatedStructureGroupCount: value.repeatedStructureGroups.length,
    sourceFrameCount: value.sourceFrameIds.length,
    pages: value.pages.map((page) => ({ id: page.id, name: page.name, role: page.role, nodeCount: page.nodeCount })),
    patternInventory: [...inventory.values()].sort((left, right) => (right.definitions + right.instances) - (left.definitions + left.instances) || left.label.localeCompare(right.label)),
    responsiveFamilies: value.responsiveFamilies.map((family) => ({ artifact: family.artifact, breakpointNames: family.breakpointNames, widths: family.widths, hasCollision: family.hasCollision })),
    repeatedStructures: value.repeatedStructureGroups.slice(0, 50).map((group) => ({ signature: group.signature, occurrenceCount: group.nodeIds.length })),
    tokenCollections: [...tokenCollections.values()].sort((left, right) => Number(left.remote) - Number(right.remote) || left.name.localeCompare(right.name)),
  };
}

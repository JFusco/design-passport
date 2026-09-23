import type { DesignKnowledgeGraph, NodeSnapshot, PageSnapshot, ReadinessProfile, ScanScope } from "../contracts";
import { hashValue } from "../stable";

export const AUDIT_TARGET_NODE_TYPES = ["FRAME", "COMPONENT", "COMPONENT_SET"] as const;

export type AuditTargetNodeType = typeof AUDIT_TARGET_NODE_TYPES[number];

export function isAuditTargetNodeType(type: string): type is AuditTargetNodeType {
  return AUDIT_TARGET_NODE_TYPES.some((candidate) => candidate === type);
}

export function collectDescendants(graph: Pick<DesignKnowledgeGraph, "nodes">, rootId: string): NodeSnapshot[] {
  const output: NodeSnapshot[] = [];
  const pending = [rootId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || visited.has(id)) continue;
    visited.add(id);
    const node = graph.nodes[id];
    if (!node) continue;
    output.push(node);
    pending.push(...node.childIds.slice().reverse());
  }
  return output;
}

function postOrder(nodes: Record<string, NodeSnapshot>): NodeSnapshot[] {
  const state = new Map<string, "visiting" | "done">();
  const output: NodeSnapshot[] = [];
  for (const startId of Object.keys(nodes).sort()) {
    if (state.get(startId) === "done") continue;
    const stack: Array<{ id: string; expanded: boolean }> = [{ id: startId, expanded: false }];
    while (stack.length > 0) {
      const entry = stack.pop();
      if (!entry) continue;
      const node = nodes[entry.id];
      if (!node || state.get(entry.id) === "done") continue;
      if (entry.expanded) {
        state.set(entry.id, "done");
        output.push(node);
        continue;
      }
      if (state.get(entry.id) === "visiting") throw new Error(`Cycle detected in design graph at ${entry.id}`);
      state.set(entry.id, "visiting");
      stack.push({ id: entry.id, expanded: true });
      for (let index = node.childIds.length - 1; index >= 0; index -= 1) {
        const childId = node.childIds[index];
        if (!childId || !nodes[childId]) continue;
        if (state.get(childId) === "visiting") throw new Error(`Cycle detected in design graph at ${childId}`);
        if (state.get(childId) !== "done") stack.push({ id: childId, expanded: false });
      }
    }
  }
  return output;
}

export function populateGraphMetrics(nodes: Record<string, NodeSnapshot>): void {
  const descendantCounts = new Map<string, number>();
  const contentSignatures = new Map<string, string>();
  for (const node of postOrder(nodes)) {
    node.descendantCount = node.childIds.reduce((sum, childId) => sum + (nodes[childId] ? 1 + (descendantCounts.get(childId) ?? 0) : 0), 0);
    descendantCounts.set(node.id, node.descendantCount);
    node.contentSignature = hashValue({
      type: node.type,
      name: node.name.replace(/\s*\/\s*[^/]+\s*\/\s*\d+(?:\.\d+)?\s*$/i, ""),
      text: node.text?.contentHash,
      children: node.childIds.filter((id) => nodes[id]?.evidenceRole !== "instance-descendant").map((id) => contentSignatures.get(id) ?? "missing"),
    });
    contentSignatures.set(node.id, node.contentSignature);
  }
}

export function sourceFrameIds(
  graph: { pages: PageSnapshot[]; nodes: Record<string, NodeSnapshot> },
  profile: ReadinessProfile,
): string[] {
  const screenPages = new Set(profile.pageRoles.screens.pageIds);
  const foundationPages = new Set(profile.pageRoles.foundations.pageIds);
  const libraryPages = new Set([
    ...profile.pageRoles.components.pageIds,
    ...(profile.artifactKind === "library" ? profile.pageRoles.foundations.pageIds : []),
  ]);
  return Object.values(graph.nodes)
    .filter((node) => {
      if (node.evidenceRole === "instance-descendant") return false;
      const parent = graph.nodes[node.parentId ?? ""];
      const topLevel = !parent || (parent.type === "SECTION" && !graph.nodes[parent.parentId ?? ""]);
      if (screenPages.has(node.pageId)) return topLevel && ["FRAME", "COMPONENT", "COMPONENT_SET"].includes(node.type);
      if (!libraryPages.has(node.pageId)) return false;
      if (node.type === "COMPONENT_SET") return true;
      if (node.type === "COMPONENT") return parent?.type !== "COMPONENT_SET";
      if (!topLevel || node.type !== "FRAME") return false;
      if (foundationPages.has(node.pageId)) return true;
      // Component-page frames are documentation scaffolding. They can be
      // audited only through an explicit marked-wrapper selection.
      return false;
    })
    .map((node) => node.id)
    .sort();
}

export function targetRootIds(
  scope: ScanScope,
  graph: DesignKnowledgeGraph,
  currentPageId: string,
  selectionIds: readonly string[],
): string[] {
  return resolveTargetRoots(scope, graph, currentPageId, selectionIds).rootIds;
}

export interface TargetRootResolution {
  rootIds: string[];
  mode: "exact" | "component-sources";
  requestedNodeIds: string[];
  excludedNodeIds: string[];
}

function nestedComponentSources(graph: DesignKnowledgeGraph, wrapperId: string): string[] {
  const descendants = collectDescendants(graph, wrapperId).filter((node) => node.id !== wrapperId);
  const sourceIds = new Set(descendants.filter((node) => node.type === "COMPONENT_SET"
    || node.type === "COMPONENT" && graph.nodes[node.parentId ?? ""]?.type !== "COMPONENT_SET").map((node) => node.id));
  return [...sourceIds].filter((id) => {
    let parentId = graph.nodes[id]?.parentId;
    while (parentId && parentId !== wrapperId) {
      if (sourceIds.has(parentId)) return false;
      parentId = graph.nodes[parentId]?.parentId;
    }
    return true;
  }).sort();
}

export function resolveTargetRoots(
  scope: ScanScope,
  graph: DesignKnowledgeGraph,
  currentPageId: string,
  selectionIds: readonly string[],
): TargetRootResolution {
  if (scope === "selection") {
    const requestedNodeIds = [...new Set(selectionIds)];
    const rootIds = requestedNodeIds.flatMap((id) => {
      const node = graph.nodes[id];
      if (!node || !isAuditTargetNodeType(node.type)) return [];
      const page = graph.pages.find((candidate) => candidate.id === node.pageId);
      if (page?.role !== "components" || node.type !== "FRAME" || node.sourceMarked) return [id];
      return nestedComponentSources(graph, id);
    });
    const uniqueRoots = [...new Set(rootIds)];
    const excludedNodeIds = requestedNodeIds.filter((id) => !uniqueRoots.includes(id));
    return { rootIds: uniqueRoots, mode: excludedNodeIds.length > 0 ? "component-sources" : "exact", requestedNodeIds, excludedNodeIds };
  }
  if (scope === "file") return { rootIds: [...new Set(graph.sourceFrameIds)], mode: "exact", requestedNodeIds: [], excludedNodeIds: [] };
  const page = graph.pages.find((candidate) => candidate.id === currentPageId);
  const rootIds = page?.role === "components"
    ? graph.sourceFrameIds.filter((id) => graph.nodes[id]?.pageId === currentPageId)
    : (page?.rootNodeIds ?? []).flatMap((id) => {
    const node = graph.nodes[id];
    if (!node) return [];
    if (isAuditTargetNodeType(node.type)) return [id];
    if (node.type === "SECTION") return node.childIds.filter((childId) => {
      const child = graph.nodes[childId];
      return child && isAuditTargetNodeType(child.type);
    });
    return [];
  });
  return { rootIds: [...new Set(rootIds)], mode: "exact", requestedNodeIds: [], excludedNodeIds: [] };
}

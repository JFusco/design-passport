import type { DesignKnowledgeGraph, NodeSnapshot, PageSnapshot, ReadinessProfile, ScanScope } from "../contracts";
import { hashValue } from "../stable";

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
      children: node.childIds.map((id) => contentSignatures.get(id) ?? "missing"),
    });
    contentSignatures.set(node.id, node.contentSignature);
  }
}

export function sourceFrameIds(
  graph: { pages: PageSnapshot[]; nodes: Record<string, NodeSnapshot> },
  profile: ReadinessProfile,
): string[] {
  const screenPages = new Set(profile.pageRoles.screens.pageIds);
  const libraryPages = new Set([
    ...profile.pageRoles.components.pageIds,
    ...(profile.artifactKind === "library" ? profile.pageRoles.foundations.pageIds : []),
  ]);
  return Object.values(graph.nodes)
    .filter((node) => {
      const parent = graph.nodes[node.parentId ?? ""];
      const topLevel = !parent || (parent.type === "SECTION" && !graph.nodes[parent.parentId ?? ""]);
      if (screenPages.has(node.pageId)) return topLevel && ["FRAME", "COMPONENT", "COMPONENT_SET"].includes(node.type);
      if (!libraryPages.has(node.pageId)) return false;
      if (node.type === "COMPONENT_SET") return true;
      if (node.type === "COMPONENT") return parent?.type !== "COMPONENT_SET";
      return topLevel && node.type === "FRAME";
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
  if (scope === "selection") return [...new Set(selectionIds)].filter((id) => Boolean(graph.nodes[id]));
  if (scope === "file") return [...new Set(graph.sourceFrameIds)];
  const page = graph.pages.find((candidate) => candidate.id === currentPageId);
  return [...new Set((page?.rootNodeIds ?? []).flatMap((id) => {
    const node = graph.nodes[id];
    if (!node) return [];
    if (["FRAME", "COMPONENT", "COMPONENT_SET"].includes(node.type)) return [id];
    if (node.type === "SECTION") return node.childIds.filter((childId) => {
      const child = graph.nodes[childId];
      return child && ["FRAME", "COMPONENT", "COMPONENT_SET"].includes(child.type);
    });
    return [];
  }))];
}

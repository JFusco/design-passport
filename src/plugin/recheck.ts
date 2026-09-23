import type { DesignKnowledgeGraph, Finding, ReadinessReport } from "../core/contracts";
import type { AuditRecheckRequest } from "./messages";

interface RecheckFindings {
  request: AuditRecheckRequest;
  findingIds: string[];
  nodeIds?: string[];
}

function actionable(finding: Finding): boolean {
  return finding.status !== "pass" && finding.status !== "not-applicable" && finding.status !== "waived";
}

/** Capture counters from the displayed report; never accept arbitrary canvas IDs. */
export function captureRecheckFindings(
  request: AuditRecheckRequest,
  report: ReadinessReport | undefined,
  graph: DesignKnowledgeGraph | undefined,
  historical: boolean,
): RecheckFindings {
  if (!report) throw new Error("Run an audit before rechecking its findings");
  const current = report.findings.filter(actionable);
  if (request.mode === "changes" || request.mode === "full") return { request, findingIds: current.map((finding) => finding.id) };
  if (historical) throw new Error("Refresh this saved historical audit before rechecking an individual component or issue");
  if (request.mode === "issue") {
    const group = report.issueGroups?.find((candidate) => candidate.id === request.issueId);
    const findingIds = group?.findingIds ?? (report.findings.some((finding) => finding.id === request.issueId) ? [request.issueId] : undefined);
    if (!findingIds) throw new Error("This issue is stale or does not belong to the displayed audit");
    return { request, findingIds: current.filter((finding) => findingIds.includes(finding.id)).map((finding) => finding.id) };
  }
  const component = graph?.nodes[request.componentId];
  const displayedModule = report.frames.some((frame) => frame.rootId === request.componentId)
    || component?.type === "COMPONENT" || component?.type === "COMPONENT_SET";
  const withinAuditTarget = (id: string): boolean => {
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current && !seen.has(current)) {
      if (report.target.rootIds.includes(current)) return true;
      seen.add(current);
      current = graph?.nodes[current]?.parentId;
    }
    return false;
  };
  if (!component || !displayedModule
    || !withinAuditTarget(component.id)) throw new Error("This module is stale or does not belong to the displayed audit");
  const nodeIds = new Set<string>();
  const pending = [component.id];
  while (pending.length) {
    const id = pending.pop()!;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);
    pending.push(...graph?.nodes[id]?.childIds ?? []);
  }
  return { request, nodeIds: [...nodeIds], findingIds: current.filter((finding) => nodeIds.has(finding.nodeId)).map((finding) => finding.id) };
}

export function recheckCounts(captured: RecheckFindings, report: ReadinessReport): { resolvedCount: number; remainingCount: number } {
  const current = report.findings.filter(actionable);
  const currentIds = new Set(current.map((finding) => finding.id));
  const resolvedCount = captured.findingIds.filter((id) => !currentIds.has(id)).length;
  const remainingCount = captured.request.mode === "issue"
    ? captured.findingIds.filter((id) => currentIds.has(id)).length
    : captured.request.mode === "component"
      ? current.filter((finding) => captured.nodeIds?.includes(finding.nodeId)).length
      : current.length;
  return { resolvedCount, remainingCount };
}

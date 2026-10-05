import { buildLearningEnvelope } from "../../src/core/knowledge-loop";
import { buildReadinessReport } from "../../src/core/report";
import { evaluateRules } from "../../src/core/rules";
import { hashValue } from "../../src/core/stable";
import { healthyGraph, profile } from "../fixtures";
export function auditFixture(identity = "base") {
  const p = profile(); const graph = healthyGraph(p);
  graph.snapshotHash = hashValue(`snapshot:${identity}`);
  return buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"], findings: evaluateRules(graph, p, ["root:desktop"]), now: new Date("2026-09-23T12:00:00Z") });
}
export function learningFixture(identity = "base", projectScope = "project:companion-test") {
  return buildLearningEnvelope({ projectScope, report: auditFixture(identity), pluginVersion: "test", knowledgeVersion: "1.0.0", now: new Date("2026-09-23T12:00:00Z") });
}
export function fileScopeFixture(roots = 100) {
  const base = auditFixture();
  const root = base.frames[0]!;
  const rootIds = Array.from({ length: roots }, (_, index) => `synthetic:${index}`);
  return { ...base, target: { ...base.target, scope: "file" as const, rootIds },
    frames: rootIds.map((rootId) => ({ ...root, rootId, rootName: `Synthetic page design ${rootId}` })),
    findings: rootIds.flatMap((rootId) => base.findings.map((finding) => ({ ...finding, rootId, id: `${rootId}:${finding.id}`, nodeId: `${rootId}:${finding.nodeId}`, nodePath: `${rootId}/${finding.nodePath}` }))),
    issueGroups: rootIds.flatMap((rootId) => (base.issueGroups ?? []).map((group) => ({ ...group, id: `${rootId}:${group.id}`, primaryFindingId: `${rootId}:${group.primaryFindingId}`, findingIds: group.findingIds.map((id) => `${rootId}:${id}`) }))),
  };
}

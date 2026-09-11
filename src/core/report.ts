import { CATALOG_DIGEST, CATALOG_VERSION } from "./catalog";
import { RULESET_VERSION } from "./constants";
import { AXES, type ChangePlan, type DesignKnowledgeGraph, type Finding, type FrameResult, type ReadinessProfile, type ReadinessReport, type ScanScope, type VariantCoverage } from "./contracts";
import { collectDescendants } from "./operations/graph";
import { axisScores, capGradeForTokenCoverage, gradeFromAxes, isAtLeastB, worstAxisScores } from "./grading";
import { evaluateRules } from "./rules";
import { assertContract } from "./schema";
import { hashValue } from "./stable";

export interface BuildReportInput {
  graph: DesignKnowledgeGraph;
  profile: ReadinessProfile;
  scope: ScanScope;
  targetRootIds: string[];
  appliedChanges?: ChangePlan[];
  findings?: Finding[];
  now?: Date;
}

function blockers(findings: Finding[]): Finding[] {
  return findings.filter((item) => item.hardBlocker && item.status !== "pass" && item.status !== "not-applicable");
}

function unresolvedCritical(findings: Finding[]): boolean {
  return findings.some((item) => item.scoreImpact !== false && item.status === "needs-review" && item.severity === 4);
}

function tokenCoverage(findings: Finding[]): number | undefined {
  const finding = findings.find((item) => item.ruleId === "token.application.minimum");
  const coverage = finding?.evidence.measured.coverage;
  return typeof coverage === "number" ? coverage : undefined;
}

function variantCoverage(
  graph: DesignKnowledgeGraph,
  rootId: string,
  findings: Finding[],
): VariantCoverage[] {
  const root = graph.nodes[rootId];
  if (root?.type !== "COMPONENT_SET") return [];
  return root.childIds.flatMap((variantId) => {
    const variant = graph.nodes[variantId];
    if (!variant || variant.type !== "COMPONENT" || variant.parentId !== rootId) return [];
    const nodes = collectDescendants(graph, variantId);
    const nodeIds = new Set(nodes.map((node) => node.id));
    return [{
      variantId,
      variantName: variant.name,
      variantProperties: variant.variantProperties ?? {},
      nodeCount: nodes.length,
      findingIds: findings
        .filter((finding) => finding.rootId === rootId && nodeIds.has(finding.nodeId))
        .map((finding) => finding.id),
    }];
  });
}

export function buildReadinessReport(input: BuildReportInput): ReadinessReport {
  const targetRootIds = [...new Set(input.targetRootIds)];
  if (targetRootIds.length === 0) throw new Error("A report requires at least one source frame");
  const findings = input.findings ?? evaluateRules(input.graph, input.profile, targetRootIds);
  const targetSet = new Set(targetRootIds);
  const foreignFinding = findings.find((finding) => !targetSet.has(finding.rootId));
  if (foreignFinding) throw new Error(`Finding ${foreignFinding.id} does not belong to an in-scope source frame`);
  if (new Set(findings.map((finding) => finding.id)).size !== findings.length) throw new Error("Finding IDs must be unique within a report");
  for (const finding of findings) {
    assertContract("finding", finding);
    if (!input.graph.nodes[finding.nodeId]) throw new Error(`Finding ${finding.id} references an unknown node`);
  }
  for (const rootId of targetRootIds) {
    const representedAxes = new Set(findings.filter((finding) => finding.rootId === rootId).map((finding) => finding.axis));
    const missingAxes = AXES.filter((axis) => !representedAxes.has(axis));
    if (missingAxes.length > 0) throw new Error(`Source frame ${rootId} is missing findings for: ${missingAxes.join(", ")}`);
  }
  const knowledgeComplete = input.graph.complete && !input.graph.cancelled && input.graph.loadedPageCount === input.graph.pageCount;
  const frames: FrameResult[] = targetRootIds.map((rootId) => {
    const root = input.graph.nodes[rootId];
    if (!root) throw new Error(`Target root ${rootId} is absent from the design knowledge graph`);
    const frameFindings = findings.filter((item) => item.rootId === rootId);
    const scores = axisScores(frameFindings);
    const grade = capGradeForTokenCoverage(
      gradeFromAxes(scores),
      tokenCoverage(frameFindings),
    );
    const frameBlockers = blockers(frameFindings);
    const page = input.graph.pages.find((candidate) => candidate.id === root.pageId);
    if (!page) throw new Error(`Target root ${rootId} references unknown page ${root.pageId}`);
    return {
      rootId,
      rootName: root.name,
      rootType: root.type,
      pageId: page.id,
      pageName: page.name,
      grade,
      ready: isAtLeastB(grade) && frameBlockers.length === 0 && !unresolvedCritical(frameFindings) && knowledgeComplete,
      blockerIds: frameBlockers.map((item) => item.id),
      axisScores: scores,
      variantCoverage: variantCoverage(input.graph, rootId, frameFindings),
    };
  });
  const worstFrame = [...frames].sort((left, right) => left.grade.score - right.grade.score || left.rootId.localeCompare(right.rootId))[0];
  if (!worstFrame) throw new Error("Unable to determine the limiting source frame");
  const reportAxes = worstAxisScores(frames);
  const blockerFindings = blockers(findings);
  const generatedAt = (input.now ?? new Date()).toISOString();
  const report: ReadinessReport = {
    schemaVersion: 1,
    rulesetVersion: RULESET_VERSION,
    catalogVersion: CATALOG_VERSION,
    catalogDigest: CATALOG_DIGEST,
    profileHash: hashValue(input.profile),
    target: {
      scope: input.scope,
      rootIds: targetRootIds,
      knowledgeSnapshotHash: input.graph.snapshotHash,
      knowledgeComplete,
    },
    axes: reportAxes,
    frames,
    grade: worstFrame.grade,
    ready: frames.every((frame) => frame.ready) && knowledgeComplete,
    blockers: blockerFindings.map((item) => `${item.title}: ${item.nodePath}`),
    findings,
    appliedChanges: input.appliedChanges ?? [],
    generatedAt,
    snapshotHash: "pending",
  };
  const { snapshotHash: _pending, ...snapshotMaterial } = report;
  report.snapshotHash = hashValue(snapshotMaterial);
  assertContract("readiness-report", report);
  return report;
}

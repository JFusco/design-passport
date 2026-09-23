import type { Axis, Finding, FrameResult, ReadinessReport, VariantCoverage } from "../../core/contracts";
import { groupsForFindings } from "../../core/finding-groups";
import { isActionableFinding } from "../../core/finding-policy";

export interface IssueSummary {
  actionableCount: number;
  occurrenceCount: number;
  relatedGroupCount: number;
}

/** Only verified sources reduce issue counts. A related group is an organizing
 * aid and retains each occurrence as an independently actionable issue. */
export function actionableIssueSummary(report: ReadinessReport, findings: readonly Finding[] = report.findings): IssueSummary {
  const actionable = findings.filter(isActionableFinding);
  const groups = groupsForFindings(actionable, report.schemaVersion >= 2 ? report.issueGroups : undefined);
  return {
    actionableCount: groups.reduce((count, group) => count + (group.kind === "related" ? group.occurrenceCount : 1), 0),
    occurrenceCount: groups.reduce((count, group) => count + group.occurrenceCount, 0),
    relatedGroupCount: groups.filter((group) => group.kind === "related").length,
  };
}

export interface VariantBreakdown extends VariantCoverage, IssueSummary {
  failCount: number;
  reviewCount: number;
}

export interface ModuleBreakdown extends FrameResult, IssueSummary {
  failCount: number;
  reviewCount: number;
  weakestAxes: Axis[];
  topRules: Array<{ ruleId: string; count: number }>;
  variants: VariantBreakdown[];
}

export interface PageBreakdown extends IssueSummary {
  pageId: string;
  pageName: string;
  modules: ModuleBreakdown[];
  gradeCounts: Record<FrameResult["grade"]["letter"], number>;
}

export function reportBreakdown(report: ReadinessReport): PageBreakdown[] {
  const findingsById = new Map(report.findings.map((finding) => [finding.id, finding]));
  const byRoot = new Map<string, Finding[]>();
  for (const finding of report.findings) {
    const findings = byRoot.get(finding.rootId) ?? [];
    findings.push(finding);
    byRoot.set(finding.rootId, findings);
  }

  const modules = report.frames.map<ModuleBreakdown>((frame) => {
    const findings = byRoot.get(frame.rootId) ?? [];
    const actionable = findings.filter(isActionableFinding);
    const ruleCounts = new Map<string, number>();
    for (const finding of actionable) ruleCounts.set(finding.ruleId, (ruleCounts.get(finding.ruleId) ?? 0) + 1);
    return {
      ...frame,
      ...actionableIssueSummary(report, actionable),
      failCount: findings.filter((finding) => finding.status === "fail").length,
      reviewCount: findings.filter((finding) => finding.status === "needs-review").length,
      weakestAxes: [...frame.axisScores]
        .sort((left, right) => left.score - right.score || left.axis.localeCompare(right.axis))
        .slice(0, 3)
        .map((axis) => axis.axis),
      topRules: [...ruleCounts.entries()]
        .map(([ruleId, count]) => ({ ruleId, count }))
        .sort((left, right) => right.count - left.count || left.ruleId.localeCompare(right.ruleId))
        .slice(0, 3),
      variants: (frame.variantCoverage ?? []).map((variant) => {
        const variantFindings = variant.findingIds.flatMap((id) => {
          const finding = findingsById.get(id);
          return finding ? [finding] : [];
        });
        return {
          ...variant,
          ...actionableIssueSummary(report, variantFindings),
          failCount: variantFindings.filter((finding) => finding.status === "fail").length,
          reviewCount: variantFindings.filter((finding) => finding.status === "needs-review").length,
        };
      }),
    };
  });

  const pages = new Map<string, PageBreakdown>();
  for (const module of modules) {
    const page = pages.get(module.pageId) ?? {
      pageId: module.pageId,
      pageName: module.pageName,
      modules: [],
      actionableCount: 0,
      occurrenceCount: 0,
      relatedGroupCount: 0,
      gradeCounts: { A: 0, B: 0, C: 0, D: 0, F: 0 },
    };
    page.modules.push(module);
    page.gradeCounts[module.grade.letter] += 1;
    pages.set(module.pageId, page);
  }

  return [...pages.values()]
    .map((page) => ({
      ...page,
      ...actionableIssueSummary(report, page.modules.flatMap((module) => byRoot.get(module.rootId) ?? [])),
      modules: page.modules.sort((left, right) => left.grade.score - right.grade.score || left.rootName.localeCompare(right.rootName)),
    }))
    .sort((left, right) => left.pageName.localeCompare(right.pageName));
}

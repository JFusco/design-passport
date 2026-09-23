import { AXIS_LABELS, PRODUCT_NAME } from "./constants";
import type { Finding, ReadinessReport } from "./contracts";
import { groupsForFindings } from "./finding-groups";
import { findingImpactLabel, isActionableFinding } from "./finding-policy";

function inline(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/[\r\n]+/g, " ")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([`*_[\]{}()#+.!|])/g, "\\$1");
}

function findingLines(finding: Finding, enriched: boolean): string[] {
  const summary = `- **${inline(finding.status)} · ${inline(String(finding.severity))}** — ${inline(finding.title)} (${inline(finding.nodePath)}): ${inline(finding.message)}`;
  if (!enriched) return [summary];
  const source = finding.provenance;
  return [summary,
    `  - Category: ${inline(finding.category ?? "requirement")} · ${inline(findingImpactLabel(finding))}`,
    `  - Finding: ${inline(finding.id)} · Node: ${inline(finding.nodeId)}`,
    ...(source?.navigationNodeId ? [`  - Navigation node: ${inline(source.navigationNodeId)}`] : []),
    ...(source ? [`  - Source: ${inline(source.sourceLabel ?? source.sourceNodeId ?? source.sourceStyleId ?? "Unverified")} · Ownership: ${inline(source.kind)}${source.property ? ` · Property: ${inline(source.property)}` : ""}`,
      ...(source.sourceStyleId ? [`  - Style ID: ${inline(source.sourceStyleId)}`] : [])] : []),
    `  - Evidence: ${inline(JSON.stringify(finding.evidence.measured))}`,
  ];
}

function issueGroupLines(report: ReadinessReport): string[] {
  if (report.schemaVersion < 2) return [];
  const findings = report.findings.filter(isActionableFinding);
  const byId = new Map(findings.map((finding) => [finding.id, finding]));
  const groups = groupsForFindings(findings, report.issueGroups);
  const issues = groups.reduce((count, group) => count + (group.kind === "source" ? 1 : group.occurrenceCount), 0);
  return [
    "## Actionable issues and occurrences", "",
    `${issues} actionable issues · ${groups.reduce((count, group) => count + group.occurrenceCount, 0)} affected occurrences. Verified common sources count once; related findings retain individual issues because a shared fix is unverified.`, "",
    "| Issue | Relationship | Source / property | Occurrences | Finding IDs |",
    "| --- | --- | --- | ---: | --- |",
    ...groups.map((group) => {
      const primary = byId.get(group.primaryFindingId)!;
      const relationship = group.kind === "related" ? "Related; review each occurrence" : group.sourceLabel || group.sourceNodeId || group.sourceStyleId ? "Verified source" : "Individual finding";
      const source = [group.sourceLabel ?? group.sourceNodeId, ...(group.sourceStyleId ? [`Style ID: ${group.sourceStyleId}`] : []), group.property].filter(Boolean).join(" · ") || "Unverified";
      return `| ${inline(primary.title)} | ${relationship} | ${inline(source)} | ${group.occurrenceCount} | ${group.findingIds.map(inline).join("; ")} |`;
    }), "",
  ];
}

export function reportToMarkdown(report: ReadinessReport): string {
  const producer = report.producer
    ? `Plugin ${report.producer.pluginVersion} · Ruleset ${report.producer.rulesetVersion} · Build ${report.producer.buildSha} · ${report.producer.channel}`
    : `Historical producer · Ruleset ${report.rulesetVersion}`;
  const lines = [
    `# ${PRODUCT_NAME} Readiness Report`,
    "",
    `Overall: **${report.grade.letter} (${report.grade.score.toFixed(1)})** · ${report.ready ? "Ready" : "Not ready"}`,
    "",
    `${inline(producer)} · Catalog: ${inline(report.catalogVersion)} · Snapshot: ${inline(report.snapshotHash)}`,
    "",
    `Generated: ${inline(report.generatedAt)} · Report schema: ${report.schemaVersion}`,
    "",
    `Whole-file knowledge: ${report.target.knowledgeComplete ? "complete" : "incomplete"} (${inline(report.target.knowledgeSnapshotHash)})`,
    "",
    "## Axes",
    "",
    "| Axis | Score | Passed / applicable weight |",
    "| --- | ---: | ---: |",
    ...report.axes.map((axis) => `| ${inline(AXIS_LABELS[axis.axis])} | ${axis.score.toFixed(1)} | ${axis.passedWeight} / ${axis.applicableWeight} |`),
    "",
    "## Source frames",
    "",
    "| Page | Module / component | Type | Grade | Ready | Blockers |",
    "| --- | --- | --- | ---: | :---: | ---: |",
    ...report.frames.map((frame) => `| ${inline(frame.pageName)} | ${inline(frame.rootName)} | ${inline(frame.rootType)} | ${frame.grade.letter} (${frame.grade.score.toFixed(1)}) | ${frame.ready ? "Yes" : "No"} | ${frame.blockerIds.length} |`),
    "",
    "## Token coverage ledger",
    "",
    "Only missing source-owned values lower coverage. Historical reports may not contain this ledger.",
    "",
    "| Source | Coverage | Bound | Inherited | Ignored | Missing |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...report.frames.map((frame) => {
      const coverage = frame.tokenCoverage;
      return `| ${inline(frame.rootName)} | ${coverage?.coverage === null ? "Not applicable" : coverage ? `${coverage.coverage.toFixed(1)}%` : "Historical"} | ${coverage?.counts.bound ?? "—"} | ${coverage?.counts.inherited ?? "—"} | ${coverage?.counts.ignored ?? "—"} | ${coverage?.counts.missing ?? "—"} |`;
    }),
    "",
    "## Component-set variant coverage",
    "",
    "Every listed variant and its descendants were scanned. The score belongs to the component set as a whole; the table attributes findings without assigning separate variant scores.",
    "",
    "| Component set | Variant | Properties | Nodes checked | Attributed findings |",
    "| --- | --- | --- | ---: | ---: |",
    ...report.frames.flatMap((frame) => (frame.variantCoverage ?? []).map((variant) => {
      const properties = Object.entries(variant.variantProperties).map(([key, value]) => `${key}: ${value}`).join(" · ") || "None";
      return `| ${inline(frame.rootName)} | ${inline(variant.variantName)} | ${inline(properties)} | ${variant.nodeCount} | ${variant.findingIds.length} |`;
    })),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length > 0 ? report.blockers.map((blocker) => `- ${inline(blocker)}`) : ["- None"]),
    "",
    ...issueGroupLines(report),
    "## Findings",
    "",
    ...report.findings.filter(isActionableFinding).flatMap((finding) => findingLines(finding, report.schemaVersion >= 2)),
    "",
    `_Generated by ${PRODUCT_NAME}. Text and URLs originating in the design are treated as untrusted display data._`,
    "",
  ];
  return lines.join("\n");
}

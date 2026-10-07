import type { Finding } from "./contracts";
import { hashValue } from "./stable";

const AGGREGATES = new Set([
  "naming.default-critical", "naming.default-healthy", "naming.source-unique",
  "structure.auto-layout-coverage", "structure.clipping", "component.description",
  "accessibility.text-contrast", "accessibility.target-minimum", "accessibility.target-preferred", "accessibility.behavior-review",
  "pipeline.consumable-root", "pipeline.file-knowledge", "pipeline.annotation", "pipeline.dev-resource", "pipeline.export-names", "pipeline.literal-styling",
  "token.foundation.sources", "token.foundation.semantic", "token.foundation.metadata", "token.foundation.alias-layer",
  "token.application.started", "token.application.substantial", "token.application.strong", "token.application.minimum", "token.application.excellent", "token.application.breakpoint-tier",
  "responsive.signal", "responsive.family", "responsive.collisions", "responsive.completeness", "responsive.content-parity", "responsive.binding-parity",
]);

/** Obligation identity does not depend on representative nodes, measurements or group IDs. */
export function stableIssueKey(finding: Finding): string {
  const measured = finding.evidence.measured;
  const bucket = finding.ruleId === "token.application.repeated-literal" ? [measured.field, measured.rawValue]
    : finding.ruleId === "component.repeated-candidate" ? [measured.signature]
      : finding.ruleId === "naming.component-property" || finding.ruleId === "naming.component-value" ? [measured.propertyName]
        : [measured.field ?? finding.provenance?.property ?? ""];
  const aggregate = AGGREGATES.has(finding.ruleId) || ["token.application.repeated-literal", "component.repeated-candidate"].includes(finding.ruleId);
  return `issue:${hashValue([finding.rootId, finding.ruleId, aggregate ? "aggregate" : finding.nodeId, bucket])}`;
}

export function actionableFinding(finding: Finding): boolean {
  return finding.status !== "pass" && finding.status !== "not-applicable";
}

import type { MultiFileReviewReportV1, ReadinessReport } from "./contracts";
import {
  validateChangePlan,
  validateDesignReferencePack,
  validateFinding,
  validateKnowledgeCandidate,
  validateKnowledgeDecision,
  validateMultiFileReviewReport,
  validateProjectStyleGuideBinding,
  validateReadinessProfile,
  validateReadinessReport,
  validateReviewLearningEnvelope,
  validateReviewSource,
  validateTeamKnowledgePack,
  type GeneratedValidator,
} from "../generated/schema-validators.js";

export type ContractName =
  | "change-plan"
  | "design-reference-pack"
  | "finding"
  | "knowledge-candidate"
  | "knowledge-decision"
  | "multi-file-review-report"
  | "project-style-guide-binding"
  | "readiness-profile"
  | "readiness-report"
  | "review-learning-envelope"
  | "review-source"
  | "team-knowledge-pack";

const validators: Record<ContractName, GeneratedValidator> = {
  "change-plan": validateChangePlan,
  "design-reference-pack": validateDesignReferencePack,
  finding: validateFinding,
  "knowledge-candidate": validateKnowledgeCandidate,
  "knowledge-decision": validateKnowledgeDecision,
  "multi-file-review-report": validateMultiFileReviewReport,
  "project-style-guide-binding": validateProjectStyleGuideBinding,
  "readiness-profile": validateReadinessProfile,
  "readiness-report": validateReadinessReport,
  "review-learning-envelope": validateReviewLearningEnvelope,
  "review-source": validateReviewSource,
  "team-knowledge-pack": validateTeamKnowledgePack,
};

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateContract(name: ContractName, value: unknown): ContractValidationResult {
  const validator = validators[name];
  const valid = validator(value);
  if (valid && (name === "readiness-report" || name === "multi-file-review-report")) {
    const errors = name === "readiness-report" ? reportRelationshipErrors(value as ReadinessReport)
      : (value as MultiFileReviewReportV1).targets.flatMap(({ report }, index) => reportRelationshipErrors(report).map((error) => `/targets/${index}/report${error}`));
    if (errors.length > 0) return { valid: false, errors };
  }
  return {
    valid,
    errors: valid
      ? []
      : (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? error.keyword}`),
  };
}

export function assertContract(name: ContractName, value: unknown): void {
  const result = validateContract(name, value);
  if (!result.valid) throw new Error(`${name} failed JSON Schema validation: ${result.errors.join("; ")}`);
}

/** JSON Schema checks shape; this checks occurrence identity and category invariants. */
function reportRelationshipErrors(report: ReadinessReport): string[] {
  if (report.schemaVersion === 1) return [];
  const errors: string[] = [];
  const findings = new Map(report.findings.map((finding) => [finding.id, finding]));
  if (findings.size !== report.findings.length) errors.push("/findings IDs must be unique");
  for (const finding of report.findings) {
    if (finding.category !== "requirement" && (finding.scoreImpact !== false || finding.hardBlocker)) {
      errors.push(`/findings/${finding.id} advisory categories cannot score or block readiness`);
    }
  }
  const groupIds = new Set<string>();
  const groupedIds = new Set<string>();
  for (const group of report.issueGroups ?? []) {
    if (groupIds.has(group.id)) errors.push(`/issueGroups/${group.id} duplicate group ID`);
    groupIds.add(group.id);
    if (!group.findingIds.includes(group.primaryFindingId)) errors.push(`/issueGroups/${group.id} primary finding must be a member`);
    const nodes = new Set<string>();
    for (const id of group.findingIds) {
      const finding = findings.get(id);
      if (!finding || finding.status === "pass" || finding.status === "not-applicable") errors.push(`/issueGroups/${group.id} invalid actionable occurrence ${id}`);
      else nodes.add(finding.nodeId);
      if (groupedIds.has(id)) errors.push(`/issueGroups/${group.id} occurrence appears more than once`);
      groupedIds.add(id);
    }
    if (nodes.size !== group.occurrenceCount) errors.push(`/issueGroups/${group.id} occurrence count does not match affected nodes`);
    if (group.kind === "related" && (group.sourceNodeId || group.sourceStyleId)) errors.push(`/issueGroups/${group.id} related findings cannot claim a verified source`);
    if (group.kind === "source") {
      const primary = findings.get(group.primaryFindingId);
      if (group.sourceNodeId && group.sourceStyleId) errors.push(`/issueGroups/${group.id} a common source must identify either a node or a style`);
      if (!group.sourceNodeId && !group.sourceStyleId && (nodes.size > 1 || group.sourceLabel)) errors.push(`/issueGroups/${group.id} common source identity is missing`);
      if (group.sourceNodeId || group.sourceStyleId) for (const id of group.findingIds) {
        const finding = findings.get(id);
        const source = finding?.provenance;
        const matchingIdentity = group.sourceStyleId
          ? source?.kind === "style" && source.sourceStyleId === group.sourceStyleId && !source.sourceNodeId
          : (source?.kind === "direct" || source?.kind === "inherited") && source.sourceNodeId === group.sourceNodeId && !source.sourceStyleId;
        if (!matchingIdentity || finding?.ruleId !== primary?.ruleId || source?.property !== group.property || source?.contextKey !== group.contextKey) {
          errors.push(`/issueGroups/${group.id} declared common source does not match occurrence ${id}`);
        }
      }
    }
  }
  for (const finding of report.findings) {
    if (finding.status !== "pass" && finding.status !== "not-applicable" && !groupedIds.has(finding.id)) errors.push(`/findings/${finding.id} missing issue group`);
  }
  return errors;
}

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

type ValidationError = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
};

export type GeneratedValidator = ((value: unknown) => boolean) & { errors?: ValidationError[] | null };

export const validateChangePlan: GeneratedValidator;
export const validateCodeConnectParse: GeneratedValidator;
export const validateDesignReferencePack: GeneratedValidator;
export const validateFinding: GeneratedValidator;
export const validateKnowledgeCandidate: GeneratedValidator;
export const validateKnowledgeDecision: GeneratedValidator;
export const validateMultiFileReviewReport: GeneratedValidator;
export const validateProjectStyleGuideBinding: GeneratedValidator;
export const validateReadinessProfile: GeneratedValidator;
export const validateReadinessReport: GeneratedValidator;
export const validateReviewLearningEnvelope: GeneratedValidator;
export const validateReviewSource: GeneratedValidator;
export const validateTeamKnowledgePack: GeneratedValidator;

type ValidationError = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
};

export type GeneratedValidator = ((value: unknown) => boolean) & { errors?: ValidationError[] | null };

export const validateChangePlan: GeneratedValidator;
export const validateCodeConnectParse: GeneratedValidator;
export const validateFinding: GeneratedValidator;
export const validateReadinessProfile: GeneratedValidator;
export const validateReadinessReport: GeneratedValidator;

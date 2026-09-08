import {
  validateChangePlan,
  validateCodeConnectParse,
  validateFinding,
  validateReadinessProfile,
  validateReadinessReport,
  type GeneratedValidator,
} from "../generated/schema-validators.js";

export type ContractName = "change-plan" | "code-connect-parse" | "finding" | "readiness-profile" | "readiness-report";

const validators: Record<ContractName, GeneratedValidator> = {
  "change-plan": validateChangePlan,
  "code-connect-parse": validateCodeConnectParse,
  finding: validateFinding,
  "readiness-profile": validateReadinessProfile,
  "readiness-report": validateReadinessReport,
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

import type { BindableField, JsonValue } from "../../core/contracts";
import { scopesForBindableField, variableTypeForBindableField } from "../../core/operations/variable-compatibility";

export function normalizeSemanticTokenName(input: string): string {
  const segments = input.normalize("NFKC").split("/").map((segment) => segment.trim().replace(/\s+/g, " "));
  if (segments.length < 2 || segments.some((segment) => !/^[A-Za-z][A-Za-z0-9 -]*$/.test(segment))) {
    throw new Error("Token name must be a semantic slash-separated path");
  }
  for (const segment of segments) {
    const compact = segment.replace(/\s+/g, "");
    if (/^#[0-9a-f]{3,8}$/i.test(compact) || /^\d+(?:\.\d+)?(?:px|rem)?$/i.test(compact)) {
      throw new Error("Raw-value token names are not semantic");
    }
  }
  return segments.join("/");
}

export function variableTypeForField(field: BindableField): VariableResolvedDataType {
  return variableTypeForBindableField(field);
}

export function variableScopesForField(field: BindableField): VariableScope[] {
  return [...scopesForBindableField(field)] as VariableScope[];
}

export function webCodeSyntaxForTokenName(name: string): string {
  const customProperty = name
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!customProperty) throw new Error("Token name cannot produce valid web code syntax");
  return `var(--${customProperty})`;
}

function validChannel(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function toVariableValue(value: JsonValue, type: VariableResolvedDataType): VariableValue {
  if (type === "FLOAT" && typeof value === "number" && Number.isFinite(value)) return value;
  if (type === "STRING" && typeof value === "string" && value.length > 0 && value.length <= 500) return value;
  if (type === "COLOR" && value && !Array.isArray(value) && typeof value === "object") {
    const record = value as Record<string, JsonValue>;
    const alpha = record.a === undefined ? 1 : record.a;
    if (validChannel(record.r) && validChannel(record.g) && validChannel(record.b) && validChannel(alpha)) {
      return { r: record.r, g: record.g, b: record.b, a: alpha };
    }
  }
  throw new Error(`The repeated value is not compatible with a ${type.toLocaleLowerCase("en-US")} variable`);
}

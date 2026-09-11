import type { CertificationSummary, NodeSnapshot, ReadinessProfile } from "../../core/contracts";
import { validateContract } from "../../core/schema";

const MAX_SHARED_DATA_LENGTH = 100_000;

function parseObject(raw: string): Record<string, unknown> | undefined {
  if (!raw || raw.length > MAX_SHARED_DATA_LENGTH) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

export function parseStoredProfile(raw: string): ReadinessProfile | undefined {
  const value = parseObject(raw);
  if (!value) return undefined;
  const { requireCodeConnect: _legacyRequireCodeConnect, ...current } = value;
  return validateContract("readiness-profile", current).valid ? current as unknown as ReadinessProfile : undefined;
}

export function parseCertificationSummary(raw: string): CertificationSummary | undefined {
  const value = parseObject(raw);
  if (!value || value.schemaVersion !== 1 || !["A", "B", "C", "D", "F"].includes(String(value.grade))
    || typeof value.score !== "number" || !Number.isFinite(value.score) || value.score < 0 || value.score > 100
    || typeof value.rulesetVersion !== "string" || !value.rulesetVersion
    || typeof value.catalogVersion !== "string" || !value.catalogVersion
    || typeof value.certifiedAt !== "string" || !Number.isFinite(Date.parse(value.certifiedAt))
    || typeof value.snapshotHash !== "string" || !value.snapshotHash
    || typeof value.knowledgeSnapshotHash !== "string" || !value.knowledgeSnapshotHash) return undefined;
  return value as unknown as CertificationSummary;
}

export function parsePatternConfirmation(raw: string): NodeSnapshot["confirmedPattern"] {
  const value = parseObject(raw);
  if (!value || typeof value.canonicalName !== "string" || !value.canonicalName.trim() || value.canonicalName.length > 200
    || typeof value.sourceName !== "string" || !value.sourceName.trim() || value.sourceName.length > 200
    || typeof value.catalogVersion !== "string" || !value.catalogVersion.trim() || value.catalogVersion.length > 100) return undefined;
  return { canonicalName: value.canonicalName, sourceName: value.sourceName, catalogVersion: value.catalogVersion };
}

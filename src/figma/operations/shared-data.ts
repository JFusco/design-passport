import type { CertificationSummary, NodeSnapshot, ReadinessProfile } from "../../core/contracts";
import { normalizeReadinessProfile } from "../../core/profile";

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
  return value ? normalizeReadinessProfile(value) : undefined;
}

export function parseCertificationSummary(raw: string): CertificationSummary | undefined {
  const value = parseObject(raw);
  if (!value || ![1, 2].includes(Number(value.schemaVersion)) || !["A", "B", "C", "D", "F"].includes(String(value.grade))
    || typeof value.score !== "number" || !Number.isFinite(value.score) || value.score < 0 || value.score > 100
    || typeof value.rulesetVersion !== "string" || !value.rulesetVersion
    || typeof value.catalogVersion !== "string" || !value.catalogVersion
    || typeof value.certifiedAt !== "string" || !Number.isFinite(Date.parse(value.certifiedAt))
    || typeof value.snapshotHash !== "string" || !value.snapshotHash
    || typeof value.knowledgeSnapshotHash !== "string" || !value.knowledgeSnapshotHash) return undefined;
  if (value.schemaVersion === 2 && (typeof value.pluginVersion !== "string" || !value.pluginVersion
    || typeof value.buildSha !== "string" || !value.buildSha
    || !["production", "development"].includes(String(value.channel)))) return undefined;
  return value as unknown as CertificationSummary;
}

export function parsePatternConfirmation(raw: string): NodeSnapshot["confirmedPattern"] {
  const value = parseObject(raw);
  if (!value || typeof value.canonicalName !== "string" || !value.canonicalName.trim() || value.canonicalName.length > 200
    || typeof value.sourceName !== "string" || !value.sourceName.trim() || value.sourceName.length > 200
    || typeof value.catalogVersion !== "string" || !value.catalogVersion.trim() || value.catalogVersion.length > 100) return undefined;
  return { canonicalName: value.canonicalName, sourceName: value.sourceName, catalogVersion: value.catalogVersion };
}

export function parseDetachmentIntent(raw: string, nodeId: string): NodeSnapshot["intentionalDetachment"] {
  const value = parseObject(raw);
  if (!value || value.nodeId !== nodeId || typeof value.acknowledgedAt !== "string"
    || !Number.isFinite(Date.parse(value.acknowledgedAt))) return undefined;
  return { nodeId, acknowledgedAt: value.acknowledgedAt };
}

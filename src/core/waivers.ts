import type { Finding } from "./contracts";

type Waiver = NonNullable<Finding["waiver"]>;
export type WaiverStore = Record<string, Waiver>;

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseWaiver(value: unknown): Waiver | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.reason !== "string" || !candidate.reason.trim() || candidate.reason.length > 500
    || typeof candidate.createdBy !== "string" || !candidate.createdBy.trim() || candidate.createdBy.length > 200
    || !validDate(candidate.createdAt)
    || (candidate.expiresAt !== undefined && !validDate(candidate.expiresAt))) return undefined;
  return {
    reason: candidate.reason,
    createdAt: candidate.createdAt,
    createdBy: candidate.createdBy,
    ...(typeof candidate.expiresAt === "string" ? { expiresAt: candidate.expiresAt } : {}),
  };
}

export function sanitizeWaiverStore(value: unknown): WaiverStore {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: WaiverStore = {};
  for (const [findingId, candidate] of Object.entries(value as Record<string, unknown>).slice(0, 10_000)) {
    if (!findingId || findingId.length > 500 || findingId === "__proto__" || findingId === "constructor" || findingId === "prototype") continue;
    const waiver = parseWaiver(candidate);
    if (waiver) output[findingId] = waiver;
  }
  return output;
}

export function applyWaivers(findings: Finding[], waivers: WaiverStore, now = Date.now()): Finding[] {
  return findings.map((item) => {
    const waiver = waivers[item.id];
    if (item.status === "pass" || item.status === "not-applicable" || !waiver) return item;
    if (waiver.expiresAt && Date.parse(waiver.expiresAt) <= now) return item;
    return { ...item, status: "waived", waiver };
  });
}

import type { Finding, ReadinessReport } from "../core/contracts";
import { actionableFinding, stableIssueKey } from "../core/issue-key";
import { validateContract } from "../core/schema";

export interface IssueReviewState {
  records: Array<{ key: string; outcome: "resolved" | "unresolved"; checkedAt: string; previous?: Finding }>;
  clearedKeys: string[];
}
export interface IssueReviewRecord {
  schemaVersion: 1;
  reportHash: string;
  clearedKeys: string[];
}
export const validIssueKey = (value: unknown): value is string => typeof value === "string" && /^issue:[a-zA-Z0-9:._-]+$/.test(value) && value.length <= 200;
export function validClearedKeys(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10_000 && value.every(validIssueKey) && new Set(value).size === value.length;
}
export function isIssueReviewState(value: unknown): value is IssueReviewState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["records", "clearedKeys"].includes(key)) || !validClearedKeys(candidate.clearedKeys)
    || !Array.isArray(candidate.records) || candidate.records.length > 10_000) return false;
  const seen = new Set<string>();
  return candidate.records.every((record: unknown) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const row = record as Record<string, unknown>;
    if (Object.keys(row).some((key) => !["key", "outcome", "checkedAt", "previous"].includes(key))
      || !validIssueKey(row.key) || seen.has(row.key) || !["resolved", "unresolved"].includes(String(row.outcome))
      || typeof row.checkedAt !== "string" || !Number.isFinite(Date.parse(row.checkedAt))) return false;
    seen.add(row.key);
    return row.previous === undefined || validateContract("finding", row.previous).valid && stableIssueKey(row.previous as Finding) === row.key;
  }) && candidate.clearedKeys.every((key) => (candidate.records as IssueReviewState["records"]).some((row) => row.key === key && row.outcome === "resolved"));
}
export function mergeIssueReview(previous: IssueReviewState | undefined, oldReport: ReadinessReport | undefined, nextReport: ReadinessReport, checkedKeys: readonly string[]): IssueReviewState {
  const active = new Set(nextReport.findings.filter(actionableFinding).map(stableIssueKey));
  const records = new Map<string, IssueReviewState["records"][number]>((previous?.records ?? []).map((row) => {
    const next = { ...row }; if (active.has(row.key)) { next.outcome = "unresolved"; delete next.previous; }
    return [row.key, next];
  }));
  for (const key of checkedKeys) {
    const before = oldReport?.findings.find((finding) => stableIssueKey(finding) === key && actionableFinding(finding));
    records.set(key, { key, outcome: active.has(key) ? "unresolved" : "resolved", checkedAt: nextReport.verification?.verifiedAt ?? nextReport.generatedAt,
      ...(!active.has(key) && before ? { previous: before } : {}) });
  }
  return { records: [...records.values()], clearedKeys: (previous?.clearedKeys ?? []).filter((key) => !active.has(key) && records.get(key)?.outcome === "resolved") };
}
export function resolvedIssueKeys(state: IssueReviewState | undefined, report: ReadinessReport): Set<string> {
  const active = new Set(report.findings.filter(actionableFinding).map(stableIssueKey));
  return new Set(state?.records.filter((row) => row.outcome === "resolved" && !active.has(row.key)).map((row) => row.key) ?? []);
}

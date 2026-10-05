import type { ReviewCandidateView } from "../../../src/companion/view-models";
export const REVIEW_DRAFTS_KEY = "design-passport:review-drafts:v1";
export interface LocalReviewDraft {
  revision: string;
  wording: string;
  scope: "project" | "shared";
  exceptions: string;
  rationale: string;
}
export function storedDrafts(): Record<string, LocalReviewDraft> {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(REVIEW_DRAFTS_KEY) ?? "{}",
    );
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, LocalReviewDraft>)
      : {};
  } catch {
    return {};
  }
}
export function blocksModelApply(candidate: ReviewCandidateView): boolean {
  const saved = storedDrafts()[candidate.id];
  if (!saved) return false;
  if (saved.revision !== candidate.revision) return true;
  if (
    typeof saved.wording !== "string" ||
    typeof saved.exceptions !== "string" ||
    typeof saved.rationale !== "string"
  )
    return true;
  const exceptions = saved.exceptions
    .split("\n")
    .map((s) => s.normalize("NFKC").trim())
    .filter(Boolean);
  return (
    saved.wording.normalize("NFKC").trim() !== candidate.wording ||
    saved.scope !== candidate.proposedScope ||
    JSON.stringify([...new Set(exceptions)].sort()) !==
      JSON.stringify([...candidate.exceptions].sort()) ||
    !!saved.rationale.trim()
  );
}

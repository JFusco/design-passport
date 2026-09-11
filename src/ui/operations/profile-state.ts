import type { ReadinessProfile } from "../../core/contracts";
import { profileDomainErrors } from "../../core/profile-semantics";
import { hashValue } from "../../core/stable";
import { cloneProfile } from "./presentation";

export interface ProfileDraftState {
  dirty: boolean;
  semanticErrors: string[];
  issues: string[];
  blocked: boolean;
}

export function profileDraftState(input: {
  committed: ReadinessProfile;
  draft: ReadinessProfile;
  configured: boolean;
  profileIssues: string[];
  pageIds: string[];
}): ProfileDraftState {
  const semanticErrors = profileDomainErrors(input.draft, new Set(input.pageIds));
  const issues = [...new Set([...input.profileIssues, ...semanticErrors])];
  const dirty = hashValue(input.draft) !== hashValue(input.committed);
  return {
    dirty,
    semanticErrors,
    issues,
    blocked: !input.configured || dirty || issues.length > 0,
  };
}

export function discardProfileDraft(
  committed: ReadinessProfile,
  suggestion: ReadinessProfile,
  configured: boolean,
): ReadinessProfile {
  return cloneProfile(configured ? committed : suggestion);
}

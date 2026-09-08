import { DEFAULT_PROFILE } from "./constants";
import type { ReadinessProfile } from "./contracts";

export interface ProfilePageCandidate {
  id: string;
  name: string;
}

const FOUNDATION_PAGE = /foundation|token|style guide|styleguide/;
const COMPONENT_PAGE = /component|library/;
const SCREEN_PAGE = /screen|design|product|flow/;

function freshDefaultProfile(): ReadinessProfile {
  return JSON.parse(JSON.stringify(DEFAULT_PROFILE)) as ReadinessProfile;
}

export function inferProfileFromPages(pages: readonly ProfilePageCandidate[]): ReadinessProfile {
  const profile = freshDefaultProfile();
  for (const page of pages) {
    const name = page.name.toLocaleLowerCase("en-US");
    if (FOUNDATION_PAGE.test(name)) profile.pageRoles.foundations.pageIds.push(page.id);
    else if (COMPONENT_PAGE.test(name)) profile.pageRoles.components.pageIds.push(page.id);
    else if (SCREEN_PAGE.test(name)) profile.pageRoles.screens.pageIds.push(page.id);
  }

  const hasLibraryPages = profile.pageRoles.foundations.pageIds.length > 0
    || profile.pageRoles.components.pageIds.length > 0;
  if (profile.pageRoles.screens.pageIds.length === 0 && hasLibraryPages) {
    profile.artifactKind = "library";
  }
  return profile;
}

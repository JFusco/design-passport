import { DEFAULT_PROFILE } from "./constants";
import type { ReadinessProfile } from "./contracts";

export interface ProfilePageCandidate {
  id: string;
  name: string;
}

export interface ProfileCollectionCandidate {
  key: string;
  name: string;
  remote?: boolean;
}

const FOUNDATION_PAGE = /foundation|token|style guide|styleguide/;
const COMPONENT_PAGE = /component|library/;
const SCREEN_PAGE = /screen|design|product|flow/;
const COMPONENT_SECTION = /^[\s❖◇◆]*components?[\s]*$/i;
const PAGE_DIVIDER = /^\s*[-–—]+\s*$/;
const NON_SOURCE_PAGE = /cover|usage|catalog|archive|notes?/;

function freshDefaultProfile(): ReadinessProfile {
  return JSON.parse(JSON.stringify(DEFAULT_PROFILE)) as ReadinessProfile;
}

export function inferProfileFromPages(
  pages: readonly ProfilePageCandidate[],
  collections: readonly ProfileCollectionCandidate[] = [],
): ReadinessProfile {
  const profile = freshDefaultProfile();
  let activeSection: "components" | undefined;
  for (const page of pages) {
    const name = page.name.toLocaleLowerCase("en-US");
    if (PAGE_DIVIDER.test(name) || /archive/.test(name)) {
      activeSection = undefined;
      continue;
    }
    if (COMPONENT_SECTION.test(name)) {
      activeSection = "components";
      continue;
    }
    if (NON_SOURCE_PAGE.test(name)) continue;
    if (FOUNDATION_PAGE.test(name)) profile.pageRoles.foundations.pageIds.push(page.id);
    else if (COMPONENT_PAGE.test(name)) profile.pageRoles.components.pageIds.push(page.id);
    else if (SCREEN_PAGE.test(name)) profile.pageRoles.screens.pageIds.push(page.id);
    else if (activeSection === "components") profile.pageRoles.components.pageIds.push(page.id);
  }

  profile.tokenSourceCollectionKeys = collections
    .filter((collection) => !collection.remote && /semantic/i.test(collection.name))
    .map((collection) => collection.key);

  const hasLibraryPages = profile.pageRoles.foundations.pageIds.length > 0
    || profile.pageRoles.components.pageIds.length > 0;
  if (profile.pageRoles.screens.pageIds.length === 0 && hasLibraryPages) {
    profile.artifactKind = "library";
  }
  return profile;
}

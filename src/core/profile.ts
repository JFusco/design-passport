import type { ReadinessProfile } from "./contracts";
import { profileDomainErrors } from "./profile-semantics";
import { validateContract } from "./schema";

export function profileSemanticErrors(profile: ReadinessProfile, availablePageIds?: Set<string>): string[] {
  const schema = validateContract("readiness-profile", profile);
  if (!schema.valid) return schema.errors;
  return profileDomainErrors(profile, availablePageIds);
}

export function assertProfileSemantics(profile: ReadinessProfile, availablePageIds?: Set<string>): void {
  const errors = profileSemanticErrors(profile, availablePageIds);
  if (errors.length > 0) throw new Error(`Profile is invalid: ${errors.join("; ")}`);
}

export function reconcileProfilePages(
  profile: ReadinessProfile,
  availablePageIds: Set<string>,
): { profile: ReadinessProfile; removedPageIds: string[] } {
  const removedPageIds = new Set<string>();
  const reconcile = (pageIds: string[]) => pageIds.filter((pageId) => {
    const available = availablePageIds.has(pageId);
    if (!available) removedPageIds.add(pageId);
    return available;
  });
  return {
    profile: {
      ...profile,
      pageRoles: {
        foundations: {
          pageIds: reconcile(profile.pageRoles.foundations.pageIds),
          externalLibraryKeys: [...profile.pageRoles.foundations.externalLibraryKeys],
        },
        components: {
          pageIds: reconcile(profile.pageRoles.components.pageIds),
          externalLibraryKeys: [...profile.pageRoles.components.externalLibraryKeys],
        },
        screens: {
          pageIds: reconcile(profile.pageRoles.screens.pageIds),
          externalLibraryKeys: [...profile.pageRoles.screens.externalLibraryKeys],
        },
      },
      breakpoints: profile.breakpoints.map((breakpoint) => ({ ...breakpoint })),
      tokenSourceCollectionKeys: [...profile.tokenSourceCollectionKeys],
    },
    removedPageIds: [...removedPageIds],
  };
}

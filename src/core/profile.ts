import { DEFAULT_PROFILE } from "./constants";
import type { ReadinessProfile } from "./contracts";
import { profileDomainErrors } from "./profile-semantics";
import { validateContract } from "./schema";

interface ReadinessProfileV1 extends Omit<ReadinessProfile, "schemaVersion" | "ruleModes" | "excludedPageIds"> {
  schemaVersion: 1;
}

function cloneProfile(profile: ReadinessProfile): ReadinessProfile {
  return {
    ...profile,
    excludedPageIds: [...new Set(profile.excludedPageIds ?? [])].sort(),
    pageRoles: {
      foundations: {
        pageIds: [...profile.pageRoles.foundations.pageIds],
        externalLibraryKeys: [...profile.pageRoles.foundations.externalLibraryKeys],
      },
      components: {
        pageIds: [...profile.pageRoles.components.pageIds],
        externalLibraryKeys: [...profile.pageRoles.components.externalLibraryKeys],
      },
      screens: {
        pageIds: [...profile.pageRoles.screens.pageIds],
        externalLibraryKeys: [...profile.pageRoles.screens.externalLibraryKeys],
      },
    },
    breakpoints: profile.breakpoints.map((breakpoint) => ({ ...breakpoint })),
    tokenSourceCollectionKeys: [...profile.tokenSourceCollectionKeys],
    ruleModes: { ...profile.ruleModes },
  };
}

/** Validate profile-v1/v2/v3 input and always return the current in-memory contract. */
export function normalizeReadinessProfile(value: unknown): ReadinessProfile | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const { requireCodeConnect: _legacyRequireCodeConnect, ...candidate } = value as Record<string, unknown>;
  if (!validateContract("readiness-profile", candidate).valid) return undefined;
  if (candidate.schemaVersion === 3) return cloneProfile(candidate as unknown as ReadinessProfile);
  if (candidate.schemaVersion === 2) return cloneProfile({ ...candidate, schemaVersion: 3, excludedPageIds: [] } as unknown as ReadinessProfile);
  const legacy = candidate as unknown as ReadinessProfileV1;
  return cloneProfile({
    ...legacy,
    schemaVersion: 3,
    excludedPageIds: [],
    ruleModes: { ...DEFAULT_PROFILE.ruleModes },
  });
}

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
      excludedPageIds: reconcile(profile.excludedPageIds),
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
      ruleModes: { ...profile.ruleModes },
    },
    removedPageIds: [...removedPageIds],
  };
}

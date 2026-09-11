import type { ReadinessProfile } from "./contracts";

export function profileDomainErrors(profile: ReadinessProfile, availablePageIds?: Set<string>): string[] {
  const errors: string[] = [];
  const roles = [profile.pageRoles.foundations, profile.pageRoles.components, profile.pageRoles.screens];
  const assignedPages = roles.flatMap((role) => role.pageIds);
  const duplicatePages = [...new Set(assignedPages.filter((pageId, index) => assignedPages.indexOf(pageId) !== index))];
  if (duplicatePages.length > 0) errors.push(`Pages may have only one role: ${duplicatePages.join(", ")}`);
  if (availablePageIds) {
    const missing = assignedPages.filter((pageId) => !availablePageIds.has(pageId));
    if (missing.length > 0) errors.push(`Mapped pages no longer exist: ${[...new Set(missing)].join(", ")}`);
  }
  if (profile.artifactKind === "product" && profile.pageRoles.screens.pageIds.length === 0) {
    errors.push("A product profile requires at least one local Screens page");
  }
  if (profile.artifactKind === "library"
    && profile.pageRoles.components.pageIds.length === 0
    && profile.pageRoles.foundations.pageIds.length === 0) {
    errors.push("A library profile requires a local Foundations or Components page");
  }
  const normalizedNames = profile.breakpoints.map((breakpoint) => breakpoint.name.trim().toLocaleLowerCase("en-US"));
  if (new Set(normalizedNames).size !== normalizedNames.length) errors.push("Breakpoint names must be unique");
  const widths = profile.breakpoints.map((breakpoint) => breakpoint.width);
  if (new Set(widths).size !== widths.length) errors.push("Breakpoint widths must be unique");
  if (profile.breakpoints.some((breakpoint) => breakpoint.name.trim() !== breakpoint.name || !breakpoint.name.trim())) {
    errors.push("Breakpoint names must be non-empty and trimmed");
  }
  if (profile.breakpoints.some((breakpoint) => !Number.isFinite(breakpoint.width) || breakpoint.width <= 0)) {
    errors.push("Breakpoint widths must be positive numbers");
  }
  return errors;
}

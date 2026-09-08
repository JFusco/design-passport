import catalogJson from "../generated/ui-design-brain.catalog.json";
import type { PatternResolution } from "./contracts";

type CatalogAlias = string | { name: string; context: string };

export interface CatalogPattern {
  name: string;
  slug: string;
  aliases: CatalogAlias[];
  file: string;
  guidance: string;
}

interface CatalogData {
  schemaVersion: 1;
  catalogVersion: string;
  catalogDigest: string;
  authoritySourceDigest: string;
  authority: {
    owns: string[];
    excludes: string[];
    accessibilityProse: string;
  };
  patterns: CatalogPattern[];
}

export const UI_DESIGN_BRAIN = catalogJson as CatalogData;
export const CATALOG_VERSION = UI_DESIGN_BRAIN.catalogVersion;
export const CATALOG_DIGEST = UI_DESIGN_BRAIN.catalogDigest;

function normalizeLookup(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function splitQualifiedName(input: string): { root: string; qualifier?: string } {
  const parts = input.split("/").map((part) => part.trim()).filter(Boolean);
  const root = parts.shift() ?? "";
  return parts.length > 0 ? { root, qualifier: parts.join(" / ") } : { root };
}

const canonical = new Map<string, CatalogPattern>();
const plainAliases = new Map<string, CatalogPattern>();
const contextualAliases = new Map<string, CatalogPattern[]>();

for (const pattern of UI_DESIGN_BRAIN.patterns) {
  canonical.set(normalizeLookup(pattern.name), pattern);
  for (const alias of pattern.aliases) {
    if (typeof alias === "string") plainAliases.set(normalizeLookup(alias), pattern);
    else {
      const key = normalizeLookup(alias.name);
      contextualAliases.set(key, [...(contextualAliases.get(key) ?? []), pattern]);
    }
  }
}

export function resolvePattern(input: string): PatternResolution {
  const compactInput = input.normalize("NFKC").trim().replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ");
  const { root, qualifier } = splitQualifiedName(compactInput);
  const normalizedInput = normalizeLookup(root);
  if (!normalizedInput) {
    return { input, normalizedInput, kind: "none", requiresConfirmation: false, catalogVersion: CATALOG_VERSION };
  }

  // The catalog intentionally reuses a few labels across patterns (for example,
  // CTA, Banner, Label, and Stepper). They always stay human-confirmed even when
  // the same spelling is also a canonical entry elsewhere in the catalog.
  const contextual = contextualAliases.get(normalizedInput);
  if (contextual) {
    const canonicalCandidate = canonical.get(normalizedInput);
    const candidates = [...new Set([
      ...contextual.map((pattern) => pattern.name),
      ...(canonicalCandidate ? [canonicalCandidate.name] : []),
    ])].sort();
    return {
      input,
      normalizedInput,
      kind: "contextual",
      candidates,
      ...(qualifier ? { qualifier } : {}),
      requiresConfirmation: true,
      catalogVersion: CATALOG_VERSION,
    };
  }

  const exact = canonical.get(normalizedInput);
  if (exact) {
    return {
      input,
      normalizedInput,
      kind: "canonical",
      canonicalName: exact.name,
      ...(qualifier ? { qualifier } : {}),
      requiresConfirmation: false,
      catalogVersion: CATALOG_VERSION,
    };
  }

  const alias = plainAliases.get(normalizedInput);
  if (alias) {
    return {
      input,
      normalizedInput,
      kind: "alias",
      canonicalName: alias.name,
      ...(qualifier ? { qualifier } : {}),
      requiresConfirmation: false,
      catalogVersion: CATALOG_VERSION,
    };
  }

  return {
    input,
    normalizedInput,
    kind: "novel",
    ...(qualifier ? { qualifier } : {}),
    requiresConfirmation: false,
    catalogVersion: CATALOG_VERSION,
  };
}

export function canonicalPatternName(resolution: PatternResolution): string | undefined {
  if (!resolution.canonicalName) return undefined;
  return resolution.qualifier ? `${resolution.canonicalName} / ${resolution.qualifier}` : resolution.canonicalName;
}

export function getPattern(name: string): CatalogPattern | undefined {
  return canonical.get(normalizeLookup(name));
}

export function getPatternChecklist(name: string): string[] {
  const pattern = getPattern(name);
  if (!pattern) return [];
  const section = pattern.guidance.match(/\*\*Best practices:\*\*([\s\S]*?)(?:\n\*\*|\n---|$)/i)?.[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line));
}

export function catalogStats(): { patternCount: number; plainAliasCount: number; contextualAliasCount: number } {
  let plainAliasCount = 0;
  let contextualAliasCount = 0;
  for (const pattern of UI_DESIGN_BRAIN.patterns) {
    for (const alias of pattern.aliases) {
      if (typeof alias === "string") plainAliasCount += 1;
      else contextualAliasCount += 1;
    }
  }
  return { patternCount: UI_DESIGN_BRAIN.patterns.length, plainAliasCount, contextualAliasCount };
}

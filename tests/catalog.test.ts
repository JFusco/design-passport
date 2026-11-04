import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { catalogStats, canonicalPatternName, resolvePattern, UI_DESIGN_BRAIN } from "../src/core/catalog";

describe("UI Design Brain resolver", () => {
  it("pins the expected complete catalog", () => {
    expect(catalogStats()).toEqual({ patternCount: 82, plainAliasCount: 166, contextualAliasCount: 8 });
    expect(UI_DESIGN_BRAIN.catalogVersion).toBe(packageJson.devDependencies["ui-design-brain"]);
    expect(UI_DESIGN_BRAIN.catalogDigest).toMatch(/^sha256:/);
  });

  it("resolves every canonical name and casing deterministically", () => {
    const contextualNames = new Set(UI_DESIGN_BRAIN.patterns.flatMap((pattern) => pattern.aliases)
      .filter((alias): alias is { name: string; context: string } => typeof alias !== "string")
      .map((alias) => alias.name.toLocaleLowerCase("en-US")));
    for (const pattern of UI_DESIGN_BRAIN.patterns) {
      if (contextualNames.has(pattern.name.toLocaleLowerCase("en-US"))) {
        expect(resolvePattern(pattern.name)).toMatchObject({ kind: "contextual", requiresConfirmation: true });
      } else {
        expect(resolvePattern(pattern.name)).toMatchObject({ kind: "canonical", canonicalName: pattern.name, requiresConfirmation: false });
        expect(resolvePattern(pattern.name.toLocaleUpperCase("en-US"))).toMatchObject({ kind: "canonical", canonicalName: pattern.name });
      }
    }
  });

  it("resolves every plain alias and preserves slash qualifiers", () => {
    for (const pattern of UI_DESIGN_BRAIN.patterns) {
      for (const alias of pattern.aliases) {
        if (typeof alias !== "string") continue;
        const result = resolvePattern(`${alias} / Product`);
        expect(result).toMatchObject({ kind: "alias", canonicalName: pattern.name, qualifier: "Product", requiresConfirmation: false });
        expect(canonicalPatternName(result)).toBe(`${pattern.name} / Product`);
      }
    }
  });

  it("never guesses any of the eight contextual alias entries", () => {
    const contextual = UI_DESIGN_BRAIN.patterns.flatMap((pattern) => pattern.aliases.filter((alias) => typeof alias !== "string"));
    expect(contextual).toHaveLength(8);
    for (const alias of contextual) {
      if (typeof alias === "string") continue;
      expect(resolvePattern(alias.name)).toMatchObject({ kind: "contextual", requiresConfirmation: true });
    }
    expect(resolvePattern("CTA").candidates).toEqual(["Button", "Link"]);
    expect(resolvePattern("Banner").candidates).toEqual(["Alert", "Hero"]);
  });

  it("records unknown terms as novel", () => {
    expect(resolvePattern("Commerce orbit / Featured")).toMatchObject({ kind: "novel", qualifier: "Featured", requiresConfirmation: false });
  });
});

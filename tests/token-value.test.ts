import { describe, expect, it } from "vitest";
import {
  normalizeSemanticTokenName,
  toVariableValue,
  variableScopesForField,
  variableTypeForField,
  webCodeSyntaxForTokenName,
} from "../src/figma/operations/token-value";

describe("semantic token operations", () => {
  it("normalizes a semantic path without inventing its meaning", () => {
    expect(normalizeSemanticTokenName(" Semantic / Space / Card gap ")).toBe("Semantic/Space/Card gap");
  });

  it.each(["16", "semantic/16px", "semantic/#ff5900", "one-segment", "semantic//gap"])("rejects non-semantic token name %s", (name) => {
    expect(() => normalizeSemanticTokenName(name)).toThrow();
  });

  it("derives exact Figma type, scope and web syntax", () => {
    expect(variableTypeForField("fills")).toBe("COLOR");
    expect(variableTypeForField("fontFamily")).toBe("STRING");
    expect(variableScopesForField("paddingBottom")).toEqual(["GAP"]);
    expect(webCodeSyntaxForTokenName("Semantic / Space / Card Gap")).toBe("var(--semantic-space-card-gap)");
  });

  it("accepts finite values compatible with the chosen variable type", () => {
    expect(toVariableValue(16, "FLOAT")).toBe(16);
    expect(toVariableValue("Inter", "STRING")).toBe("Inter");
    expect(toVariableValue({ r: 1, g: 0.5, b: 0, a: 0.8 }, "COLOR")).toEqual({ r: 1, g: 0.5, b: 0, a: 0.8 });
  });

  it("rejects mismatched and non-finite values", () => {
    expect(() => toVariableValue("16", "FLOAT")).toThrow();
    expect(() => toVariableValue(Number.NaN, "FLOAT")).toThrow();
    expect(() => toVariableValue("", "STRING")).toThrow();
    expect(() => toVariableValue({ r: 2, g: 0.5, b: 0 }, "COLOR")).toThrow();
  });
});

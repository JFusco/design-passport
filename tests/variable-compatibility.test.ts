import { describe, expect, it } from "vitest";
import type { BindableField, VariableCandidate } from "../src/core/contracts";
import {
  isPreciselyScopedVariableForField,
  scopesForBindableField,
  variableTypeForBindableField,
} from "../src/core/operations/variable-compatibility";

function variable(overrides: Partial<VariableCandidate> = {}): VariableCandidate {
  return {
    id: "variable:1",
    key: "variable:key",
    name: "semantic/space/default",
    collectionId: "collection:1",
    collectionKey: "collection:key",
    collectionName: "Semantic Dimensions",
    type: "FLOAT",
    remote: false,
    evidenceLevel: "full",
    semantic: true,
    scopes: ["GAP"],
    modeNames: ["Default"],
    ...overrides,
  };
}

describe("variable compatibility", () => {
  it.each([
    ["fills", "COLOR"],
    ["strokes", "COLOR"],
    ["fontFamily", "STRING"],
    ["fontStyle", "STRING"],
    ["paddingBottom", "FLOAT"],
    ["fontWeight", "FLOAT"],
  ] satisfies Array<[BindableField, VariableCandidate["type"]]>)("maps %s to %s", (field, type) => {
    expect(variableTypeForBindableField(field)).toBe(type);
  });

  it("maps bindable fields to specific Figma scopes", () => {
    expect(scopesForBindableField("fills")).toEqual(["ALL_FILLS", "FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"]);
    expect(scopesForBindableField("paddingTop")).toEqual(["GAP"]);
    expect(scopesForBindableField("fontWeight")).toEqual(["FONT_WEIGHT"]);
  });

  it("accepts only full, compatible and specifically scoped candidates", () => {
    expect(isPreciselyScopedVariableForField(variable(), "itemSpacing")).toBe(true);
    expect(isPreciselyScopedVariableForField(variable({ type: "COLOR" }), "itemSpacing")).toBe(false);
    expect(isPreciselyScopedVariableForField(variable({ evidenceLevel: "summary" }), "itemSpacing")).toBe(false);
    expect(isPreciselyScopedVariableForField(variable({ scopes: [] }), "itemSpacing")).toBe(false);
    expect(isPreciselyScopedVariableForField(variable({ scopes: ["ALL_SCOPES"] }), "itemSpacing")).toBe(false);
    expect(isPreciselyScopedVariableForField(variable({ scopes: ["WIDTH_HEIGHT"] }), "itemSpacing")).toBe(false);
  });
});

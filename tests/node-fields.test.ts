import { describe, expect, it } from "vitest";
import { bindingCoverage, eligibleTokenFields, rawFieldValue } from "../src/core/operations/node-fields";
import { node } from "./fixtures";

describe("code-relevant node fields", () => {
  it("does not count default zero geometry as token debt unless it is bound", () => {
    const unbound = node({
      fills: [],
      boundFields: [],
      layout: { mode: "HORIZONTAL", itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, inferredAvailable: false },
      cornerRadius: 0,
      text: { charactersLength: 1, contentHash: "text", backgroundResolvable: false, paragraphIndent: 0, paragraphSpacing: 0, letterSpacingPx: 0 },
    });
    expect(eligibleTokenFields(unbound)).toEqual([]);

    const bound = node({ ...unbound, boundFields: ["paddingBottom", "paragraphIndent"] });
    expect(eligibleTokenFields(bound)).toEqual(["paddingBottom", "paragraphIndent"]);
  });

  it("counts non-zero padding edges independently", () => {
    const value = node({
      fills: [],
      boundFields: ["paddingTop", "paddingLeft"],
      layout: { mode: "VERTICAL", paddingTop: 8, paddingRight: 16, paddingBottom: 24, paddingLeft: 32, inferredAvailable: false },
    });
    expect(eligibleTokenFields(value)).toEqual(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]);
    expect(rawFieldValue(value, "paddingTop")).toBe(8);
    expect(rawFieldValue(value, "paddingRight")).toBe(16);
    expect(rawFieldValue(value, "paddingBottom")).toBe(24);
    expect(rawFieldValue(value, "paddingLeft")).toBe(32);
    expect(bindingCoverage([value])).toEqual({ eligible: 4, bound: 2, coverage: 50 });
  });

  it("includes effect subfields in binding coverage", () => {
    const value = node({ fills: [], boundFields: [], layout: undefined, effects: [{ type: "DROP_SHADOW", visible: true, eligibleFieldCount: 4, boundFieldCount: 3, boundVariableIds: ["effect:1"], valueHash: "effect-hash" }] });
    expect(bindingCoverage([value])).toEqual({ eligible: 4, bound: 3, coverage: 75 });
  });
});

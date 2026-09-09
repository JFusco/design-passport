import { describe, expect, it } from "vitest";
import { buildChangePlans } from "../src/core/planner";
import { applyAutoLayoutProperties, assessGeometryChange } from "../src/figma/mutations";
import { syntheticFinding } from "./fixtures";

describe("mutation planning and geometry safety", () => {
  it("keeps preview and apply operations deterministic and idempotent", () => {
    const findings = [
      syntheticFinding({ id: "rename", ruleId: "naming.pattern-alias", status: "fail", fixability: "automatic", suggestedValue: { name: "Button / Primary" } }),
      syntheticFinding({ id: "bind", ruleId: "token.application.unique-inference", status: "fail", fixability: "guarded", suggestedValue: { field: "fills", variableId: "var:1" } }),
      syntheticFinding({ id: "layout", ruleId: "structure.inferred-auto-layout", status: "fail", fixability: "guarded", suggestedValue: { tolerance: 0.5 } }),
    ];
    const first = buildChangePlans(findings);
    const second = buildChangePlans(findings);
    expect(first).toEqual(second);
    expect(first.map((plan) => plan.risk)).toEqual(["low", "guarded", "structural"]);
    expect(first.flatMap((plan) => plan.operations.map((operation) => operation.kind))).toEqual(["rename-node", "bind-variable", "apply-inferred-auto-layout"]);
  });

  it("accepts the exact 0.5px geometry boundary and rejects 0.51px", () => {
    const before = [{ x: 0, y: 0, width: 20, height: 20 }];
    expect(assessGeometryChange(before, [{ x: 0.5, y: 0, width: 20, height: 20 }], { width: 100, height: 100 }, 0.5).valid).toBe(true);
    expect(assessGeometryChange(before, [{ x: 0.51, y: 0, width: 20, height: 20 }], { width: 100, height: 100 }, 0.5).valid).toBe(false);
  });

  it("rejects introduced overlap and clipping", () => {
    const before = [{ x: 0, y: 0, width: 20, height: 20 }, { x: 30, y: 0, width: 20, height: 20 }];
    const overlap = [{ ...before[0]! }, { x: 19.8, y: 0, width: 20, height: 20 }];
    expect(assessGeometryChange(before, overlap, { width: 100, height: 100 }, 20).introducedOverlap).toBe(true);
    const clipping = [{ x: -0.6, y: 0, width: 20, height: 20 }, before[1]!];
    expect(assessGeometryChange(before, clipping, { width: 100, height: 100 }, 0.5).introducedClipping).toBe(true);
  });

  it("preserves valid node defaults when Figma omits newer inferred layout fields", () => {
    const node = {
      layoutMode: "NONE",
      primaryAxisSizingMode: "FIXED",
      counterAxisSizingMode: "FIXED",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      itemSpacing: 0,
      layoutWrap: "NO_WRAP",
      counterAxisSpacing: 0,
      itemReverseZIndex: false,
      strokesIncludedInLayout: false,
    } as unknown as FrameNode;
    const inferred = {
      layoutMode: "HORIZONTAL",
      primaryAxisSizingMode: "AUTO",
      counterAxisSizingMode: "AUTO",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "CENTER",
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      itemSpacing: 4,
    } as unknown as InferredAutoLayoutResult;

    applyAutoLayoutProperties(node, inferred);

    expect(node.layoutMode).toBe("HORIZONTAL");
    expect(node.layoutWrap).toBe("NO_WRAP");
    expect(node.counterAxisSpacing).toBe(0);
    expect(node.itemReverseZIndex).toBe(false);
    expect(node.strokesIncludedInLayout).toBe(false);
  });
});

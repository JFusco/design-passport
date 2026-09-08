import { describe, expect, it } from "vitest";
import type { VariableCollectionOption } from "../src/figma/adapter";
import { findingsForReview } from "../src/ui/operations/findings";
import { cloneProfile, gradeClass, relativeTime, statusClass } from "../src/ui/operations/presentation";
import { defaultTokenCollectionId } from "../src/ui/operations/token-wizard";
import { profile, syntheticFinding } from "./fixtures";

function collection(id: string, name: string): VariableCollectionOption {
  return { id, key: `${id}:key`, name, remote: false, modeNames: ["Default"], variableCount: 1 };
}

describe("UI operations", () => {
  it("orders blockers and failures ahead of reviews and passing evidence", () => {
    const findings = [
      syntheticFinding({ id: "pass", status: "pass" }),
      syntheticFinding({ id: "review", status: "needs-review", severity: 4, nodePath: "B" }),
      syntheticFinding({ id: "fail", status: "fail", severity: 1, nodePath: "C" }),
      syntheticFinding({ id: "blocker", status: "fail", severity: 4, hardBlocker: true, nodePath: "Z" }),
    ];
    expect(findingsForReview(findings, { showPassing: false, axis: "all" }).map((finding) => finding.id)).toEqual(["blocker", "fail", "review"]);
    expect(findingsForReview(findings, { showPassing: true, axis: "token-foundation" }).at(-1)?.id).toBe("pass");
    expect(findingsForReview(findings, { showPassing: true, axis: "accessibility" })).toEqual([]);
  });

  it("chooses a collection appropriate to token type with a deterministic fallback", () => {
    const collections = [collection("space", "Semantic Dimensions"), collection("color", "Semantic Colors")];
    expect(defaultTokenCollectionId("fills", collections)).toBe("color");
    expect(defaultTokenCollectionId("paddingBottom", collections)).toBe("space");
    expect(defaultTokenCollectionId("fontWeight", collections)).toBe("space");
    expect(defaultTokenCollectionId("fills", [collection("base", "Primitives")])).toBe("base");
    expect(defaultTokenCollectionId("fills", [])).toBe("");
  });

  it("keeps cloned profiles independent and formats stable presentation values", () => {
    const source = profile();
    const copy = cloneProfile(source);
    copy.breakpoints[0]!.width = 1600;
    expect(source.breakpoints[0]!.width).toBe(1440);
    expect(gradeClass("B")).toBe("grade grade-b");
    expect(statusClass("needs-review")).toBe("status status-needs-review");
    const now = Date.parse("2026-09-08T12:00:00.000Z");
    expect(relativeTime("2026-09-08T11:59:50.000Z", now)).toBe("just now");
    expect(relativeTime("2026-09-08T11:30:00.000Z", now)).toBe("30m ago");
    expect(relativeTime("2026-09-08T10:00:00.000Z", now)).toBe("2h ago");
  });
});

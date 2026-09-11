import { describe, expect, it } from "vitest";
import type { VariableCollectionOption } from "../src/figma/adapter";
import { findingsForReview } from "../src/ui/operations/findings";
import { reportBreakdown } from "../src/ui/operations/breakdown";
import { certificationNotice, cloneProfile, formatDateTime, friendlyReference, gradeClass, humanizeIdentifier, relativeTime, statusClass } from "../src/ui/operations/presentation";
import { buildReadinessReport } from "../src/core/report";
import { defaultTokenCollectionId } from "../src/ui/operations/token-wizard";
import { healthyGraph, profile, syntheticFinding } from "./fixtures";

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
    expect(certificationNotice(2, "source frames", 0)).toBe("Certified 2 source frames.");
    expect(certificationNotice(3, "components", 1)).toBe("Certified 3 components. Removed 1 legacy variant annotation.");
    expect(certificationNotice(3, "components", 0)).toBe("Certified 3 components. Removed 0 legacy variant annotations.");
    const now = Date.parse("2026-09-08T12:00:00.000Z");
    expect(relativeTime("2026-09-08T11:59:50.000Z", now)).toBe("just now");
    expect(relativeTime("2026-09-08T11:30:00.000Z", now)).toBe("30m ago");
    expect(relativeTime("2026-09-08T10:00:00.000Z", now)).toBe("2h ago");
    expect(friendlyReference("h53:10c7d66fa486b1")).toBe("10C7-D66F");
    expect(humanizeIdentifier("project:ui-library-v1")).toBe("UI Library V1");
    expect(formatDateTime("not-a-date")).toBe("Date unavailable");
  });

  it("groups report issues by page and independently graded module", () => {
    const p = profile();
    const graph = healthyGraph(p);
    const report = buildReadinessReport({ graph, profile: p, scope: "file", targetRootIds: ["root:desktop", "root:mobile"] });
    const pages = reportBreakdown(report);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ pageId: "page:1", pageName: "Screens" });
    expect(pages[0]?.modules.map((module) => module.rootId).sort()).toEqual(["root:desktop", "root:mobile"]);
    expect(pages[0]?.actionableCount).toBeGreaterThan(0);
    expect(pages[0]?.modules[0]?.weakestAxes).toHaveLength(3);
  });

  it("keeps variant finding ids available for exact UI filtering", () => {
    const p = profile();
    const graph = healthyGraph(p);
    graph.nodes["root:desktop"]!.type = "COMPONENT_SET";
    graph.nodes["root:desktop"]!.childIds = ["variant:1"];
    graph.nodes["variant:1"] = {
      ...graph.nodes["button:1"]!,
      id: "variant:1",
      rootId: "root:desktop",
      parentId: "root:desktop",
      path: "Screens / Button / state=Default",
      name: "state=Default",
      type: "COMPONENT",
      childIds: ["button:1"],
      variantProperties: { state: "Default" },
    };
    graph.nodes["button:1"]!.parentId = "variant:1";
    const report = buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"] });
    const variant = reportBreakdown(report)[0]?.modules[0]?.variants[0];
    expect(variant?.variantId).toBe("variant:1");
    expect(variant?.findingIds.every((id) => report.findings.some((finding) => finding.id === id))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { reportToMarkdown } from "../src/core/markdown";
import { profileSemanticErrors } from "../src/core/profile";
import { validateContract } from "../src/core/schema";
import { buildReadinessReport } from "../src/core/report";
import { parseStoredProfile } from "../src/figma/operations/shared-data";
import { healthyGraph, profile } from "./fixtures";

describe("contracts and hostile input handling", () => {
  it("validates profile JSON Schema and semantic constraints", () => {
    const p = profile();
    expect(validateContract("readiness-profile", p)).toEqual({ valid: true, errors: [] });
    const invalidBreakpoints = { ...p, breakpoints: [{ name: "Desktop", width: 1440 }, { name: "desktop", width: 1440 }] };
    expect(profileSemanticErrors(invalidBreakpoints)).toEqual(expect.arrayContaining([
      "Breakpoint names must be unique",
      "Breakpoint widths must be unique",
    ]));
    const duplicateRoles = {
      ...p,
      pageRoles: {
        ...p.pageRoles,
        components: { ...p.pageRoles.components, pageIds: ["page:1"] },
      },
    };
    expect(profileSemanticErrors(duplicateRoles)).toContain("Pages may have only one role: page:1");
    expect(profileSemanticErrors({ ...p, breakpoints: [{ name: " Desktop ", width: 1440 }] })).toContain("Breakpoint names must be non-empty and trimmed");
    expect(profileSemanticErrors({ ...p, breakpoints: [{ name: "Desktop", width: 0 }] }).join(" ")).toMatch(/> 0|greater than 0|positive/i);
  });

  it.each([true, false])("loads a legacy profile with requireCodeConnect=%s without changing unrelated settings", (legacyValue) => {
    const current = profile({
      artifactKind: "library",
      tokenSourceCollectionKeys: ["collection:one", "collection:two"],
      breakpoints: [{ name: "Wide", width: 1600, variableModeName: "Desktop" }],
    });
    const legacy = { ...current, requireCodeConnect: legacyValue };
    expect(validateContract("readiness-profile", legacy).valid).toBe(false);
    expect(parseStoredProfile(JSON.stringify(legacy))).toEqual(current);
  });

  it("escapes untrusted layer content in Markdown exports", () => {
    const p = profile();
    const report = buildReadinessReport({ graph: healthyGraph(p), profile: p, scope: "selection", targetRootIds: ["root:desktop"] });
    report.findings[0]!.title = "<script>|break [click](javascript:alert(1))";
    const markdown = reportToMarkdown(report);
    expect(markdown).toContain("&lt;script&gt;\\|break");
    expect(markdown).toContain("The score belongs to the component set as a whole");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("[click](javascript:");
  });
});

import { describe, expect, it } from "vitest";
import { parseFigmaSourceUrl, referencePackFromFigmaRest, validateReviewBatch } from "../src/core/review-source";

describe("Figma companion source validation", () => {
  it("accepts exact Figma design URLs and normalizes node ids", () => {
    expect(parseFigmaSourceUrl("https://www.figma.com/design/gXT4bIDrkgva2uSzY763oG/UI-Design-Library?node-id=0-1&p=f")).toEqual({ fileKey: "gXT4bIDrkgva2uSzY763oG", nodeId: "0:1" });
  });

  it.each([
    "http://www.figma.com/design/gXT4bIDrkgva2uSzY763oG/x",
    "https://www.figma.com.evil.example/design/gXT4bIDrkgva2uSzY763oG/x",
    "https://user@www.figma.com/design/gXT4bIDrkgva2uSzY763oG/x",
    "https://www.figma.com:444/design/gXT4bIDrkgva2uSzY763oG/x",
    "https://www.figma.com/proto/gXT4bIDrkgva2uSzY763oG/x",
    "https://www.figma.com/design/gXT4bIDrkgva2uSzY763oG/%E0%A4%A",
  ])("rejects unsafe or unsupported URL %s", (url) => expect(() => parseFigmaSourceUrl(url)).toThrow());

  it("enforces target, style-guide, project-scope, profile, and unknown-field constraints", () => {
    const target = { sourceId: "target:1", projectScope: "project:1", role: "target" as const, url: "https://figma.com/design/abcdefgh/Target", readinessProfile: {} };
    expect(validateReviewBatch({ projectScope: "project:1", sources: [target] })).toBeDefined();
    expect(() => validateReviewBatch({ projectScope: "project:1", sources: [{ ...target, readinessProfile: undefined }] })).toThrow(/profile/i);
    expect(() => validateReviewBatch({ projectScope: "project:1", sources: [{ ...target, projectScope: "project:2" }] })).toThrow(/scope/i);
    expect(() => validateReviewBatch({ projectScope: "project:1", sources: [target, { ...target, sourceId: "style:1", role: "style-guide" }, { ...target, sourceId: "style:2", role: "style-guide" }] })).toThrow(/at most one/i);
    expect(() => validateReviewBatch({ projectScope: "project:1", sources: [{ ...target, surprise: true } as typeof target] })).toThrow(/unsupported/i);
  });

  it("normalizes isolated REST data into a sanitized advisory pack", () => {
    const result = referencePackFromFigmaRest({
      sourceId: "style:1",
      projectScope: "project:1",
      role: "style-guide",
      file: { document: { type: "DOCUMENT", children: [{ type: "FRAME", name: "Foundation", itemSpacing: 8, paddingTop: 16, cornerRadius: 4, absoluteBoundingBox: { width: 1440 } }, { type: "COMPONENT", name: "Button" }] } },
      now: new Date("2026-09-10T12:00:00Z"),
    });
    expect(result.source.role).toBe("style-guide");
    expect(result.facts.some((fact) => fact.domain === "components")).toBe(true);
    expect(result.facts.some((fact) => fact.domain === "layout")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("figma.com");
  });

  it("prefers explicitly documented breakpoints and imports structured guidance markers", () => {
    const result = referencePackFromFigmaRest({
      sourceId: "style:1",
      projectScope: "project:1",
      role: "style-guide",
      file: {
        components: { remote: { name: "Modal" } },
        document: {
          type: "DOCUMENT",
          children: [
            { type: "FRAME", name: "Passport Breakpoint :: Desktop :: 1440", absoluteBoundingBox: { width: 1280 } },
            { type: "FRAME", name: "Passport Breakpoint :: Mobile :: 390", absoluteBoundingBox: { width: 720 } },
            { type: "FRAME", name: "Passport Guidance :: accessibility :: Focus visibility :: Show a visible focus indicator for controls." },
            { type: "INSTANCE", name: "Button" },
          ],
        },
      },
      now: new Date("2026-09-10T12:00:00Z"),
    });
    expect(result.facts).toContainEqual(expect.objectContaining({ domain: "accessibility", label: "Focus visibility", guidance: "Show a visible focus indicator for controls." }));
    expect(result.facts).toContainEqual(expect.objectContaining({
      domain: "breakpoints",
      matcher: { kind: "numeric-node-field", field: "frameWidth", allowedValues: [390, 1440] },
    }));
    expect(result.facts).toContainEqual(expect.objectContaining({
      domain: "components",
      matcher: expect.objectContaining({ allowedValues: ["Button", "Modal"] }),
    }));
  });

  it("recognizes document-bound variables when the local-variables endpoint is unavailable", () => {
    const result = referencePackFromFigmaRest({
      sourceId: "style:1",
      projectScope: "project:1",
      role: "style-guide",
      file: {
        document: {
          type: "DOCUMENT",
          children: [{
            type: "FRAME",
            name: "Token specimen",
            boundVariables: { paddingTop: { type: "VARIABLE_ALIAS", id: "VariableID:1:2" } },
          }],
        },
      },
      now: new Date("2026-09-10T12:00:00Z"),
    });
    expect(result.facts).toContainEqual(expect.objectContaining({ factId: "fact:variables-present", domain: "tokens" }));
    expect(result.source.completeness.warnings).not.toContain("Local variable details were unavailable from the Figma REST API.");
  });
});

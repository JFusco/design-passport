import { describe, expect, it, vi } from "vitest";
import { CERTIFICATION_ANNOTATION_PREFIX, LEGACY_CERTIFICATION_ANNOTATION_PREFIX } from "../src/core/constants";
import { clearVariantCoverageAnnotations, setCertification } from "../src/figma/mutations";
import { annotationText, copyAnnotationForWrite, preservedAnnotations } from "../src/figma/operations/annotations";

describe("annotation safety", () => {
  it("uses Markdown as the authoritative label and writes exactly one label shape", () => {
    const source = { label: "legacy", labelMarkdown: "**current**", properties: [{ type: "TYPE", label: "Grade" }] } as unknown as Annotation;
    expect(annotationText(source)).toBe("**current**");
    const copy = copyAnnotationForWrite(source) as unknown as Record<string, unknown>;
    expect(copy.labelMarkdown).toBe("**current**");
    expect(copy).not.toHaveProperty("label");
    expect(copy.properties).not.toBe((source as unknown as { properties: unknown }).properties);
  });

  it("preserves unrelated annotations while replacing both current and legacy certificates", () => {
    const annotations = [
      { label: `${CERTIFICATION_ANNOTATION_PREFIX} Grade B` },
      { labelMarkdown: `${LEGACY_CERTIFICATION_ANNOTATION_PREFIX} Grade C` },
      { label: "AI source frame" },
    ] as unknown as Annotation[];
    expect(preservedAnnotations(annotations, [CERTIFICATION_ANNOTATION_PREFIX, LEGACY_CERTIFICATION_ANNOTATION_PREFIX]).map(annotationText)).toEqual(["AI source frame"]);
  });

  it("writes the source marker and concise grade note when certifying a component", () => {
    const node = {
      annotations: [],
      setSharedPluginData: vi.fn(),
      setRelaunchData: vi.fn(),
    } as unknown as SceneNode;
    setCertification(node, {
      schemaVersion: 1,
      grade: "B",
      score: 82.3,
      rulesetVersion: "1.0.0-beta.1",
      catalogVersion: "1.17.0",
      certifiedAt: "2026-09-09T11:00:00.000Z",
      snapshotHash: "report",
      knowledgeSnapshotHash: "knowledge",
    });
    expect((node as SceneNode & { annotations: Annotation[] }).annotations.map(annotationText)).toEqual([
      "AI source frame",
      "[Design Passport] Grade B (82.3).",
    ]);
  });

  it("summarizes component-set coverage on the certified root", () => {
    const node = {
      annotations: [],
      setSharedPluginData: vi.fn(),
      setRelaunchData: vi.fn(),
    } as unknown as SceneNode;
    setCertification(node, {
      schemaVersion: 1,
      grade: "A",
      score: 94.9,
      rulesetVersion: "1.0.0-beta.1",
      catalogVersion: "1.17.0",
      certifiedAt: "2026-09-09T11:00:00.000Z",
      snapshotHash: "report",
      knowledgeSnapshotHash: "knowledge",
    }, 18);
    expect((node as SceneNode & { annotations: Annotation[] }).annotations.map(annotationText)).toEqual([
      "AI source frame",
      "[Design Passport] Grade A (94.9) · 18 variants scanned as one component set.",
    ]);
  });

  it("clears legacy coverage notes while preserving designer annotations", () => {
    const node = {
      type: "COMPONENT",
      parent: { type: "COMPONENT_SET" },
      annotations: [
        { label: "Designer note" },
        { label: "[Design Passport] Covered by “In-page navigation” aggregate B (87.9); this variant is not independently graded." },
        { labelMarkdown: "[Design Passport] Covered by **legacy Markdown note**" },
      ],
    } as unknown as SceneNode;
    expect(clearVariantCoverageAnnotations(node)).toBe(2);
    expect((node as SceneNode & { annotations: Annotation[] }).annotations.map(annotationText)).toEqual([
      "Designer note",
    ]);
    expect(clearVariantCoverageAnnotations(node)).toBe(0);
    expect((node as SceneNode & { annotations: Annotation[] }).annotations.map(annotationText)).toEqual(["Designer note"]);
  });
});

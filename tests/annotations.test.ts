import { describe, expect, it } from "vitest";
import { CERTIFICATION_ANNOTATION_PREFIX, LEGACY_CERTIFICATION_ANNOTATION_PREFIX } from "../src/core/constants";
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
});

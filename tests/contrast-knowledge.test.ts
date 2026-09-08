import { describe, expect, it } from "vitest";
import { contrastRatio, isLargeText } from "../src/core/contrast";
import { isKnowledgeFresh, parseResponsiveName } from "../src/core/knowledge";
import { healthyGraph } from "./fixtures";

describe("measured accessibility and context freshness", () => {
  it("calculates WCAG contrast and large-text thresholds", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, { r: 1, g: 1, b: 1, a: 1 })).toBeCloseTo(21, 4);
    expect(contrastRatio({ r: 0.5, g: 0.5, b: 0.5, a: 1 }, { r: 1, g: 1, b: 1, a: 1 })).toBeCloseTo(3.98, 1);
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(18.66, 700)).toBe(true);
    expect(isLargeText(18, 700)).toBe(false);
  });

  it("parses only complete responsive specimen names", () => {
    expect(parseResponsiveName("Hero / Desktop / 1440")).toEqual({ artifact: "Hero", breakpoint: "Desktop", width: 1440 });
    expect(parseResponsiveName("Commerce / Hero / Mobile / 375")).toEqual({ artifact: "Commerce / Hero", breakpoint: "Mobile", width: 375 });
    expect(parseResponsiveName("Hero / Desktop")).toBeUndefined();
    expect(parseResponsiveName("Hero / Desktop / wide")).toBeUndefined();
  });

  it("requires a complete context no older than fifteen minutes", () => {
    const graph = healthyGraph();
    expect(isKnowledgeFresh(graph, Date.parse("2026-09-07T12:14:59.000Z"))).toBe(true);
    expect(isKnowledgeFresh(graph, Date.parse("2026-09-07T12:15:01.000Z"))).toBe(false);
    expect(isKnowledgeFresh({ ...graph, complete: false }, Date.parse("2026-09-07T12:01:00.000Z"))).toBe(false);
  });
});

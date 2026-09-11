import { afterEach, describe, expect, it } from "vitest";
import { buildReferencePack } from "../src/core/knowledge-loop";
import { hashValue } from "../src/core/stable";
import { FigmaAdapter } from "../src/figma/adapter";

function pack() {
  return buildReferencePack({
    packVersion: "1.0.0",
    source: {
      schemaVersion: 1,
      sourceId: "source:style",
      projectScope: "project:ui-library",
      role: "style-guide",
      contentDigest: hashValue("source"),
      completeness: { complete: true, availableDomains: ["layout"], warnings: [] },
    },
    facts: [{ factId: "fact:spacing", domain: "layout", label: "Spacing", guidance: "Use the project spacing scale.", matcher: { kind: "informational" }, provenance: "figma-derived" }],
  }, new Date("2026-09-10T12:00:00Z"));
}

afterEach(() => Reflect.deleteProperty(globalThis, "figma"));

describe("private project style-guide storage", () => {
  it("persists only a validated file-bound payload and retains it after an invalid replacement", () => {
    let stored = "";
    Object.assign(globalThis, { figma: {
      editorType: "figma",
      fileKey: "file-key",
      root: {
        id: "root",
        getPluginData: () => stored,
        setPluginData: (_key: string, value: string) => { stored = value; },
      },
    } });
    const adapter = new FigmaAdapter();
    const binding = adapter.importProjectStyleGuide(JSON.stringify(pack()));
    expect(binding.pack.source.role).toBe("style-guide");
    expect(stored).not.toContain("file-key");
    const validStored = stored;
    expect(() => adapter.importProjectStyleGuide("not json")).toThrow();
    expect(stored).toBe(validStored);
  });

  it("reads in Dev Mode but blocks replacement and removal", () => {
    let stored = "";
    Object.assign(globalThis, { figma: {
      editorType: "figma",
      fileKey: "file-key",
      root: { id: "root", getPluginData: () => stored, setPluginData: (_key: string, value: string) => { stored = value; } },
    } });
    const adapter = new FigmaAdapter();
    adapter.importProjectStyleGuide(JSON.stringify(pack()));
    (globalThis as unknown as { figma: { editorType: string } }).figma.editorType = "dev";
    expect(adapter.getProjectStyleGuideStatus().state).toBe("active");
    expect(() => adapter.importProjectStyleGuide(JSON.stringify(pack()))).toThrow(/Design mode/i);
    expect(() => adapter.removeProjectStyleGuide()).toThrow(/Design mode/i);
  });

  it("rejects copied-file fingerprints and missing stable file keys", () => {
    let stored = "";
    Object.assign(globalThis, { figma: {
      editorType: "figma",
      fileKey: "file-key",
      root: { id: "root", getPluginData: () => stored, setPluginData: (_key: string, value: string) => { stored = value; } },
    } });
    const adapter = new FigmaAdapter();
    adapter.importProjectStyleGuide(JSON.stringify(pack()));
    (globalThis as unknown as { figma: { fileKey?: string } }).figma.fileKey = "copied-file-key";
    expect(adapter.getProjectStyleGuideStatus()).toMatchObject({ state: "invalid" });
    Reflect.deleteProperty((globalThis as unknown as { figma: object }).figma, "fileKey");
    expect(() => adapter.importProjectStyleGuide(JSON.stringify(pack()))).toThrow(/stable Figma file key/i);
  });
});

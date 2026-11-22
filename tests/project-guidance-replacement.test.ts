import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReferencePack, parseReferencePack } from "../src/core/knowledge-loop";
import { hashValue } from "../src/core/stable";
import { FigmaAdapter } from "../src/figma/adapter";

function guidance(role: "style-guide" | "reference" = "style-guide") {
  return buildReferencePack({
    packVersion: "qa-v1",
    source: {
      schemaVersion: 1,
      sourceId: "source:qa",
      projectScope: "project:qa",
      role,
      contentDigest: hashValue("sanitized-qa"),
      completeness: { complete: true, availableDomains: ["layout"], warnings: [] },
    },
    facts: [{ factId: "fact:spacing", domain: "layout", label: "Spacing", guidance: "Use documented spacing when applicable.", matcher: { kind: "informational" }, provenance: "figma-derived" }],
  });
}

function file() {
  const stored = new Map<string, string>();
  const api = {
    editorType: "figma",
    fileKey: "qa-origin-file",
    root: {
      getPluginData: (key: string) => stored.get(key) ?? "",
      setPluginData: vi.fn((key: string, value: string) => stored.set(key, value)),
    },
  };
  vi.stubGlobal("figma", api);
  return { api, stored, adapter: new FigmaAdapter() };
}

afterEach(() => vi.unstubAllGlobals());

describe("project guidance replacement isolation", () => {
  it.each([
    ["malformed", (): string => "{", /valid JSON/],
    ["wrong role", (): string => JSON.stringify(guidance("reference")), /role must be style-guide/],
    ["unsafe", (): string => {
      const pack = guidance();
      pack.facts[0]!.guidance = "Reserved test address https://example.invalid/qa";
      return JSON.stringify(pack);
    }, /Unsafe URL/],
    ["oversized", (): string => JSON.stringify(guidance()) + " ".repeat(90_001), /90 KB/],
    ["digest invalid", (): string => {
      const pack = guidance();
      pack.facts[0]!.guidance = "Changed without regenerating the digest.";
      return JSON.stringify(pack);
    }, /digest does not match/],
    ["schema invalid", (): string => JSON.stringify({ ...guidance(), unexpected: true }), /JSON Schema/],
  ] as const)("retains the exact previous binding after a %s replacement", (_label, invalidRaw, error) => {
    const { api, stored, adapter } = file();
    adapter.importProjectStyleGuide(JSON.stringify(guidance()));
    const before = [...stored];
    const status = adapter.getProjectStyleGuideStatus();
    expect(() => adapter.importProjectStyleGuide(invalidRaw())).toThrow(error);
    expect([...stored]).toEqual(before);
    expect(adapter.getProjectStyleGuideStatus()).toEqual(status);
    expect(api.root.setPluginData).toHaveBeenCalledTimes(1);
  });

  it("identifies reviewed revisions independently of the base guide, including partial and final withdrawals", () => {
    const { adapter } = file();
    const base = guidance();
    adapter.importProjectStyleGuide(JSON.stringify(base));
    const first = { ...base.facts[0]!, factId: "fact:approved-a", provenance: "approved-project" as const, candidateDigest: hashValue("a") };
    const second = { ...first, factId: "fact:approved-b", candidateDigest: hashValue("b") };
    const apply = (facts: typeof base.facts) => {
      const pack = buildReferencePack({ packVersion: base.packVersion, source: { ...base.source, sourceId: "project-guidance:project:qa" }, facts });
      return adapter.importProjectStyleGuide(JSON.stringify(pack));
    };
    for (const facts of [[second, first], [first], [first], []]) {
      const binding = apply(facts);
      expect(binding.pack.facts).toContainEqual(base.facts[0]);
      expect(binding.pack.facts).toHaveLength(1 + facts.length);
      expect(adapter.getProjectStyleGuideStatus()).toMatchObject({ guidanceRevision: hashValue(facts.map((fact) => fact.candidateDigest).sort()) });
    }
    const { candidateDigest: _missing, ...legacy } = first;
    apply([legacy]);
    expect(adapter.getProjectStyleGuideStatus()).toMatchObject({ state: "active", guidanceRevision: undefined });
  });

  it("permits Dev Mode reads while blocking replacement and removal", () => {
    const { api, stored, adapter } = file();
    const binding = adapter.importProjectStyleGuide(JSON.stringify(guidance()));
    const before = [...stored];
    api.editorType = "dev";
    expect(adapter.getProjectStyleGuideBinding()).toEqual(binding);
    expect(adapter.getProjectStyleGuideStatus().state).toBe("active");
    expect(() => adapter.importProjectStyleGuide(JSON.stringify(guidance()))).toThrow(/Switch to Design mode/);
    expect(() => adapter.removeProjectStyleGuide()).toThrow(/Switch to Design mode/);
    expect([...stored]).toEqual(before);
    expect(api.root.setPluginData).toHaveBeenCalledTimes(1);
  });

  it("rejects a copied binding without clearing it or applying its guidance", () => {
    const { api, stored, adapter } = file();
    adapter.importProjectStyleGuide(JSON.stringify(guidance()));
    const before = [...stored];
    api.fileKey = "qa-copied-file";
    expect(adapter.getProjectStyleGuideStatus()).toMatchObject({ state: "invalid", error: "Project style guide belongs to a different Figma file" });
    expect(() => adapter.getProjectStyleGuideBinding()).toThrow(/different Figma file/);
    expect([...stored]).toEqual(before);
    expect(api.root.setPluginData).toHaveBeenCalledTimes(1);
  });

  it("enforces the exact UTF-8 input limit before parsing", () => {
    const raw = JSON.stringify(guidance());
    const boundary = raw + " ".repeat(90_000 - Buffer.byteLength(raw, "utf8"));
    expect(parseReferencePack(boundary).digest).toBe(JSON.parse(raw).digest);
    expect(() => parseReferencePack(boundary + " ")).toThrow(/90 KB/);
  });
});

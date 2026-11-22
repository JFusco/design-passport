import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesignReferencePackV1 } from "../src/core/contracts";
import { buildReferencePack, parseReferencePack } from "../src/core/knowledge-loop";
import { hashValue } from "../src/core/stable";
import { FigmaAdapter } from "../src/figma/adapter";
import { newBuildDiagnostics } from "../src/figma/context-cache";
import type { PluginToUiMessage, UiToPluginMessage } from "../src/plugin/messages";
import { healthyGraph, profile } from "./fixtures";

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

function file(fileKey: string | null = "qa-origin-file") {
  const stored = new Map<string, string>();
  const api = {
    editorType: "figma",
    fileKey: fileKey ?? undefined,
    root: {
      getPluginData: (key: string) => stored.get(key) ?? "",
      setPluginData: vi.fn((key: string, value: string) => stored.set(key, value)),
    },
  };
  vi.stubGlobal("figma", api);
  return { api, stored, adapter: new FigmaAdapter() };
}

function approvedGuidance(facts: DesignReferencePackV1["facts"], projectScope = "project:qa") {
  const base = guidance();
  const contentDigest = hashValue(facts.map((fact) => fact.candidateDigest).sort());
  return buildReferencePack({
    packVersion: base.packVersion,
    source: { ...base.source, sourceId: `project-guidance:${projectScope}`, projectScope, contentDigest },
    facts,
  });
}

const approvedFact = {
  ...guidance().facts[0]!,
  factId: "fact:approved",
  provenance: "approved-project" as const,
  candidateDigest: hashValue("approved"),
};

async function openPlugin(persistent: boolean) {
  vi.resetModules();
  const { FigmaAdapter: Adapter } = await import("../src/figma/adapter");
  const { api } = file(persistent ? "qa-origin-file" : null);
  const saved = new Map<string, unknown>();
  const events: PluginToUiMessage[] = [];
  const ui = {
    postMessage: (message: PluginToUiMessage) => events.push(message),
    onmessage: undefined as ((message: UiToPluginMessage) => Promise<void>) | undefined,
  };
  const configured = profile();
  const graph = healthyGraph(configured);
  const page = { id: "page:1", name: "Screens", selection: [] };
  Object.assign(api.root, {
    id: "document", name: graph.fileName, children: [page],
    getSharedPluginData: () => JSON.stringify(configured),
  });
  Object.assign(api, {
    ui, currentPage: page, showUI: vi.fn(), loadAllPagesAsync: vi.fn(), on: vi.fn(),
    clientStorage: {
      getAsync: async (key: string) => structuredClone(saved.get(key)),
      setAsync: async (key: string, value: unknown) => { saved.set(key, structuredClone(value)); },
      deleteAsync: async (key: string) => { saved.delete(key); },
      keysAsync: async () => [...saved.keys()],
    },
  });
  vi.spyOn(Adapter.prototype, "getCollectionOptions").mockResolvedValue([]);
  vi.spyOn(Adapter.prototype, "matchesVariableEnvironment").mockResolvedValue(true);
  vi.spyOn(Adapter.prototype, "buildKnowledge").mockResolvedValue({ graph, collections: [], diagnostics: newBuildDiagnostics() });
  vi.stubGlobal("__html__", "");
  await import("../src/plugin/main");
  async function send(message: UiToPluginMessage) {
    const start = events.length;
    await ui.onmessage!(message);
    return events.slice(start);
  }
  await send({ type: "initialize" });
  return send;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it("replaces session guidance, preserving the base facts and rejecting foreign removals", async () => {
    const send = await openPlugin(false);
    const base = guidance();
    const importGuide = (pack: DesignReferencePackV1) => send({ type: "add-session-reference", raw: JSON.stringify(pack) });
    await importGuide(base);
    await send({ type: "generate-context", regenerate: false });
    const scan = { type: "scan", request: { scope: "page", refreshKnowledge: false } } as const;
    const initial = (await send(scan)).find((event) => event.type === "scan-result");
    expect(initial?.insights.filter((insight) => insight.origin === "project").map((insight) => insight.factId)).toEqual(["fact:spacing"]);
    for (const facts of [[approvedFact], []]) {
      const pack = approvedGuidance(facts);
      const events = await importGuide(pack);
      expect(events.find((event) => event.type === "session-reference-result")).toMatchObject({
        projectStyleGuide: { persistent: false, guidanceRevision: pack.source.contentDigest },
      });
      expect(events.find((event) => event.type === "scan-result")?.insights.filter((insight) => insight.origin === "project").map((insight) => insight.factId).sort())
        .toEqual(["fact:spacing", ...facts.map((fact) => fact.factId)].sort());
    }
    expect(await importGuide(approvedGuidance([], "project:other"))).toContainEqual(expect.objectContaining({
      type: "error", message: expect.stringContaining("same project scope"),
    }));
    const afterError = (await send(scan)).find((event) => event.type === "scan-result");
    expect(afterError?.insights).toEqual(initial?.insights);
  });

  it("refreshes live advice and reopens the original saved report with its captured insights", async () => {
    const send = await openPlugin(true);
    const importGuide = (pack: DesignReferencePackV1) => send({ type: "import-project-style-guide", raw: JSON.stringify(pack) });
    await importGuide(guidance());
    const originalFact = { ...approvedFact, factId: "fact:original", candidateDigest: hashValue("original") };
    await importGuide(approvedGuidance([originalFact]));
    await send({ type: "generate-context", regenerate: false });
    const scanned = (await send({ type: "scan", request: { scope: "page", refreshKnowledge: false } })).find((event) => event.type === "scan-result");
    expect(scanned?.savedAuditId).toBeTruthy();
    expect(scanned?.insights).toContainEqual(expect.objectContaining({ factId: originalFact.factId }));
    for (const facts of [[approvedFact], []]) {
      const pack = approvedGuidance(facts);
      const events = await importGuide(pack);
      expect(events.find((event) => event.type === "project-style-guide-result")).toMatchObject({
        status: { guidanceRevision: pack.source.contentDigest },
      });
      const result = events.find((event) => event.type === "scan-result");
      expect(result).toMatchObject({ report: scanned!.report, savedAuditId: scanned!.savedAuditId, saveStatus: { state: "saved" } });
      expect(result?.insights.filter((insight) => insight.origin === "project").map((insight) => insight.factId).sort())
        .toEqual(["fact:spacing", ...facts.map((fact) => fact.factId)].sort());
    }
    const reopened = (await send({ type: "open-saved-audit", id: scanned!.savedAuditId! })).find((event) => event.type === "restored-audit");
    expect(reopened?.audit).toMatchObject({ id: scanned!.savedAuditId, report: scanned!.report, insights: scanned!.insights });
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

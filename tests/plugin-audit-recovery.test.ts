import { afterEach, describe, expect, it, vi } from "vitest";
import type { CapturedAuditTarget } from "../src/figma/adapter";
import type { PluginToUiMessage, UiToPluginMessage } from "../src/plugin/messages";
import { hashValue } from "../src/core/stable";
import { healthyGraph, profile } from "./fixtures";
import { contextFixture } from "./context-cache-fixtures";

function memoryStorage() {
  const data = new Map<string, unknown>();
  return {
    data,
    getAsync: vi.fn(async (key: string) => structuredClone(data.get(key))),
    setAsync: vi.fn(async (key: string, value: unknown) => { data.set(key, structuredClone(value)); }),
    deleteAsync: vi.fn(async (key: string) => { data.delete(key); }),
    keysAsync: vi.fn(async () => [...data.keys()]),
  };
}

async function launch(storage = memoryStorage(), fileKey: string | undefined = "file-key", editorType: "figma" | "dev" = "figma", waitForRestore = true, inputProfile = profile()) {
  vi.resetModules();
  const events: PluginToUiMessage[] = [];
  let cancelled = false;
  const adapter = {
    getBootstrap: vi.fn(async () => ({
      fileName: "Golden Product", fileKeyAvailable: Boolean(fileKey), editorType, canMutateDocument: editorType === "figma",
      pages: [{ id: "page:1", name: "Screens" }], collections: [], profile: inputProfile, profileSuggestion: inputProfile,
      profileConfigured: true, profileIssues: [], selectionSummary: { eligibleCount: 1, unsupportedCount: 0 },
      projectStyleGuide: { state: "none", persistent: Boolean(fileKey) },
    })),
    getCollectionOptions: vi.fn(async () => []),
    getProjectStyleGuideStatus: vi.fn(() => ({ state: "none", persistent: Boolean(fileKey) })),
    reconcileProfile: vi.fn(() => ({ profile: inputProfile, profileConfigured: true, profileIssues: [] })),
    saveProfile: vi.fn(async () => undefined),
    beginScan: vi.fn(() => { cancelled = false; }),
    cancel: vi.fn(() => { cancelled = true; }),
    isScanCancelled: vi.fn(() => cancelled),
    buildKnowledge: vi.fn(async () => {
      const graph = healthyGraph(inputProfile);
      graph.builtAt = new Date().toISOString();
      return { graph, collections: [], diagnostics: {} };
    }),
    matchesDocumentTopology: vi.fn(() => true),
    matchesVariableEnvironment: vi.fn(async () => true),
    captureAuditTarget: vi.fn((scope: string): CapturedAuditTarget => scope === "page"
      ? { scope: "page", pageId: "page:1" } : { scope: "selection", nodeIds: ["root:desktop"] }),
    targetRootIds: vi.fn((target: CapturedAuditTarget) => target.scope === "selection" ? [...target.nodeIds] : ["root:desktop"]),
    getSelectionSummary: vi.fn(() => ({ eligibleCount: 1, unsupportedCount: 0 })),
    navigate: vi.fn(async () => undefined),
  };
  const handlers = new Map<string, (event: unknown) => void>();
  const ui: { postMessage: (message: PluginToUiMessage) => void; onmessage?: (message: UiToPluginMessage) => Promise<void> } = {
    postMessage: (message) => events.push(message),
  };
  const figmaMock = {
    fileKey, editorType, clientStorage: storage, ui,
    showUI: vi.fn(), root: { id: "document", name: "Golden Product", children: [{ id: "page:1", name: "Screens" }] },
    loadAllPagesAsync: vi.fn(async () => undefined),
    on: vi.fn((type: string, handler: (event: unknown) => void) => handlers.set(type, handler)),
  };
  vi.stubGlobal("figma", figmaMock);
  vi.stubGlobal("__html__", "");
  vi.doMock("../src/figma/adapter", () => ({ FigmaAdapter: class { constructor() { return adapter; } } }));
  await import("../src/plugin/main");
  const send = async (message: UiToPluginMessage) => { await ui.onmessage?.(message); };
  await send({ type: "initialize" });
  if (waitForRestore) await vi.waitFor(() => expect(events.some((event) => event.type === "saved-audits" || event.type === "audit-save-status")).toBe(true));
  return { storage, events, adapter, handlers, send, figmaMock };
}

async function launchWithVariables() {
  const fixture = contextFixture(2);
  const variable = { id: "variable:1", key: "variable:key", name: "semantic/space", variableCollectionId: "collection:1", resolvedType: "FLOAT", remote: false, valuesByMode: { mode: 8 }, scopes: ["GAP"], codeSyntax: {} };
  const collection = { id: "collection:1", key: "collection:key", name: "Semantic", remote: false, modes: [{ modeId: "mode", name: "Default" }], defaultModeId: "mode", variableIds: [variable.id] };
  fixture.setVariables([variable as unknown as Variable]);
  fixture.setCollections([collection as unknown as VariableCollection]);
  const plugin = await launch(memoryStorage(), "file-key", "figma", true, fixture.readinessProfile);
  Object.assign(plugin.figmaMock, { variables: fixture.figma.variables, teamLibrary: fixture.figma.teamLibrary, mixed: fixture.figma.mixed });
  plugin.figmaMock.root.children.splice(0, plugin.figmaMock.root.children.length, ...fixture.pages);
  plugin.adapter.buildKnowledge.mockImplementation(async () => {
    const result = await fixture.adapter.buildKnowledge(fixture.readinessProfile, () => undefined, { contextCache: fixture.cache });
    return { ...result, collections: [] };
  });
  plugin.adapter.matchesVariableEnvironment.mockImplementation(() => fixture.adapter.matchesVariableEnvironment());
  plugin.adapter.captureAuditTarget.mockReturnValue({ scope: "page", pageId: "page:0" });
  plugin.adapter.targetRootIds.mockImplementation((target) => target.scope === "page"
    ? fixture.pages.find((page) => page.id === target.pageId)?.children.map((root) => root.id) ?? []
    : fixture.pages.flatMap((page) => page.children.map((root) => root.id)));
  return { ...plugin, fixture, variable };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("../src/figma/adapter");
  vi.restoreAllMocks();
});

describe("plugin audit recovery integration", () => {
  it("saves before completion and restores after a fresh launch without building context", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "selection", refreshKnowledge: false } });
    const result = first.events.find((event) => event.type === "scan-result");
    expect(result).toMatchObject({ saveStatus: { state: "saved" } });
    expect(first.storage.data.size).toBeGreaterThan(0);
    const second = await launch(first.storage);
    await vi.waitFor(() => expect(second.events.some((event) => event.type === "restored-audit")).toBe(true));
    expect(second.adapter.buildKnowledge).not.toHaveBeenCalled();
    const restored = second.events.find((event) => event.type === "restored-audit");
    expect(restored?.type === "restored-audit" && restored.audit.report).toEqual(result?.type === "scan-result" && result.report);
    await second.send({ type: "certify" });
    expect(second.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("saved historical audit") });
    await second.send({ type: "export", format: "json" });
    const exported = second.events.at(-1);
    expect(exported?.type).toBe("export-result");
    if (exported?.type === "export-result") expect(JSON.parse(exported.content)).toMatchObject({ kind: "historical-audit", freshness: "historical" });
    await second.send({ type: "refresh-audit" });
    expect(second.adapter.captureAuditTarget).not.toHaveBeenCalled();
    expect(second.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
  });

  it("keeps the previous saved result when replacement writes fail", async () => {
    const plugin = await launch();
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const initial = plugin.events.find((event) => event.type === "scan-result");
    plugin.storage.setAsync.mockRejectedValue(new Error("Quota exceeded"));
    await plugin.send({ type: "refresh-audit" });
    const latest = plugin.events.filter((event) => event.type === "scan-result").at(-1);
    expect(latest).toMatchObject({ saveStatus: { state: "not-saved" } });
    plugin.storage.setAsync.mockImplementation(async (key, value) => { plugin.storage.data.set(key, structuredClone(value)); });
    const reopened = await launch(plugin.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    const restored = reopened.events.find((event) => event.type === "restored-audit");
    expect(restored?.type === "restored-audit" && restored.audit.id).toBe(initial?.type === "scan-result" && initial.savedAuditId);
  });

  it("rejects every historical mutation command before invoking document or storage mutations", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const reopened = await launch(first.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    const writes = reopened.storage.setAsync.mock.calls.length;
    const commands: UiToPluginMessage[] = [
      { type: "apply-plan", planId: "any", undoOnlyAcknowledged: false },
      { type: "apply-all", planIds: ["any"], undoOnlyAcknowledged: false },
      { type: "certify" },
      { type: "certify-components" },
      { type: "waive", findingId: "any", reason: "Temporary exemption" },
      { type: "clear-waiver", findingId: "any" },
      { type: "confirm-pattern", findingId: "any", canonicalName: "Button" },
      { type: "create-token", collectionId: "any", name: "space/test", field: "width", nodeIds: ["a", "b", "c"], rawValue: 8 },
      { type: "preview-contribution" },
      { type: "export-contribution", digest: "anything" },
    ];
    for (const command of commands) {
      await reopened.send(command);
      expect(reopened.events.at(-1), command.type).toMatchObject({ type: "error", message: expect.stringContaining("saved historical audit") });
    }
    expect(reopened.storage.setAsync).toHaveBeenCalledTimes(writes);
    expect(reopened.adapter.buildKnowledge).not.toHaveBeenCalled();
    expect(reopened.adapter.saveProfile).not.toHaveBeenCalled();
  });

  it("restores original setup provenance and uses changed setup only on explicit refresh", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const initial = first.events.find((event) => event.type === "scan-result");
    const changedProfile = profile({ tokenSourceCollectionKeys: ["changed-collection"] });
    const reopened = await launch(first.storage, "file-key", "figma", true, changedProfile);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    const restored = reopened.events.find((event) => event.type === "restored-audit");
    expect(restored).toMatchObject({ audit: { profile: profile(), report: { profileHash: hashValue(profile()) } } });
    expect(restored?.type === "restored-audit" && restored.audit.report).toEqual(initial?.type === "scan-result" && initial.report);
    expect(reopened.adapter.buildKnowledge).not.toHaveBeenCalled();
    await reopened.send({ type: "refresh-audit" });
    expect(reopened.events.find((event) => event.type === "scan-result")).toMatchObject({ report: { profileHash: hashValue(changedProfile) } });
  });

  it("retains a deleted captured target's saved result and export when refresh cannot resolve it", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "selection", refreshKnowledge: false } });
    const initial = first.events.find((event) => event.type === "scan-result");
    const reopened = await launch(first.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    reopened.adapter.targetRootIds.mockImplementationOnce(() => { throw new Error("The captured selection no longer exists"); });
    await reopened.send({ type: "refresh-audit" });
    expect(reopened.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("no longer exists") });
    expect(reopened.events.some((event) => event.type === "scan-result")).toBe(false);
    expect(reopened.adapter.captureAuditTarget).not.toHaveBeenCalled();
    await reopened.send({ type: "export", format: "json" });
    const exported = reopened.events.at(-1);
    expect(exported?.type).toBe("export-result");
    if (exported?.type === "export-result" && initial?.type === "scan-result") expect(JSON.parse(exported.content).report).toEqual(initial.report);
  });

  it("restores in Dev Mode, isolates files, and handles a missing file key without a shared fallback", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const dev = await launch(first.storage, "file-key", "dev");
    await vi.waitFor(() => expect(dev.events.some((event) => event.type === "restored-audit")).toBe(true));
    const other = await launch(first.storage, "different-file");
    expect(other.events.some((event) => event.type === "restored-audit")).toBe(false);
    const unsaved = await launch(first.storage, "");
    await unsaved.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    expect(unsaved.events.find((event) => event.type === "scan-result")).toMatchObject({ saveStatus: { state: "session-only" } });
  });

  it("persists a page batch using one graph", async () => {
    const plugin = await launch();
    plugin.figmaMock.root.children.push({ id: "page:2", name: "Components" });
    await plugin.send({ type: "audit-pages", pageIds: ["page:1", "page:2"] });
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(2);
    expect(plugin.events.at(-1)).toMatchObject({ type: "batch-complete", completed: 2, total: 2, cancelled: false });
  });

  it("rebuilds same-session context after variable values change without a document event", async () => {
    const plugin = await launchWithVariables();
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(1);
    plugin.variable.valuesByMode.mode = 12;
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(2);
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(2);
    expect(await plugin.fixture.adapter.matchesVariableEnvironment()).toBe(true);
  });

  it("stops a batch when a variable changes between pages without rebuilding", async () => {
    const plugin = await launchWithVariables();
    const originalPost = plugin.figmaMock.ui.postMessage;
    plugin.figmaMock.ui.postMessage = (message) => {
      originalPost(message);
      if (message.type === "scan-result") plugin.variable.valuesByMode.mode = 12;
    };
    await plugin.send({ type: "audit-pages", pageIds: ["page:0", "page:1"] });
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(1);
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("changed or expired") });
    expect(plugin.events.some((event) => event.type === "knowledge-stale")).toBe(true);
    await plugin.send({ type: "export", format: "json" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "export-result", content: expect.stringContaining('"historical-audit"') });
  });

  it("rejects mutation authority and exports historically after an unannounced variable edit", async () => {
    const plugin = await launchWithVariables();
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    plugin.variable.valuesByMode.mode = 12;
    await plugin.send({ type: "certify" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("stale") });
    expect(plugin.events.some((event) => event.type === "knowledge-stale")).toBe(true);
    await plugin.send({ type: "export", format: "json" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "export-result", content: expect.stringContaining('"historical-audit"') });
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
  });

  it("publishes a completed snapshot as stale when a variable changes during its durable save", async () => {
    const plugin = await launchWithVariables();
    const set = plugin.storage.setAsync.getMockImplementation()!;
    plugin.storage.setAsync.mockImplementation(async (key, value) => {
      if (key.includes(":audit:")) plugin.variable.valuesByMode.mode = 12;
      await set(key, value);
    });
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const resultIndex = plugin.events.findIndex((event) => event.type === "scan-result");
    expect(plugin.events[resultIndex]).toMatchObject({ saveStatus: { state: "saved" } });
    expect(plugin.events[resultIndex + 1]).toEqual({ type: "knowledge-stale" });
    await plugin.send({ type: "export", format: "json" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "export-result", content: expect.stringContaining('"historical-audit"') });
  });

  it("keeps the predecessor when a variable changes before report publication", async () => {
    const plugin = await launchWithVariables();
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const original = plugin.events.find((event) => event.type === "scan-result");
    const reads = plugin.storage.getAsync.getMockImplementation()!;
    const writeCount = plugin.storage.setAsync.mock.calls.length;
    plugin.storage.getAsync.mockImplementation(async (key) => {
      if (key.startsWith("waivers:")) plugin.variable.valuesByMode.mode = 12;
      return reads(key);
    });
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    expect(plugin.events.filter((event) => event.type === "scan-result")).toEqual([original]);
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("changed or expired") });
    expect(plugin.storage.setAsync).toHaveBeenCalledTimes(writeCount);
  });

  it("keeps saved page results when a batch is cancelled between pages", async () => {
    const plugin = await launch();
    plugin.figmaMock.root.children.push({ id: "page:2", name: "Components" });
    const originalPost = plugin.figmaMock.ui.postMessage;
    plugin.figmaMock.ui.postMessage = (message) => {
      originalPost(message);
      if (message.type === "scan-result") void plugin.send({ type: "cancel-scan" });
    };
    await plugin.send({ type: "audit-pages", pageIds: ["page:1", "page:2"] });
    expect(plugin.events.at(-1)).toMatchObject({ type: "batch-complete", completed: 1, total: 2, cancelled: true });
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(1);
    const reopened = await launch(plugin.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
  });

  it.each(["expiry", "remote document change"])("stops a batch on %s without rebuilding or publishing another page", async (change) => {
    const plugin = await launch();
    plugin.figmaMock.root.children.push({ id: "page:2", name: "Components" });
    const originalPost = plugin.figmaMock.ui.postMessage;
    plugin.figmaMock.ui.postMessage = (message) => {
      originalPost(message);
      if (message.type !== "scan-result") return;
      if (change === "expiry") vi.spyOn(Date, "now").mockReturnValue(Date.now() + 16 * 60 * 1000);
      else plugin.handlers.get("documentchange")?.({ documentChanges: [{ id: "button:1", origin: "REMOTE", type: "PROPERTY_CHANGE", properties: ["width"] }] });
    };
    await plugin.send({ type: "audit-pages", pageIds: ["page:1", "page:2"] });
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(1);
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("changed or expired") });
    expect(plugin.events.some((event) => event.type === "batch-complete")).toBe(false);
    await plugin.send({ type: "export", format: "json" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "export-result", content: expect.stringContaining('"historical-audit"') });
    vi.restoreAllMocks();
    const reopened = await launch(plugin.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    expect(reopened.events.find((event) => event.type === "saved-audits")).toMatchObject({ audits: [{ target: { scope: "page", pageId: "page:1" } }] });
  });

  it("retains the saved report if an explicit refresh is cancelled during capture", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const initial = first.events.find((event) => event.type === "scan-result");
    const reopened = await launch(first.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    const build = reopened.adapter.buildKnowledge.getMockImplementation()!;
    let release!: () => void;
    reopened.adapter.buildKnowledge.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return build();
    });
    const refresh = reopened.send({ type: "refresh-audit" });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await reopened.send({ type: "cancel-scan" });
    release();
    await refresh;
    expect(reopened.events.some((event) => event.type === "scan-result")).toBe(false);
    expect(reopened.events.some((event) => event.type === "scan-cancelled")).toBe(true);
    const third = await launch(first.storage);
    await vi.waitFor(() => expect(third.events.some((event) => event.type === "restored-audit")).toBe(true));
    expect(third.events.find((event) => event.type === "restored-audit")).toMatchObject({ audit: { id: initial?.type === "scan-result" && initial.savedAuditId } });
  });

  it("stops on the first unsaved batch page so its live report remains available", async () => {
    const plugin = await launch();
    plugin.figmaMock.root.children.push({ id: "page:2", name: "Components" });
    plugin.storage.setAsync.mockRejectedValueOnce(new Error("Quota exceeded"));
    await plugin.send({ type: "audit-pages", pageIds: ["page:1", "page:2"] });
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(1);
    expect(plugin.events.find((event) => event.type === "scan-result")).toMatchObject({ saveStatus: { state: "not-saved" } });
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("page could not be saved") });
    await plugin.send({ type: "export", format: "json" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "export-result" });
  });

  it("rejects a session-only batch before doing expensive work", async () => {
    const plugin = await launch(memoryStorage(), "");
    await plugin.send({ type: "audit-pages", pageIds: ["page:1"] });
    expect(plugin.adapter.buildKnowledge).not.toHaveBeenCalled();
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("session-only") });
  });

  it("keeps export available when an unsaved result becomes stale", async () => {
    const plugin = await launch();
    plugin.storage.setAsync.mockRejectedValueOnce(new Error("Quota exceeded"));
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    plugin.handlers.get("documentchange")?.({ documentChanges: [{ id: "button:1", origin: "LOCAL", type: "PROPERTY_CHANGE", properties: ["width"] }] });
    await plugin.send({ type: "export", format: "json" });
    const exported = plugin.events.at(-1);
    expect(exported?.type).toBe("export-result");
    if (exported?.type === "export-result") {
      const envelope = JSON.parse(exported.content);
      expect(envelope).toMatchObject({ kind: "historical-audit", freshness: "historical" });
      expect(envelope.savedAt).toBeUndefined();
    }
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
    await plugin.send({ type: "certify" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("stale") });
  });

  it.each(["saved", "invalidated"] as const)("preserves an unsaved report and its original configuration when setup is %s", async (change) => {
    const plugin = await launch();
    plugin.storage.setAsync.mockRejectedValueOnce(new Error("Quota exceeded"));
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const completed = plugin.events.find((event) => event.type === "scan-result");
    expect(completed).toMatchObject({ saveStatus: { state: "not-saved" } });
    if (change === "saved") {
      await plugin.send({ type: "save-profile", profile: profile({ tokenSourceCollectionKeys: ["changed-collection"] }) });
    } else {
      plugin.adapter.reconcileProfile.mockReturnValueOnce({ profile: profile(), profileConfigured: false, profileIssues: [] });
      await plugin.send({ type: "refresh-audit" });
    }
    expect(plugin.events.at(-1)?.type).toBe(change === "saved" ? "profile-saved" : "profile-invalidated");
    await plugin.send({ type: "export", format: "json" });
    const exported = plugin.events.at(-1);
    expect(exported?.type).toBe("export-result");
    if (exported?.type === "export-result" && completed?.type === "scan-result") {
      const envelope = JSON.parse(exported.content);
      expect(envelope).toMatchObject({ kind: "historical-audit", report: completed.report, target: { scope: "page", pageId: "page:1" } });
      expect(envelope.savedAt).toBeUndefined();
    }
    expect(plugin.adapter.buildKnowledge).toHaveBeenCalledTimes(1);
    await plugin.send({ type: "certify" });
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringMatching(/audit|stale/) });
  });

  it("does not let delayed startup recovery replace a newly requested audit", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const oldKeys = [...first.storage.data.keys()];
    let release!: (keys: string[]) => void;
    first.storage.keysAsync.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const reopened = await launch(first.storage, "file-key", "figma", false);
    await reopened.send({ type: "scan", request: { scope: "selection", refreshKnowledge: false } });
    release(oldKeys);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(false);
    expect(reopened.events.find((event) => event.type === "scan-result")).toMatchObject({ report: { target: { scope: "selection" } } });
  });

  it("rejects a changed build without overwriting the previous report", async () => {
    const plugin = await launch();
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const initial = plugin.events.find((event) => event.type === "scan-result");
    const keysBefore = [...plugin.storage.data.keys()];
    const build = plugin.adapter.buildKnowledge.getMockImplementation()!;
    plugin.adapter.buildKnowledge.mockImplementationOnce(async () => {
      plugin.handlers.get("documentchange")?.({ documentChanges: [{ id: "button:1", origin: "REMOTE", type: "PROPERTY_CHANGE", properties: ["name"] }] });
      return build();
    });
    await plugin.send({ type: "refresh-audit" });
    expect(plugin.events.filter((event) => event.type === "scan-result")).toEqual([initial]);
    expect(plugin.events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("design changed") });
    expect([...plugin.storage.data.keys()]).toEqual(keysBefore);
  });

  it("historical navigation failures do not terminate an ongoing refresh", async () => {
    const first = await launch();
    await first.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const reopened = await launch(first.storage);
    await vi.waitFor(() => expect(reopened.events.some((event) => event.type === "restored-audit")).toBe(true));
    const build = reopened.adapter.buildKnowledge.getMockImplementation()!;
    let release!: () => void;
    reopened.adapter.buildKnowledge.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return build();
    });
    const refresh = reopened.send({ type: "refresh-audit" });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    reopened.adapter.navigate.mockRejectedValueOnce(new Error("Node no longer exists"));
    await reopened.send({ type: "navigate", nodeId: "deleted" });
    expect(reopened.events.at(-1)).toMatchObject({ type: "error", nonTerminal: true });
    await reopened.send({ type: "export", format: "markdown" });
    expect(reopened.events.at(-1)).toMatchObject({ type: "export-result", content: expect.stringContaining("Historical audit") });
    release();
    await refresh;
    expect(reopened.events.filter((event) => event.type === "scan-result")).toHaveLength(1);
  });

  it("exports the still-displayed old report historically while a changed graph's replacement is saving", async () => {
    const plugin = await launch();
    await plugin.send({ type: "scan", request: { scope: "page", refreshKnowledge: false } });
    const original = plugin.events.find((event) => event.type === "scan-result");
    const build = plugin.adapter.buildKnowledge.getMockImplementation()!;
    plugin.adapter.buildKnowledge.mockImplementationOnce(async () => {
      const result = await build();
      result.graph.snapshotHash = "changed-context-hash";
      return result;
    });
    const set = plugin.storage.setAsync.getMockImplementation()!;
    let release!: () => void;
    plugin.storage.setAsync.mockImplementationOnce(async (key, value) => {
      await new Promise<void>((resolve) => { release = resolve; });
      await set(key, value);
    });
    const refresh = plugin.send({ type: "refresh-audit" });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await plugin.send({ type: "export", format: "json" });
    const exported = plugin.events.at(-1);
    expect(exported?.type).toBe("export-result");
    if (exported?.type === "export-result" && original?.type === "scan-result") {
      expect(JSON.parse(exported.content)).toMatchObject({ kind: "historical-audit", report: original.report });
    }
    release();
    await refresh;
    expect(plugin.events.filter((event) => event.type === "scan-result")).toHaveLength(2);
  });
});

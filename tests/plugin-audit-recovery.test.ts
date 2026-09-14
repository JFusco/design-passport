import { afterEach, describe, expect, it, vi } from "vitest";
import type { CapturedAuditTarget } from "../src/figma/adapter";
import type { PluginToUiMessage, UiToPluginMessage } from "../src/plugin/messages";
import { healthyGraph, profile } from "./fixtures";

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

async function launch(storage = memoryStorage(), fileKey: string | undefined = "file-key", editorType: "figma" | "dev" = "figma", waitForRestore = true) {
  vi.resetModules();
  const events: PluginToUiMessage[] = [];
  const inputProfile = profile();
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
});

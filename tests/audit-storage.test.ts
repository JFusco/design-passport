import { describe, expect, it } from "vitest";
import { gzipSync, strToU8 } from "fflate";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import type { CapturedAuditTarget } from "../src/figma/adapter";
import { buildReadinessReport } from "../src/core/report";
import { buildChangePlans } from "../src/core/planner";
import { utf8ByteLength } from "../src/core/stable";
import { AuditStorage, type AuditCodecMeasurement, type ClientStoragePort } from "../src/plugin/audit-storage";
import { canonicalAuditTargetKey, isAuditViewState, type AuditViewState, type SaveAuditInput } from "../src/plugin/audit-state";
import { buildKnowledgeSummary } from "../src/plugin/knowledge-summary";
import { healthyGraph, profile } from "./fixtures";

class MemoryStorage implements ClientStoragePort {
  values = new Map<string, unknown>();
  events: string[] = [];
  failWrites = false;
  quota = 5_000_000;
  beforeSet: ((key: string) => Promise<void>) | undefined;
  beforeDelete: ((key: string) => Promise<void>) | undefined;
  reads = 0;
  inventories = 0;

  size(): number {
    return [...this.values].reduce((sum, [key, value]) => sum + utf8ByteLength(key)
      + (value instanceof Uint8Array ? value.byteLength : utf8ByteLength(JSON.stringify(value) ?? "null")), 0);
  }

  async getAsync(key: string): Promise<unknown> { this.reads += 1; return structuredClone(this.values.get(key)); }
  async keysAsync(): Promise<string[]> { this.inventories += 1; return [...this.values.keys()]; }
  async setAsync(key: string, value: unknown): Promise<void> {
    this.events.push(`set:${key}`);
    await this.beforeSet?.(key);
    if (this.failWrites) throw new Error("Simulated storage failure");
    const previous = this.values.get(key);
    this.values.set(key, structuredClone(value));
    if (this.size() > this.quota) {
      if (previous === undefined) this.values.delete(key);
      else this.values.set(key, previous);
      throw new Error("Quota exceeded");
    }
  }
  async deleteAsync(key: string): Promise<void> {
    this.events.push(`delete:${key}`);
    await this.beforeDelete?.(key);
    this.values.delete(key);
  }
}

function input(options: { fileKey?: string; target?: CapturedAuditTarget; at?: string } = {}): SaveAuditInput {
  const target = options.target ?? { scope: "page", pageId: "page:1" };
  const pageId = target.scope === "page" ? target.pageId : "page:1";
  const auditProfile = profile({ pageRoles: { foundations: { pageIds: [], externalLibraryKeys: [] }, components: { pageIds: [], externalLibraryKeys: [] }, screens: { pageIds: [pageId], externalLibraryKeys: [] } } });
  const graph = healthyGraph(auditProfile);
  graph.pages[0]!.id = pageId;
  for (const node of Object.values(graph.nodes)) node.pageId = pageId;
  const report = buildReadinessReport({ graph, profile: auditProfile, scope: target.scope, targetRootIds: target.scope === "selection" ? [...target.nodeIds] : graph.sourceFrameIds, now: new Date(options.at ?? "2026-09-14T12:00:00.000Z") });
  return {
    fileKey: options.fileKey ?? "file-one", target, report, plans: buildChangePlans(report.findings),
    knowledge: buildKnowledgeSummary(graph), insights: [], profile: auditProfile,
    provenance: { pluginVersion: "0.1.1", knowledgeVersion: "1" },
  };
}

const view: AuditViewState = {
  activeTab: "findings", showPassing: true, axisFilter: "accessibility", pageFilter: "page:1",
  rootFilter: "root:desktop", variantFilter: "all", expanded: "a-finding",
};

function noise(length: number): string {
  let state = 91;
  return Array.from({ length }, () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) | 0;
    return String.fromCharCode(33 + ((state >>> 16) % 90));
  }).join("");
}

describe("durable audit storage", () => {
  it("round-trips Unicode audits and context in an isolated browser bundle without Node or DOM globals", async () => {
    const original = input();
    original.report.frames[0]!.rootName = "帳戶 / Übersicht / 👩🏽‍🎨";
    original.report.findings[0]!.evidence.summary = "Résumé · Ελληνικά · مرحبًا · 🚀 · \u007f\u0080\u07ff\u0800\uffff · \u{10000}\u{10ffff} · \ud800.\udc00";
    original.knowledge.pages[0]!.name = "元件 / Components 🧩";
    const bundle = await build({
      entryPoints: [fileURLToPath(new URL("../src/plugin/audit-storage.ts", import.meta.url))],
      bundle: true, write: false, platform: "browser", format: "iife", globalName: "AuditRuntime", target: "es2020",
    });
    const harness = new Script(`${bundle.outputFiles[0]!.text}\n(async () => {
      const forbidden = ["TextEncoder", "TextDecoder", "Buffer", "Worker", "window", "document", "CompressionStream", "DecompressionStream", "process", "require"];
      if (!forbidden.every((key) => typeof globalThis[key] === "undefined")) throw new Error("The sandbox accidentally exposes a forbidden global");
      const data = new Map();
      const clone = (value) => value === undefined ? undefined : value instanceof Uint8Array ? new Uint8Array(value) : JSON.parse(JSON.stringify(value));
      const port = {
        getAsync: async (key) => clone(data.get(key)),
        setAsync: async (key, value) => { data.set(key, clone(value)); },
        deleteAsync: async (key) => { data.delete(key); },
        keysAsync: async () => [...data.keys()],
      };
      const input = JSON.parse(fixture);
      const first = new AuditRuntime.AuditStorage(port);
      const saved = await first.saveAudit(input);
      if (saved.status.state !== "saved") throw new Error(saved.status.message || "Audit was not saved");
      await first.saveContext(input.fileKey, "unicode-context", { label: input.report.frames[0].rootName });
      const reopened = new AuditRuntime.AuditStorage(port);
      const audit = await reopened.loadAudit(input.fileKey, saved.audit.id);
      const context = await reopened.loadContext(input.fileKey, "unicode-context");
      const history = await reopened.listAudits(input.fileKey);
      return JSON.stringify({ report: audit && audit.report, context, label: history[0].label, binaryRecords: [...data.values()].filter((value) => value instanceof Uint8Array).length });
    })();`);
    const result = JSON.parse(await harness.runInNewContext({ fixture: JSON.stringify(original) }, { timeout: 10_000 }) as string);
    expect(result.report).toEqual(original.report);
    expect(result.context).toEqual({ label: original.report.frames[0]!.rootName });
    expect(result.label).toBe(original.knowledge.pages[0]!.name);
    expect(result.binaryRecords).toBe(2);
  });

  it.each([
    { name: "overlong sequence", bytes: [0xc0, 0xaf] },
    { name: "surrogate code point", bytes: [0xed, 0xa0, 0x80] },
    { name: "out-of-range code point", bytes: [0xf4, 0x90, 0x80, 0x80] },
    { name: "invalid continuation", bytes: [0xe2, 0x28, 0xa1] },
    { name: "incomplete sequence", bytes: [0xf0, 0x9f] },
  ])("treats a $name in compressed UTF-8 as a cache miss", async ({ bytes }) => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    await storage.saveContext("file-one", "invalid", "original");
    const key = [...port.values.keys()][0]!;
    const raw = new Uint8Array([
      ...strToU8('{"schemaVersion":1,"fileKey":"file-one","key":"invalid","value":"'),
      ...bytes,
      ...strToU8('"}'),
    ]);
    port.values.set(key, gzipSync(raw));
    expect(await storage.loadContext("file-one", "invalid")).toBeUndefined();
  });

  it("restores a completed result in a new plugin instance without its graph", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const original = input();
    const { audit, status } = await storage.saveAudit(original);
    expect(status.state).toBe("saved");
    expect([...port.values.values()].some((value) => value instanceof Uint8Array)).toBe(true);
    const reopened = new AuditStorage(port);
    const restored = await reopened.loadAudit(original.fileKey, audit.id);
    expect(restored?.report).toEqual(original.report);
    expect(restored?.profile).toEqual(original.profile);
    expect(restored).not.toHaveProperty("graph");
    expect(await reopened.loadAudit("other-file", audit.id)).toBeUndefined();
    expect(await reopened.listAudits("other-file")).toEqual([]);
  });

  it("keeps historical report v1 provenance while newly saved v3 reports carry categorized groups and producer evidence", async () => {
    const storage = new AuditStorage(new MemoryStorage());
    const legacy = input();
    legacy.report.schemaVersion = 1;
    legacy.report.rulesetVersion = "1.0.0-beta.2";
    delete legacy.report.issueGroups;
    for (const finding of legacy.report.findings) {
      delete finding.category;
      delete finding.provenance;
    }
    const saved = await storage.saveAudit(legacy);
    expect(saved.status.state).toBe("saved");
    expect((await storage.loadAudit(legacy.fileKey, saved.audit.id))?.report).toEqual(legacy.report);
    const current = input({ target: { scope: "file" } });
    const next = await storage.saveAudit(current);
    expect(next.status.state).toBe("saved");
    expect((await storage.loadAudit(current.fileKey, next.audit.id))?.report).toMatchObject({ schemaVersion: 3, producer: { pluginVersion: "0.4.0", rulesetVersion: "1.0.0-beta.4" } });
  });

  it.each(["changed", "cancelled"])("retains the predecessor when replacement becomes %s during its durable write", async (reason) => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const previous = await storage.saveAudit(input());
    let stale = false;
    port.beforeSet = async (key) => { if (key.includes(":audit:")) stale = true; };
    const candidate = await storage.saveAudit(input({ at: "2026-09-14T12:05:00.000Z" }), {
      assertCurrent: async () => { if (stale) throw new Error(reason); },
    });
    expect(candidate.status).toEqual({ state: "not-saved", message: reason });
    expect(await storage.loadAudit("file-one", candidate.audit.id)).toBeUndefined();
    expect((await storage.listAudits("file-one")).map((audit) => audit.id)).toEqual([previous.audit.id]);
    expect((await storage.loadAudit("file-one", previous.audit.id))?.report).toEqual(previous.audit.report);
  });

  it("publishes at the verified durable commit before asynchronous predecessor cleanup", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const previous = await storage.saveAudit(input());
    const events: string[] = [];
    port.beforeDelete = async (key) => { if (key.includes(":audit:") && key.endsWith(previous.audit.id)) events.push("prune"); };
    const candidate = await storage.saveAudit(input({ at: "2026-09-14T12:05:00.000Z" }), {
      assertCurrent: async (phase) => { events.push(phase); },
      commit: (audit) => {
        expect([...port.values.keys()].some((key) => key.endsWith(audit.id))).toBe(true);
        expect([...port.values.keys()].some((key) => key.endsWith(previous.audit.id))).toBe(true);
        events.push("commit");
      },
    });
    expect(candidate.status.state).toBe("saved");
    expect(events).toEqual(["prepare", "before-write", "after-write", "commit", "prune"]);
  });

  it("validates category filters without requiring them on historical view state", () => {
    expect(isAuditViewState(view)).toBe(true);
    for (const categoryFilter of ["all", "requirement", "recommendation", "governance"]) expect(isAuditViewState({ ...view, categoryFilter })).toBe(true);
    expect(isAuditViewState({ ...view, categoryFilter: "anything" })).toBe(false);
  });

  it("lists small headers without decompressing report bodies, then decodes only the chosen result", async () => {
    const measurements: AuditCodecMeasurement[] = [];
    const storage = new AuditStorage(new MemoryStorage(), { onCodec: (sample) => measurements.push(sample) });
    const first = await storage.saveAudit(input());
    await storage.saveAudit(input({ target: { scope: "page", pageId: "page:2" } }));
    measurements.length = 0;
    expect(await storage.listAudits("file-one")).toHaveLength(2);
    expect(measurements).toEqual([]);
    await storage.loadAudit("file-one", first.audit.id);
    expect(measurements.map((sample) => sample.operation)).toEqual(["decompress"]);
    expect(measurements[0]?.rawBytes).toBeGreaterThan(measurements[0]!.compressedBytes);
  });

  it("uses a selection's sorted unique IDs as its identity and commits before pruning the previous result", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const first = await storage.saveAudit(input({ target: { scope: "selection", nodeIds: ["root:desktop", "root:tablet"] } }));
    port.events.length = 0;
    const second = await storage.saveAudit(input({ target: { scope: "selection", nodeIds: ["root:tablet", "root:desktop"] }, at: "2026-09-14T12:05:00.000Z" }));
    expect(first.audit.targetKey).toBe(second.audit.targetKey);
    const rows = await storage.listAudits("file-one");
    expect(rows.map((row) => row.id)).toEqual([second.audit.id]);
    expect(port.events[0]).toContain(`set:design-passport:cache:v1:audit:`);
    expect(port.events.findIndex((event) => event.includes(`delete:`) && event.endsWith(first.audit.id))).toBeGreaterThan(0);
  });

  it("keeps separate latest results for pages, selections, whole files, and different files", async () => {
    const storage = new AuditStorage(new MemoryStorage());
    await storage.saveAudit(input());
    await storage.saveAudit(input({ target: { scope: "page", pageId: "page:2" } }));
    await storage.saveAudit(input({ target: { scope: "selection", nodeIds: ["root:desktop"] } }));
    await storage.saveAudit(input({ target: { scope: "file" } }));
    await storage.saveAudit(input({ fileKey: "file-two" }));
    expect(await storage.listAudits("file-one")).toHaveLength(4);
    expect(await storage.listAudits("file-two")).toHaveLength(1);
  });

  it("preserves the previous saved result after a storage failure", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const previous = await storage.saveAudit(input());
    port.failWrites = true;
    const failed = await storage.saveAudit(input({ at: "2026-09-14T12:05:00.000Z" }));
    expect(failed.status.state).toBe("not-saved");
    expect((await new AuditStorage(port).loadAudit("file-one", previous.audit.id))?.id).toBe(previous.audit.id);
    expect((await storage.listAudits("file-one")).map((row) => row.id)).toEqual([previous.audit.id]);
  });

  it("preserves previous reports when an atomic replacement cannot fit, including unrelated quota usage", async () => {
    const port = new MemoryStorage();
    const previous = await new AuditStorage(port).saveAudit(input());
    await port.setAsync("waivers:file-one", { reason: "keep this unrelated preference" });
    const before = port.size();
    const storage = new AuditStorage(port, { maximumBytes: before + 100 });
    const failed = await storage.saveAudit(input({ at: "2026-09-14T12:05:00.000Z" }));
    expect(failed.status.state).toBe("not-saved");
    expect((await storage.listAudits("file-one"))[0]?.id).toBe(previous.audit.id);
    expect(port.values.get("waivers:file-one")).toEqual({ reason: "keep this unrelated preference" });
  });

  it("does not evict any prior report for a single oversized new result", async () => {
    const port = new MemoryStorage();
    const initial = await new AuditStorage(port).saveAudit(input());
    const storage = new AuditStorage(port, { maximumBytes: port.size() });
    const oversized = input({ target: { scope: "page", pageId: "page:other" } });
    oversized.report.findings[0]!.message += noise(4_000);
    const saved = await storage.saveAudit(oversized);
    expect(saved.status.state).toBe("not-saved");
    expect(saved.audit.report).toEqual(oversized.report);
    expect((await new AuditStorage(port).listAudits("file-one")).map((entry) => entry.id)).toEqual([initial.audit.id]);
    expect(port.events.some((event) => event.startsWith("delete:"))).toBe(false);
  });

  it("preserves the predecessor when the platform quota fills after the storage inventory", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const previous = await storage.saveAudit(input());
    port.quota = port.size() + 100;
    port.beforeSet = async (key) => {
      if (key.includes(":audit:") && !key.endsWith(previous.audit.id)) port.values.set("concurrent-preference", "x".repeat(40));
    };
    const result = await storage.saveAudit(input({ at: "2026-09-14T12:05:00.000Z" }));
    expect(result.status).toMatchObject({ state: "not-saved", message: "Quota exceeded" });
    expect((await new AuditStorage(port).loadAudit("file-one", previous.audit.id))?.report).toEqual(previous.audit.report);
    expect(await port.getAsync("concurrent-preference")).toBe("x".repeat(40));
  });

  it("recovers a committed replacement when its originating instance stops before predecessor cleanup", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const previous = await storage.saveAudit(input());
    let interrupted = () => {};
    let reached = () => {};
    const stop = new Promise<void>((_resolve, reject) => { interrupted = () => reject(new Error("Plugin instance stopped")); });
    const deleting = new Promise<void>((resolve) => { reached = resolve; });
    port.beforeDelete = async (key) => {
      if (key.endsWith(previous.audit.id) && key.includes(":audit:")) { reached(); await stop; }
    };
    const replacementInput = input({ at: "2026-09-14T12:05:00.000Z" });
    const writing = storage.saveAudit(replacementInput);
    await deleting;
    const reopened = new AuditStorage(port);
    const newest = (await reopened.listAudits("file-one"))[0]!;
    expect(newest.id).not.toBe(previous.audit.id);
    expect((await reopened.loadAudit("file-one", newest.id))?.report).toEqual(replacementInput.report);
    interrupted();
    expect((await writing).status.state).toBe("saved");
    expect([...port.values.keys()].filter((key) => key.includes(":audit:"))).toHaveLength(2);
  });

  it("evicts optional context before report history and never evicts reports to store context", async () => {
    const port = new MemoryStorage();
    const originalStorage = new AuditStorage(port);
    const old = await originalStorage.saveAudit(input());
    const auditBytes = port.size();
    const cacheData = noise(auditBytes * 4);
    await originalStorage.saveContext("file-one", "context-v1", cacheData);
    expect(await originalStorage.loadContext("file-one", "context-v1")).toBe(cacheData);
    const storage = new AuditStorage(port, { maximumBytes: auditBytes * 3 });
    const result = await storage.saveAudit(input({ target: { scope: "page", pageId: "page:2" } }));
    expect(result.status.state).toBe("saved");
    expect(await storage.loadContext("file-one", "context-v1")).toBeUndefined();
    expect((await storage.listAudits("file-one")).map((row) => row.id)).toContain(old.audit.id);
    await storage.saveContext("file-one", "too-large", noise(auditBytes * 10));
    expect(await storage.loadContext("file-one", "too-large")).toBeUndefined();
    expect(await storage.listAudits("file-one")).toHaveLength(2);
  });

  it("persists browsing preferences and orders history by actual last access", async () => {
    const port = new MemoryStorage();
    let now = Date.parse("2026-09-14T12:00:00.000Z");
    const storage = new AuditStorage(port, { now: () => now });
    const first = await storage.saveAudit(input());
    now += 1_000;
    const second = await storage.saveAudit(input({ target: { scope: "page", pageId: "page:2" } }));
    now += 1_000;
    await storage.updateView("file-one", first.audit.id, view);
    expect((await storage.listAudits("file-one")).map((row) => row.id)).toEqual([first.audit.id, second.audit.id]);
    const restored = await new AuditStorage(port, { now: () => now + 1_000 }).loadAudit("file-one", first.audit.id);
    expect(restored?.viewState).toEqual(view);
    expect(isAuditViewState({ ...view, undoAcknowledged: true })).toBe(false);
    expect(isAuditViewState({ ...view, activeTab: "profile" })).toBe(true);
  });

  it("ignores a corrupt view overlay without losing the saved report or its safe original view", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const originalView = { ...view, activeTab: "modules" as const };
    const saved = await storage.saveAudit({ ...input(), viewState: originalView });
    await storage.updateView("file-one", saved.audit.id, view);
    const key = [...port.values.keys()].find((candidate) => candidate.includes(":view:"))!;
    port.values.set(key, { schemaVersion: 1, lastViewedAt: new Date().toISOString(), viewState: { ...view, undoAcknowledged: true } });
    const restored = await new AuditStorage(port).loadAudit("file-one", saved.audit.id);
    expect(restored?.report).toEqual(saved.audit.report);
    expect(restored?.viewState).toEqual(originalView);
    expect(restored?.viewState).not.toHaveProperty("undoAcknowledged");
  });

  it("restores supported reports with original versions instead of requiring the current ruleset", async () => {
    const original = input();
    original.report.rulesetVersion = "archived-ruleset-v0";
    original.report.producer = { ...original.report.producer!, rulesetVersion: "archived-ruleset-v0" };
    original.report.catalogVersion = "archived-catalog-v0";
    original.provenance = { pluginVersion: "0.0.1", knowledgeVersion: "archived-knowledge-v0" };
    const port = new MemoryStorage();
    const saved = await new AuditStorage(port).saveAudit(original);
    const restored = await new AuditStorage(port).loadAudit("file-one", saved.audit.id);
    expect(saved.status.state).toBe("saved");
    expect(restored?.report).toEqual(original.report);
    expect(restored?.profile).toEqual(original.profile);
    expect(restored?.provenance).toEqual(original.provenance);
  });

  it("retains the most recently accessed reports when the history count is bounded", async () => {
    let now = 1_800_000_000_000;
    const port = new MemoryStorage();
    const storage = new AuditStorage(port, { maximumAudits: 2, now: () => now++ });
    const first = await storage.saveAudit(input());
    const second = await storage.saveAudit(input({ target: { scope: "page", pageId: "page:2" } }));
    await storage.loadAudit("file-one", first.audit.id);
    const third = await storage.saveAudit(input({ target: { scope: "page", pageId: "page:3" } }));
    const ids = (await storage.listAudits("file-one")).map((row) => row.id);
    expect(ids).toContain(first.audit.id);
    expect(ids).toContain(third.audit.id);
    expect(ids).not.toContain(second.audit.id);
  });

  it("discovers independent writes from multiple plugin instances and rejects a late older replacement", async () => {
    const port = new MemoryStorage();
    const first = new AuditStorage(port, { nonce: () => "first" });
    const second = new AuditStorage(port, { nonce: () => "second" });
    await Promise.all([
      first.saveAudit(input()),
      second.saveAudit(input({ target: { scope: "page", pageId: "page:2" } })),
    ]);
    expect(await first.listAudits("file-one")).toHaveLength(2);
    const newer = await first.saveAudit(input({ at: "2026-09-14T12:10:00.000Z" }));
    const late = await second.saveAudit(input({ at: "2026-09-14T12:05:00.000Z" }));
    expect(late.status.state).toBe("not-saved");
    expect((await first.listAudits("file-one")).map((row) => row.id)).toContain(newer.audit.id);
  });

  it("keeps the newer same-target result when an older write was already in flight", async () => {
    const port = new MemoryStorage();
    let release = () => {};
    let reached = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const blocked = new Promise<void>((resolve) => { reached = resolve; });
    port.beforeSet = async (key) => {
      if (key.endsWith("-slow")) { reached(); await gate; }
    };
    const slow = new AuditStorage(port, { nonce: () => "slow" });
    const fast = new AuditStorage(port, { nonce: () => "fast" });
    const older = slow.saveAudit(input());
    await blocked;
    const newer = await fast.saveAudit(input({ at: "2026-09-14T12:10:00.000Z" }));
    release();
    expect((await older).status.state).toBe("not-saved");
    expect((await fast.listAudits("file-one")).map((row) => row.id)).toEqual([newer.audit.id]);
    expect([...port.values.keys()].some((key) => key.endsWith("-slow"))).toBe(false);
  });

  it("keeps view writes within the cache budget without sacrificing readable reports", async () => {
    const port = new MemoryStorage();
    const original = await new AuditStorage(port).saveAudit(input());
    const used = port.size();
    const storage = new AuditStorage(port, { maximumBytes: used + 10 });
    await storage.updateView("file-one", original.audit.id, view);
    expect((await storage.loadAudit("file-one", original.audit.id))?.report).toEqual(original.audit.report);
    expect(port.size()).toBe(used);
  });

  it("treats optional context serialization failures as nonfatal", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const saved = await storage.saveAudit(input());
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    await expect(storage.saveContext("file-one", "invalid", cyclic)).resolves.toBeUndefined();
    expect((await storage.listAudits("file-one"))[0]?.id).toBe(saved.audit.id);
  });

  it("flushes 65 context fragments with one storage inventory", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const saved = await storage.saveAudit(input());
    port.inventories = 0;
    port.reads = 0;
    await storage.saveContexts("file-one", Array.from({ length: 65 }, (_, index) => ({ key: `root:${index}`, value: { nodes: [index] } })));
    expect(port.inventories).toBe(1);
    expect(port.reads).toBe(2); // Existing report header and its optional view record.
    expect(await storage.loadContext("file-one", "root:0")).toEqual({ nodes: [0] });
    expect(await storage.loadContext("file-one", "root:64")).toEqual({ nodes: [64] });
    expect((await storage.listAudits("file-one"))[0]?.id).toBe(saved.audit.id);
  });

  it("keeps reports while a batched context flush fills the available space", async () => {
    const port = new MemoryStorage();
    const saved = await new AuditStorage(port).saveAudit(input());
    const maximumBytes = port.size() + 1_500;
    const storage = new AuditStorage(port, { maximumBytes });
    await storage.saveContexts("file-one", Array.from({ length: 65 }, (_, index) => ({ key: `root:${index}`, value: { index, data: noise(600) } })));
    expect(port.size()).toBeLessThanOrEqual(maximumBytes);
    expect((await storage.listAudits("file-one"))[0]?.id).toBe(saved.audit.id);
    expect(await storage.loadContext("file-one", "root:64")).toMatchObject({ index: 64 });
    expect(await storage.loadContext("file-one", "root:0")).toBeUndefined();
  });

  it("ignores corrupted, unsupported, and malformed cache values", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const saved = await storage.saveAudit(input());
    const key = [...port.values.keys()].find((candidate) => candidate.endsWith(saved.audit.id))!;
    const bytes = port.values.get(key) as Uint8Array;
    bytes[bytes.length - 10] = (bytes[bytes.length - 10] ?? 0) ^ 255;
    port.values.set(key, bytes);
    await port.setAsync("design-passport:cache:v1:audit:broken", new Uint8Array([1, 2, 3]));
    await port.setAsync("design-passport:cache:v1:audit:unsupported", gzipSync(strToU8('{"schemaVersion":2}')));
    expect(await storage.listAudits("file-one")).toEqual([]);
    expect(await storage.loadAudit("file-one", saved.audit.id)).toBeUndefined();
    const repaired = await storage.saveAudit(input({ at: "2026-09-14T12:15:00.000Z" }));
    expect(repaired.status.state).toBe("saved");
  });

  it("forgets one saved result or one file without removing waivers or another file", async () => {
    const port = new MemoryStorage();
    const storage = new AuditStorage(port);
    const first = await storage.saveAudit(input());
    await storage.saveAudit(input({ fileKey: "file-two" }));
    await storage.saveContext("file-one", "context", { hello: true });
    await storage.updateView("file-one", first.audit.id, view);
    await port.setAsync("waivers:file-one", { keep: true });
    await storage.forgetAudit("file-one", first.audit.id);
    await storage.updateView("file-one", first.audit.id, view);
    expect(await storage.listAudits("file-one")).toEqual([]);
    expect(await storage.loadContext("file-one", "context")).toEqual({ hello: true });
    await storage.clearFile("file-one");
    expect(await storage.loadContext("file-one", "context")).toBeUndefined();
    expect(await storage.listAudits("file-two")).toHaveLength(1);
    expect(await port.getAsync("waivers:file-one")).toEqual({ keep: true });
  });

  it("does not persist malformed reports or unsafe presentation state", async () => {
    const storage = new AuditStorage(new MemoryStorage());
    const malformed = input();
    malformed.report.frames = [];
    expect((await storage.saveAudit(malformed)).status.state).toBe("not-saved");
    expect(canonicalAuditTargetKey({ scope: "selection", nodeIds: ["b", "a", "a"] }))
      .toBe(canonicalAuditTargetKey({ scope: "selection", nodeIds: ["a", "b"] }));
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { capture, restore } from "../scripts/qa/native-storage";
import { hashValue } from "../src/core/stable";
import { AuditStorage } from "../src/plugin/audit-storage";
import { buildReadinessReport } from "../src/core/report";
import { buildKnowledgeSummary } from "../src/plugin/knowledge-summary";
import { healthyGraph, profile } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());
const fileKey = "private-copy";
const prefix = `design-passport:cache:v1:context:${hashValue(fileKey)}:`;
const foreign = "preserved".padEnd(200, "x");
function storageFixture() {
  const values = new Map<string, unknown>([[`${prefix}first`, { original: true }], ["other-plugin:key", foreign]]);
  const writes: string[] = [];
  const storage = {
    keysAsync: async () => [...values.keys()], getAsync: async (key: string) => values.get(key),
    setAsync: async (key: string, value: unknown) => { writes.push(key); values.set(key, value); },
    deleteAsync: async (key: string) => { writes.push(key); values.delete(key); },
  };
  vi.stubGlobal("figma", { clientStorage: storage });
  return { values, writes, storage };
}

describe("isolated native QA storage", () => {
  it("restores exact scoped JSON and verifies it while preserving foreign keys", async () => {
    const fixture = storageFixture();
    const checkpoint = await capture(fileKey);
    expect(checkpoint.records).toHaveLength(1);
    fixture.values.set(`${prefix}new`, "discarded disposable QA context");
    fixture.values.set(`${prefix}first`, "changed");
    expect(await restore(checkpoint, fileKey)).toMatchObject({ digest: checkpoint.digest, entries: 1 });
    expect(await capture(fileKey)).toEqual(checkpoint);
    expect(fixture.values.get("other-plugin:key")).toBe(foreign);
  });

  it("round-trips real compressed audit/context packets through JSON and reproduces aggregate quota pressure", async () => {
    const source = storageFixture();
    source.values.delete(`${prefix}first`);
    source.values.set("other-plugin:key", new Uint8Array(2_000_000));
    const storage = new AuditStorage(source.storage);
    const p = profile(), graph = healthyGraph(p);
    const report = buildReadinessReport({ graph, profile: p, scope: "file", targetRootIds: graph.sourceFrameIds });
    const saved = await storage.saveAudit({ fileKey, target: { scope: "file" }, report, plans: [], knowledge: buildKnowledgeSummary(graph), insights: [], profile: p, provenance: { pluginVersion: "0.5.0", knowledgeVersion: "1" } });
    expect(saved.status.state).toBe("saved");
    await storage.saveContext(fileKey, "fragment", { native: true, unicode: "🚀" });
    const checkpoint = JSON.parse(JSON.stringify(await capture(fileKey)));
    expect(checkpoint.records.every((entry: { encoding: string }) => entry.encoding === "uint8-base64")).toBe(true);
    expect(JSON.stringify(checkpoint)).not.toContain("other-plugin:key");
    const isolated = storageFixture();
    isolated.values.clear();
    isolated.values.set("unrelated:key", new Uint8Array(100_000));
    await restore(checkpoint, fileKey);
    expect(await capture(fileKey)).toEqual(checkpoint);
    const restored = new AuditStorage(isolated.storage);
    expect((await restored.loadAudit(fileKey, saved.audit!.id))?.report).toEqual(report);
    expect(await restored.loadContext(fileKey, "fragment")).toEqual({ native: true, unicode: "🚀" });
    expect(isolated.values.get("unrelated:key")).toEqual(new Uint8Array(100_000));
    expect([...isolated.values].some(([key, value]) => key.endsWith("native-qa-quota-reserve") && value instanceof Uint8Array)).toBe(true);
  });

  it("preserves empty, padded and multiblock binary values with native byte accounting", async () => {
    const fixture = storageFixture();
    for (const length of [0, 1, 2, 3, 4, 4097]) {
      const value = Uint8Array.from({ length }, (_, index) => index % 256);
      fixture.values.set(`${prefix}first`, value);
      const checkpoint = JSON.parse(JSON.stringify(await capture(fileKey)));
      fixture.values.set(`${prefix}first`, "changed");
      await restore(checkpoint, fileKey);
      expect(fixture.values.get(`${prefix}first`)).toEqual(value);
      expect(fixture.values.get(`${prefix}first`)).toBeInstanceOf(Uint8Array);
    }
  });

  it.each(["file", "foreign key", "duplicate", "order", "digest", "bytes", "count", "legacy version", "encoding", "padding", "quota pressure"])("rejects invalid %s before any write", async (change) => {
    const fixture = storageFixture();
    const checkpoint = await capture(fileKey);
    if (change === "file") checkpoint.fileKey = "other-file";
    if (change === "foreign key") checkpoint.records[0]!.key = "other-plugin:key";
    if (change === "duplicate") checkpoint.records.push(checkpoint.records[0]!);
    if (change === "order") checkpoint.records.push({ key: `${prefix}earlier`, encoding: "json", value: 1 });
    if (change === "digest") checkpoint.digest = "invalid";
    if (change === "bytes") checkpoint.records[0]!.value = "x".repeat(4_000_000);
    if (change === "count") checkpoint.records = Array.from({ length: 10_001 }, (_, index) => ({ key: `${prefix}${index}`, encoding: "json", value: 1 }));
    if (change === "legacy version") Object.assign(checkpoint, { schemaVersion: 1 });
    if (change === "encoding") Object.assign(checkpoint.records[0]!, { encoding: "unknown" });
    if (change === "padding") Object.assign(checkpoint.records[0]!, { encoding: "uint8-base64", value: "AB==" });
    if (change === "quota pressure") checkpoint.quotaPressureBytes = -1;
    await expect(restore(checkpoint, fileKey)).rejects.toThrow();
    expect(fixture.writes).toEqual([]);
  });

  it("accounts for retained foreign data before replacing scoped records", async () => {
    const fixture = storageFixture();
    const checkpoint = await capture(fileKey);
    fixture.values.set("other-plugin:key", "x".repeat(4_000_000));
    await expect(restore(checkpoint, fileKey)).rejects.toThrow("shared storage budget");
    expect(fixture.writes).toEqual([]);
  });

  it("freezes incoming records before yielding and detects incomplete native writes", async () => {
    const fixture = storageFixture();
    const checkpoint = await capture(fileKey);
    const keys = fixture.storage.keysAsync;
    fixture.storage.keysAsync = async () => { checkpoint.records[0]!.value = "caller mutation"; return keys(); };
    await restore(checkpoint, fileKey);
    expect(fixture.values.get(`${prefix}first`)).toEqual({ original: true });
    fixture.storage.keysAsync = keys;
    const next = await capture(fileKey);
    fixture.storage.setAsync = async () => undefined;
    await expect(restore(next, fileKey)).rejects.toThrow("restore verification failed");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { capture, restore } from "../scripts/qa/native-storage";
import { hashValue } from "../src/core/stable";

afterEach(() => vi.unstubAllGlobals());
const fileKey = "private-copy";
const prefix = `design-passport:cache:v1:context:${hashValue(fileKey)}:`;
function storageFixture() {
  const values = new Map<string, unknown>([[`${prefix}first`, { original: true }], ["other-plugin:key", "preserved"]]);
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
    expect(fixture.values.get("other-plugin:key")).toBe("preserved");
  });

  it.each(["file", "foreign key", "duplicate", "order", "digest", "bytes", "count"])("rejects invalid %s before any write", async (change) => {
    const fixture = storageFixture();
    const checkpoint = await capture(fileKey);
    if (change === "file") checkpoint.fileKey = "other-file";
    if (change === "foreign key") checkpoint.records[0]!.key = "other-plugin:key";
    if (change === "duplicate") checkpoint.records.push(checkpoint.records[0]!);
    if (change === "order") checkpoint.records.push({ key: `${prefix}earlier`, value: 1 });
    if (change === "digest") checkpoint.digest = "invalid";
    if (change === "bytes") checkpoint.records[0]!.value = "x".repeat(4_000_000);
    if (change === "count") checkpoint.records = Array.from({ length: 10_001 }, (_, index) => ({ key: `${prefix}${index}`, value: 1 }));
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

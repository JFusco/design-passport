import { afterEach, describe, expect, it, vi } from "vitest";
import { createPendingSendController, boundPendingKey, existingPendingKey } from "../src/plugin/conductor-pending-send";
import { ConductorSubmissionRefusedError } from "../src/plugin/conductor-transport";
import type { DesignSubmission } from "../src/core/conductor-contracts";
afterEach(() => vi.unstubAllGlobals());
const payload: DesignSubmission = { submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", componentId: "feature", connectionVersion: 1, fileKey: "file", frames: [{ nodeId: "1:2", variantId: "variant", expectedVariantVersion: null }], message: "Updated navigation", annotations: [] };
const receipt = { submissionId: "server-receipt", commentId: "comment", variantIds: ["variant"], transition: "not_requested", notification: "pending", warnings: [] };
function fixture() {
  let session = 1, supported = true;
  let token = { origin: "https://example.test", token: "secret", ownerUserId: "owner-a", expiresAt: "2099-01-01" };
  const storage = new Map<string, unknown>();
  const api = { getAsync: vi.fn(async (key: string) => storage.get(key)), setAsync: vi.fn(async (key: string, value: unknown) => { storage.set(key, value); }), deleteAsync: vi.fn(async (key: string) => { storage.delete(key); }) };
  vi.stubGlobal("figma", { fileKey: "file", clientStorage: api }); // Deliberately no canvas/selection APIs.
  const request = vi.fn(async (_path: string, _body?: unknown): Promise<unknown> => receipt), present = vi.fn();
  const make = () => createPendingSendController({ credentials: () => token, current: () => true, session: () => session, supported: () => supported, request, present });
  const controller = make(), key = boundPendingKey(token, "file");
  return { controller, make, storage, api, request, present, key, token, support: (value: boolean) => { supported = value; }, switch: (owner = "owner-b") => { session++; token = { ...token, ownerUserId: owner }; } };
}
describe("durable pending sends", () => {
  it("persists dispatch metadata before transport and acknowledgement before cleanup", async () => {
    const f = fixture();
    f.request.mockImplementation(async () => {
      expect(f.storage.get(`${f.key}:dispatch`)).toMatchObject({ requestId: payload.submissionId, fileKey: "file", attemptsStarted: 1 });
      return receipt;
    });
    f.api.deleteAsync.mockImplementation(async key => { expect(f.storage.get(`${f.key}:terminal`)).toMatchObject({ outcome: "committed" }); f.storage.delete(key); });
    expect(await f.controller.send(payload, "bound")).toEqual(receipt);
    expect(f.storage.has(f.key)).toBe(false);
    expect(f.storage.get(`${f.key}:receipt`)).toBe(payload.submissionId);
  });
  it.each(["payload", "dispatch"])("does not transport after a %s storage failure", async stage => {
    const f = fixture();
    f.api.setAsync.mockImplementation(async (key, value) => { if ((stage === "payload" && key === f.key) || key.endsWith(":dispatch")) throw new Error("Storage unavailable"); f.storage.set(key, value); });
    await expect(f.controller.send(payload, "bound")).rejects.toThrow("Storage unavailable");
    expect(f.request).not.toHaveBeenCalled();
  });
  it.each(["bound", "existing"] as const)("recovers a restarted %s send without any frame selection", async kind => {
    const f = fixture(), key = kind === "bound" ? f.key : existingPendingKey(f.token, "file");
    f.storage.set(key, kind === "bound" ? { payload } : payload);
    const restarted = f.make();
    expect(await restarted.blocked()).toBe(true);
    await restarted.check();
    expect(f.request).toHaveBeenCalledWith(expect.stringContaining(payload.submissionId));
    expect(f.storage.has(key)).toBe(false);
  });
  it.each(["committed", "cancelled"] as const)("resolves an uncertain send as %s and never resends the design", async outcome => {
    const f = fixture(); f.request.mockRejectedValueOnce(new Error("Response lost"));
    await f.controller.send(payload, "bound");
    f.request.mockImplementation(async (path, body) => {
      expect(path).toContain("/resolve"); expect(body).toEqual({ fileKey: "file" });
      expect(f.storage.get(`${f.key}:recovery`)).toMatchObject({ operation: "resolve" });
      return { requestId: payload.submissionId, fileKey: "file", outcome, ...(outcome === "committed" ? { receipt: null } : {}) };
    });
    const restarted = f.make(); await restarted.requestResolution(); await restarted.resolve();
    expect(f.storage.has(f.key)).toBe(false);
    expect(f.request.mock.calls.filter(([path]) => path === "/api/figma-plugin/v1/submissions")).toHaveLength(1);
  });
  it("automatically resolves a definitive refusal on a supporting server", async () => {
    const f = fixture(); f.request.mockRejectedValueOnce(new ConductorSubmissionRefusedError("Refused"))
      .mockResolvedValueOnce({ requestId: payload.submissionId, fileKey: "file", outcome: "cancelled" });
    await f.controller.send(payload, "bound");
    expect(f.request.mock.calls[1]?.[0]).toContain("/resolve"); expect(f.storage.has(f.key)).toBe(false);
  });
  it("restores editing on an old server only for a proven live first-attempt refusal", async () => {
    const f = fixture(); f.support(false); f.request.mockRejectedValueOnce(new ConductorSubmissionRefusedError("Refused"));
    await expect(f.controller.send(payload, "bound")).rejects.toThrow("first send"); expect(f.storage.has(f.key)).toBe(false);
    f.storage.set(f.key, { payload: { ...payload, submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } });
    expect(await f.make().blocked()).toBe(true);
    await f.make().send(payload, "bound");
    expect(f.request).toHaveBeenCalledTimes(1); expect(f.storage.has(f.key)).toBe(true);
  });
  it("does not treat a missing receipt, timeout or restarted metadata as cancellation", async () => {
    const f = fixture(); f.support(false); f.storage.set(f.key, { payload });
    f.request.mockRejectedValue(new Error("404")); await f.make().check();
    expect(f.storage.has(f.key)).toBe(true); expect(f.present.mock.calls.at(-1)?.[0]).toContain("does not cancel");
  });
  it("retains resolution through restart and prevents transport when sidecar storage fails", async () => {
    const f = fixture(); f.storage.set(f.key, { payload });
    await f.controller.requestResolution(); f.api.setAsync.mockRejectedValueOnce(new Error("Disk full")); await f.controller.resolve();
    expect(f.request).not.toHaveBeenCalled(); expect(f.storage.has(f.key)).toBe(true);
    f.request.mockRejectedValueOnce(new Error("Response lost")); await f.controller.resolve();
    expect(f.storage.has(`${f.key}:recovery`)).toBe(true);
    await f.make().send(payload, "bound");
    expect(f.request).toHaveBeenCalledTimes(1);
  });
  it("retains the payload if terminal acknowledgement cannot be stored", async () => {
    const f = fixture(); f.storage.set(f.key, { payload }); f.api.setAsync.mockRejectedValueOnce(new Error("Disk full"));
    await f.controller.check(); expect(f.storage.has(f.key)).toBe(true); expect(f.api.deleteAsync).not.toHaveBeenCalled();
  });
  it.each(["owner-a", "owner-b"])("ignores late receipts after reopening as %s", async owner => {
    const f = fixture(); let done!: (value: unknown) => void;
    f.request.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
    const sending = f.controller.send(payload, "bound"); await vi.waitFor(() => expect(done).toBeTypeOf("function"));
    f.switch(owner); done(receipt); await expect(sending).rejects.toThrow("session changed");
    expect(f.storage.has(f.key)).toBe(true); expect(f.api.deleteAsync).not.toHaveBeenCalled();
  });
  it("copies legacy existing pending storage before removing its old key", async () => {
    const f = fixture(), legacy = `conductor-existing-pending-v1:${f.token.origin}:${f.token.ownerUserId}`;
    f.storage.set(legacy, payload); f.api.deleteAsync.mockRejectedValueOnce(new Error("Interrupted"));
    await expect(f.controller.blocked()).rejects.toThrow("Interrupted");
    expect(f.storage.has(legacy)).toBe(true); expect(f.storage.get(existingPendingKey(f.token, "file"))).toEqual(payload);
    expect(await f.make().blocked()).toBe(true); expect(f.storage.has(legacy)).toBe(false);
  });
  it("requires an explicit confirmation before starting uncertain resolution", async () => {
    const f = fixture(); f.storage.set(f.key, { payload });
    await expect(f.controller.resolve()).rejects.toThrow("Confirm pending-send resolution");
    expect(f.request).not.toHaveBeenCalled();
  });
  it.each(["payload", "dispatch", "terminal"])("fences a paused %s write after switching accounts", async phase => {
    const f = fixture(); let release!: () => void, entered!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; }), began = new Promise<void>(resolve => { entered = resolve; });
    f.api.setAsync.mockImplementation(async (key, value) => {
      const pause = phase === "payload" ? key === f.key : key.endsWith(`:${phase}`);
      if (pause) { entered(); await gate; }
      f.storage.set(key, value);
    });
    const sending = f.controller.send(payload, "bound"); await began;
    f.switch(); release(); await expect(sending).rejects.toThrow("session changed");
    expect(f.storage.has(f.key)).toBe(true); expect(f.api.deleteAsync).not.toHaveBeenCalled();
    expect(f.request).toHaveBeenCalledTimes(phase === "terminal" ? 1 : 0);
    expect(await f.make().blocked()).toBe(false);
    f.switch("owner-a"); expect(await f.make().blocked()).toBe(phase !== "terminal");
  });

});

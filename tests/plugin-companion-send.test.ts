import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createCompanionSend, type CompanionSource, type CompanionView } from "../src/plugin/companion-send";
import { CompanionRequestError, ConductorTransport, type CompanionUpload, type ConductorCredentials } from "../src/plugin/conductor-transport";
import { parseUiMessage } from "../src/plugin/message-validation";

function fixture() {
  const evidenceId = randomUUID();
  const data = new Map<string, unknown>();
  let credentials: ConductorCredentials | undefined = { origin: "http://localhost:3109", ownerUserId: "designer", token: "synthetic", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  let source = '{ "example": "🧪" }\n';
  let projects = [{ id: "atlas", name: "Atlas" }, { id: "harbor", name: "Harbor" }];
  let available = true;
  let failBeforeCommit = false;
  let disconnectAfterCommit = false;
  let now = Date.now();
  const receipts = new Map<string, { requestId: string; projectId: string; evidenceId: string }>();
  const posts: CompanionUpload[] = [];
  const storage = {
    keysAsync: async () => [...data.keys()],
    getAsync: async (key: string) => data.get(key),
    setAsync: async (key: string, value: unknown) => { data.set(key, structuredClone(value)); },
    deleteAsync: async (key: string) => { data.delete(key); },
  };
  const request = vi.fn(async (token: ConductorCredentials, path: string, upload?: CompanionUpload) => {
    if (!available) throw new CompanionRequestError(403, "Reconnect with Companion contributions.");
    const url = new URL(path, token.origin);
    const projectId = url.searchParams.get("project");
    if (!projectId) return { projects };
    if (!projects.some(project => project.id === projectId)) throw new CompanionRequestError(403, "Access refused");
    if (upload) {
      expect(data.get(`companion-send-v1:${encodeURIComponent(token.origin)}:${token.ownerUserId}:${upload.requestId}`)).toBeInstanceOf(Uint8Array);
      posts.push(upload);
      if (failBeforeCommit) throw new Error("Unavailable before commit.");
      receipts.set(upload.requestId, { projectId, requestId: upload.requestId, evidenceId });
      if (disconnectAfterCommit) throw new Error("Response lost.");
      return receipts.get(upload.requestId);
    }
    const receipt = receipts.get(url.searchParams.get("receipt")!);
    if (!receipt) throw new CompanionRequestError(404, "Unavailable");
    return receipt;
  });
  const buildExport = vi.fn(async () => ({ filename: "example.json", content: source }));
  function launch() {
    let view: CompanionView | undefined;
    const client = createCompanionSend({
      connection: async () => credentials, environment: () => "Local Conductor", storage,
      open: () => {}, stop: () => {}, newId: randomUUID, request,
      export: buildExport, now: () => now, present: value => { view = value; },
    });
    return {
      view: () => view!, client,
      open: (source?: CompanionSource) => client.handle({ type: "companion-open", ...(source ? { source } : {}) }),
      confirm: (projectId = "atlas", retryId?: string) => client.handle({ type: "companion-send", projectId, consent: true,
        reviewId: view!.preview!.reviewId, ...(retryId ? { retryId } : {}) }),
      reviewRetry: (requestId: string) => client.handle({ type: "companion-review-retry", requestId }),
      check: (requestId: string) => client.handle({ type: "companion-check", requestId }),
    };
  }
  return { launch, data, request, storage, receipts, posts, buildExport, input: (content: string) => { source = content; },
    beforeCommit: (failing: boolean) => { failBeforeCommit = failing; },
    advance: (milliseconds: number) => { now += milliseconds; },
    projectAccess: (items: typeof projects) => { projects = items; },
    revoke: () => { available = false; }, account: (ownerUserId: string) => { credentials = { ...credentials!, ownerUserId }; },
    origin: (origin: string) => { credentials = { ...credentials!, origin }; },
    offline: () => { credentials = undefined; }, loseResponse: (lost: boolean) => { disconnectAfterCommit = lost; } };
}

describe("explicit Companion contributions", () => {
  it("recovers a lost response after restarting, then records a deliberate second receipt for the same evidence", async () => {
    const setup = fixture();
    const first = setup.launch();
    expect(setup.request).not.toHaveBeenCalled();
    await first.open({kind: "audit"});
    expect(first.view().preview?.bytes).toBe(Buffer.byteLength('{ "example": "🧪" }\n'));
    expect(setup.posts).toHaveLength(0);
    setup.loseResponse(true);
    await first.confirm();
    const requestId = setup.posts[0]!.requestId;
    expect(first.view().pending[0]?.requestId).toBe(requestId);
    expect(setup.posts[0]?.content).toBe('{ "example": "🧪" }\n');
    expect(JSON.stringify(first.view())).not.toContain("🧪");
    setup.loseResponse(false);
    first.client.close();
    const reopened = setup.launch();
    await reopened.open();
    await reopened.check(requestId);
    expect(reopened.view().receipt?.requestId).toBe(requestId);
    expect(reopened.view().pending).toHaveLength(0);
    expect([...setup.data.values()].some(value => value instanceof Uint8Array)).toBe(false);
    expect(setup.posts).toHaveLength(1);
    const evidenceId = reopened.view().receipt!.evidenceId;
    await reopened.open({kind: "audit"}); await reopened.confirm();
    expect(reopened.view().receipt?.requestId).not.toBe(requestId);
    expect(reopened.view().receipt?.evidenceId).toBe(evidenceId);
  });
  it.each<CompanionSource>([{ kind: "audit" }, { kind: "learning", digest: "previewed" }])(
    "retries the exact $kind bytes and request ID after a pre-commit failure and restart", async source => {
      const setup = fixture(), first = setup.launch();
      const content = '{ "generatedAt": "original", "title": "café 🧪" }\r\n';
      setup.input(content);
      setup.beforeCommit(true);
      await first.open(source);
      await first.confirm();
      const original = setup.posts[0]!;
      expect(setup.receipts.size).toBe(0);
      first.client.close();

      setup.input('{ "generatedAt": "restored", "title": "café 🧪" }\n');
      setup.buildExport.mockClear();
      const reopened = setup.launch();
      await reopened.open();
      expect(reopened.view().preview).toBeUndefined();
      expect(reopened.view().pending[0]).toMatchObject({ requestId: original.requestId, kind: source.kind, canReview: true });
      await reopened.check(original.requestId);
      expect(reopened.view().message).toMatch(/No receipt/);
      await reopened.reviewRetry(original.requestId);
      expect(reopened.view().preview).toMatchObject({
        kind: source.kind, filename: "example.json", bytes: Buffer.byteLength(content),
        retry: { requestId: original.requestId, projectId: "atlas" },
      });
      expect(setup.posts).toHaveLength(1);
      setup.beforeCommit(false);
      await reopened.confirm("atlas", original.requestId);
      expect(setup.buildExport).not.toHaveBeenCalled();
      expect(setup.posts).toEqual([original, original]);
      expect(Buffer.from(setup.posts[1]!.content)).toEqual(Buffer.from(content));
      expect(reopened.view().receipt?.requestId).toBe(original.requestId);
      expect(reopened.view().pending).toHaveLength(0);
    },
  );
  it("binds the saved retry review to the original account, environment and permitted project", async () => {
    const setup = fixture(), first = setup.launch();
    setup.beforeCommit(true);
    await first.open({ kind: "audit" }); await first.confirm();
    const requestId = setup.posts[0]!.requestId;
    setup.beforeCommit(false);
    const reopened = setup.launch();
    await reopened.open({ kind: "learning", digest: "previewed" });
    await reopened.confirm("atlas", requestId);
    expect(setup.posts).toHaveLength(1);
    await reopened.reviewRetry(requestId);
    await reopened.confirm("harbor", requestId);
    await reopened.confirm("atlas", randomUUID());
    await reopened.client.handle({ type: "companion-send", reviewId: randomUUID(), retryId: requestId, projectId: "atlas", consent: true });
    expect(setup.posts).toHaveLength(1);
    setup.account("other");
    await reopened.confirm("atlas", requestId);
    expect(reopened.view().needsConnection).toBe(true);
    await reopened.open();
    expect(reopened.view().pending).toEqual([]);
    setup.account("designer"); setup.origin("https://another.example.test");
    await reopened.open();
    expect(reopened.view().pending).toEqual([]);
    setup.origin("http://localhost:3109"); setup.projectAccess([{ id: "harbor", name: "Harbor" }]);
    await reopened.open();
    await reopened.reviewRetry(requestId);
    expect(reopened.view().preview).toBeUndefined();
    expect(reopened.view().pending).toEqual([]);
    expect(setup.posts).toHaveLength(1);
  });
  it("clears expired bytes on restart and retains the current owner's receipt lookup", async () => {
    const setup = fixture(), first = setup.launch();
    setup.loseResponse(true);
    await first.open({ kind: "audit" }); await first.confirm();
    const requestId = setup.posts[0]!.requestId;
    setup.advance(24 * 60 * 60 * 1_000);
    const reopened = setup.launch();
    await reopened.client.prune();
    expect([...setup.data.values()]).toEqual([expect.objectContaining({ requestId })]);
    await reopened.open();
    expect(reopened.view().pending[0]).toMatchObject({ requestId, canReview: false });
    await reopened.reviewRetry(requestId);
    expect(reopened.view().preview).toBeUndefined();
    await reopened.check(requestId);
    expect(reopened.view().receipt?.requestId).toBe(requestId);
    expect(setup.posts).toHaveLength(1);
  });
  it("rejects damaged saved content while preserving the request's receipt lookup", async () => {
    const setup = fixture(), first = setup.launch();
    setup.loseResponse(true);
    await first.open({ kind: "audit" }); await first.confirm();
    const requestId = setup.posts[0]!.requestId;
    const packet = [...setup.data.values()][0] as Uint8Array;
    packet.fill(0, packet.byteLength - 10);
    const reopened = setup.launch();
    await reopened.open(); await reopened.reviewRetry(requestId);
    await reopened.confirm("atlas", requestId);
    expect(reopened.view().message).toMatch(/could not be verified/);
    expect(setup.posts).toHaveLength(1);
    await reopened.check(requestId);
    expect(reopened.view().receipt?.requestId).toBe(requestId);
  });
  it("preserves the first pending export when another would exceed the shared retry budget", async () => {
    const setup = fixture(), first = setup.launch();
    setup.beforeCommit(true);
    setup.input(JSON.stringify({ file: randomBytes(390_000).toString("base64") }));
    await first.open({ kind: "audit" }); await first.confirm();
    const requestId = setup.posts[0]!.requestId;
    setup.account("other");
    setup.input(JSON.stringify({ file: randomBytes(390_000).toString("base64") }));
    const second = setup.launch();
    await second.open({ kind: "audit" }); await second.confirm();
    expect(second.view().message).toMatch(/retry storage is full/);
    expect(setup.posts).toHaveLength(1);
    expect([...setup.data.keys()][0]).toMatch(requestId);
    expect(setup.data.size).toBe(1);
  });
  it("keeps offline and workspace-only connections private and rejects oversize or unconfirmed sends", async () => {
    const setup = fixture(), app = setup.launch();
    expect(() => parseUiMessage({type: "companion-send", consent: false})).toThrow(/Confirm/);
    setup.input("x".repeat(1_000_001)); await app.open({kind: "learning", digest: "preview"});
    expect(app.view().preview).toBeUndefined(); expect(app.view().message).toMatch(/size limit/);
    setup.revoke(); await app.open({kind: "audit"});
    expect(app.view().needsConnection).toBe(true); expect(app.view().projects).toEqual([]);
    setup.offline(); setup.request.mockClear(); await app.open({kind: "audit"});
    expect(setup.request).not.toHaveBeenCalled(); expect(setup.posts).toHaveLength(0);
  });
  it("refuses to dispatch if the intent could not be persisted", async () => {
    const setup = fixture(), app = setup.launch(); await app.open({kind: "audit"});
    vi.spyOn(setup.storage, "setAsync").mockRejectedValueOnce(new Error("Storage is full"));
    await app.confirm(); expect(setup.posts).toHaveLength(0); expect(app.view().message).toMatch(/full/);
  });
  it("transports the original bytes and headers to the fixed Companion route", async () => {
    const origin = "http://localhost:3109";
    const fetcher = vi.fn(async (_url: string, _opts: RequestInit) => new Response("{}", { status: 200 }));
    const transport = new ConductorTransport([{origin, id: "local", label: "Local"}], fetcher as typeof fetch);
    const companion = { kind: "audit" as const, requestId: randomUUID(), content: '{ "a": 1 }\n' };
    transport.open(); await transport.request(origin, "/api/figma-plugin/v1/companion?project=atlas", { token: "fixture", companion });
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ body: companion.content, method: "POST", redirect: "error",
      headers: {"X-Passport-Request": companion.requestId, "X-Passport-Kind": "audit"} });
    await expect(transport.request(origin, "/api/figma-plugin/v1/submissions", { token: "fixture", companion })).rejects.toThrow(/Invalid/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

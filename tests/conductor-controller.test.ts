import { afterEach, describe, expect, it, vi } from "vitest";
import { createConductorController } from "../src/plugin/conductor-controller";
import { CONDUCTOR_ENVIRONMENTS } from "../src/plugin/conductor-environments";
import { parseDesignSubmission, type DesignSubmission } from "../src/core/conductor-contracts";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function controller() {
  return createConductorController({ post: vi.fn(), enterCanvas: () => () => {}, apply: vi.fn() });
}
describe("native Conductor controller", () => {
  it("pairs without a browser URL global in the Figma sandbox", async () => {
    vi.useFakeTimers();
    const environment = CONDUCTOR_ENVIRONMENTS[0]!;
    const verificationUrl = `${environment.origin}/design-passport/pair?code=ABCDEF12`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "pairing", userCode: "ABCDEF12", pollingSecret: "a".repeat(64), verificationUrl, expiresAt: new Date(Date.now() + 600000).toISOString() }));
    const openExternal = vi.fn();
    vi.stubGlobal("fetch", fetcher); vi.stubGlobal("URL", undefined);
    vi.stubGlobal("figma", { openExternal, clientStorage: { getAsync: async () => undefined } });
    const client = controller(); await client.handle({ type: "conductor-connect", environment: environment.id });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(openExternal).toHaveBeenCalledWith(verificationUrl);
    client.stop();
  });
  it("does not resume network access when credential loading finishes after entering offline audit", async () => {
    let finish!: (value: unknown) => void;
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("figma", { fileKey: "file", clientStorage: { getAsync: () => new Promise((resolve) => { finish = resolve; }) } });
    const client = controller(); const opening = client.handle({ type: "conductor-open" });
    await client.handle({ type: "conductor-offline" });
    finish({ origin: CONDUCTOR_ENVIRONMENTS[0]!.origin, ownerUserId: "owner", token: "secret", expiresAt: new Date(Date.now() + 10000).toISOString() });
    await opening; expect(fetcher).not.toHaveBeenCalled();
  });
});

it("retries a timed-out pairing poll under the same code and stops on leaving Conductor", async () => {
  vi.useFakeTimers();
  const environment = CONDUCTOR_ENVIRONMENTS.find((entry) => entry.id === "production")!;
  const verificationUrl = `${environment.origin}/design-passport/pair?code=ABCDEF12`;
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ id: "pairing", userCode: "ABCDEF12", pollingSecret: "a".repeat(64), verificationUrl, expiresAt: new Date(Date.now() + 600000).toISOString() }))
    .mockImplementationOnce(() => new Promise(() => {}))
    .mockResolvedValue(Response.json({ state: "pending" }));
  const post = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("figma", { openExternal: vi.fn(), clientStorage: { getAsync: async () => undefined } });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  await client.handle({ type: "conductor-connect", environment: environment.id });
  await vi.advanceTimersByTimeAsync(35000);
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "pairing", userCode: "ABCDEF12" }));
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([`${environment.origin}/api/figma-plugin/v1/pairings`, `${environment.origin}/api/figma-plugin/v1/pairings/pairing`, `${environment.origin}/api/figma-plugin/v1/pairings/pairing`]);
  await client.handle({ type: "conductor-offline" });
  await vi.advanceTimersByTimeAsync(600000);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("never polls past the original pairing deadline after a timeout", async () => {
  vi.useFakeTimers();
  const environment = CONDUCTOR_ENVIRONMENTS.find((entry) => entry.id === "production")!;
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ id: "pairing", userCode: "ABCDEF12", pollingSecret: "a".repeat(64), verificationUrl: `${environment.origin}/design-passport/pair?code=ABCDEF12`, expiresAt: new Date(Date.now() + 36000).toISOString() })).mockImplementation(() => new Promise(() => {}));
  const post = vi.fn(); vi.stubGlobal("fetch", fetcher); vi.stubGlobal("figma", { openExternal: vi.fn(), clientStorage: { getAsync: async () => undefined } });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  await client.handle({ type: "conductor-connect", environment: environment.id });
  await vi.advanceTimersByTimeAsync(40000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "error", message: expect.stringContaining("expired") }));
  client.stop();
});

it("keeps an authenticated connection usable after a local selection mistake", async () => {
  const origin = CONDUCTOR_ENVIRONMENTS[0]!.origin;
  const credentials = { origin, ownerUserId: "owner", token: "fixture", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const post = vi.fn();
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ contractVersion: "1.0.0", enabled: true, jobs: [], destination: { project: "Project", deliverable: "Website" } }));
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("figma", { fileKey: "file", currentPage: { selection: [] }, clientStorage: { getAsync: async (key: string) => key === "conductor-credentials-v1" ? credentials : undefined } });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  await client.handle({ type: "conductor-open" });
  const calls = fetcher.mock.calls.length;
  await client.handle({ type: "conductor-inspect-selection" });
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", message: expect.stringContaining("Select one to eight") }));
  expect(fetcher).toHaveBeenCalledTimes(calls);
  client.stop();
});

it("shows saving, blocks duplicate actions and preserves an uncertain submission for retry", async () => {
  const origin = CONDUCTOR_ENVIRONMENTS[0]!.origin;
  const credentials = { origin, ownerUserId: "owner", token: "fixture", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const frame = { id: "1:1", name: "Design", type: "FRAME", parent: null, annotations: [], getSharedPluginData: () => JSON.stringify({ schemaVersion: 1, role: "design", organizationId: "org", projectId: "project", deliverableId: "deliverable", componentId: "component", workspaceId: "workspace", fileKey: "file", nodeId: "1:1", jobItemId: "job", elementId: "design", variantId: "variant", revision: 1, connectionVersion: 1 }) };
  const storage = new Map<string, unknown>([["conductor-credentials-v1", credentials]]);
  let finish!: (value: Response) => void;
  const bodies: { submissionId: string }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).endsWith("/submissions")) {
      bodies.push(JSON.parse(String(init?.body)));
      if (bodies.length === 1) return new Promise<Response>((resolve) => { finish = resolve; });
      return Response.json({ submissionId: "saved", commentId: "comment", variantIds: ["variant"], transition: "not_requested", notification: "disabled", warnings: [] });
    }
    if (String(url).includes("/submissions/context?")) return Response.json({ componentId: "component", componentName: "Hero", connectionVersion: 1, frames: [{ nodeId: "1:1", variantId: "variant", expectedVariantVersion: 1 }], workflow: { version: 1, transitions: [] } });
    return Response.json({ contractVersion: "1.0.0", enabled: true, jobs: [], destination: { project: "Project", deliverable: "Website" } });
  });
  const post = vi.fn(); vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("figma", { fileKey: "file", currentPage: { selection: [frame] }, clientStorage: { getAsync: async (key: string) => storage.get(key), setAsync: async (key: string, value: unknown) => { storage.set(key, value); }, deleteAsync: async (key: string) => { storage.delete(key); } } });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  await client.handle({ type: "conductor-open" }); await client.handle({ type: "conductor-inspect-selection" });
  const command = { type: "conductor-submit", message: "Review this design", annotationIds: [], transitionId: "" } as const;
  const submitting = client.handle({ ...command, annotationIds: [] });
  await vi.waitFor(() => expect(bodies).toHaveLength(1));
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ busy: "submitting", submission: expect.objectContaining({ componentName: "Hero" }) }));
  await client.handle({ ...command, annotationIds: [] }); expect(bodies).toHaveLength(1);
  finish(new Response("", { status: 503 })); await submitting;
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", hasError: true, submission: expect.objectContaining({ componentName: "Hero" }) }));
  await client.handle({ ...command, annotationIds: [] });
  expect(bodies[1]?.submissionId).toBe(bodies[0]?.submissionId);
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", message: expect.stringContaining("External notifications are disabled") }));
  client.stop();
});

it("clears destination loading after a failed read and permits an explicit retry", async () => {
  const credentials = { origin: CONDUCTOR_ENVIRONMENTS[0]!.origin, ownerUserId: "owner", token: "fixture", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const frame = { id: "90:1", type: "FRAME", name: "Existing frame", width: 1024, parent: null, annotations: [], getSharedPluginData: () => "" };
  let attempts = 0;
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).includes("/destinations")) return ++attempts === 1 ? new Response("", { status: 503 }) : Response.json({ options: [{ id: "p", name: "Project" }], more: false });
    return Response.json({ contractVersion: "1.0.0", enabled: true, jobs: [], destination: { project: "", deliverable: "" } });
  });
  const post = vi.fn(); vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("figma", { fileKey: "file", editorType: "figma", mode: "default", currentPage: { selection: [frame] }, clientStorage: { getAsync: async (key: string) => key === "conductor-credentials-v1" ? credentials : undefined } });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  await client.handle({ type: "conductor-open" }); await client.handle({ type: "conductor-start-existing" });
  expect(post.mock.calls.at(-1)?.[0]).toMatchObject({ state: "connected", hasError: true });
  expect(post.mock.calls.at(-1)?.[0].busy).toBeUndefined();
  await client.handle({ type: "conductor-existing-destination" });
  expect(post.mock.calls.at(-1)?.[0]).toMatchObject({ existing: { options: [{ id: "p", name: "Project" }] } });
  expect(post.mock.calls.at(-1)?.[0].busy).toBeUndefined(); client.stop();
});

it("shows neutral refusal guidance for a workspace submission conflict", async () => {
  const credentials = { origin: CONDUCTOR_ENVIRONMENTS[0]!.origin, ownerUserId: "owner", token: "fixture", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const binding = { schemaVersion: 1, role: "design", organizationId: "org", projectId: "p", deliverableId: "d", componentId: "c", workspaceId: "workspace", fileKey: "file", nodeId: "1:1", jobItemId: "job", elementId: "design", variantId: "variant", revision: 1, connectionVersion: 1 };
  const frame = { id: "1:1", name: "Design", type: "FRAME", parent: null, annotations: [], getSharedPluginData: () => JSON.stringify(binding) };
  const storage = new Map<string, unknown>([["conductor-credentials-v1", credentials]]);
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).endsWith("/submissions")) return new Response("", { status: 409 });
    if (String(url).includes("/submissions/context?")) return Response.json({ componentId: "c", componentName: "Card", connectionVersion: 1, frames: [{ nodeId: "1:1", variantId: "variant", expectedVariantVersion: 1 }], workflow: { version: 1, transitions: [] } });
    return Response.json({ contractVersion: "1.0.0", enabled: true, jobs: [], destination: { project: "Project", deliverable: "Website" } });
  });
  const post = vi.fn(); vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("figma", { fileKey: "file", currentPage: { selection: [frame] }, clientStorage: { getAsync: async (key: string) => storage.get(key), setAsync: async (key: string, value: unknown) => { storage.set(key, value); } } });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  await client.handle({ type: "conductor-open" }); await client.handle({ type: "conductor-inspect-selection" });
  await client.handle({ type: "conductor-submit", message: "Review design", annotationIds: [], transitionId: "" });
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", hasError: true, message: expect.stringContaining("Conductor refused this submission") }));
  expect(post.mock.calls.at(-1)?.[0].message).not.toMatch(/frame width|default appearance/);
  client.stop();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function existingControllerFixture() {
  const credentials = { origin: CONDUCTOR_ENVIRONMENTS[0]!.origin, ownerUserId: "account-a", token: "fixture-a", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const frame = { id: "90:1", type: "FRAME", name: "Existing frame", width: 1024, parent: null, annotations: [{ label: "Account A note" }], getSharedPluginData: () => "" };
  const destination = { project: { id: "p", name: "Project" }, deliverable: { id: "d", name: "Website" }, component: { id: "c", name: "Card" }, devices: [{ slug: "tablet", width: 1024, hasDefault: false }] };
  const storage = new Map<string, unknown>([["conductor-credentials-v1", credentials]]);
  const clientStorage = {
    getAsync: vi.fn(async (key: string): Promise<unknown> => storage.get(key)),
    setAsync: vi.fn(async (key: string, value: unknown) => { storage.set(key, value); }),
    deleteAsync: vi.fn(async (key: string) => { storage.delete(key); }),
  };
  const submissions: { payload: DesignSubmission; authorization: string | null }[] = [];
  const response = { refused: false };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).endsWith("/submissions")) {
      const payload = parseDesignSubmission(JSON.parse(String(init?.body)));
      submissions.push({ payload, authorization: new Headers(init?.headers).get("Authorization") });
      return response.refused ? new Response("", { status: 409 }) : Response.json({ commentId: "saved", variantIds: payload.frames.map((entry) => entry.variantId) });
    }
    if (String(url).includes("/destinations")) return Response.json({ options: [], more: false, destination });
    return Response.json({ contractVersion: "1.0.0", enabled: true, jobs: [], destination: { project: "Project", deliverable: "Website" } });
  });
  const post = vi.fn(); vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("figma", { fileKey: "file", editorType: "figma", mode: "default", currentPage: { selection: [frame] }, clientStorage });
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  const review = async () => {
    await client.handle({ type: "conductor-open" });
    await client.handle({ type: "conductor-start-existing" });
    await client.handle({ type: "conductor-existing-destination", projectId: "p", deliverableId: "d", componentId: "c" });
    await client.handle({ type: "conductor-review-existing", variantName: "A's design", isDefaultAppearance: true, deviceTargetSlug: "tablet", message: "Account A message", annotationIds: ["90:1/0"] });
  };
  const reopenAsB = async () => {
    storage.set("conductor-credentials-v1", { ...credentials, ownerUserId: "account-b", token: "fixture-b" });
    await client.handle({ type: "conductor-open" });
    await client.handle({ type: "conductor-start-existing" });
    const presentation = post.mock.calls.at(-1)![0];
    expect(presentation.existing.review).toBeUndefined();
    expect(presentation.existing.details).toBeUndefined();
    post.mockClear();
    return presentation;
  };
  return { client, clientStorage, storage, credentials, submissions, response, post, review, reopenAsB };
}

describe.each(["conductor-offline", "conductor-disconnect"] as const)("existing handoff session reset: %s", (reset) => {
  it("does not send a pending write under a new account and lets the original owner recover it", async () => {
    const f = existingControllerFixture(); await f.review();
    const entered = deferred<void>(); const gate = deferred<void>();
    f.clientStorage.setAsync.mockImplementationOnce(async (key, value) => { entered.resolve(); await gate.promise; f.storage.set(key, value); });
    const confirming = f.client.handle({ type: "conductor-confirm-existing" }); await entered.promise;
    await f.client.handle({ type: reset });
    const presentation = await f.reopenAsB();
    gate.resolve(); await confirming;
    expect(f.submissions).toEqual([]);
    expect(f.post.mock.calls.length).toBeGreaterThan(0);
    for (const [state] of f.post.mock.calls) expect(state).toEqual(presentation);
    const key = `conductor-existing-pending-v1:${f.credentials.origin}:account-a:file`;
    const pending = parseDesignSubmission(f.storage.get(key));
    await f.client.handle({ type: "conductor-offline" });
    f.storage.set("conductor-credentials-v1", f.credentials);
    await f.client.handle({ type: "conductor-open" }); await f.client.handle({ type: "conductor-start-existing" });
    expect(f.post.mock.calls.at(-1)?.[0].existing.review).toMatchObject({ variantName: "A's design", message: "Account A message", annotationIds: ["90:1/0"] });
    await f.client.handle({ type: "conductor-confirm-existing" });
    expect(f.submissions).toEqual([{ payload: pending, authorization: "Bearer fixture-a" }]);
    expect(f.storage.has(key)).toBe(false); f.client.stop();
  });

  it.each([false, true])("ignores a stale pending read (rejected: %s)", async (rejected) => {
    const f = existingControllerFixture(); await f.review();
    const entered = deferred<void>(); const gate = deferred<unknown>();
    f.clientStorage.getAsync.mockImplementationOnce(async () => { entered.resolve(); return gate.promise; });
    const confirming = f.client.handle({ type: "conductor-confirm-existing" }); await entered.promise;
    await f.client.handle({ type: reset });
    const presentation = await f.reopenAsB();
    if (rejected) gate.reject(new Error("Account A storage read failed")); else gate.resolve(undefined);
    await confirming;
    expect(f.submissions).toEqual([]);
    for (const [state] of f.post.mock.calls) expect(state).toEqual(presentation);
    f.client.stop();
  });

  it.each([false, true])("ignores terminal cleanup after switching accounts (refused: %s)", async (refused) => {
    const f = existingControllerFixture(); await f.review(); f.response.refused = refused;
    const entered = deferred<void>(); const gate = deferred<void>();
    f.clientStorage.deleteAsync.mockImplementationOnce(async (key) => { entered.resolve(); await gate.promise; f.storage.delete(key); });
    const confirming = f.client.handle({ type: "conductor-confirm-existing" }); await entered.promise;
    expect(f.submissions).toHaveLength(1);
    expect(f.submissions[0]?.authorization).toBe("Bearer fixture-a");
    await f.client.handle({ type: reset });
    const presentation = await f.reopenAsB();
    gate.resolve(); await confirming;
    for (const [state] of f.post.mock.calls) expect(state).toEqual(presentation);
    expect(f.submissions).toHaveLength(1); f.client.stop();
  });
});

it("disconnects from an existing-frame review and clears the handoff presentation", async () => {
  const f = existingControllerFixture(); await f.review();
  await f.client.handle({ type: "conductor-disconnect" });
  expect(f.post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "offline" }));
  expect(f.post.mock.calls.at(-1)?.[0].existing).toBeUndefined();
  expect(f.storage.has("conductor-credentials-v1")).toBe(false); f.client.stop();
});

it("keeps the existing-frame refusal guidance and editable details in the parent presentation", async () => {
  const f = existingControllerFixture(); await f.review(); f.response.refused = true;
  await f.client.handle({ type: "conductor-confirm-existing" });
  expect(f.post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", hasError: true, message: expect.stringContaining("frame width, design name and default appearance"), existing: expect.objectContaining({ review: undefined, details: expect.objectContaining({ variantName: "A's design", message: "Account A message", annotationIds: ["90:1/0"] }) }) }));
  expect([...f.storage.keys()]).toEqual(["conductor-credentials-v1"]); f.client.stop();
});

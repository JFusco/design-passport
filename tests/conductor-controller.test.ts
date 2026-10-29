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

it("shows saving, blocks duplicate actions and preserves an uncertain submission for recovery", async () => {
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
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ state: "connected", recovery: expect.objectContaining({ canResolve: false }) }));
  await client.handle({ ...command, annotationIds: [] });
  expect(bodies).toHaveLength(1);
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ recovery: expect.any(Object) }));
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

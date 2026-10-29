import { afterEach, describe, expect, it, vi } from "vitest";
import { createConductorController } from "../src/plugin/conductor-controller";
import { CONDUCTOR_ENVIRONMENTS } from "../src/plugin/conductor-environments";
import { parseDesignSubmission, type DesignSubmission } from "../src/core/conductor-contracts";
import type { ConductorCommand, ConductorPresentation } from "../src/plugin/conductor-state";
import { ConductorPanel } from "../src/ui/components/ConductorPanel";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function lifecycleFixture(kind: "bound" | "existing") {
  const credentials = { origin: CONDUCTOR_ENVIRONMENTS[0]!.origin, ownerUserId: "account-a", token: "fixture-a", expiresAt: new Date(Date.now() + 600_000).toISOString() };
  const binding = { schemaVersion: 1, role: "design", organizationId: "org", projectId: "p", deliverableId: "d", componentId: "c", workspaceId: "workspace", fileKey: "file", nodeId: "1:1", jobItemId: "job", elementId: "design", variantId: "variant", revision: 1, connectionVersion: 1 };
  const frame = { id: "1:1", type: "FRAME", name: "Design", width: 1024, parent: null, annotations: [{ label: "Checked note" }], getSharedPluginData: () => kind === "bound" ? JSON.stringify(binding) : "" };
  const destination = { project: { id: "p", name: "Project" }, deliverable: { id: "d", name: "Website" }, component: { id: "c", name: "Card" }, devices: [{ slug: "tablet", width: 1024, hasDefault: false }] };
  const context = { contractVersion: "1.0.0", enabled: true, supports: ["design_change", "resolve_pending_send"], jobs: [{ id: "job", name: "Card", device: "tablet", state: "ready_for_canvas", canApply: true }], destination: { project: "Project", deliverable: "Website" } };
  const selectionContext = { projectId: "p", projectName: "Project", deliverableId: "d", deliverableName: "Website", componentId: "c", componentName: "Card", connectionVersion: 1, frames: [{ nodeId: "1:1", variantId: "variant", expectedVariantVersion: 1 }], frameDetails: { "1:1": { variantName: "Tablet", isDefaultAppearance: true, deviceTargetSlug: "tablet", frameWidth: 1024 } }, workflow: { version: 1, transitions: [] } };
  const storage = new Map<string, unknown>([["conductor-credentials-v1", credentials]]);
  const clientStorage = {
    getAsync: vi.fn(async (key: string): Promise<unknown> => storage.get(key)),
    setAsync: vi.fn(async (key: string, value: unknown) => { storage.set(key, value); }),
    deleteAsync: vi.fn(async (key: string) => { storage.delete(key); }),
  };
  const figma = { fileKey: "file", editorType: "figma", mode: "default", currentPage: { selection: [frame] }, clientStorage, openExternal: vi.fn() };
  const submissions: { payload: DesignSubmission; authorization: string | null }[] = [];
  const resolutions: { requestId: string; body: unknown }[] = [];
  const receipt = (payload = submissions[0]!.payload) => ({ submissionId: "server-result", commentId: "saved", variantIds: payload.frames.map(frame => frame.variantId), transition: "not_requested", notification: "pending", warnings: [] });
  const respond = vi.fn(async (payload: DesignSubmission): Promise<Response> => Response.json(receipt(payload)));
  const resolve = vi.fn(async (requestId: string): Promise<Response> => Response.json({ requestId, fileKey: figma.fileKey, outcome: "cancelled" }));
  const status = vi.fn(async (): Promise<Response> => Response.json(receipt()));
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const path = String(url);
    if (path.endsWith("/submissions")) {
      const payload = parseDesignSubmission(JSON.parse(String(init?.body)));
      submissions.push({ payload, authorization: new Headers(init?.headers).get("Authorization") }); return respond(payload);
    }
    if (path.endsWith("/resolve")) {
      const requestId = path.split("/").at(-2)!;
      resolutions.push({ requestId, body: JSON.parse(String(init?.body)) }); return resolve(requestId);
    }
    if (path.includes("/submissions/context?")) return Response.json(selectionContext);
    if (path.includes("/submissions/")) return status();
    if (path.includes("/destinations")) return Response.json({ options: [], more: false, destination });
    return Response.json(context);
  });
  const post = vi.fn<(state: ConductorPresentation) => void>();
  vi.stubGlobal("figma", figma); vi.stubGlobal("fetch", fetcher);
  const client = createConductorController({ post, enterCanvas: () => () => {}, apply: vi.fn() });
  const command: ConductorCommand = kind === "bound" ? { type: "conductor-submit", message: "Authored summary", annotationIds: ["1:1/0"], transitionId: "" } : { type: "conductor-confirm-existing" };
  const details = { type: "conductor-review-existing" as const, variantName: "Tablet", isDefaultAppearance: false, deviceTargetSlug: "tablet", message: "Authored summary", annotationIds: ["1:1/0"] };
  const review = async () => {
    if (kind === "bound") await client.handle({ type: "conductor-inspect-selection" });
    else {
      await client.handle({ type: "conductor-start-existing" });
      await client.handle({ type: "conductor-existing-destination", projectId: "p", deliverableId: "d", componentId: "c" });
      await client.handle(details);
    }
  };
  const key = `${kind === "bound" ? "conductor-draft-v1" : "conductor-existing-pending-v1"}:${credentials.origin}:account-a:file`;
  const open = () => client.handle({ type: "conductor-open" });
  const setup = async () => { await open(); await review(); };
  const last = () => post.mock.calls.at(-1)![0];
  return { client, post, last, credentials, binding, frame, figma, storage, clientStorage, destination, context, selectionContext, submissions, resolutions, respond, resolve, status, receipt, fetcher, command, details, key, open, review, setup };
}

it.each([false, true])("presents reviewed existing-frame details and opens Design (default: %s)", async isDefaultAppearance => {
  const f = lifecycleFixture("existing"); f.details.isDefaultAppearance = isDefaultAppearance; await f.setup();
  await f.client.handle(f.command);
  expect(f.last().message).toContain("Tablet");
  expect(f.last().message).toContain(isDefaultAppearance ? "Default appearance" : "a named variant");
  expect(f.last().message).toContain("1024px");
  expect(f.last().message).toContain("Project / Website / Card → Design");
  expect(f.last().message).toContain("Your message and checked annotations are in Design discussion.");
  expect(f.last().existingResult).toBe("/projects/p/deliverables/d/features/c?tab=design");
  await f.client.handle({ type: "conductor-open-existing-result" });
  expect(f.figma.openExternal).toHaveBeenCalledWith(`${f.credentials.origin}/projects/p/deliverables/d/features/c?tab=design`);
  f.client.stop();
});

describe.each(["bound", "existing"] as const)("parent-controller recovery: %s", kind => {
  it("automatically cancels a supported first refusal and requires a newly reviewed identity", async () => {
    const f = lifecycleFixture(kind); await f.setup(); f.respond.mockResolvedValueOnce(new Response("", { status: 409 }));
    await f.client.handle(f.command);
    expect(f.resolutions).toEqual([{ requestId: f.submissions[0]!.payload.submissionId, body: { fileKey: "file" } }]);
    expect(f.last().message).toBe("The pending send was cancelled. Nothing from this request was saved.");
    expect(f.last().existing).toBeUndefined(); expect(f.last().submission).toBeUndefined();
    await f.client.handle(f.command); expect(f.submissions).toHaveLength(1);
    await f.review(); await f.client.handle(f.command);
    expect(f.submissions).toHaveLength(2); expect(f.submissions[1]!.payload.submissionId).not.toBe(f.submissions[0]!.payload.submissionId);
    f.client.stop();
  });
  it("recovers an earlier delayed commit on refusal with its actual outcomes and reviewed destination", async () => {
    const f = lifecycleFixture(kind); await f.setup();
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(new Response("", { status: 409 }));
    await f.client.handle(f.command);
    const original = f.submissions[0]!.payload;
    f.resolve.mockImplementation(async requestId => Response.json({ requestId, fileKey: "file", outcome: "committed", receipt: { ...f.receipt(), transition: "applied", notification: "failed" } }));
    await f.review(); await f.client.handle(f.command);
    expect(f.submissions[1]!.payload).toEqual(original);
    expect(f.last().message).toContain("workflow action was applied"); expect(f.last().message).toContain("Notification delivery failed");
    expect(f.last().message).toContain("Project / Website / Card → Design");
    expect(f.storage.get(`${f.key}:receipt`)).toBe(original.submissionId);
    await f.client.handle({ type: "conductor-open-existing-result" });
    expect(f.figma.openExternal).toHaveBeenCalledWith(`${f.credentials.origin}/projects/p/deliverables/d/features/c?tab=design`);
    f.client.stop();
  });
  it("resumes a persisted resolution after reopening without touching a deleted source", async () => {
    const f = lifecycleFixture(kind); await f.setup(); f.respond.mockResolvedValueOnce(new Response("", { status: 409 }));
    f.resolve.mockRejectedValueOnce(new Error("Response lost")); await f.client.handle(f.command);
    const original = f.submissions[0]!.payload;
    expect(f.storage.get(`${f.key}:recovery`)).toMatchObject({ requestId: original.submissionId, operation: "resolve" });
    await f.client.handle({ type: "conductor-offline" }); f.figma.currentPage.selection = [];
    await f.open(); expect(f.last().recovery?.retryCommand).toBeUndefined();
    await f.client.handle({ type: "conductor-resolve-pending" });
    expect(f.resolutions.map(entry => entry.requestId)).toEqual([original.submissionId, original.submissionId]);
    expect(f.submissions).toHaveLength(1); expect(f.storage.has(f.key)).toBe(false); f.client.stop();
  });
  it("restores editable details only after a proven legacy first refusal", async () => {
    const f = lifecycleFixture(kind); f.context.supports = []; await f.setup();
    f.respond.mockResolvedValueOnce(new Response("", { status: 409 })); await f.client.handle(f.command);
    expect(f.storage.has(f.key)).toBe(false); expect(f.resolutions).toEqual([]);
    if (kind === "existing") {
      expect(f.last().existing?.details).toMatchObject({ message: "Authored summary", variantName: "Tablet" });
      expect(f.last().existing?.review).toBeUndefined();
      await f.client.handle(f.command); expect(f.submissions).toHaveLength(1);
      await f.client.handle(f.details);
    } else await f.review();
    await f.client.handle(f.command); expect(f.submissions).toHaveLength(2);
    expect(f.submissions[1]!.payload.submissionId).not.toBe(f.submissions[0]!.payload.submissionId); f.client.stop();
  });
  it.each(["uncertain", "restarted", "missing metadata"])("retains a legacy %s refusal and offers the original review", async boundary => {
    const f = lifecycleFixture(kind); f.context.supports = []; await f.setup();
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(new Response("", { status: 409 }));
    await f.client.handle(f.command); const original = f.submissions[0]!.payload;
    if (boundary !== "uncertain") { await f.client.handle({ type: "conductor-offline" }); await f.open(); }
    if (boundary === "missing metadata") f.storage.delete(`${f.key}:dispatch`);
    expect(renderToStaticMarkup(createElement(ConductorPanel, { state: f.last(), send: vi.fn() }))).toContain("Review original send");
    await f.review(); await f.client.handle(f.command);
    expect(f.submissions[1]!.payload).toEqual(original); expect(f.storage.has(f.key)).toBe(true);
    expect(f.last().message).toContain("Upgrade Conductor"); expect(f.resolutions).toEqual([]); f.client.stop();
  });
  it("does not delete a newer pending identity or its sidecars on an old response", async () => {
    const f = lifecycleFixture(kind); await f.setup();
    let replacement!: DesignSubmission;
    f.respond.mockImplementationOnce(async payload => {
      replacement = { ...payload, submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", message: "Newer send" };
      f.storage.set(f.key, kind === "bound" ? { payload: replacement } : replacement);
      f.storage.set(`${f.key}:dispatch`, { requestId: replacement.submissionId, fileKey: "file", attemptsStarted: 1 });
      f.storage.set(`${f.key}:recovery`, { requestId: replacement.submissionId, fileKey: "file", operation: "resolve" });
      return new Response("", { status: 409 });
    });
    await f.client.handle(f.command);
    expect(parseDesignSubmission(kind === "bound" ? (f.storage.get(f.key) as { payload: unknown }).payload : f.storage.get(f.key))).toEqual(replacement);
    expect(f.storage.get(`${f.key}:dispatch`)).toMatchObject({ requestId: replacement.submissionId });
    expect(f.storage.get(`${f.key}:recovery`)).toMatchObject({ requestId: replacement.submissionId });
    expect(f.resolutions).toEqual([]); f.client.stop();
  });
  it("uses independently advertised recovery for stored requests and first refusals", async () => {
    const f = lifecycleFixture(kind); f.context.supports = ["resolve_pending_send"]; await f.setup();
    expect(f.last().supportsDesignChanges).toBe(false);
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 })); await f.client.handle(f.command);
    await f.client.handle({ type: "conductor-offline" }); f.figma.currentPage.selection = []; await f.open();
    expect(f.last().recovery?.canResolve).toBe(true);
    await f.client.handle({ type: "conductor-request-resolution" }); await f.client.handle({ type: "conductor-resolve-pending" });
    expect(f.resolutions).toHaveLength(1);
    f.figma.currentPage.selection = [f.frame]; await f.review(); f.respond.mockResolvedValueOnce(new Response("", { status: 409 })); await f.client.handle(f.command);
    expect(f.resolutions).toHaveLength(2); f.client.stop();
  });
  it.each(["missing", "disabled", "file", "owner", "origin"])("invalidates earlier capabilities when the scope becomes %s", async boundary => {
    const f = lifecycleFixture(kind); await f.setup();
    if (boundary === "missing") f.context.supports = [];
    if (boundary === "disabled") f.context.enabled = false;
    if (boundary === "file") f.figma.fileKey = "another-file";
    if (boundary === "owner" || boundary === "origin") {
      f.storage.set("conductor-credentials-v1", { ...f.credentials, ...(boundary === "owner" ? { ownerUserId: "account-b" } : { origin: CONDUCTOR_ENVIRONMENTS.find(entry => entry.origin !== f.credentials.origin)!.origin }) });
      f.context.supports = []; await f.open();
    } else if (boundary !== "file") await f.client.handle({ type: "conductor-refresh" });
    await f.client.handle({ type: "conductor-start-change" });
    expect(f.last().supportsDesignChanges).toBe(false); expect(f.submissions).toEqual([]); expect(f.resolutions).toEqual([]); f.client.stop();
  });
  it("suppresses cached destination details and links for a redacted committed resolution", async () => {
    const f = lifecycleFixture(kind); await f.setup(); expect(f.last().destination).toBeDefined();
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 })); await f.client.handle(f.command);
    f.resolve.mockImplementation(async requestId => Response.json({ requestId, fileKey: "file", outcome: "committed", receipt: null }));
    await f.client.handle({ type: "conductor-request-resolution" }); await f.client.handle({ type: "conductor-resolve-pending" });
    expect(f.last().message).toBe("The earlier send was saved, but its details are no longer accessible.");
    expect(f.last().destination).toBeUndefined(); expect(f.last().existingResult).toBeUndefined();
    const html = renderToStaticMarkup(createElement(ConductorPanel, { state: f.last(), send: vi.fn() }));
    expect(html).not.toContain("Project"); expect(html).not.toContain("Website"); expect(html).not.toContain("Open component’s Design tab"); f.client.stop();
  });
  it.each(["conductor-offline", "conductor-disconnect"] as const)("isolates stale callbacks and the active send after %s", async reset => {
    for (const ownerUserId of ["account-a", "account-b"]) {
      const f = lifecycleFixture(kind); f.context.supports = []; await f.setup();
      const oldGate = deferred<Response>(), newGate = deferred<Response>();
      f.respond.mockImplementationOnce(() => oldGate.promise).mockImplementationOnce(() => newGate.promise);
      const oldSending = f.client.handle(f.command); await vi.waitFor(() => expect(f.submissions).toHaveLength(1));
      const original = f.submissions[0]!.payload;
      await f.client.handle({ type: reset });
      f.storage.set("conductor-credentials-v1", { ...f.credentials, ownerUserId, token: "reconnected-fixture" }); await f.open(); await f.review();
      const currentSending = f.client.handle(f.command); await vi.waitFor(() => expect(f.submissions).toHaveLength(2));
      const currentKey = f.key.replace(":account-a:", `:${ownerUserId}:`);
      expect(f.submissions[1]!.authorization).toBe("Bearer reconnected-fixture");
      if (ownerUserId === "account-a") expect(f.submissions[1]!.payload).toEqual(original);
      oldGate.resolve(Response.json(f.receipt(original))); await oldSending;
      expect(f.last().busy).toBe("submitting"); expect(f.storage.has(currentKey)).toBe(true);
      expect(f.storage.has(`${f.key}:receipt`)).toBe(false);
      await f.client.handle(f.command); expect(f.submissions).toHaveLength(2);
      newGate.resolve(Response.json(f.receipt(f.submissions[1]!.payload))); await currentSending;
      expect(f.storage.get(`${currentKey}:receipt`)).toBe(f.submissions[1]!.payload.submissionId);
      expect(f.storage.has(currentKey)).toBe(false);
      if (ownerUserId !== "account-a") expect(f.storage.has(f.key)).toBe(true);
      f.client.stop();
    }
  });
  it.each(["read", "payload", "receipt"])("stops stale %s storage work after an account change", async boundary => {
    const f = lifecycleFixture(kind); await f.setup(); const gate = deferred<void>(), entered = deferred<void>();
    if (boundary === "read") f.clientStorage.getAsync.mockImplementation(async key => { if (key === f.key) { entered.resolve(); await gate.promise; } return f.storage.get(key); });
    else f.clientStorage.setAsync.mockImplementation(async (key, value) => { if (key === (boundary === "payload" ? f.key : `${f.key}:receipt`)) { entered.resolve(); await gate.promise; } f.storage.set(key, value); });
    const sending = f.client.handle(f.command); await entered.promise;
    await f.client.handle({ type: "conductor-offline" }); f.storage.set("conductor-credentials-v1", { ...f.credentials, ownerUserId: "account-b", token: "fixture-b" });
    const reopening = f.open(); gate.resolve(); await Promise.all([sending, reopening]);
    expect(f.last().state).toBe("connected"); expect(f.last().existing).toBeUndefined(); expect(f.last().submission).toBeUndefined();
    expect(f.submissions).toHaveLength(boundary === "receipt" ? 1 : 0);
    expect(f.clientStorage.deleteAsync).not.toHaveBeenCalledWith(f.key); f.client.stop();
  });
  it("rejects expired credentials before sending and preserves the pending owner scope", async () => {
    const f = lifecycleFixture(kind); f.context.supports = []; await f.setup(); f.respond.mockResolvedValueOnce(new Response("", { status: 503 })); await f.client.handle(f.command);
    await f.client.handle({ type: "conductor-offline" }); f.storage.set("conductor-credentials-v1", { ...f.credentials, expiresAt: new Date(Date.now() - 1000).toISOString() });
    await f.open(); await f.client.handle(f.command);
    expect(f.submissions).toHaveLength(1); expect(f.storage.has(f.key)).toBe(true); f.client.stop();
  });
  it("restores a design-change review and retries its exact original request", async () => {
    const f = lifecycleFixture(kind); await f.open(); await f.client.handle({ type: "conductor-start-change" });
    if (kind === "bound") await f.client.handle({ type: "conductor-review-change", summary: "Authored change", annotationIds: ["1:1/0"] });
    else { await f.client.handle({ type: "conductor-existing-destination", projectId: "p", deliverableId: "d", componentId: "c" }); await f.client.handle({ ...f.details, message: "Authored change" }); }
    const confirm: ConductorCommand = kind === "bound" ? { type: "conductor-confirm-change" } : f.command;
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 })); await f.client.handle(confirm);
    const original = f.submissions[0]!.payload;
    expect(original.intent).toBe("design_change");
    const retryCommand = f.last().recovery!.retryCommand!;
    await f.client.handle({ type: "conductor-offline" }); await f.open();
    await f.client.handle({ type: retryCommand });
    if (kind === "bound") expect(f.last().change?.review).toEqual({ summary: "Authored change", annotationIds: ["1:1/0"] });
    else expect(f.last().existing?.review).toMatchObject({ message: "Authored change", annotationIds: ["1:1/0"] });
    await f.client.handle(confirm);
    expect(f.submissions.map(entry => entry.payload)).toEqual([original, original]);
    expect(f.storage.get(`${f.key}:receipt`)).toBe(original.submissionId); expect(f.storage.has(f.key)).toBe(false); f.client.stop();
  });
  it.each(["legacy-to-change", "change-to-legacy"])("blocks a different intent during %s recovery", async direction => {
    const f = lifecycleFixture(kind); await f.open();
    if (direction === "legacy-to-change") await f.review();
    else {
      await f.client.handle({ type: "conductor-start-change" });
      if (kind === "bound") await f.client.handle({ type: "conductor-review-change", summary: "Authored summary", annotationIds: ["1:1/0"] });
      else { await f.client.handle({ type: "conductor-existing-destination", projectId: "p", deliverableId: "d", componentId: "c" }); await f.client.handle(f.details); }
    }
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 }));
    await f.client.handle(direction === "change-to-legacy" && kind === "bound" ? { type: "conductor-confirm-change" } : f.command);
    const original = f.storage.get(f.key);
    if (direction === "legacy-to-change") await f.client.handle({ type: kind === "bound" ? "conductor-start-change" : "conductor-start-existing-change" });
    else await f.review();
    expect(f.submissions).toHaveLength(1); expect(f.storage.get(f.key)).toEqual(original); expect(f.last().recovery).toBeDefined(); f.client.stop();
  });
  it("requires the original source identity and selected annotation content on retry", async () => {
    const f = lifecycleFixture(kind); f.context.supports = []; await f.setup();
    f.respond.mockResolvedValueOnce(new Response("", { status: 503 })); await f.client.handle(f.command);
    const original = f.storage.get(f.key);
    if (kind === "bound") { f.binding.variantId = "different-variant"; f.selectionContext.frames[0]!.variantId = "different-variant"; }
    else f.frame.width = 1023;
    await f.review(); await f.client.handle(f.command);
    expect(f.submissions).toHaveLength(1); expect(f.storage.get(f.key)).toEqual(original);
    f.binding.variantId = "variant"; f.selectionContext.frames[0]!.variantId = "variant"; f.frame.width = 1024;
    f.frame.annotations[0]!.label = "Changed note";
    await f.review(); await f.client.handle(f.command);
    expect(f.submissions).toHaveLength(1); expect(f.storage.get(f.key)).toEqual(original); f.client.stop();
  });
  it.each([401, 403, 404, 503])("retains the same resolution and payload after recovery HTTP %s", async status => {
    const f = lifecycleFixture(kind); await f.setup(); f.respond.mockResolvedValueOnce(new Response("", { status: 409 }));
    f.resolve.mockResolvedValueOnce(new Response("", { status })); await f.client.handle(f.command);
    const original = f.storage.get(f.key); expect(original).toBeDefined();
    expect(f.storage.get(`${f.key}:recovery`)).toMatchObject({ operation: "resolve" });
    expect(f.last().recovery?.retryCommand).toBeUndefined();
    await f.review(); await f.client.handle(f.command);
    expect(f.submissions).toHaveLength(1); expect(f.storage.get(f.key)).toEqual(original); f.client.stop();
  });
});

it("keeps refresh connected with jobs when the saved receipt is incomplete, and preserves auth failures", async () => {
  const f = lifecycleFixture("bound");
  const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  f.storage.set(`${f.key}:receipt`, requestId);
  f.storage.set(`${f.key}:terminal`, { requestId, fileKey: "file", outcome: "committed", receipt: {}, intent: "design_change" });
  f.status.mockResolvedValueOnce(Response.json({ commentId: "c", variantIds: ["v"] })); await f.open();
  expect(f.last()).toMatchObject({ state: "connected", jobs: f.context.jobs, message: expect.stringContaining("receipt is unavailable") });
  expect(f.last().hasError).toBeUndefined();
  f.status.mockResolvedValueOnce(new Response("", { status: 401 })); await f.client.handle({ type: "conductor-refresh" });
  expect(f.last()).toMatchObject({ state: "error", message: expect.stringContaining("expired or was revoked") }); f.client.stop();
});

it.each(["cancelled", "redacted", "matching"])("associates receipt status with its own request after a %s change", async outcome => {
  const f = lifecycleFixture("bound"); await f.setup(); await f.client.handle(f.command);
  const original = f.submissions[0]!.payload;
  f.status.mockResolvedValue(Response.json({ ...f.receipt(original), transition: "applied" }));
  await f.client.handle({ type: "conductor-start-change" });
  await f.client.handle({ type: "conductor-review-change", summary: "Next change", annotationIds: [] });
  if (outcome !== "matching") {
    f.respond.mockResolvedValueOnce(new Response("", { status: 409 }));
    f.resolve.mockImplementation(async requestId => Response.json({ requestId, fileKey: "file", outcome: outcome === "cancelled" ? "cancelled" : "committed", ...(outcome === "redacted" ? { receipt: null } : {}) }));
  }
  await f.client.handle({ type: "conductor-confirm-change" });
  if (outcome === "matching") f.status.mockResolvedValue(Response.json(f.receipt(f.submissions[1]!.payload)));
  await f.client.handle({ type: "conductor-refresh" });
  if (outcome === "matching") expect(f.last().message).toContain("Design changes saved");
  else { expect(f.last().message).toContain("workflow action was applied"); expect(f.last().message).not.toContain("Design changes saved"); expect(f.last().message).not.toContain("Approval and workflow state are unchanged"); }
  f.client.stop();
});

it("opens the bound change's actual authorized Design destination", async () => {
  const f = lifecycleFixture("bound"); await f.open();
  await f.client.handle({ type: "conductor-start-change" });
  await f.client.handle({ type: "conductor-review-change", summary: "Improved navigation", annotationIds: ["1:1/0"] });
  await f.client.handle({ type: "conductor-confirm-change" });
  expect(f.last().message).toContain("Project / Website / Card → Design");
  expect(f.last().existingResult).toBe("/projects/p/deliverables/d/features/c?tab=design");
  await f.client.handle({ type: "conductor-open-existing-result" });
  expect(f.figma.openExternal).toHaveBeenCalledWith(`${f.credentials.origin}/projects/p/deliverables/d/features/c?tab=design`); f.client.stop();
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
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ message: expect.stringContaining("External notifications are disabled") }));
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

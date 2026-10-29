import { afterEach, describe, expect, it, vi } from "vitest";
import { readExistingFrame } from "../src/figma/conductor-existing-frame";
import { createExistingFrameController } from "../src/plugin/conductor-existing-controller";
import { parseDesignSubmission } from "../src/core/conductor-contracts";
import { ConductorSubmissionRefusedError } from "../src/plugin/conductor-transport";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConductorPanel } from "../src/ui/components/ConductorPanel";
import type { ExistingFrameState } from "../src/plugin/conductor-existing-state";

afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const frame = { id: "60:1", type: "FRAME", name: "Tablet hero", width: 1024, parent: null, annotations: [{ label: "Selected note" }], getSharedPluginData: () => "" };
  const storage = new Map<string, unknown>();
  const clientStorage = { getAsync: async (key: string) => storage.get(key), setAsync: async (key: string, value: unknown) => { storage.set(key, value); }, deleteAsync: async (key: string) => { storage.delete(key); } };
  const figma = { fileKey: "file", editorType: "figma", mode: "default", currentPage: { selection: [frame] }, clientStorage };
  vi.stubGlobal("figma", figma);
  const destination = { project: { id: "p", name: "Project" }, deliverable: { id: "d", name: "Website" }, component: { id: "c", name: "Card" }, devices: [{ slug: "tablet", width: 1024, hasDefault: false }] };
  const request = vi.fn(async (_path: string, body?: unknown) => body ? { commentId: "saved", variantIds: (body as { frames: { variantId: string }[] }).frames.map((entry) => entry.variantId) } : { options: [], more: false, destination });
  let id = 0;
  const present = vi.fn();
  const controller = createExistingFrameController({ request, present, credentials: () => ({ origin: "http://localhost:3109", token: "fixture", ownerUserId: "owner", expiresAt: "2099-01-01" }), current: () => true, newId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}` });
  const choose = async () => { await controller.handle({ type: "conductor-start-existing" }); await controller.handle({ type: "conductor-existing-destination", projectId: "p", deliverableId: "d", componentId: "c" }); };
  const review = { type: "conductor-review-existing", variantName: "Hero tablet", isDefaultAppearance: true, deviceTargetSlug: "tablet", message: "Ready for review", annotationIds: ["60:1/0"] } as const;
  return { frame, destination, request, present, controller, choose, review, storage, figma };
}
describe("existing frame handoff", () => {
  it("saves an explicit default or named variant with its project breakpoint and notes", async () => {
    for (const isDefaultAppearance of [true, false]) {
      const f = fixture(); await f.choose();
      await f.controller.handle({ ...f.review, isDefaultAppearance, annotationIds: [...f.review.annotationIds] });
      expect(f.request.mock.calls.every(([, body]) => body === undefined)).toBe(true);
      await f.controller.handle({ type: "conductor-confirm-existing" });
      const payload = parseDesignSubmission(f.request.mock.calls.find(([, body]) => body)?.[1]);
      expect(payload).toMatchObject({ componentId: "c", existingFrame: { projectId: "p", deliverableId: "d", frameWidth: 1024, deviceTargetSlug: "tablet", variantName: "Hero tablet", isDefaultAppearance }, annotations: [{ nodeId: "60:1", text: "Selected note" }] });
      expect(payload.transition).toBeUndefined();
      expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("Project / Website / Card"), undefined, expect.stringContaining("/features/c?tab=design"));
    }
  });
  it("requires an exact configured width and never infers a breakpoint by rounding", async () => {
    const f = fixture(); f.frame.width = 1023.99; await f.choose();
    await expect(f.controller.handle({ ...f.review, annotationIds: [] })).rejects.toThrow("1023.99px");
    expect(f.request.mock.calls.some(([, body]) => body)).toBe(false);
  });
  it("refuses a second default and lets the designer choose a named variant", async () => {
    const f = fixture(); f.destination.devices[0]!.hasDefault = true; await f.choose();
    await expect(f.controller.handle({ ...f.review, annotationIds: [] })).rejects.toThrow("default design already exists");
    await f.controller.handle({ ...f.review, isDefaultAppearance: false, annotationIds: [] });
    await f.controller.handle({ type: "conductor-confirm-existing" });
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("a named variant"), undefined, expect.any(String));
  });
  it("requires a new review after the selected frame width, name or destination changes", async () => {
    const f = fixture(); await f.choose(); await f.controller.handle({ ...f.review, annotationIds: [...f.review.annotationIds] });
    f.frame.name = "Changed";
    await expect(f.controller.handle({ type: "conductor-confirm-existing" })).rejects.toThrow("changed");
    f.frame.name = "Tablet hero"; f.destination.component.name = "Renamed Card";
    // Network responses must be separate objects, as they are in the real transport.
    f.request.mockImplementation(async () => ({ options: [], more: false, destination: { ...f.destination, component: { ...f.destination.component, name: "New name" } } }));
    await f.controller.handle({ type: "conductor-confirm-existing" });
    const { type: _type, ...details } = f.review;
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("destination or project breakpoints changed"), expect.objectContaining({ details, review: undefined }));
  });
  it("restores editable details and specific guidance after a refused handoff", async () => {
    const f = fixture(); await f.choose(); await f.controller.handle({ ...f.review, annotationIds: [...f.review.annotationIds] });
    f.request.mockImplementation(async (_path, body) => {
      if (body) throw new ConductorSubmissionRefusedError("Refresh and review this submission again.");
      return { options: [], more: false, destination: f.destination };
    });
    await expect(f.controller.handle({ type: "conductor-confirm-existing" })).rejects.toThrow(/frame width, design name and default appearance/);
    expect(f.storage.size).toBe(0);
    const { type: _type, ...details } = f.review;
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("frame width, design name and default appearance"), expect.objectContaining({ details, review: undefined }));
  });
  it("allows another file while preserving the original file's uncertain handoff", async () => {
    const f = fixture(); f.figma.fileKey = "a"; await f.choose(); await f.controller.handle({ ...f.review, annotationIds: [...f.review.annotationIds] });
    f.request.mockImplementationOnce(async () => ({ options: [], more: false, destination: f.destination })).mockRejectedValueOnce(new Error("Timed out"));
    await expect(f.controller.handle({ type: "conductor-confirm-existing" })).rejects.toThrow("Timed out");
    const pending = parseDesignSubmission([...f.storage.values()][0]);
    expect([...f.storage.keys()]).toEqual(["conductor-existing-pending-v1:http://localhost:3109:owner:a"]);
    f.figma.fileKey = "b";
    f.figma.currentPage.selection = [{ ...f.frame, id: "70:1", name: "Other file frame" }];
    await f.controller.handle({ type: "conductor-start-existing" });
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("Name the design"), expect.objectContaining({ query: {} }));
    expect(f.present.mock.calls.at(-1)?.[1].review).toBeUndefined();
    f.figma.fileKey = "a"; f.figma.currentPage.selection = [f.frame]; f.controller.reset();
    await f.controller.handle({ type: "conductor-start-existing" });
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("previous handoff"), expect.objectContaining({ review: expect.objectContaining({ annotationIds: [...f.review.annotationIds] }) }));
    await f.controller.handle({ type: "conductor-confirm-existing" });
    expect(f.request.mock.calls.filter(([, body]) => body).map(([, body]) => body)).toEqual([pending, pending]);
    expect(f.storage.size).toBe(0);
  });
  it.each([false, true])("migrates a legacy pending identity safely (interrupted copy: %s)", async (interrupted) => {
    const f = fixture(); await f.choose(); await f.controller.handle({ ...f.review, annotationIds: [...f.review.annotationIds] });
    f.request.mockImplementationOnce(async () => ({ options: [], more: false, destination: f.destination })).mockRejectedValueOnce(new Error("Timed out"));
    await expect(f.controller.handle({ type: "conductor-confirm-existing" })).rejects.toThrow("Timed out");
    const scopedKey = [...f.storage.keys()][0]!;
    const pending = parseDesignSubmission(f.storage.get(scopedKey));
    const legacyKey = scopedKey.slice(0, -":file".length);
    f.storage.delete(scopedKey); f.storage.set(legacyKey, pending); f.controller.reset();
    f.figma.fileKey = "another-file";
    await f.controller.handle({ type: "conductor-start-existing" });
    expect(f.present.mock.calls.at(-1)?.[1].review).toBeUndefined();
    expect(f.storage.get(legacyKey)).toEqual(pending);
    f.figma.fileKey = "file";
    if (interrupted) {
      vi.spyOn(f.figma.clientStorage, "deleteAsync").mockRejectedValueOnce(new Error("Interrupted migration"));
      await expect(f.controller.handle({ type: "conductor-start-existing" })).rejects.toThrow("Interrupted migration");
      expect(f.storage.get(legacyKey)).toEqual(pending);
      expect(f.storage.get(scopedKey)).toEqual(pending);
      f.controller.reset();
    }
    await f.controller.handle({ type: "conductor-start-existing" });
    expect(f.storage.has(legacyKey)).toBe(false);
    expect(f.storage.get(scopedKey)).toEqual(pending);
    await f.controller.handle({ type: "conductor-confirm-existing" });
    expect(f.request.mock.calls.filter(([, body]) => body).map(([, body]) => body)).toEqual([pending, pending]);
    expect(f.storage.size).toBe(0);
  });
  it("renders an enabled Disconnect throughout the existing-frame steps", () => {
    const f = fixture();
    const { type: _type, ...review } = f.review;
    const frame = { fileKey: "file", id: f.frame.id, name: f.frame.name, width: f.frame.width, annotations: [{ id: "60:1/0", nodeId: "60:1", text: "Selected note" }] };
    const steps: ExistingFrameState[] = [
      { frame, query: {}, options: [], more: false },
      { frame, query: {}, options: [], more: false, destination: f.destination },
      { frame, query: {}, options: [], more: false, destination: f.destination, review: { ...review, annotationIds: [...review.annotationIds] } },
    ];
    for (const existing of steps) {
      const html = renderToStaticMarkup(createElement(ConductorPanel, { state: { state: "connected", message: "Connected", jobs: [], environments: [], busy: "submitting", existing }, send: vi.fn() }));
      const disconnect = html.match(/<button[^>]*>Disconnect<\/button>/)?.[0];
      expect(disconnect).toBeDefined();
      expect(disconnect).not.toContain("disabled");
      expect(html).not.toContain("Refresh workspaces");
      expect(html).not.toContain("Use selected design frames");
    }
  });
  it("retries an uncertain save with the same request and variant identities", async () => {
    const f = fixture(); await f.choose(); await f.controller.handle({ ...f.review, annotationIds: [] });
    let first: unknown;
    f.request.mockImplementation(async (_path, body) => {
      if (!body) return { options: [], more: false, destination: f.destination };
      if (!first) { first = body; throw new Error("Timed out"); }
      expect(body).toEqual(first);
      return { commentId: "saved", variantIds: (body as { frames: { variantId: string }[] }).frames.map((entry) => entry.variantId) };
    });
    await expect(f.controller.handle({ type: "conductor-confirm-existing" })).rejects.toThrow("Timed out");
    f.controller.reset();
    f.destination.devices[0]!.hasDefault = true;
    await f.controller.handle({ type: "conductor-start-existing" });
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("previous handoff"), expect.objectContaining({ review: expect.objectContaining({ isDefaultAppearance: true }) }));
    await f.controller.handle({ type: "conductor-confirm-existing" });
    expect(f.storage.size).toBe(0);
  });
  it("refuses an existing workspace binding even if malformed", () => {
    const f = fixture(); f.frame.getSharedPluginData = () => "malformed";
    expect(() => readExistingFrame()).toThrow("existing component");
  });
});

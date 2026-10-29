import { createPendingSendController } from "../src/plugin/conductor-pending-send";
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
  const request = vi.fn(async (_path: string, body?: unknown) => body ? { submissionId: "saved", transition: "not_requested", notification: "pending", warnings: [], commentId: "saved", variantIds: (body as { frames: { variantId: string }[] }).frames.map((entry) => entry.variantId) } : { options: [], more: false, destination });
  let id = 0;
  const present = vi.fn();
  const token = { origin: "http://localhost:3109", token: "fixture", ownerUserId: "owner", expiresAt: "2099-01-01" };
  const pending = createPendingSendController({ credentials: () => token, current: () => true, session: () => 1, supported: () => false, request, present });
  const controller = createExistingFrameController({ request, present, pending, credentials: () => token, current: () => true, newId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}` });
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
    await expect(f.controller.handle({ type: "conductor-confirm-existing" })).rejects.toThrow(/Review the destination, width and design details/);
    expect([...f.storage.values()]).toMatchObject([{ outcome: "refused" }]);

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
  it("refuses an existing workspace binding even if malformed", () => {
    const f = fixture(); f.frame.getSharedPluginData = () => "malformed";
    expect(() => readExistingFrame()).toThrow("existing component");
  });
});

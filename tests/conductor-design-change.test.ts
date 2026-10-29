import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesignChangeController } from "../src/plugin/conductor-change-controller";
import { ConductorPanel } from "../src/ui/components/ConductorPanel";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConductorDesignChange } from "../src/ui/components/ConductorDesignChange";
import { ConductorExistingConfirmation } from "../src/ui/components/ConductorExistingConfirmation";
import { ConductorExistingFrame } from "../src/ui/components/ConductorExistingFrame";
import type { DesignChangeState } from "../src/plugin/conductor-change-controller";
import type { ExistingFrameState } from "../src/plugin/conductor-existing-state";
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const binding = { schemaVersion: 1, role: "design", organizationId: "org", projectId: "p", deliverableId: "d", componentId: "c", workspaceId: "workspace", fileKey: "file", nodeId: "1:2", jobItemId: "job", elementId: "design", variantId: "variant", revision: 1, connectionVersion: 1 };
  const frame = { id: "1:2", name: "Design", width: 390, type: "FRAME", parent: null, annotations: [{ label: "Keep the BA decision" }, { label: "Unchecked" }], getSharedPluginData: () => JSON.stringify(binding) };
  vi.stubGlobal("figma", { fileKey: "file", currentPage: { selection: [frame] } });
  const context = { projectId: "p", projectName: "Project", deliverableId: "d", deliverableName: "Website", componentId: "c", componentName: "Hero", connectionVersion: 1,
    frames: [{ nodeId: "1:2", variantId: "variant", expectedVariantVersion: null }], frameDetails: { "1:2": { variantName: "Design / mobile", isDefaultAppearance: false, deviceTargetSlug: "mobile", frameWidth: 390 } } };
  const request = vi.fn(async () => JSON.parse(JSON.stringify(context))), present = vi.fn();
  const pending = { review: vi.fn(async () => ({})), send: vi.fn(async () => ({ submissionId: "saved", commentId: "comment", variantIds: ["variant"], transition: "not_requested" as const, notification: "pending" as const, warnings: [] })) };
  const controller = createDesignChangeController({ request, present, pending, current: () => true, newId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  const review = { type: "conductor-review-change" as const, summary: "  Improved navigation  ", annotationIds: ["1:2/0"] };
  return { frame, context, request, present, pending, controller, review };
}
describe("explicit design changes", () => {
  it("reviews all destination metadata and saves only the authored summary and checked notes, without transition", async () => {
    const f = fixture(); await f.controller.handle({ type: "conductor-start-change" });
    expect(f.present.mock.calls.at(-1)?.[1]).toMatchObject({ project: "Project", deliverable: "Website", feature: "Hero", frames: [{ name: "Design", appearance: "Named variant", width: 390, newLink: true }] });
    await f.controller.handle(f.review); expect(f.pending.send).not.toHaveBeenCalled();
    await f.controller.handle({ type: "conductor-confirm-change" });
    expect(f.pending.send).toHaveBeenCalledWith(expect.objectContaining({ intent: "design_change", message: "Improved navigation", frames: [{ nodeId: "1:2", variantId: "variant", expectedVariantVersion: null, frameWidth: 390 }], annotations: [{ nodeId: "1:2", text: "Keep the BA decision" }] }), "bound", expect.objectContaining({ resultPath: "/projects/p/deliverables/d/features/c?tab=design" }));
    expect(f.present).toHaveBeenLastCalledWith(expect.stringContaining("Project / Website / Hero → Design"), undefined, "/projects/p/deliverables/d/features/c?tab=design");
    expect((f.pending.send.mock.calls[0] as unknown as [Record<string, unknown>])[0].transition).toBeUndefined();
  });
  it("rejects blank summaries and directs unchanged designs to Design Notes", async () => {
    const f = fixture(); await f.controller.handle({ type: "conductor-start-change" });
    await expect(f.controller.handle({ ...f.review, summary: " \n " })).rejects.toThrow("Design Notes"); expect(f.pending.send).not.toHaveBeenCalled();
  });
  it.each(["width", "name", "annotation", "version", "destination"])("requires another review after %s changes", async field => {
    const f = fixture(); await f.controller.handle({ type: "conductor-start-change" }); await f.controller.handle(f.review);
    if (field === "width") f.frame.width = 389.99;
    if (field === "name") f.frame.name = "Renamed";
    if (field === "annotation") f.frame.annotations[0]!.label = "Changed";
    if (field === "version") (f.context.frames[0] as { expectedVariantVersion: number | null }).expectedVariantVersion = 2;
    if (field === "destination") f.context.componentName = "Renamed Hero";
    await expect(f.controller.handle({ type: "conductor-confirm-change" })).rejects.toThrow(/changed|review/i); expect(f.pending.send).not.toHaveBeenCalled();
  });
  it("loads pending requests before touching the canvas", async () => {
    const f = fixture(); vi.stubGlobal("figma", {}); f.pending.review.mockResolvedValue(undefined as never);
    await f.controller.handle({ type: "conductor-start-change" }); expect(f.request).not.toHaveBeenCalled();
  });
  it("shows the action only with both server capabilities and keeps recovery independent of selection", () => {
    const base = { state: "connected" as const, message: "Connected", environments: [], jobs: [] };
    expect(renderToStaticMarkup(createElement(ConductorPanel, { state: base, send: vi.fn() }))).not.toContain(">Send design changes<");
    expect(renderToStaticMarkup(createElement(ConductorPanel, { state: { ...base, supportsDesignChanges: true }, send: vi.fn() }))).toContain(">Send design changes<");
    const markup = renderToStaticMarkup(createElement(ConductorPanel, { state: { ...base, recovery: { summary: "Pending", canResolve: true, confirming: true } }, send: vi.fn() }));
    expect(markup).toContain("Confirm resolution"); expect(markup).not.toContain(">Use selected design frames<");
  });
});

it("uses the required confirmation and policy copy in both change forms and review states", () => {
  const bound: DesignChangeState = { project: "Project", deliverable: "Website", feature: "Hero", frames: [{ id: "1:2", name: "Design", url: "https://www.figma.com/design/file?node-id=1%3A2", variantName: "Mobile", appearance: "Named variant", breakpoint: "mobile", width: 390, newLink: true, baseline: null }], annotations: [] };
  const existing: ExistingFrameState = { intent: "design_change", frame: { fileKey: "file", id: "1:2", name: "Design", width: 390, annotations: [] }, query: {}, options: [], more: false,
    destination: { project: { id: "p", name: "Project" }, deliverable: { id: "d", name: "Website" }, component: { id: "c", name: "Hero" }, devices: [{ slug: "mobile", width: 390, hasDefault: false }] },
    review: { variantName: "Mobile", isDefaultAppearance: false, deviceTargetSlug: "mobile", message: "Improved navigation", annotationIds: [] } };
  const editing = { ...existing }; delete editing.review;
  const markup = [
    renderToStaticMarkup(createElement(ConductorDesignChange, { state: bound, disabled: false, send: vi.fn() })),
    renderToStaticMarkup(createElement(ConductorDesignChange, { state: { ...bound, review: { summary: "Improved navigation", annotationIds: [] } }, disabled: false, send: vi.fn() })),
    renderToStaticMarkup(createElement(ConductorExistingConfirmation, { state: existing, disabled: false, busy: false, send: vi.fn() })),
    renderToStaticMarkup(createElement(ConductorExistingFrame, { state: editing, disabled: false, busy: false, send: vi.fn() })),
  ];
  for (const html of markup) {
    expect(html).toContain("Describe what changed. If there is no design change, cancel and use Design Notes in Conductor.");
    expect(html).toContain("No workflow action. Approval and workflow stay unchanged.");
    expect(html).toContain("Applicable workflow role holders receive a Conductor inbox notice. Eligible role holders who opted into Slack also receive a Slack direct message after the update is saved. Slack delivery may be unavailable or fail separately.");
    expect(html).toContain("Conductor does not compare the visuals.");
  }
  for (const html of markup.slice(0, 3)) expect(html).toContain("https://www.figma.com/design/file?node-id=1%3A2");
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { applyConductorWorkspace } from "../src/figma/conductor-workspace";
import { readConductorBinding } from "../src/figma/conductor-binding";
import { instructionDigest, sha256 } from "../src/core/conductor-digest";
import type { CanvasJob } from "../src/core/conductor-contracts";
class NativeNode {
  id: string; name = ""; x = 0; y = 0; width = 100; height = 100;
  children: NativeNode[] = []; parent: NativeNode | null = null;
  private data = new Map<string,string>(); private shared = new Map<string,string>();
  constructor(readonly type: string, id: number) { this.id = `1:${id}`; }
  appendChild(node: NativeNode) { if (node.parent) node.parent.children = node.parent.children.filter((entry) => entry !== node); this.children.push(node); node.parent = this; }
  resize(width: number, height: number) { this.width = width; this.height = height; }
  resizeWithoutConstraints(width: number, height: number) { this.resize(width, height); }
  getPluginData(key: string) { return this.data.get(key) ?? ""; }
  setPluginData(key: string, value: string) { this.data.set(key, value); }
  getSharedPluginData(namespace: string, key: string) { return this.shared.get(`${namespace}:${key}`) ?? ""; }
  setSharedPluginData(namespace: string, key: string, value: string) { this.shared.set(`${namespace}:${key}`, value); }
  findAll(predicate: (node: NativeNode) => boolean): NativeNode[] { return this.children.flatMap((child) => [...(predicate(child) ? [child] : []), ...child.findAll(predicate)]); }
}
function harness() {
  let next = 0; const root = new NativeNode("DOCUMENT", next++); const initial = new NativeNode("PAGE", next++); root.appendChild(initial);
  const create = (type: string) => { const node = new NativeNode(type, next++); initial.appendChild(node); return node; };
  const api = { fileKey: "file", editorType: "figma", mode: "default", root, loadAllPagesAsync: async () => {}, loadFontAsync: async () => {}, createImage: () => ({ hash: "image", getSizeAsync: async () => ({ width: 390, height: 844 }) }),
    createPage: () => { const page = new NativeNode("PAGE", next++); root.appendChild(page); return page; }, createSection: () => create("SECTION"), createFrame: () => create("FRAME"), createText: () => create("TEXT"), createRectangle: () => create("RECTANGLE"), commitUndo: vi.fn() };
  vi.stubGlobal("figma", api);
  return { api, root, create, all: () => root.findAll(() => true) };
}
const screenshot = new Uint8Array([1,2,3]);
function job(): CanvasJob {
  const instructions = { contractVersion: "1.0.0" as const, width: 390, height: 844, nodes: [{ id: "heading", kind: "text" as const, name: "Heading", x: 10, y: 10, width: 300, height: 30, text: "Welcome" }], warnings: [] };
  return { id: "job", organizationId: "org", projectId: "project", deliverableId: "deliverable", componentId: "component", workspaceId: "workspace", fileKey: "file", connectionVersion: 1, revision: 1, canonicalName: "Hero", deviceLabel: "Mobile", sourceDigest: sha256(screenshot), instructionDigest: instructionDigest(instructions), generation: "complete", instructions, wireframeVariantId: "wireframe", designVariantId: "design" };
}
const lease = { epoch: 1, expiresAt: "2026-10-27T12:02:00.000Z" };
const deps = () => ({ checkpoint: async () => lease, now: () => Date.parse("2026-10-27T12:00:00.000Z") });
afterEach(() => vi.unstubAllGlobals());
describe("native workspace mutation and recovery", () => {
  it("creates editable native layers with locked reference and recovers a receipt without duplicates", async () => {
    const fixture = harness(); const first = await applyConductorWorkspace(job(), lease, screenshot, deps()); const count = fixture.all().length;
    expect(fixture.all().find((node) => node.id === first.referenceNodeId)).toMatchObject({ locked: true, width: 390, height: 844 });
    expect(fixture.all().find((node) => node.id === first.wireframeNodeId)?.name).toBe("Wireframe r1");
    expect(fixture.all().find((node) => node.name === "Heading")?.type).toBe("TEXT");
    expect(await applyConductorWorkspace(job(), lease, screenshot, deps())).toMatchObject({ sectionNodeId: first.sectionNodeId, designNodeId: first.designNodeId });
    expect(fixture.all()).toHaveLength(count);
  });
  it("adds a revision while preserving designer edits and reusing the unchanged reference", async () => {
    const fixture = harness(); const first = await applyConductorWorkspace(job(), lease, screenshot, deps());
    const design = fixture.all().find((node) => node.id === first.designNodeId)!; design.name = "Designer changes"; design.resize(500,900);
    const second = await applyConductorWorkspace({ ...job(), id: "job2", revision: 2, wireframeVariantId: "wireframe2" }, lease, screenshot, deps());
    expect(second.designNodeId).toBe(first.designNodeId); expect(second.referenceNodeId).toBe(first.referenceNodeId);
    expect(design).toMatchObject({ name: "Designer changes", width: 500, height: 900 }); expect(second.wireframeNodeId).not.toBe(first.wireframeNodeId);
  });
  it("creates no canvas content when a lease or evidence digest is invalid", async () => {
    const fixture = harness(); const count = fixture.all().length;
    await expect(applyConductorWorkspace({ ...job(), sourceDigest: "invalid" }, lease, screenshot, deps())).rejects.toThrow("digest");
    await expect(applyConductorWorkspace(job(), lease, screenshot, { ...deps(), checkpoint: async () => ({ ...lease, epoch: 2 }) })).rejects.toThrow("lease");
    expect(fixture.all()).toHaveLength(count);
  });
  it("retains reference and blank Design without inventing a wireframe on generation failure", async () => {
    const fixture = harness(); const input = job(); input.generation = "failed"; input.instructions.nodes = []; input.instructionDigest = instructionDigest(input.instructions);
    const receipt = await applyConductorWorkspace(input, lease, screenshot, deps());
    expect(receipt.wireframeNodeId).toBeUndefined(); expect(receipt.designNodeId).toBeTruthy(); expect(receipt.referenceNodeId).toBeTruthy();
    expect(fixture.all().filter((node) => readConductorBinding(node as unknown as BaseNode)?.role === "wireframe")).toHaveLength(0);
  });
  it("refuses a copied binding without touching existing layers", async () => {
    const fixture = harness(); const first = await applyConductorWorkspace(job(), lease, screenshot, deps());
    const design = fixture.all().find((node) => node.id === first.designNodeId)!;
    const copy = fixture.create("FRAME"); copy.setSharedPluginData("verndaleAiReady", "conductor-binding-v1", design.getSharedPluginData("verndaleAiReady", "conductor-binding-v1"));
    const count = fixture.all().length;
    await expect(applyConductorWorkspace(job(), lease, screenshot, deps())).rejects.toThrow("Copied"); expect(fixture.all()).toHaveLength(count);
  });
});

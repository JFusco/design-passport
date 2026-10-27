import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceBinding } from "../src/core/conductor-contracts";
import { stampConductorBinding } from "../src/figma/conductor-binding";
import { readConductorSelection } from "../src/figma/conductor-selection";

const binding: Omit<WorkspaceBinding, "nodeId"> = { schemaVersion: 1, role: "design", organizationId: "org", projectId: "project", deliverableId: "deliverable", componentId: "component", workspaceId: "workspace", fileKey: "file", jobItemId: "job", elementId: "design", variantId: "variant", revision: 1, connectionVersion: 1 };
function node(id: string, parent: BaseNode | null = null, notes: string[] = []) {
  let stamp = "";
  return { id, name: id, type: "FRAME", parent, annotations: notes.map((label) => ({ label })), getSharedPluginData: () => stamp, setSharedPluginData: (_namespace: string, _key: string, value: string) => { stamp = value; } } as unknown as FrameNode;
}
function select(...selection: SceneNode[]) {
  // No root or document traversal API: selection must be sufficient.
  vi.stubGlobal("figma", { fileKey: "file", currentPage: { selection } });
}
afterEach(() => vi.unstubAllGlobals());
describe("explicit Conductor annotation selection", () => {
  it("reads only selected layers and keeps each note's source node", () => {
    const design = node("1:1", null, ["Unselected frame note"]); stampConductorBinding(design, binding);
    const selected = node("1:2", design, ["Use the approved heading"]);
    node("1:3", design, ["Unselected sibling note"]);
    select(selected);
    expect(readConductorSelection()).toMatchObject({ frames: [{ id: design.id }], annotations: [{ id: "1:2/0", nodeId: "1:2", text: "Use the approved heading" }] });
  });
  it("does not collect descendant annotations when the whole frame is selected", () => {
    const design = node("1:1", null, ["Frame note"]); stampConductorBinding(design, binding);
    node("1:2", design, ["Child note"]);
    select(design);
    expect(readConductorSelection().annotations.map((note) => note.text)).toEqual(["Frame note"]);
  });
  it("refuses notes from references and other components", () => {
    const design = node("1:1"); stampConductorBinding(design, binding);
    const other = node("1:2"); stampConductorBinding(other, { ...binding, componentId: "other" });
    select(design, other); expect(() => readConductorSelection()).toThrow("one Conductor component");
    const reference = node("1:3"); stampConductorBinding(reference, { ...binding, role: "reference" });
    select(node("1:4", reference, ["Original note"])); expect(() => readConductorSelection()).toThrow("replacement Design");
  });
  it("bounds the explicitly selected notes before submission", () => {
    const design = node("1:1", null, Array.from({ length: 21 }, (_, index) => `Note ${index}`)); stampConductorBinding(design, binding);
    select(design); expect(() => readConductorSelection()).toThrow("at most 20 annotations");
  });
});

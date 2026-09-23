import { describe, expect, it } from "vitest";
import type { NodeSnapshot } from "../src/core/contracts";
import { deriveRepeatedStructures, deriveResponsiveFamilies, finalizeKnowledgeGraph } from "../src/core/knowledge";
import { populateGraphMetrics } from "../src/core/operations/graph";
import { healthyGraph, node, profile } from "./fixtures";

function typography(id: string, rootId: string, styleId = "style:body"): NodeSnapshot {
  return node({ id, rootId, parentId: rootId, name: "Body", type: "TEXT", fills: [], layout: undefined, boundFields: [], boundVariableIds: {},
    text: { fontSize: 16, charactersLength: 1, contentHash: "body", backgroundResolvable: false,
      style: { id: styleId, status: "resolved", controlledFields: ["fontSize"], overriddenFields: [] } } });
}

function siblings() {
  const desktop = node({ id: "desktop", rootId: "desktop", name: "Hero / Desktop / 1440", childIds: ["desktop-text"], fills: [], layout: undefined, boundFields: [], boundVariableIds: {} });
  const mobile = node({ id: "mobile", rootId: "mobile", name: "Hero / Mobile / 390", childIds: ["mobile-text"], fills: [], layout: undefined, boundFields: [], boundVariableIds: {} });
  const values = [desktop, mobile, typography("desktop-text", desktop.id), typography("mobile-text", mobile.id)];
  return Object.fromEntries(values.map((value) => [value.id, value]));
}

describe("source evidence and derived knowledge indexes", () => {
  it("does not turn rendered instance descendants into responsive source families or repeated-structure debt", () => {
    const values = Array.from({ length: 5 }, (_, index) => node({ id: `instance-child:${index}`, parentId: "instance", evidenceRole: "instance-descendant", owningInstanceId: "instance", structuralSignature: "same", name: "Hero / Desktop / 1440" }));
    values.push(node({ id: "source:1", structuralSignature: "same" }), node({ id: "source:2", structuralSignature: "same" }));
    const nodes = Object.fromEntries(values.map((value) => [value.id, value]));
    expect(deriveRepeatedStructures(nodes)).toEqual([]);
    expect(deriveResponsiveFamilies(nodes, profile()).flatMap((family) => family.memberIds)).not.toContain("instance-child:0");
    nodes["source:3"] = node({ id: "source:3", structuralSignature: "same" });
    expect(deriveRepeatedStructures(nodes)).toEqual([{ signature: "same", nodeIds: ["source:1", "source:2", "source:3"] }]);
  });

  it("compares applied style identities and ignores inert binding metadata in responsive parity", () => {
    const nodes = siblings();
    expect(deriveResponsiveFamilies(nodes, profile())[0]?.bindingParity).toBe(true);
    nodes.desktop!.boundFields.push("cornerRadius"); nodes.desktop!.boundVariableIds.cornerRadius = ["inert-radius"];
    nodes.desktop!.cornerRadius = 8;
    expect(deriveResponsiveFamilies(nodes, profile())[0]?.bindingParity).toBe(true);
    nodes["mobile-text"]!.text!.style!.id = "style:independent";
    expect(deriveResponsiveFamilies(nodes, profile())[0]?.bindingParity).toBe(false);
    nodes["mobile-text"]!.text!.style!.id = "style:body";
    nodes["mobile-text"]!.text!.style!.controlledFields = [];
    nodes["mobile-text"]!.text!.style!.overriddenFields = ["fontSize"];
    expect(deriveResponsiveFamilies(nodes, profile())[0]?.bindingParity).toBe(false);
  });

  it.each([
    ["visibility", { visible: false }], ["render visibility", { renderVisible: false }],
    ["corner sides", { cornerRadii: { topLeft: 8, topRight: 4, bottomLeft: 0, bottomRight: 0 } }],
    ["stroke sides", { strokeWeights: { top: 1, right: 0, bottom: 0, left: 0 } }],
    ["binding sides", { boundGeometryFields: ["strokeTopWeight"] }],
    ["mask", { isMask: true }], ["clipping", { clipsContent: true }],
    ["source role", { evidenceRole: "instance-descendant", owningInstanceId: "instance" }],
    ["Boolean state", { interactionProperties: { Disabled: "true" } }],
    ["variant state", { variantProperties: { State: "disabled" } }],
    ["interaction", { hasPointerInteraction: true }],
    ["bounds", { absoluteBounds: { x: 1, y: 1, width: 24, height: 24 } }],
    ["page ownership", { pageId: "page:2" }],
    ["source ownership", { rootId: "root:other" }],
    ["structural signature", { structuralSignature: "structure:changed" }],
    ["layout item sizing", { layoutItem: { verticalSizing: "FIXED" } }],
    ["intentional detachment", { intentionalDetachment: { nodeId: "root:desktop", acknowledgedAt: "2026-09-23T12:00:00.000Z" } }],
    ["instance inheritance", { instanceEvidence: { overridesKnown: true, directOverrideFields: ["fontName"], scaleFactor: 2 } }],
  ] satisfies Array<[string, Partial<NodeSnapshot>]>)("hashes rule-relevant %s changes", (_label, changes) => {
    const p = profile(); const before = healthyGraph(p); const rootId = Object.keys(before.nodes)[0]!;
    const changed = structuredClone(before); Object.assign(changed.nodes[rootId]!, changes);
    expect(finalizeKnowledgeGraph(changed, p).snapshotHash).not.toBe(finalizeKnowledgeGraph(before, p).snapshotHash);
  });

  it("retains source structural signatures while keeping inherited descendants navigable", () => {
    const instance = node({ id: "instance", type: "INSTANCE", childIds: [] });
    const root = node({ id: "source", childIds: [instance.id] });
    const nodes = { source: root, instance } as Record<string, NodeSnapshot>;
    populateGraphMetrics(nodes); const before = root.contentSignature;
    const rendered = typography("rendered", root.id);
    rendered.evidenceRole = "instance-descendant"; rendered.owningInstanceId = instance.id;
    nodes.rendered = rendered; instance.childIds.push(rendered.id);
    populateGraphMetrics(nodes);
    expect(root.contentSignature).toBe(before);
    expect(root.descendantCount).toBe(2);
    expect(instance.childIds).toEqual([rendered.id]);
  });

  it("hashes the resource epoch even if the rendered values have not propagated", () => {
    const p = profile(); const before = healthyGraph(p);
    const first = finalizeKnowledgeGraph({ ...before, resourceFingerprint: "resources:1" }, p);
    const second = finalizeKnowledgeGraph({ ...before, resourceFingerprint: "resources:2" }, p);
    expect(second.snapshotHash).not.toBe(first.snapshotHash);
  });
});

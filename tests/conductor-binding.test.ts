import { describe, expect, it } from "vitest";
import { assertCurrentConductorBinding, conductorAuditRole, readConductorBinding, stampConductorBinding } from "../src/figma/conductor-binding";
import type { WorkspaceBinding } from "../src/core/conductor-contracts";
const binding: Omit<WorkspaceBinding, "nodeId"> = { schemaVersion: 1, role: "design", organizationId: "org", projectId: "project", deliverableId: "deliverable", componentId: "component", workspaceId: "workspace", fileKey: "file", jobItemId: "job", elementId: "design", variantId: "variant", revision: 1, connectionVersion: 1 };
function node(id: string, parent: BaseNode | null = null) {
  let raw = "";
  return { id, type: "FRAME", parent, getSharedPluginData: () => raw, setSharedPluginData: (_ns: string, _key: string, value: string) => { raw = value; } } as unknown as BaseNode;
}
describe("Conductor identity and audit exclusion", () => {
  it("accepts actual identity but rejects copied nodes and duplicated files", () => {
    const original = node("1:2"); stampConductorBinding(original, binding);
    expect(assertCurrentConductorBinding(original, "file").nodeId).toBe("1:2");
    const copy = node("1:3"); copy.setSharedPluginData("", "", JSON.stringify(readConductorBinding(original)));
    expect(() => assertCurrentConductorBinding(copy, "file")).toThrow("Copied");
    expect(() => assertCurrentConductorBinding(original, "duplicated-file")).toThrow("Copied");
  });
  it.each(["reference", "wireframe"] as const)("excludes %s descendants independently of page naming", (role) => {
    const root = node("1:2"); stampConductorBinding(root, { ...binding, role });
    expect(conductorAuditRole(node("1:3", root))).toBe(role);
  });
  it("keeps a bound Design frame eligible for normal audit rules", () => {
    const root = node("1:2"); stampConductorBinding(root, binding);
    expect(conductorAuditRole(node("1:3", root))).toBe("design");
  });
  it("fails closed for malformed stamps instead of auditing reference content", () => {
    const root = node("1:2"); root.setSharedPluginData("", "", "{broken");
    expect(readConductorBinding(root)).toBeUndefined();
    expect(conductorAuditRole(node("1:3", root))).toBe("reference");
  });
});

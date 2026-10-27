import type { WorkspaceBinding, WorkspaceRole } from "../core/conductor-contracts";

export const CONDUCTOR_NAMESPACE = "verndaleAiReady";
export const CONDUCTOR_BINDING_KEY = "conductor-binding-v1";
const ROLES: WorkspaceRole[] = ["section", "reference", "wireframe", "design"];

export function readConductorBinding(node: BaseNode): WorkspaceBinding | undefined {
  const raw = node.getSharedPluginData?.(CONDUCTOR_NAMESPACE, CONDUCTOR_BINDING_KEY);
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as WorkspaceBinding;
    if (value.schemaVersion !== 1 || !ROLES.includes(value.role)
      || ![value.organizationId, value.projectId, value.deliverableId, value.componentId,
        value.workspaceId, value.fileKey, value.nodeId, value.jobItemId, value.elementId, value.variantId].every((entry) => typeof entry === "string" && entry.length > 0 && entry.length <= 200)
      || !Number.isSafeInteger(value.revision) || value.revision < 1
      || !Number.isSafeInteger(value.connectionVersion) || value.connectionVersion < 1) return undefined;
    return value;
  } catch { return undefined; }
}

/** Identity is checked separately from parsing so a copied stamp is a conflict. */
export function assertCurrentConductorBinding(node: BaseNode, fileKey: string): WorkspaceBinding {
  const binding = readConductorBinding(node);
  if (!binding || binding.nodeId !== node.id || binding.fileKey !== fileKey) throw new Error("Copied or invalid Conductor binding; reconnect this workspace explicitly");
  return binding;
}

/** Fail closed for excluded content, including copied/malformed role stamps. */
export function conductorAuditRole(node: BaseNode): "reference" | "wireframe" | "design" | undefined {
  let current: BaseNode | null = node;
  let role: "design" | undefined;
  while (current && current.type !== "DOCUMENT") {
    const raw = current.getSharedPluginData?.(CONDUCTOR_NAMESPACE, CONDUCTOR_BINDING_KEY);
    if (raw) {
      const binding = readConductorBinding(current);
      if (!binding) return "reference";
      if (binding.role === "reference" || binding.role === "wireframe") return binding.role;
      if (binding.role === "design") role = "design";
    }
    current = current.parent;
  }
  return role;
}

export function stampConductorBinding(node: BaseNode, binding: Omit<WorkspaceBinding, "nodeId">): void {
  node.setSharedPluginData(CONDUCTOR_NAMESPACE, CONDUCTOR_BINDING_KEY, JSON.stringify({ ...binding, nodeId: node.id }));
}

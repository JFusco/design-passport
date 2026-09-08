export type ComponentSnapshotNodeType = "COMPONENT" | "COMPONENT_SET";

/**
 * Figma throws when componentPropertyDefinitions is read from a variant
 * ComponentNode. The owning ComponentSetNode is the definition source.
 */
export function canReadComponentPropertyDefinitions(
  nodeType: ComponentSnapshotNodeType,
  parentType: string | undefined,
): boolean {
  return nodeType === "COMPONENT_SET" || parentType !== "COMPONENT_SET";
}

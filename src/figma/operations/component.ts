import type { NodeSnapshot } from "../../core/contracts";

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

type ComponentMetadata = Pick<NodeSnapshot, "component" | "variantProperties" | "interactionProperties" | "unavailableComponentMetadata">;

/** A malformed component set can make otherwise readable nodes reject metadata
 * getters. Keep their usable evidence and record exactly which reads failed. */
export function componentMetadataSnapshot(node: SceneNode): ComponentMetadata {
  const output: ComponentMetadata = {};
  const unavailable: NonNullable<NodeSnapshot["unavailableComponentMetadata"]> = [];
  const read = <T>(field: typeof unavailable[number], capture: () => T): T | undefined => {
    try { return capture(); }
    catch { unavailable.push(field); return undefined; }
  };
  if (node.type === "INSTANCE") {
    // Read once so variant and Boolean state evidence share the same outcome.
    const properties = read("componentProperties", () => Object.entries(node.componentProperties));
    if (properties) {
      const variants = properties.filter(([, property]) => property.type === "VARIANT")
        .map(([name, property]) => [name, String(property.value)]);
      const interaction = properties.filter(([, property]) => property.type === "VARIANT" || property.type === "BOOLEAN")
        .map(([name, property]) => [name, String(property.value)]);
      if (variants.length) output.variantProperties = Object.fromEntries(variants);
      if (interaction.length) output.interactionProperties = Object.fromEntries(interaction);
    }
  } else if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    const definitions = canReadComponentPropertyDefinitions(node.type, node.parent?.type)
      ? read("componentPropertyDefinitions", () => Object.entries(node.componentPropertyDefinitions))
      : [];
    output.component = {
      kind: node.type === "COMPONENT" ? "component" : "component-set",
      ...(node.key ? { key: node.key } : {}),
      descriptionLength: node.description.length,
      documentationLinkCount: node.documentationLinks.length,
      propertyDefinitions: (definitions ?? []).map(([name, definition]) => ({
        name, type: definition.type,
        values: (definition.variantOptions ?? [definition.defaultValue]).map(String),
      })),
    };
    if (node.type === "COMPONENT") {
      const variants = read("variantProperties", () => {
        const value = node.variantProperties;
        return value ? { ...value } : undefined;
      });
      if (variants) output.variantProperties = variants;
      const interaction: Record<string, string> = { ...variants };
      for (const [name, definition] of definitions ?? []) {
        if (definition.type === "BOOLEAN") interaction[name] = String(definition.defaultValue);
      }
      if (Object.keys(interaction).length) output.interactionProperties = interaction;
    }
  }
  if (unavailable.length) output.unavailableComponentMetadata = unavailable;
  return output;
}

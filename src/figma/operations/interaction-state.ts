/** Capture actual component control values, including Boolean properties omitted
 * by variantProperties. Preserve opaque #ids so duplicate display names with
 * contradictory values remain distinct evidence. */
export function interactionPropertiesSnapshot(node: SceneNode): Record<string, string> | undefined {
  if (node.type === "INSTANCE") {
    const properties = Object.entries(node.componentProperties)
      .filter(([, property]) => property.type === "VARIANT" || property.type === "BOOLEAN")
      .map(([name, property]) => [name, String(property.value)] as const);
    return properties.length ? Object.fromEntries(properties) : undefined;
  }
  if (node.type === "COMPONENT") {
    const properties: Record<string, string> = { ...node.variantProperties };
    // Components inside a set cannot read componentPropertyDefinitions. Their
    // explicit variant assignments remain sufficient evidence for state.
    if (node.parent?.type !== "COMPONENT_SET") {
      for (const [name, definition] of Object.entries(node.componentPropertyDefinitions)) {
        if (definition.type === "BOOLEAN") properties[name] = String(definition.defaultValue);
      }
    }
    return Object.keys(properties).length ? properties : undefined;
  }
  return undefined;
}

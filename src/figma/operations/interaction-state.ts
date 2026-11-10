import { componentMetadataSnapshot } from "./component";

/** Capture actual component control values, including Boolean properties omitted
 * by variantProperties. Preserve opaque #ids so duplicate display names with
 * contradictory values remain distinct evidence. */
export function interactionPropertiesSnapshot(node: SceneNode): Record<string, string> | undefined {
  return componentMetadataSnapshot(node).interactionProperties;
}

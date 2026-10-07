import type { DesignKnowledgeGraph, Finding } from "../core/contracts";

export type MicroFieldGroup = "name" | "tokens" | "annotations" | "exports" | "metadata" | "rendering";
export class MicroCheckRequired extends Error {}
const TOKEN_PROPERTIES = new Set([
  "boundVariables", "textStyleId", "fills", "strokes", "cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "strokeWeight",
  "fontSize", "fontName", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent",
  "itemSpacing", "counterAxisSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
]);
const GEOMETRY_PROPERTIES = new Set(["width", "height", "x", "y", "size", "relativeTransform"]);
export function microFieldGroup(property: string): MicroFieldGroup | undefined {
  if (property === "name") return "name";
  if (TOKEN_PROPERTIES.has(property)) return "tokens";
  if (GEOMETRY_PROPERTIES.has(property)) return "rendering";
  if (property === "annotations") return "annotations";
  if (property === "exportSettings") return "exports";
  if (property === "pluginData") return "metadata";
  return undefined;
}
export function findingMicroFields(finding: Finding): MicroFieldGroup[] {
  if (finding.ruleId.startsWith("token.")) return ["tokens"];
  if (finding.axis === "layer-naming") return ["name", "metadata"];
  if (finding.ruleId === "pipeline.annotation") return ["annotations"];
  if (finding.ruleId === "pipeline.export-names") return ["name", "exports"];
  if (finding.ruleId === "component.detached-design") return ["metadata"];
  return [];
}
export function microClosure(graph: DesignKnowledgeGraph, journal: Record<string, string[]>, selected: ReadonlyMap<string, readonly MicroFieldGroup[]>): Map<string, Set<MicroFieldGroup>> {
  const closure = new Map<string, Set<MicroFieldGroup>>();
  const add = (id: string, groups: readonly MicroFieldGroup[]) => {
    if (!graph.nodes[id]) throw new MicroCheckRequired("A changed layer was not captured. Regenerate audit to verify.");
    const fields = closure.get(id) ?? new Set<MicroFieldGroup>();
    groups.forEach((group) => fields.add(group)); closure.set(id, fields);
  };
  for (const [id, groups] of selected) add(id, groups);
  const geometryOnly: string[] = [];
  for (const [id, properties] of Object.entries(journal)) {
    const groups = properties.map(microFieldGroup);
    if (groups.some((group) => !group)) throw new MicroCheckRequired("An unsupported field changed. Regenerate audit to verify.");
    // Dimensions delivered alongside a supported styling edit are its geometry dependencies.
    if (groups.every((group) => group === "rendering")) { geometryOnly.push(id); continue; }
    add(id, groups as MicroFieldGroup[]);
  }
  const descendants = (id: string, groups: MicroFieldGroup[]) => {
    const pending = [id], seen = new Set<string>();
    while (pending.length) {
      const next = pending.pop()!; if (seen.has(next)) continue; seen.add(next);
      add(next, groups); pending.push(...graph.nodes[next]!.childIds);
    }
  };
  const sources = new Set<string>();
  for (const [id, fields] of [...closure]) {
    let current = graph.nodes[id];
    const ancestors = new Set<string>();
    while (current) {
      if (ancestors.has(current.id)) throw new MicroCheckRequired("Cyclic ownership needs regeneration.");
      ancestors.add(current.id);
      if (current.type === "COMPONENT") sources.add(current.id);
      if (fields.has("tokens") && current.layout && current.layout.mode !== "NONE") descendants(current.id, ["rendering", "tokens"]);
      current = graph.nodes[current.parentId ?? ""];
    }
    if (fields.has("tokens")) descendants(id, ["rendering", "tokens"]);
  }
  for (const instanceId of graph.instanceIds) if (sources.has(graph.nodes[instanceId]?.instance?.mainComponentId ?? "")) descendants(instanceId, ["name", "tokens", "rendering"]);
  for (const node of Object.values(graph.nodes)) {
    if (node.text?.backgroundSourceNodeIds?.some((id) => closure.get(id)?.has("tokens"))) add(node.id, ["tokens", "rendering"]);
  }
  for (const id of geometryOnly) {
    if (!closure.has(id)) throw new MicroCheckRequired("An unscoped geometry edit needs regeneration.");
    add(id, ["rendering"]);
  }
  return closure;
}

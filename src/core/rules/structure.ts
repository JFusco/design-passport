import type { Finding, NodeSnapshot } from "../contracts";
import { createFinding } from "./finding";

const GEOMETRY_NODE_TYPES = new Set(["BOOLEAN_OPERATION", "ELLIPSE", "LINE", "POLYGON", "RECTANGLE", "STAR", "VECTOR"]);

function isMeasurableLayoutContainer(node: NodeSnapshot, nodesById: ReadonlyMap<string, NodeSnapshot>): boolean {
  if (node.childIds.length < 2 || !["FRAME", "COMPONENT"].includes(node.type)) return false;
  const children = node.childIds.map((id) => nodesById.get(id)).filter((child): child is NodeSnapshot => Boolean(child));
  return children.length > 0 && !children.every((child) => GEOMETRY_NODE_TYPES.has(child.type));
}

export function evaluateStructureRules(root: NodeSnapshot, nodes: NodeSnapshot[]): Finding[] {
  const output: Finding[] = [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const containers = nodes.filter((node) => isMeasurableLayoutContainer(node, nodesById));
  const withoutAutoLayout = containers.filter((node) => node.layout?.mode === "NONE");
  const coverage = containers.length === 0
    ? 100
    : ((containers.length - withoutAutoLayout.length) / containers.length) * 100;
  output.push(createFinding(
    "structure.auto-layout-coverage",
    "structure-auto-layout",
    4,
    root,
    withoutAutoLayout[0] ?? root,
    coverage >= 80 ? "pass" : "fail",
    "Auto Layout coverage",
    `${coverage.toFixed(1)}% of measurable multi-child containers use Auto Layout.`,
    { containerCount: containers.length, withoutAutoLayoutCount: withoutAutoLayout.length, coverage },
  ));
  for (const node of withoutAutoLayout.filter((candidate) => candidate.layout?.inferredAvailable)) {
    output.push(createFinding(
      "structure.inferred-auto-layout",
      "structure-auto-layout",
      2,
      root,
      node,
      "fail",
      "Inferred Auto Layout candidate",
      "Figma exposes inferred Auto Layout; the plugin can validate it on a temporary clone before applying.",
      { childCount: node.childIds.length, tolerancePx: 0.5 },
      {
        fixability: "guarded",
        suggestedValue: { tolerance: 0.5 },
        scoreImpact: false,
      },
    ));
  }
  for (const node of nodes.filter((candidate) => candidate.type === "GROUP" && candidate.childIds.length > 1)) {
    output.push(createFinding(
      "structure.group",
      "structure-auto-layout",
      1,
      root,
      node,
      "needs-review",
      "Group obscures layout intent",
      "Review whether this group should be a semantically named frame with Auto Layout.",
      { childCount: node.childIds.length },
      { discriminator: node.id },
    ));
  }
  for (const node of nodes.filter((candidate) => /(?:^|[\s/_-])spacer(?:$|[\s/_-])/i.test(candidate.name))) {
    output.push(createFinding(
      "structure.spacer-layer",
      "structure-auto-layout",
      2,
      root,
      node,
      "fail",
      "Spacer layer",
      "Use Auto Layout gap or padding instead of a spacer layer.",
      { width: node.width, height: node.height },
      { discriminator: node.id },
    ));
  }
  const clipped = containers.filter((node) => node.layout?.clipsContent && node.layout.mode === "NONE");
  output.push(createFinding(
    "structure.clipping",
    "structure-auto-layout",
    1,
    root,
    clipped[0] ?? root,
    clipped.length === 0 ? "pass" : "needs-review",
    "Clipping review",
    clipped.length === 0
      ? "No non-layout container with clipping enabled was measured."
      : `${clipped.length} non-layout containers clip content and need responsive review.`,
    { clippedContainerCount: clipped.length },
  ));
  return output;
}

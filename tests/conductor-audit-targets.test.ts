import { describe, expect, it } from "vitest";
import { collectDescendants, resolveTargetRoots } from "../src/core/operations/graph";
import { healthyGraph, node } from "./fixtures";
function workspaceGraph() {
  const graph = healthyGraph();
  const roots = [node({ id: "reference", conductorRole: "reference", childIds: ["reference-child"] }), node({ id: "wireframe", conductorRole: "wireframe" }), node({ id: "design", conductorRole: "design" }), node({ id: "reference-child", parentId: "reference", childIds: [] })];
  graph.nodes = Object.fromEntries(roots.map((entry) => [entry.id,entry]));
  graph.pages[0]!.rootNodeIds = ["reference", "wireframe", "design"];
  graph.sourceFrameIds = ["reference", "wireframe", "design"];
  return graph;
}
describe("Conductor audit target boundaries", () => {
  it.each(["selection", "page", "file"] as const)("excludes reference and wireframe roots and copied descendants in %s scope", (scope) => {
    expect(resolveTargetRoots(scope, workspaceGraph(), "page:1", ["reference", "reference-child", "wireframe", "design"]).rootIds).toEqual(["design"]);
  });
  it("does not grade excluded content moved beneath an eligible Design frame", () => {
    const graph = workspaceGraph(); graph.nodes.design!.childIds = ["reference", "wireframe"];
    graph.nodes.reference!.parentId = "design"; graph.nodes.wireframe!.parentId = "design";
    expect(collectDescendants(graph,"design").map((entry) => entry.id)).toEqual(["design"]);
  });
});

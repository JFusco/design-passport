import { describe, expect, it } from "vitest";
import type { NodeSnapshot } from "../src/core/contracts";
import { deriveRepeatedStructures } from "../src/core/knowledge";
import { node } from "./fixtures";

describe("large-page pure index performance", () => {
  it.each([10_000, 50_000])("groups repeated structures across %i nodes without recursion", (count) => {
    const nodes: Record<string, NodeSnapshot> = {};
    for (let index = 0; index < count; index += 1) {
      const id = `node:${index}`;
      nodes[id] = node({ id, rootId: id, name: `Semantic layer ${index}`, path: `Page / ${id}`, structuralSignature: `signature:${index % 250}` });
    }
    const started = performance.now();
    const groups = deriveRepeatedStructures(nodes);
    const elapsed = performance.now() - started;
    expect(groups).toHaveLength(250);
    expect(groups.reduce((sum, group) => sum + group.nodeIds.length, 0)).toBe(count);
    expect(elapsed).toBeLessThan(5_000);
  });
});

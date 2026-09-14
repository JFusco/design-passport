import { afterEach, describe, expect, it, vi } from "vitest";
import { listVariableCollectionOptions } from "../src/figma/operations/collections";
import { contextFragment, mapConcurrent, readContextFragment, restPageFingerprint } from "../src/figma/context-cache";
import { buildReadinessReport } from "../src/core/report";
import { node } from "./fixtures";
import { contextFixture } from "./context-cache-fixtures";

const build = (fixture: ReturnType<typeof contextFixture>, forceFullCapture = false) => fixture.adapter.buildKnowledge(fixture.readinessProfile, () => undefined, { contextCache: fixture.cache, forceFullCapture });
const withoutTime = <T extends { builtAt: string }>(value: T) => { const { builtAt: _builtAt, ...rest } = value; return rest; };
afterEach(() => { Reflect.deleteProperty(globalThis, "figma"); });

describe("validated persisted context", () => {
  it("reuses a fragment after reopening while refreshing all inference and external evidence", async () => {
    const fixture = contextFixture();
    const first = await build(fixture);
    fixture.adapter.beginScan();
    const second = await build(fixture);
    const full = await build(fixture, true);
    expect(second.diagnostics).toMatchObject({ reusedFragments: 1, reusedNodes: 2, capturedNodes: 0, inferenceNodes: 2 });
    expect(withoutTime(second.graph)).toEqual(withoutTime(full.graph));
    expect(withoutTime(first.graph)).toEqual(withoutTime(full.graph));
    expect(fixture.counts.rootResources).toBe(0);
    expect(fixture.counts.resources).toBe(3);
    const restored = JSON.stringify([...fixture.cacheValues.values()]);
    expect(restored).not.toContain('"characters"');
    expect(restored).not.toContain('"content":"Heading"');
  });

  it.each(["name", "visible", "width", "text", "font", "fill", "effects", "annotation", "variant", "documentation", "bindings", "plugin-data"])("matches full capture after changing %s", async (change) => {
    const fixture = contextFixture(2);
    const root = fixture.pages[0]!.children[0]!;
    const text = root.children[0]!;
    root.type = "COMPONENT";
    await build(fixture);
    if (change === "name") root.name = "Updated Card";
    if (change === "visible") root.visible = false;
    if (change === "width") root.width = 280;
    if (change === "text") text.characters = "Updated text content";
    if (change === "font") text.fontName.style = "Medium";
    if (change === "fill") text.fills[0]!.color.r = 0.2;
    if (change === "effects") root.effects = [{ type: "DROP_SHADOW", visible: true, radius: 2, offset: { x: 1, y: 1 }, color: { r: 0, g: 0, b: 0, a: 1 } }];
    if (change === "annotation") root.annotations = [{ label: "Source documentation" }];
    if (change === "variant") root.variantProperties = { state: "Loading" };
    if (change === "documentation") root.description = "";
    if (change === "bindings") text.boundVariables = { fontSize: { type: "VARIABLE_ALIAS", id: "var:new" } };
    if (change === "plugin-data") fixture.metadata.set(`${root.id}:verndaleAiReady:pattern-resolution-v1`, JSON.stringify({ canonicalName: "Card", sourceName: "Card", catalogVersion: "1" }));
    const cached = await build(fixture);
    const full = await build(fixture, true);
    expect(cached.diagnostics).toMatchObject({ capturedFragments: 1, reusedFragments: 1 });
    expect(withoutTime(cached.graph)).toEqual(withoutTime(full.graph));
    const reportInput = { profile: fixture.readinessProfile, scope: "selection" as const, targetRootIds: [root.id], now: new Date("2026-09-14T00:00:00Z") };
    expect(buildReadinessReport({ ...reportInput, graph: cached.graph })).toEqual(buildReadinessReport({ ...reportInput, graph: full.graph }));
  });

  it("rehydrates dev resources, inferred variables, and main component metadata on cache hits", async () => {
    const fixture = contextFixture();
    const root = fixture.pages[0]!.children[0]!;
    root.type = "INSTANCE";
    await build(fixture);
    fixture.resources.push({ nodeId: root.id, name: "Code", url: "https://example.test/card" });
    fixture.setInference({ width: [{ type: "VARIABLE_ALIAS", id: "var:inferred" }] });
    fixture.setMainName("Updated main component");
    const cached = await build(fixture);
    const full = await build(fixture, true);
    expect(cached.diagnostics.reusedFragments).toBe(1);
    expect(cached.graph.nodes[root.id]).toMatchObject({ devResourceCount: 1, inferredBindings: { width: ["var:inferred"] }, instance: { mainComponentName: "Updated main component" } });
    expect(withoutTime(cached.graph)).toEqual(withoutTime(full.graph));
  });

  it("invalidates cached base values when variable modes or alias dependencies change", async () => {
    const fixture = contextFixture();
    const variable = { id: "variable:1", key: "variable:key", name: "semantic/space", variableCollectionId: "collection:1", resolvedType: "FLOAT", remote: false, valuesByMode: { mode: 8 }, scopes: ["GAP"], codeSyntax: { WEB: "--space" } };
    const collection = { id: "collection:1", key: "collection:key", name: "Semantic", remote: false, modes: [{ modeId: "mode", name: "Default" }], defaultModeId: "mode", variableIds: [variable.id] };
    fixture.setVariables([variable as unknown as Variable]);
    fixture.setCollections([collection as unknown as VariableCollection]);
    await build(fixture);
    expect((await build(fixture)).diagnostics.reusedFragments).toBe(1);
    variable.valuesByMode.mode = 12;
    const cached = await build(fixture);
    const full = await build(fixture, true);
    expect(cached.diagnostics.capturedFragments).toBe(1);
    expect(withoutTime(cached.graph)).toEqual(withoutTime(full.graph));
    fixture.pages[0]!.children[0]!.resolvedVariableModes = { "collection:1": "mode:changed" };
    expect((await build(fixture)).diagnostics.capturedFragments).toBe(1);
  });

  it("serializes token-heavy dependencies once per build, independent of fragment count", async () => {
    const fixture = contextFixture(65, 1);
    const count = 200;
    let valueReads = 0;
    let collectionMembershipReads = 0;
    const variables = Array.from({ length: count }, (_, index) => ({
      id: `variable:${index}`, key: `key:${index}`, name: `semantic/space/${index}`, variableCollectionId: "collection:1", resolvedType: "FLOAT", remote: false,
      get valuesByMode() { valueReads += 1; return { mode: index }; },
      scopes: ["GAP"], codeSyntax: { WEB: `--space-${index}` },
    }));
    const collection = { id: "collection:1", key: "collection:key", name: "Semantic", remote: false, modes: [{ modeId: "mode", name: "Default" }], defaultModeId: "mode",
      get variableIds() { collectionMembershipReads += 1; return variables.map((variable) => variable.id); },
    };
    fixture.setVariables(variables as unknown as Variable[]);
    fixture.setCollections([collection as unknown as VariableCollection]);
    await build(fixture);
    // Initial provenance + fresh grading evidence + one final verification.
    expect(valueReads).toBe(count * 3);
    expect(collectionMembershipReads).toBe(2);
    valueReads = 0; collectionMembershipReads = 0;
    const cached = await build(fixture);
    expect(cached.diagnostics.reusedFragments).toBe(65);
    expect(valueReads).toBe(count * 3);
    expect(collectionMembershipReads).toBe(2);
    const full = await build(fixture, true);
    expect(withoutTime(cached.graph)).toEqual(withoutTime(full.graph));
  });

  it("rejects variable changes during context validation without writing fragments", async () => {
    const fixture = contextFixture();
    const variable = { id: "variable:1", key: "variable:key", name: "semantic/space", variableCollectionId: "collection:1", resolvedType: "FLOAT", remote: false, valuesByMode: { mode: 8 }, scopes: ["GAP"], codeSyntax: {} };
    const collection = { id: "collection:1", key: "collection:key", name: "Semantic", remote: false, modes: [{ modeId: "mode", name: "Default" }], defaultModeId: "mode", variableIds: [variable.id] };
    fixture.setVariables([variable as unknown as Variable]);
    fixture.setCollections([collection as unknown as VariableCollection]);
    const read = fixture.cache.get;
    fixture.cache.get = async (key) => { variable.valuesByMode.mode = 16; return read(key); };
    await expect(build(fixture)).rejects.toThrow("Variable values or collections changed");
    expect(fixture.cacheValues.size).toBe(0);
  });

  it("recaptures deleted, inserted and moved nodes while retaining other fragments", async () => {
    const fixture = contextFixture(2, 2);
    await build(fixture);
    const first = fixture.pages[0]!.children[0]!;
    const second = fixture.pages[1]!.children[0]!;
    const moved = first.children.pop()!;
    moved.parent = second;
    second.children.push(moved);
    const cached = await build(fixture);
    expect(cached.diagnostics.capturedFragments).toBe(2);
    expect(withoutTime(cached.graph)).toEqual(withoutTime((await build(fixture, true)).graph));
    second.children.pop();
    expect((await build(fixture)).graph.nodes[moved.id]).toBeUndefined();
  });

  it("validates live optional fields when REST omits their default arrays", async () => {
    const fixture = contextFixture();
    const originalExport = fixture.pages[0]!.exportAsync;
    fixture.pages[0]!.exportAsync = async () => {
      const result = await originalExport();
      delete result.document.children[0].exportSettings;
      delete result.document.children[0].effects;
      return result;
    };
    await build(fixture);
    expect((await build(fixture)).diagnostics.reusedFragments).toBe(1);
    fixture.pages[0]!.children[0]!.exportSettings = [{ format: "PNG", suffix: "@2x" }];
    const cached = await build(fixture);
    expect(cached.diagnostics.reusedFragments).toBe(0);
    expect(withoutTime(cached.graph)).toEqual(withoutTime((await build(fixture, true)).graph));
  });

  it("rejects absent bulk inputs, corrupted storage and file mismatches", async () => {
    const fixture = contextFixture();
    await build(fixture);
    const entry = fixture.cacheValues.values().next().value as { digest: string };
    entry.digest = "corrupt";
    expect((await build(fixture)).diagnostics.reusedFragments).toBe(0);
    fixture.figma.fileKey = "another-file";
    expect((await build(fixture)).diagnostics.reusedFragments).toBe(0);
    fixture.pages[0]!.exportAsync = async () => { throw new Error("Unavailable"); };
    expect((await build(fixture)).diagnostics.reusedFragments).toBe(0);
  });

  it("does not publish partial cache writes on cancellation or fail an audit for unavailable storage", async () => {
    const fixture = contextFixture();
    fixture.cache.get = async () => { throw new Error("Storage blocked"); };
    fixture.cache.set = async () => { throw new Error("Full"); };
    const result = await build(fixture);
    expect(result.graph.complete).toBe(true);
    expect(result.diagnostics).toMatchObject({ cacheReadFailures: 1, cacheWriteFailures: 1 });
    fixture.cache.get = async () => { fixture.adapter.cancel(); return undefined; };
    expect((await build(fixture)).graph.cancelled).toBe(true);
    expect(fixture.counts.cacheWrites).toBe(0);
  });

  it("keeps cache baselines independent from opaque enrichment and mutated returned values", () => {
    const cached = contextFragment("fingerprint", [node({ id: "node:1", inferredBindings: { width: ["var:old"] }, devResourceCount: 4 })]);
    const restored = readContextFragment(cached, "fingerprint", ["node:1"])!;
    expect(restored[0]).toMatchObject({ inferredBindings: {}, devResourceCount: 0 });
    restored[0]!.name = "changed";
    expect(readContextFragment(cached, "fingerprint", ["node:1"])![0]!.name).not.toBe("changed");
    expect(readContextFragment(cached, "other", ["node:1"])).toBeUndefined();
    expect(restPageFingerprint({ document: { id: "page:other", children: [] } }, "page:1")).toBeUndefined();
  });

  it("refreshes enabled library discovery at the explicit audit boundary", async () => {
    let name = "Original library";
    const discover = vi.fn(async () => [{ key: "remote:key", name, libraryName: "Design system" }]);
    vi.stubGlobal("figma", { variables: { getLocalVariableCollectionsAsync: async () => [] }, teamLibrary: { getAvailableLibraryVariableCollectionsAsync: discover } });
    expect((await listVariableCollectionOptions({ includeRemote: true, refreshRemote: true }))[0]?.name).toBe("Original library");
    name = "Changed library";
    expect((await listVariableCollectionOptions({ includeRemote: true }))[0]?.name).toBe("Original library");
    expect((await listVariableCollectionOptions({ includeRemote: true, refreshRemote: true }))[0]?.name).toBe("Changed library");
    expect(discover).toHaveBeenCalledTimes(2);
  });

  it("bounds concurrent work while preserving input order", async () => {
    let active = 0;
    let maximum = 0;
    const output = await mapConcurrent([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1; maximum = Math.max(active, maximum);
      await new Promise((resolve) => setTimeout(resolve, value % 2));
      active -= 1;
      return value * 2;
    });
    expect(maximum).toBe(2);
    expect(output).toEqual([2, 4, 6, 8, 10]);
  });
});

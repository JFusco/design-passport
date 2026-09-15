import { describe, expect, it, vi } from "vitest";
import { FigmaAdapter, tokenPropertySnapshot } from "../src/figma/adapter";
import { createSemanticTokenAndBind } from "../src/figma/mutations";
import { assessTokenProperty, bindingCoverage, eligibleTokenFields, propertyBindingEvidence } from "../src/core/operations/node-fields";
import { evaluateTokenRules } from "../src/core/rules/token";
import { evaluateStructureRules } from "../src/core/rules/structure";
import { contextFixture } from "./context-cache-fixtures";
import { node, profile } from "./fixtures";

const solid = { type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 }, inferredVariableIds: [] };

function styleFixture() {
  const fixture = contextFixture(1, 3);
  const root = fixture.pages[0]!.children[0]!;
  const text = root.children[0]!;
  const style = { type: "TEXT", id: "S:body", key: "style-key", name: "Type/Body", remote: false, fontSize: 18,
    fontName: { family: "Inter", style: "Regular" }, letterSpacing: { unit: "PERCENT", value: 5 }, lineHeight: { unit: "PIXELS", value: 24 }, paragraphSpacing: 0, paragraphIndent: 0 };
  root.children.forEach((child) => { child.textStyleId = style.id; child.letterSpacing = { ...style.letterSpacing }; });
  Object.assign(fixture.figma, { getStyleByIdAsync: vi.fn(async () => style) });
  return { ...fixture, root, text, style };
}

describe("rendered property assessment", () => {
  it.each([
    ["absent", [], 1, 1],
    ["hidden", [{ ...solid, visible: false }], 1, 1],
    ["transparent paint", [{ ...solid, opacity: 0 }], 1, 1],
    ["transparent node", [solid], 1, 0],
    ["zero thickness", [solid], 0, 1],
  ] as const)("excludes %s strokes from debt and from binding credit", (_label, strokes, strokeWeight, opacity) => {
    const value = node({ fills: [], layout: undefined, strokes: [...strokes], strokeWeight, opacity, boundFields: ["strokes", "strokeWeight"], boundVariableIds: { strokeWeight: ["token"] } });
    expect(assessTokenProperty(value, "strokeWeight").eligible).toBe(false);
    expect(assessTokenProperty(value, "strokes").eligible).toBe(false);
    expect(bindingCoverage([value])).toEqual({ eligible: 0, bound: 0, coverage: 100 });
  });

  it("uses visible corners and side weights without pretending partial binding is complete", () => {
    const value = node({ fills: [], layout: undefined, strokes: [solid], strokeWeights: { top: 2, right: 1, bottom: 0, left: 1 },
      cornerRadii: { topLeft: 4, topRight: 8, bottomLeft: 0, bottomRight: 0 },
      boundFields: ["cornerRadius", "strokeWeight"], boundGeometryFields: ["topLeftRadius", "strokeTopWeight"] });
    expect(assessTokenProperty(value, "cornerRadius")).toMatchObject({ eligible: true, repairable: false, reason: "mixed" });
    expect(propertyBindingEvidence(value, "cornerRadius")).toBeUndefined();
    expect(propertyBindingEvidence(value, "strokeWeight")).toBeUndefined();
    value.boundGeometryFields?.push("topRightRadius", "strokeRightWeight", "strokeLeftWeight");
    expect(propertyBindingEvidence(value, "cornerRadius")).toBe("variable");
    expect(propertyBindingEvidence(value, "strokeWeight")).toBe("variable");
  });

  it("ignores inert radius metadata but retains clipping and mask boundaries", () => {
    const invisibleSurface = node({ fills: [], strokes: [], layout: undefined, cornerRadius: 8, boundFields: ["cornerRadius"] });
    expect(eligibleTokenFields(invisibleSurface)).toEqual([]);
    expect(eligibleTokenFields({ ...invisibleSurface, clipsContent: true })).toEqual(["cornerRadius"]);
    expect(eligibleTokenFields({ ...invisibleSurface, isMask: true })).toEqual(["cornerRadius"]);
  });

  it("rejects typography injected onto frames and mixed or percentage typography repairs", () => {
    const fakeText = { fontSize: 18, letterSpacingPx: 1, charactersLength: 1, contentHash: "text", backgroundResolvable: false };
    expect(assessTokenProperty(node({ text: fakeText }), "letterSpacing")).toMatchObject({ eligible: false, reason: "not-owner" });
    expect(assessTokenProperty(node({ type: "TEXT", text: { ...fakeText, mixedFields: ["fontSize"] } }), "fontSize")).toMatchObject({ eligible: false, reason: "mixed" });
    expect(assessTokenProperty(node({ type: "TEXT", text: { ...fakeText, letterSpacing: { unit: "PERCENT", value: 5 } } }), "letterSpacing")).toMatchObject({ eligible: true, repairable: false, reason: "unsupported-unit" });
  });
});

describe("live adapter to typography rules", () => {
  it.each([false, true])("counts resolved style control, preserves units and evaluates overrides (remote=%s)", async (remote) => {
    const f = styleFixture(); f.style.remote = remote;
    f.root.children[1]!.fontSize = 20;
    f.root.children[1]!.getStyledTextSegments = vi.fn(() => [{ textStyleOverrides: ["SEMANTIC_WEIGHT"] }]);
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => undefined, { contextCache: f.cache });
    const first = graph.nodes[f.text.id]!;
    const override = graph.nodes[f.root.children[1]!.id]!;
    expect(first.text?.style).toMatchObject({ status: "resolved", remote, controlledFields: expect.arrayContaining(["fontSize", "fontWeight", "letterSpacing", "lineHeight"]) });
    expect(first.text?.letterSpacing).toEqual({ unit: "PERCENT", value: 5 });
    expect(first.text?.letterSpacingPx).toBe(0.9);
    expect(first.boundFields).not.toContain("fontSize");
    expect(propertyBindingEvidence(first, "fontSize")).toBe("text-style");
    expect(override.text?.style).toMatchObject({ overriddenFields: expect.arrayContaining(["fontSize"]), explicitOverrideKinds: ["SEMANTIC_WEIGHT"] });
    expect(propertyBindingEvidence(override, "fontSize")).toBeUndefined();
    const findings = evaluateTokenRules(graph, f.readinessProfile, graph.nodes[f.root.id]!, Object.values(graph.nodes));
    expect(findings.some((finding) => finding.ruleId === "token.application.repeated-literal" && finding.evidence.measured.field === "fontFamily")).toBe(false);
  });

  it("does not invent ownership from Figma's non-text inferred payload", async () => {
    const f = contextFixture();
    f.setInference({ letterSpacing: [{ type: "VARIABLE_ALIAS", id: "var:tracking" }] } as unknown as SceneNode["inferredVariables"]);
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => undefined);
    expect(graph.nodes["root:0"]?.inferredBindings.letterSpacing).toBeUndefined();
    expect(graph.nodes["text:0:0"]?.inferredBindings.letterSpacing).toEqual(["var:tracking"]);
    expect(assessTokenProperty(graph.nodes["root:0"]!, "letterSpacing").eligible).toBe(false);
  });

  it("keeps unavailable or mixed styles out of scoring and automatic replacement", async () => {
    const f = styleFixture();
    Object.assign(f.figma, { getStyleByIdAsync: async () => null });
    const unavailable = await tokenPropertySnapshot(f.text as unknown as SceneNode);
    expect(unavailable.text?.style?.status).toBe("unavailable");
    expect(assessTokenProperty(unavailable, "fontSize")).toMatchObject({ eligible: false, repairable: false });
    f.text.textStyleId = f.figma.mixed;
    const mixed = await tokenPropertySnapshot(f.text as unknown as SceneNode);
    expect(mixed.text?.style?.status).toBe("mixed");
    expect(assessTokenProperty(mixed, "fontSize").eligible).toBe(false);
  });

  it("does not equate equal typography values expressed in different units", async () => {
    const f = styleFixture();
    f.text.letterSpacing = { unit: "PIXELS", value: 0.9 };
    const snapshot = await tokenPropertySnapshot(f.text as unknown as SceneNode);
    expect(snapshot.text?.style?.overriddenFields).toContain("letterSpacing");
    expect(propertyBindingEvidence(snapshot, "letterSpacing")).toBeUndefined();
  });

  it("invalidates style changes without document events and rehydrates style on persisted hits", async () => {
    const f = styleFixture();
    const first = await f.adapter.buildKnowledge(f.readinessProfile, () => undefined, { contextCache: f.cache });
    expect(await f.adapter.matchesVariableEnvironment()).toBe(true);
    f.style.fontSize = 20;
    expect(await f.adapter.matchesVariableEnvironment()).toBe(false);
    const reopened = new FigmaAdapter(); reopened.getCollectionOptions = async () => [];
    const second = await reopened.buildKnowledge(f.readinessProfile, () => undefined, { contextCache: f.cache });
    expect(second.diagnostics.reusedFragments).toBe(1);
    expect(second.graph.nodes[f.text.id]?.text?.style?.overriddenFields).toContain("fontSize");
    expect(second.graph.snapshotHash).not.toBe(first.graph.snapshotHash);
  });

  it("invalidates binding and mode changes that arrive without document events", async () => {
    const f = styleFixture();
    await f.adapter.buildKnowledge(f.readinessProfile, () => undefined);
    f.text.explicitVariableModes = { "collection:1": "mode:new" };
    expect(await f.adapter.matchesVariableEnvironment()).toBe(false);
  });

  it("invalidates changed naming confirmation metadata without invalidating guidance-only plugin data", async () => {
    const f = styleFixture();
    await f.adapter.buildKnowledge(f.readinessProfile, () => undefined);
    f.metadata.set(`${f.text.id}:verndaleAiReady:project-style-guide-binding-v1`, "guidance");
    expect(await f.adapter.matchesVariableEnvironment()).toBe(true);
    f.metadata.set(`${f.text.id}:verndaleAiReady:pattern-resolution-v1`, "changed confirmation");
    expect(await f.adapter.matchesVariableEnvironment()).toBe(false);
  });

  it("captures rendered instance descendants while preserving the original source ownership", async () => {
    const f = contextFixture(1, 3);
    const instance = f.pages[0]!.children[0]!;
    instance.type = "INSTANCE"; instance.overrides = [{ id: instance.id, overriddenFields: ["fills"] }]; instance.scaleFactor = 1;
    const decorative = instance.children[0]!; decorative.type = "RECTANGLE";
    const { graph } = await f.adapter.buildKnowledge(f.readinessProfile, () => undefined);
    const child = graph.nodes[instance.children[1]!.id]!;
    expect(child).toMatchObject({ rootId: instance.id, evidenceRole: "instance-descendant", owningInstanceId: instance.id });
    expect(child.parentId).toBe(instance.id);
    expect(graph.nodes[instance.id]?.childIds).toEqual(instance.children.slice(1).map((node) => node.id));
    expect(graph.nodes[decorative.id]).toBeUndefined();
    expect(bindingCoverage([child])).toEqual({ eligible: 0, bound: 0, coverage: 100 });
    expect(graph.nodes[instance.id]?.instance).toMatchObject({ mainComponentId: "main:1", overridesKnown: true, directOverrideFields: ["fills"], scaleFactor: 1 });
  });


  it("avoids inference bridge reads for rendering-only instance occurrences", async () => {
    const f = contextFixture(1, 10);
    const root = f.pages[0]!.children[0]!;
    root.type = "INSTANCE"; root.overrides = []; root.scaleFactor = 1;
    f.setInference({ fontSize: [{ type: "VARIABLE_ALIAS", id: "candidate" }] } as SceneNode["inferredVariables"]);
    const { graph, diagnostics } = await f.adapter.buildKnowledge(f.readinessProfile, () => undefined);
    // Previously all 11 nodes queried inferredVariables. The ten descendants
    // still have text/background evidence, but source debt needs one query.
    expect(f.counts.inferences).toBe(1);
    expect(diagnostics.inferenceNodes).toBe(1);
    for (const child of root.children) {
      expect(graph.nodes[child.id]?.inferredBindings).toEqual({});
      expect(graph.nodes[child.id]?.text?.charactersLength).toBeGreaterThan(0);
      expect(graph.nodes[child.id]?.evidenceRole).toBe("instance-descendant");
    }
  });

  it("skips fully evidenced typography and refreshes candidates when style control changes silently", async () => {
    const f = styleFixture();
    const paint = { id: "paint", key: "paint-key", name: "semantic/paint", variableCollectionId: "collection", resolvedType: "COLOR", remote: false, valuesByMode: { mode: { r: 1, g: 1, b: 1 } }, scopes: ["ALL_FILLS"], codeSyntax: {} };
    f.setVariables([paint as unknown as Variable]);
    f.setCollections([{ id: "collection", key: "collection-key", name: "Semantic", remote: false, modes: [{ modeId: "mode", name: "Default" }], defaultModeId: "mode", variableIds: [paint.id] } as unknown as VariableCollection]);
    for (const child of f.root.children) child.fills[0].boundVariables = { color: { type: "VARIABLE_ALIAS", id: "paint" } };
    f.setInference({ fontSize: [{ type: "VARIABLE_ALIAS", id: "candidate" }] } as SceneNode["inferredVariables"]);
    const p = profile({ ...f.readinessProfile, tokenSourceCollectionKeys: [] });
    const first = await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache });
    expect(f.counts.inferences).toBe(1); // source only; formerly four bridge reads
    expect(first.graph.nodes[f.text.id]?.inferredBindings).toEqual({});
    f.style.fontSize = 20; // same scene fields/id; its old 18px size is now an override
    const refreshed = await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache, dirtyNodeIds: [] });
    expect(refreshed.diagnostics.reusedNodes).toBe(4);
    expect(refreshed.diagnostics.inferenceNodes).toBe(3);
    expect(f.counts.inferences).toBe(4);
    expect(refreshed.graph.nodes[f.text.id]?.inferredBindings.fontSize).toEqual(["candidate"]);
    const full = await f.adapter.buildKnowledge(p, () => undefined, { forceFullCapture: true });
    expect(full.graph.snapshotHash).toBe(refreshed.graph.snapshotHash);
  });

  it("keeps guarded layout inference for a source with no uncovered token properties", async () => {
    const f = styleFixture();
    f.root.layoutMode = "NONE";
    for (const value of [f.root, ...f.root.children]) value.fills[0].boundVariables = { color: { type: "VARIABLE_ALIAS", id: "paint" } };
    let layoutReads = 0;
    Object.defineProperty(f.root, "inferredAutoLayout", { get: () => { layoutReads += 1; return {}; } });
    const { graph, diagnostics } = await f.adapter.buildKnowledge(f.readinessProfile, () => undefined);
    expect(f.counts.inferences).toBe(0);
    expect(layoutReads).toBe(1);
    expect(diagnostics.inferenceNodes).toBe(1);
    expect(evaluateStructureRules(graph.nodes[f.root.id]!, Object.values(graph.nodes)))
      .toContainEqual(expect.objectContaining({ ruleId: "structure.inferred-auto-layout", nodeId: f.root.id, fixability: "guarded" }));
  });

  it("blocks token creation when a repeated property has since become style-controlled", async () => {
    const f = styleFixture();
    Object.assign(f.figma, { getNodeByIdAsync: async (id: string) => f.root.children.find((child) => child.id === id), commitUndo: vi.fn() });
    Object.assign(f.figma.variables, { getVariableCollectionByIdAsync: async () => ({ id: "collection:1", remote: false }), createVariable: vi.fn() });
    await expect(createSemanticTokenAndBind({ collectionId: "collection:1", name: "semantic/type/body", field: "fontSize", nodeIds: f.root.children.map((child) => child.id), rawValue: 18 })).rejects.toThrow("no longer applicable");
    expect((f.figma.variables as unknown as { createVariable: ReturnType<typeof vi.fn> }).createVariable).not.toHaveBeenCalled();
  });

  it("refreshes one small component in a large Section while preserving paths, ownership and full-scan equivalence", async () => {
    const f = contextFixture(10, 5);
    const sources = f.pages.map((page) => page.children[0]!);
    const page = f.pages[0]!;
    const section = { ...sources[0]!, id: "section", type: "SECTION", name: "Components", visible: true, children: sources, parent: page };
    sources.forEach((source) => { source.parent = section; });
    page.children = [section];
    f.figma.root.children.splice(1);
    const p = profile({ ...f.readinessProfile, tokenSourceCollectionKeys: [] });
    const initial = await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache });
    expect(initial.graph.pages[0]?.rootNodeIds).toEqual(["section"]);
    expect(initial.diagnostics.capturedFragments).toBe(11);
    expect(Object.keys(initial.graph.nodes)).toHaveLength(61);
    const changed = sources[0]!.children[0]!;
    changed.fontSize = 20;
    const incremental = await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache, dirtyNodeIds: [changed.id] });
    const full = await f.adapter.buildKnowledge(p, () => undefined, { forceFullCapture: true });
    expect(incremental.diagnostics.capturedNodes).toBe(6);
    expect(incremental.diagnostics.reusedNodes).toBe(55);
    expect(incremental.diagnostics.inferenceNodes).toBe(6);
    expect(full.diagnostics.inferenceNodes).toBe(61);
    expect(incremental.graph.snapshotHash).toBe(full.graph.snapshotHash);
    expect(incremental.graph.nodes[changed.id]).toMatchObject({ rootId: "section", parentId: sources[0]!.id, path: "Page 0 / Components / Card / Heading" });

    // Renaming a Section changes every descendant path even if its own node
    // properties are unchanged; ancestor visibility also changes relevance.
    section.name = "Renamed components";
    section.visible = false;
    const renamed = await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache, dirtyNodeIds: [section.id] });
    const renamedFull = await f.adapter.buildKnowledge(p, () => undefined, { forceFullCapture: true });
    expect(renamed.graph.snapshotHash).toBe(renamedFull.graph.snapshotHash);
    expect(renamed.graph.nodes[changed.id]?.path).toContain("Renamed components");
    expect(renamed.graph.nodes[changed.id]?.renderVisible).toBe(false);
  });

  it("reuses unchanged session inference and matches forced-full capture after a localized edit", async () => {
    const f = contextFixture(2, 10);
    const p = profile({ ...f.readinessProfile, tokenSourceCollectionKeys: [] });
    await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache });
    f.pages[0]!.children[0]!.name = "Changed card";
    const incremental = await f.adapter.buildKnowledge(p, () => undefined, { contextCache: f.cache, dirtyNodeIds: ["root:0"] });
    const forced = await f.adapter.buildKnowledge(p, () => undefined, { forceFullCapture: true });
    expect(incremental.diagnostics.inferenceNodes).toBe(11);
    expect(forced.diagnostics.inferenceNodes).toBe(22);
    expect(incremental.graph.snapshotHash).toBe(forced.graph.snapshotHash);
  });
});

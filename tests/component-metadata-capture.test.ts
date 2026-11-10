import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { interactionState } from "../src/core/operations/interaction-state";
import { componentMetadataSnapshot } from "../src/figma/operations/component";
import { buildKnowledgeSummary } from "../src/plugin/knowledge-summary";
import { ContextStatusPanel } from "../src/ui/components/ContextStatusPanel";
import { PageExclusions } from "../src/ui/components/PageExclusions";
import { contextFixture } from "./context-cache-fixtures";

afterEach(() => { Reflect.deleteProperty(globalThis, "figma"); });
const build = (fixture: ReturnType<typeof contextFixture>, cache = true) => fixture.adapter.buildKnowledge(
  fixture.readinessProfile, () => undefined, cache ? { contextCache: fixture.cache } : { forceFullCapture: true },
);
const noop = () => undefined;

describe("unreadable component metadata", () => {
  it.each([true, false])("captures healthy nodes and later pages when instance properties throw (cache %s)", async (cache) => {
    const fixture = contextFixture(2);
    const instance = fixture.pages[0]!.children[0]!;
    instance.type = "INSTANCE";
    instance.name = "Disabled=true";
    Object.defineProperty(instance, "componentProperties", { get: () => { throw new Error("in get_componentProperties: Component set for node has existing errors"); } });
    const result = await build(fixture, cache);
    const captured = result.graph.nodes[instance.id]!;
    expect(result.graph).toMatchObject({ complete: true, loadedPageCount: 2 });
    expect(result.graph.nodes["text:0:0"]).toBeDefined();
    expect(result.graph.nodes["root:1"]).toBeDefined();
    expect(captured).toMatchObject({ unavailableComponentMetadata: ["componentProperties"], instance: { mainComponentId: "main:1" } });
    expect(captured.variantProperties).toBeUndefined();
    expect(captured.interactionProperties).toBeUndefined();
    expect(interactionState(result.graph, captured)).toMatchObject({ state: "unknown", evidence: [] });
    const summary = buildKnowledgeSummary(result.graph);
    expect(summary.unavailableComponentMetadataCount).toBe(1);
    const markup = renderToStaticMarkup(createElement(ContextStatusPanel, {
      status: { state: "current", knowledge: summary }, disabled: false, onGenerate: noop, onCancel: noop,
    }));
    expect(markup).toContain("Figma couldn’t read component properties on 1 layer.");
  });

  it("removes stale variant and interaction evidence and clears warnings after recovery", async () => {
    const fixture = contextFixture();
    const instance = fixture.pages[0]!.children[0]!;
    instance.type = "INSTANCE";
    let broken = false;
    let properties: InstanceNode["componentProperties"] = { State: { type: "VARIANT", value: "Disabled" } };
    Object.defineProperty(instance, "componentProperties", { get: () => {
      if (broken) throw new Error("Invalid component set");
      return properties;
    } });
    const healthy = await build(fixture);
    expect(healthy.graph.nodes[instance.id]?.variantProperties).toEqual({ State: "Disabled" });
    expect(await fixture.adapter.matchesVariableEnvironment()).toBe(true);
    broken = true;
    expect(await fixture.adapter.matchesVariableEnvironment()).toBe(false);
    await build(fixture);
    const reused = await build(fixture);
    expect(reused.diagnostics.reusedFragments).toBeGreaterThan(0);
    expect(reused.graph.nodes[instance.id]?.unavailableComponentMetadata).toEqual(["componentProperties"]);
    expect(reused.graph.nodes[instance.id]?.variantProperties).toBeUndefined();
    expect(reused.graph.nodes[instance.id]?.interactionProperties).toBeUndefined();
    const full = await build(fixture, false);
    expect(reused.graph.snapshotHash).toBe(full.graph.snapshotHash);
    broken = false;
    properties = {};
    expect(await fixture.adapter.matchesVariableEnvironment()).toBe(false);
    const recovered = await build(fixture);
    expect(recovered.graph.nodes[instance.id]?.unavailableComponentMetadata).toBeUndefined();
    expect(recovered.graph.nodes[instance.id]?.variantProperties).toBeUndefined();
    expect(buildKnowledgeSummary(recovered.graph).unavailableComponentMetadataCount).toBe(0);
    expect(await fixture.adapter.matchesVariableEnvironment()).toBe(true);
    // Capturing a broken successor must not mutate the previously accepted graph.
    expect(healthy.graph.nodes[instance.id]?.variantProperties).toEqual({ State: "Disabled" });
  });

  it.each(["COMPONENT", "COMPONENT_SET"])("preserves %s identity when definitions throw", async (type) => {
    const fixture = contextFixture(2);
    const root = fixture.pages[0]!.children[0]!;
    root.type = type;
    Object.defineProperty(root, "componentPropertyDefinitions", { get: () => { throw new Error("Invalid definitions"); } });
    const result = await build(fixture);
    expect(result.graph.complete).toBe(true);
    expect(result.graph.componentIds).toContain(root.id);
    expect(result.graph.nodes[root.id]).toMatchObject({
      unavailableComponentMetadata: ["componentPropertyDefinitions"],
      component: { kind: type === "COMPONENT" ? "component" : "component-set", propertyDefinitions: [] },
    });
    expect(result.graph.nodes["root:1"]).toBeDefined();
  });

  it("keeps known Boolean values while marking unreadable variant assignments as unknown", () => {
    const fixture = contextFixture();
    const root = fixture.pages[0]!.children[0]!;
    root.type = "COMPONENT";
    root.componentPropertyDefinitions = { "Disabled#1:2": { type: "BOOLEAN", defaultValue: true } };
    Object.defineProperty(root, "variantProperties", { get: () => { throw new Error("Invalid variants"); } });
    const metadata = componentMetadataSnapshot(root as unknown as SceneNode);
    expect(metadata).toMatchObject({ interactionProperties: { "Disabled#1:2": "true" }, unavailableComponentMetadata: ["variantProperties"] });
    expect(metadata.variantProperties).toBeUndefined();
  });

  it("does not access definitions on component-set children", () => {
    const fixture = contextFixture();
    const root = fixture.pages[0]!.children[0]!;
    root.type = "COMPONENT";
    root.parent = { type: "COMPONENT_SET" };
    root.variantProperties = { State: "Disabled" };
    Object.defineProperty(root, "componentPropertyDefinitions", { get: () => { throw new Error("Forbidden"); } });
    expect(componentMetadataSnapshot(root as unknown as SceneNode)).toMatchObject({
      variantProperties: { State: "Disabled" }, interactionProperties: { State: "Disabled" },
    });
    expect(componentMetadataSnapshot(root as unknown as SceneNode).unavailableComponentMetadata).toBeUndefined();
  });
});

describe("page exclusion capabilities", () => {
  const props = { pages: [{ id: "page:0", name: "UX Roadmap" }], excluded: [], disabled: false, dirty: true, onChange: noop, onConfirm: noop };
  it("explains disabled controls in Dev Mode", () => {
    const markup = renderToStaticMarkup(createElement(PageExclusions, { ...props, canMutateDocument: false }));
    expect(markup).toContain("Switch to Design mode to change skipped pages.");
    expect(markup).toMatch(/type="checkbox"[^>]*disabled=""/);
    expect(markup).toMatch(/<button[^>]*disabled=""/);
  });
  it("keeps exclusions available before context exists in Design mode", () => {
    const markup = renderToStaticMarkup(createElement(PageExclusions, { ...props, canMutateDocument: true }));
    expect(markup).not.toContain("disabled=\"\"");
    expect(markup).toContain("Confirmed skips are excluded from context.");
  });
  it("keeps controls locked during capture without a misleading mode warning", () => {
    const markup = renderToStaticMarkup(createElement(PageExclusions, { ...props, disabled: true, canMutateDocument: true }));
    expect(markup).toMatch(/type="checkbox"[^>]*disabled=""/);
    expect(markup).not.toContain("Switch to Design mode");
  });
});

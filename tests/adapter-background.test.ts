import { describe, expect, it } from "vitest";
import { effectSnapshots, resolveTextBackground } from "../src/figma/adapter";

const white = { type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } };
const black = { type: "SOLID", visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } };

describe("text background resolution", () => {
  it("does not treat a component-set canvas as the runtime backdrop", () => {
    const componentSet = { type: "COMPONENT_SET", fills: [white], opacity: 1, parent: { type: "PAGE" } };
    const component = { type: "COMPONENT", fills: [], opacity: 1, parent: componentSet };
    const text = { type: "TEXT", fills: [black], parent: component } as unknown as TextNode;

    expect(resolveTextBackground(text)).toMatchObject({ resolvable: false, reason: expect.stringContaining("consumer background") });
  });

  it("uses a solid surface inside the component boundary", () => {
    const component = { type: "COMPONENT", fills: [], opacity: 1, parent: { type: "COMPONENT_SET", fills: [white], opacity: 1 } };
    const surface = { type: "FRAME", fills: [black], opacity: 1, parent: component };
    const text = { type: "TEXT", fills: [white], parent: surface } as unknown as TextNode;

    expect(resolveTextBackground(text)).toMatchObject({
      color: { r: 0, g: 0, b: 0, a: 1 },
      resolvable: true,
    });
  });
});

describe("effect token evidence", () => {
  it("counts every visible effect subfield controlled by a published style as bound", () => {
    const node = {
      effectStyleId: "S:shadow-overlay",
      effects: [{
        type: "DROP_SHADOW",
        visible: true,
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        radius: 16,
        spread: 2,
        offset: { x: 0, y: 4 },
      }],
    } as unknown as SceneNode;

    expect(effectSnapshots(node)[0]).toMatchObject({
      eligibleFieldCount: 5,
      boundFieldCount: 5,
      boundVariableIds: [],
    });
  });

  it("still counts only explicit variable bindings for unstyled effects", () => {
    const node = {
      effectStyleId: "",
      effects: [{
        type: "DROP_SHADOW",
        visible: true,
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        radius: 16,
        spread: 2,
        offset: { x: 0, y: 4 },
        boundVariables: { radius: { type: "VARIABLE_ALIAS", id: "radius:1" } },
      }],
    } as unknown as SceneNode;

    expect(effectSnapshots(node)[0]).toMatchObject({
      eligibleFieldCount: 5,
      boundFieldCount: 1,
      boundVariableIds: ["radius:1"],
    });
  });
});

function renderTree(options: { surfaceFills?: unknown[]; surfaceOpacity?: number; instance?: boolean; definition?: boolean } = {}) {
  const page = { id: "page", type: "PAGE", parent: null };
  const screen = { id: "screen", type: "FRAME", fills: [white], opacity: 1, visible: true, parent: page, children: [] as unknown[], absoluteBoundingBox: { x: 0, y: 0, width: 1000, height: 1000 } };
  const surface = { id: "surface", type: options.definition ? "COMPONENT" : options.instance ? "INSTANCE" : "FRAME", fills: options.surfaceFills ?? [], opacity: options.surfaceOpacity ?? 1, visible: true, parent: screen, children: [] as unknown[], absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 } };
  const text = { id: "text", type: "TEXT", fills: [black], opacity: 1, visible: true, parent: surface, absoluteBoundingBox: { x: 20, y: 20, width: 100, height: 20 } };
  screen.children.push(surface);
  surface.children.push(text);
  return { screen, surface, text: text as unknown as TextNode };
}

describe("rendered contrast stack", () => {
  it("resolves a transparent placed instance against its actual screen", () => {
    const { text } = renderTree({ instance: true });
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: true, color: { r: 1, g: 1, b: 1, a: 1 }, foregroundColor: { r: 0, g: 0, b: 0, a: 1 }, sourceNodeIds: ["screen"] });
  });

  it("does not resolve a transparent definition using its authoring placement", () => {
    const { text } = renderTree({ definition: true });
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: false, sourceNodeIds: [] });
  });

  it("composites translucent backgrounds in paint order", () => {
    const { text } = renderTree({ surfaceFills: [{ ...black, opacity: 0.5 }, white] });
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: true, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, sourceNodeIds: ["surface", "screen"] });
  });

  it("applies ancestor opacity to both the text and background pixels", () => {
    const { text } = renderTree({ surfaceFills: [black], surfaceOpacity: 0.5 });
    (text as unknown as { fills: unknown[] }).fills = [white];
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: true, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, foregroundColor: { r: 1, g: 1, b: 1, a: 1 } });
  });

  it("requires review when all ancestors remain translucent", () => {
    const { text, screen } = renderTree({ surfaceFills: [{ ...black, opacity: 0.5 }] });
    screen.fills = [];
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: false, reason: expect.stringContaining("No opaque") });
  });

  it.each([
    ["gradient", [{ type: "GRADIENT_LINEAR", opacity: 1 }]],
    ["image", [{ type: "IMAGE", opacity: 1 }]],
    ["blend", [{ ...white, blendMode: "MULTIPLY" }]],
  ])("requires review for %s backgrounds", (_label, fills) => {
    expect(resolveTextBackground(renderTree({ surfaceFills: fills as unknown[] }).text)).toMatchObject({ resolvable: false });
  });

  it("requires review for overlapping sibling content and masks", () => {
    const { text, surface } = renderTree();
    surface.children.unshift({ id: "image", type: "RECTANGLE", visible: true, opacity: 1, fills: [white], absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 100 } });
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: false, reason: expect.stringContaining("Overlapping") });
  });

  it("ignores distant siblings but does not ignore a hidden ancestor", () => {
    const { text, surface } = renderTree();
    surface.children.push({ id: "decoration", type: "RECTANGLE", visible: true, opacity: 1, fills: [white], absoluteBoundingBox: { x: 300, y: 300, width: 100, height: 100 } });
    expect(resolveTextBackground(text).resolvable).toBe(true);
    surface.visible = false;
    expect(resolveTextBackground(text).resolvable).toBe(false);
  });
});

describe("surface geometry", () => {
  it("reviews text that intersects an ancestor rounded corner", () => {
    const { text, surface } = renderTree({ surfaceFills: [white] });
    Object.assign(surface, { topLeftRadius: 30, topRightRadius: 30, bottomLeftRadius: 30, bottomRightRadius: 30 });
    expect(resolveTextBackground(text)).toMatchObject({ resolvable: false, reason: expect.stringContaining("uniformly cover") });
    Object.assign(text, { absoluteBoundingBox: { x: 50, y: 50, width: 100, height: 20 } });
    expect(resolveTextBackground(text).resolvable).toBe(true);
  });
});

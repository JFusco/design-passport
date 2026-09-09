import { describe, expect, it } from "vitest";
import { effectSnapshots, resolveTextBackground } from "../src/figma/adapter";

const white = { type: "SOLID", visible: true, opacity: 1, color: { r: 1, g: 1, b: 1 } };
const black = { type: "SOLID", visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } };

describe("text background resolution", () => {
  it("does not treat a component-set canvas as the runtime backdrop", () => {
    const componentSet = { type: "COMPONENT_SET", fills: [white], opacity: 1, parent: { type: "PAGE" } };
    const component = { type: "COMPONENT", fills: [], opacity: 1, parent: componentSet };
    const text = { type: "TEXT", parent: component } as unknown as TextNode;

    expect(resolveTextBackground(text)).toEqual({ resolvable: false });
  });

  it("uses a solid surface inside the component boundary", () => {
    const component = { type: "COMPONENT", fills: [], opacity: 1, parent: { type: "COMPONENT_SET", fills: [white], opacity: 1 } };
    const surface = { type: "FRAME", fills: [black], opacity: 1, parent: component };
    const text = { type: "TEXT", parent: surface } as unknown as TextNode;

    expect(resolveTextBackground(text)).toEqual({
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

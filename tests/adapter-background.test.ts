import { describe, expect, it } from "vitest";
import { resolveTextBackground } from "../src/figma/adapter";

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

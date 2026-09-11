import { describe, expect, it } from "vitest";
import { utf8ByteLength } from "../src/core/stable";

describe("portable UTF-8 sizing", () => {
  it("counts ASCII, multibyte characters, surrogate pairs, and malformed surrogates", () => {
    expect(utf8ByteLength("passport")).toBe(8);
    expect(utf8ByteLength("café")).toBe(5);
    expect(utf8ByteLength("🎨")).toBe(4);
    expect(utf8ByteLength("\ud800")).toBe(3);
  });

  it("enforces byte limits rather than UTF-16 string length", () => {
    expect(utf8ByteLength("🎨".repeat(22_500))).toBe(90_000);
    expect(utf8ByteLength(`🎨${"a".repeat(89_997)}`)).toBe(90_001);
  });
});

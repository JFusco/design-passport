import { describe, expect, it } from "vitest";
import { isWaiverReasonValid } from "../src/ui/operations/waivers";

describe("waiver form", () => {
  it.each(["", "   ", "\n\t"])("rejects a blank reason", (reason) => {
    expect(isWaiverReasonValid(reason)).toBe(false);
  });

  it("accepts a documented exception", () => {
    expect(isWaiverReasonValid("Legacy component approved through Q4")).toBe(true);
  });
});

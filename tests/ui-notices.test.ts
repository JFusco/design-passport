import { describe, expect, it } from "vitest";
import { codeConnectImportFeedback } from "../src/ui/operations/notices";

describe("Code Connect import feedback", () => {
  it("reports a successful singular import", () => {
    expect(codeConnectImportFeedback(1, [])).toEqual({
      tone: "success",
      message: "Accepted 1 Code Connect entry; rejected 0.",
    });
  });

  it("makes a wholly rejected import actionable", () => {
    expect(codeConnectImportFeedback(0, [{ index: 0, reason: "figmaNode does not exist" }])).toEqual({
      tone: "error",
      message: "Accepted 0 Code Connect entries; rejected 1. Entry 1: figmaNode does not exist",
    });
  });

  it("preserves a partial success while explaining the first rejection", () => {
    expect(codeConnectImportFeedback(2, [
      { index: 3, reason: "figmaNode references another file" },
      { index: 4, reason: "figmaNode does not exist" },
    ])).toEqual({
      tone: "success",
      message: "Accepted 2 Code Connect entries; rejected 2. Entry 4: figmaNode references another file",
    });
  });
});

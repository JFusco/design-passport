import { describe, expect, it } from "vitest";
import { pluginMessageForError, ScanCancelledError } from "../src/plugin/scan-errors";

describe("plugin error presentation", () => {
  it("treats an intentional audit cancellation as a recoverable state", () => {
    expect(pluginMessageForError(new ScanCancelledError())).toEqual({ type: "scan-cancelled" });
  });

  it("preserves actionable messages for real errors", () => {
    expect(pluginMessageForError(new Error("Profile is invalid"))).toEqual({
      type: "error",
      message: "Profile is invalid",
    });
  });

  it("normalizes non-Error failures", () => {
    expect(pluginMessageForError("Unknown failure")).toEqual({
      type: "error",
      message: "Unknown failure",
    });
  });
});

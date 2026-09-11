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

  it("turns pack validation details into designer-facing recovery guidance", () => {
    expect(pluginMessageForError(new Error("design-reference-pack failed JSON Schema validation: / must have required property 'source'"))).toEqual({
      type: "error",
      message: "This file is not a valid Design Passport guide. Export a fresh pack from the local companion and try again.",
    });
    expect(pluginMessageForError(new Error("Reference pack digest does not match its contents"))).toEqual({
      type: "error",
      message: "This pack changed after it was exported. Generate a fresh pack from the local companion and try again.",
    });
    expect(pluginMessageForError(new Error("This review does not contain actionable learnings to contribute"))).toEqual({
      type: "error",
      message: "There are no actionable learnings to contribute from this review. Make or resolve a finding, then rescan before contributing.",
    });
  });
});

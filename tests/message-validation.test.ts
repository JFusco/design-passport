import { describe, expect, it } from "vitest";
import { parseUiMessage } from "../src/plugin/message-validation";
import { profile } from "./fixtures";

describe("UI message validation", () => {
  it("accepts source-frame and component certification requests", () => {
    expect(parseUiMessage({ type: "certify" })).toEqual({ type: "certify" });
    expect(parseUiMessage({ type: "certify-components" })).toEqual({ type: "certify-components" });
  });

  it("accepts a bounded, distinct apply-all request", () => {
    expect(parseUiMessage({ type: "apply-all", planIds: ["low", "guarded"], undoOnlyAcknowledged: false })).toEqual({
      type: "apply-all",
      planIds: ["low", "guarded"],
      undoOnlyAcknowledged: false,
    });
  });

  it.each([
    { type: "apply-all", planIds: [], undoOnlyAcknowledged: false },
    { type: "apply-all", planIds: ["same", "same"], undoOnlyAcknowledged: false },
    { type: "apply-all", planIds: Array.from({ length: 101 }, (_, index) => `p${index}`), undoOnlyAcknowledged: false },
    { type: "apply-all", planIds: ["one"], undoOnlyAcknowledged: "yes" },
  ])("rejects malformed bulk cleanup message", (message) => {
    expect(() => parseUiMessage(message)).toThrow();
  });

  it("requires a schema-valid profile for scans", () => {
    expect(parseUiMessage({ type: "scan", request: { scope: "selection", profile: profile(), refreshKnowledge: true } })).toMatchObject({ type: "scan" });
    expect(parseUiMessage({ type: "refresh-audit", profile: profile() })).toMatchObject({ type: "refresh-audit" });
    expect(() => parseUiMessage({ type: "scan", request: { scope: "selection", profile: {}, refreshKnowledge: true } })).toThrow("profile is invalid");
    expect(() => parseUiMessage({ type: "refresh-audit", profile: {} })).toThrow("profile is invalid");
  });

  it("rejects malformed or unsafe token creation payloads", () => {
    const valid = { type: "create-token", collectionId: "collection:1", name: "semantic/space/gap", field: "itemSpacing", nodeIds: ["1", "2", "3"], rawValue: 16 };
    expect(parseUiMessage(valid)).toEqual(valid);
    expect(() => parseUiMessage({ ...valid, field: "prototype" })).toThrow("token field is invalid");
    expect(() => parseUiMessage({ ...valid, nodeIds: ["1", "1", "2"] })).toThrow("distinct");
    expect(() => parseUiMessage({ ...valid, rawValue: Number.POSITIVE_INFINITY })).toThrow("finite JSON");
  });

  it("accepts bounded guidance and contribution commands", () => {
    expect(parseUiMessage({ type: "import-project-style-guide", raw: "{}" })).toEqual({ type: "import-project-style-guide", raw: "{}" });
    expect(parseUiMessage({ type: "add-session-reference", raw: "{}" })).toEqual({ type: "add-session-reference", raw: "{}" });
    expect(parseUiMessage({ type: "remove-project-style-guide" })).toEqual({ type: "remove-project-style-guide" });
    expect(parseUiMessage({ type: "clear-session-references" })).toEqual({ type: "clear-session-references" });
    expect(parseUiMessage({ type: "preview-contribution" })).toEqual({ type: "preview-contribution" });
    expect(parseUiMessage({ type: "export-contribution", digest: "h53:00112233445566" })).toEqual({ type: "export-contribution", digest: "h53:00112233445566" });
    expect(() => parseUiMessage({ type: "add-session-reference", raw: "x".repeat(90_001) })).toThrow(/90 KB/i);
  });
});

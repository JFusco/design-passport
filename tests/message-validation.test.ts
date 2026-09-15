import { describe, expect, it } from "vitest";
import { parseUiMessage } from "../src/plugin/message-validation";

describe("UI message validation", () => {
  it("accepts explicit recheck modes and rejects missing or contradictory target IDs", () => {
    for (const request of [{ mode: "changes" }, { mode: "full" }, { mode: "component", componentId: "1:2" }, { mode: "issue", issueId: "issue:1" }]) {
      expect(parseUiMessage({ type: "recheck-audit", request })).toEqual({ type: "recheck-audit", request });
    }
    for (const request of [{ mode: "component" }, { mode: "issue", issueId: "" }, { mode: "changes", componentId: "1:2" }, { mode: "issue", issueId: "valid", componentId: "1:2" }, { mode: "unknown" }]) {
      expect(() => parseUiMessage({ type: "recheck-audit", request })).toThrow();
    }
  });
  it("accepts 65 distinct page IDs and rejects empty, duplicate, or excessive batches", () => {
    const pageIds = Array.from({ length: 65 }, (_, index) => `page:${index}`);
    expect(parseUiMessage({ type: "audit-pages", pageIds })).toEqual({ type: "audit-pages", pageIds });
    for (const invalid of [[], ["one", "one"], [null], ["x".repeat(201)], Array.from({ length: 1_001 }, (_, index) => String(index))]) {
      expect(() => parseUiMessage({ type: "audit-pages", pageIds: invalid })).toThrow();
    }
  });

  it("accepts saved-result commands while restricting persisted state to bounded presentation preferences", () => {
    for (const type of ["open-saved-audit", "forget-saved-audit"]) {
      expect(parseUiMessage({ type, id: "audit:1" })).toEqual({ type, id: "audit:1" });
      expect(() => parseUiMessage({ type, id: "" })).toThrow();
    }
    expect(parseUiMessage({ type: "clear-file-cache" })).toEqual({ type: "clear-file-cache" });
    const viewState = { activeTab: "findings", showPassing: false, axisFilter: "all", pageFilter: "all", rootFilter: "all", variantFilter: "all", expanded: "finding:1" };
    expect(parseUiMessage({ type: "save-audit-view", id: "audit:1", viewState })).toEqual({ type: "save-audit-view", id: "audit:1", viewState });
    for (const invalid of [{ ...viewState, profile: {} }, { ...viewState, expanded: "x".repeat(1_001) }, { ...viewState, activeTab: "unknown" }]) {
      expect(() => parseUiMessage({ type: "save-audit-view", id: "audit:1", viewState: invalid })).toThrow();
    }
  });

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

  it("accepts only scan scope and knowledge-refresh intent", () => {
    expect(parseUiMessage({ type: "scan", request: { scope: "selection", refreshKnowledge: true } })).toEqual({
      type: "scan",
      request: { scope: "selection", refreshKnowledge: true },
    });
    expect(parseUiMessage({ type: "refresh-audit" })).toEqual({ type: "refresh-audit" });
    expect(() => parseUiMessage({ type: "scan", request: { scope: "selection", profile: {}, refreshKnowledge: true } })).toThrow("scan request is invalid");
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

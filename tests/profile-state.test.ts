import { describe, expect, it } from "vitest";
import { discardProfileDraft, profileDraftState } from "../src/ui/operations/profile-state";
import { profile } from "./fixtures";

const pages = ["page:1", "page:components"];

describe("profile draft state", () => {
  it("blocks both valid and invalid unsaved drafts without changing the committed profile", () => {
    const committed = profile();
    const validDraft = profile({ tokenSourceCollectionKeys: ["collection:other"] });
    const valid = profileDraftState({ committed, draft: validDraft, configured: true, profileIssues: [], pageIds: pages });
    expect(valid).toMatchObject({ dirty: true, semanticErrors: [], blocked: true });
    expect(committed.tokenSourceCollectionKeys).toEqual(["collection:key"]);

    const invalidDraft = profile({ pageRoles: { ...committed.pageRoles, screens: { pageIds: [], externalLibraryKeys: [] } } });
    const invalid = profileDraftState({ committed, draft: invalidDraft, configured: true, profileIssues: [], pageIds: pages });
    expect(invalid.dirty).toBe(true);
    expect(invalid.blocked).toBe(true);
    expect(invalid.semanticErrors).toContain("A product profile requires at least one local Screens page");
  });

  it("allows a usable automatic or saved setup and blocks only an unresolved setup", () => {
    const committed = profile();
    expect(profileDraftState({ committed, draft: profile(), configured: true, profileIssues: [], pageIds: pages }).blocked).toBe(false);
    expect(profileDraftState({ committed, draft: profile(), configured: false, profileIssues: [], pageIds: pages }).blocked).toBe(true);
  });

  it("discards to committed state or resets an unconfigured file to suggestions", () => {
    const committed = profile();
    const suggestion = profile({ artifactKind: "library", pageRoles: {
      foundations: { pageIds: [], externalLibraryKeys: [] },
      components: { pageIds: ["page:components"], externalLibraryKeys: [] },
      screens: { pageIds: [], externalLibraryKeys: [] },
    } });
    expect(discardProfileDraft(committed, suggestion, true)).toEqual(committed);
    expect(discardProfileDraft(committed, suggestion, false)).toEqual(suggestion);
    expect(discardProfileDraft(committed, suggestion, false)).not.toBe(suggestion);
  });

  it("keeps reconciliation issues blocking until an explicit save confirms them", () => {
    const committed = profile();
    const state = profileDraftState({
      committed,
      draft: profile(),
      configured: false,
      profileIssues: ["Mapped pages were removed because they no longer exist: deleted."],
      pageIds: pages,
    });
    expect(state).toMatchObject({ dirty: false, blocked: true });
    expect(state.issues).toHaveLength(1);
  });
});

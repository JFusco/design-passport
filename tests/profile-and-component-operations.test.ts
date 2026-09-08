import { describe, expect, it } from "vitest";
import { inferProfileFromPages } from "../src/core/profile-inference";
import { canReadComponentPropertyDefinitions } from "../src/figma/operations/component";

describe("profile and component operations", () => {
  it("infers a library profile when it finds foundations/components but no screens", () => {
    const result = inferProfileFromPages([
      { id: "foundation", name: "01 Foundations" },
      { id: "components", name: "Main Component Library" },
    ]);
    expect(result.artifactKind).toBe("library");
    expect(result.pageRoles.foundations.pageIds).toEqual(["foundation"]);
    expect(result.pageRoles.components.pageIds).toEqual(["components"]);
    expect(result.pageRoles.screens.pageIds).toEqual([]);
  });

  it("keeps product mode when a screen page is present and leaves unknown pages unmapped", () => {
    const result = inferProfileFromPages([
      { id: "screens", name: "Product Screens" },
      { id: "notes", name: "Archive and notes" },
    ]);
    expect(result.artifactKind).toBe("product");
    expect(result.pageRoles.screens.pageIds).toEqual(["screens"]);
    expect(Object.values(result.pageRoles).flatMap((role) => role.pageIds)).not.toContain("notes");
  });

  it("never reads property definitions from a component variant", () => {
    expect(canReadComponentPropertyDefinitions("COMPONENT", "COMPONENT_SET")).toBe(false);
    expect(canReadComponentPropertyDefinitions("COMPONENT", "FRAME")).toBe(true);
    expect(canReadComponentPropertyDefinitions("COMPONENT_SET", "PAGE")).toBe(true);
  });
});

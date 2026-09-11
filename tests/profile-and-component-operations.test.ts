import { describe, expect, it } from "vitest";
import { sourceFrameIds } from "../src/core/operations/graph";
import { inferProfileFromPages } from "../src/core/profile-inference";
import { profileSemanticErrors, reconcileProfilePages } from "../src/core/profile";
import { canReadComponentPropertyDefinitions } from "../src/figma/operations/component";
import { node, profile } from "./fixtures";

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

  it("maps component pages inside a deterministic section and skips navigation pages", () => {
    const result = inferProfileFromPages([
      { id: "cover", name: "👀 Cover" },
      { id: "catalog", name: "📚 Component Catalog" },
      { id: "marker", name: "❖ Components" },
      { id: "button", name: "Button — Light" },
      { id: "card", name: "Card" },
      { id: "divider", name: "---" },
      { id: "archive", name: "💀 Archive" },
    ]);
    expect(result.artifactKind).toBe("library");
    expect(result.pageRoles.components.pageIds).toEqual(["button", "card"]);
    expect(Object.values(result.pageRoles).flatMap((role) => role.pageIds)).not.toEqual(expect.arrayContaining(["cover", "catalog", "marker", "archive"]));
  });

  it("suggests local Semantic collections but never enabled-library collections", () => {
    const result = inferProfileFromPages(
      [{ id: "components", name: "Main Component Library" }],
      [
        { key: "semantic-colors", name: "Semantic Colors" },
        { key: "semantic-remote", name: "Semantic Remote", remote: true },
        { key: "primitives", name: "Primitives" },
      ],
    );
    expect(result.tokenSourceCollectionKeys).toEqual(["semantic-colors"]);
  });

  it("strips deleted page mappings and requires the reconciled product profile to be confirmed", () => {
    const configured = profile({
      pageRoles: {
        foundations: { pageIds: ["foundation", "deleted"], externalLibraryKeys: ["foundation:key"] },
        components: { pageIds: ["components"], externalLibraryKeys: ["components:key"] },
        screens: { pageIds: ["deleted"], externalLibraryKeys: [] },
      },
    });
    const result = reconcileProfilePages(configured, new Set(["foundation", "components"]));
    expect(result.removedPageIds).toEqual(["deleted"]);
    expect(result.profile.pageRoles).toEqual({
      foundations: { pageIds: ["foundation"], externalLibraryKeys: ["foundation:key"] },
      components: { pageIds: ["components"], externalLibraryKeys: ["components:key"] },
      screens: { pageIds: [], externalLibraryKeys: [] },
    });
    expect(profileSemanticErrors(result.profile, new Set(["foundation", "components"]))).toContain("A product profile requires at least one local Screens page");
  });

  it("never reads property definitions from a component variant", () => {
    expect(canReadComponentPropertyDefinitions("COMPONENT", "COMPONENT_SET")).toBe(false);
    expect(canReadComponentPropertyDefinitions("COMPONENT", "FRAME")).toBe(true);
    expect(canReadComponentPropertyDefinitions("COMPONENT_SET", "PAGE")).toBe(true);
  });

  it("keeps intentional library sources while excluding published-source scaffolding", () => {
    const p = profile({
      artifactKind: "library",
      pageRoles: {
        foundations: { pageIds: ["page:foundations"], externalLibraryKeys: [] },
        components: { pageIds: ["page:components"], externalLibraryKeys: [] },
        screens: { pageIds: ["page:screens"], externalLibraryKeys: [] },
      },
    });
    const values = [
      node({ id: "foundation", pageId: "page:foundations", parentId: "page:foundations", name: "Foundations" }),
      node({ id: "screen", pageId: "page:screens", parentId: "page:screens", name: "Checkout / Desktop" }),
      node({ id: "ready-section", pageId: "page:components", parentId: "page:components", name: "Delivery", type: "SECTION", childIds: ["ready-frame"], devStatus: "READY_FOR_DEV" }),
      node({ id: "ready-frame", pageId: "page:components", parentId: "ready-section", name: "Documentation / Button" }),
      node({ id: "fallback-section", pageId: "page:components", parentId: "page:components", name: "✅ Ready for Dev / Specimens", type: "SECTION", childIds: ["fallback-frame"] }),
      node({ id: "fallback-frame", pageId: "page:components", parentId: "fallback-section", name: "Composition specimens / Card" }),
      node({ id: "marked-section", pageId: "page:components", parentId: "page:components", name: "API examples", type: "SECTION", childIds: ["marked-frame", "resource-frame"] }),
      node({ id: "marked-frame", pageId: "page:components", parentId: "marked-section", name: "Consumable example", sourceMarked: true }),
      node({ id: "resource-frame", pageId: "page:components", parentId: "marked-section", name: "Linked example", devResourceCount: 1 }),
      node({ id: "published-section", pageId: "page:components", parentId: "page:components", name: "Published source / Button", type: "SECTION", childIds: ["helper-frame", "certified-frame"] }),
      node({ id: "helper-frame", pageId: "page:components", parentId: "published-section", name: "Variant label / Size / Large", sourceMarked: true }),
      node({
        id: "certified-frame",
        pageId: "page:components",
        parentId: "published-section",
        name: "Intentional published artifact",
        certification: {
          schemaVersion: 1,
          grade: "B",
          score: 85,
          rulesetVersion: "1.0.0-beta.1",
          catalogVersion: "1.17.0",
          certifiedAt: "2026-09-09T12:00:00.000Z",
          snapshotHash: "snapshot",
          knowledgeSnapshotHash: "knowledge",
        },
      }),
      node({ id: "generic-section", pageId: "page:components", parentId: "page:components", name: "Canvas helpers", type: "SECTION", childIds: ["generic-helper"] }),
      node({ id: "generic-helper", pageId: "page:components", parentId: "generic-section", name: "Spacing ruler", devResourceCount: 0 }),
      node({ id: "direct-helper", pageId: "page:components", parentId: "page:components", name: "Canvas note", devResourceCount: 0 }),
      node({ id: "component-set", pageId: "page:components", parentId: "page:components", name: "Button", type: "COMPONENT_SET", childIds: ["variant"] }),
      node({ id: "variant", pageId: "page:components", parentId: "component-set", name: "Size=Large", type: "COMPONENT" }),
      node({ id: "standalone-component", pageId: "page:components", parentId: "page:components", name: "Logo", type: "COMPONENT" }),
    ];
    const nodes = Object.fromEntries(values.map((value) => [value.id, value]));

    expect(sourceFrameIds({ pages: [], nodes }, p)).toEqual([
      "certified-frame",
      "component-set",
      "fallback-frame",
      "foundation",
      "marked-frame",
      "ready-frame",
      "resource-frame",
      "screen",
      "standalone-component",
    ]);
  });
});

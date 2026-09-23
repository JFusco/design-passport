import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";
import developmentManifest from "../development/manifest.json";

describe("Figma manifest", () => {
  it("supports Design and Dev Mode with the required private-plugin capabilities", () => {
    expect(manifest.name).toBe("Design Passport");
    expect(manifest.editorType).toEqual(["figma", "dev"]);
    expect(manifest.capabilities).toEqual(["inspect"]);
    expect(manifest.documentAccess).toBe("dynamic-page");
    expect(manifest.permissions).toEqual(["teamlibrary"]);
    expect(manifest.enablePrivatePluginApi).toBe(true);
    expect(manifest.networkAccess).toEqual({ allowedDomains: ["none"] });
  });

  it("keeps certification review available as a relaunch action", () => {
    expect(manifest.relaunchButtons).toEqual([{ command: "review-certification", name: "Review Design Passport certification", multipleSelection: true }]);
  });

  it("uses a visibly separate Figma identity for local development", () => {
    expect(developmentManifest.name).toBe("Design Passport (Development)");
    expect(developmentManifest.id).not.toBe(manifest.id);
    expect(developmentManifest).toMatchObject({
      api: manifest.api,
      editorType: manifest.editorType,
      capabilities: manifest.capabilities,
      documentAccess: manifest.documentAccess,
      permissions: manifest.permissions,
      enablePrivatePluginApi: manifest.enablePrivatePluginApi,
      networkAccess: manifest.networkAccess,
      relaunchButtons: manifest.relaunchButtons,
    });
    expect(developmentManifest.main).toBe(manifest.main);
    expect(developmentManifest.ui).toBe(manifest.ui);
  });
});

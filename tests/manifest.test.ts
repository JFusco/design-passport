import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";

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
});

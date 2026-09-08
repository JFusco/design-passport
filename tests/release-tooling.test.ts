import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

describe("release tooling contract", () => {
  it("pins the governed commit and pull-request tools", () => {
    expect(packageJson.devDependencies["@verndale/ai-commit"]).toBe("2.7.0");
    expect(packageJson.devDependencies["@verndale/ai-pr"]).toBe("1.3.5");
    expect(packageJson.devDependencies.husky).toBe("9.1.7");
    expect(packageJson.devDependencies.dotenv).toBe("16.6.1");
  });

  it("keeps the push quality gate equivalent to the canonical verifier", () => {
    expect(packageJson.scripts["verify:push"]).toBe("pnpm verify");
    expect(packageJson.scripts.prepare).toBe("husky");
  });

  it("exposes the governed commit and pull-request entry points", () => {
    expect(packageJson.scripts.commit).toBe("ai-commit run");
    expect(packageJson.scripts["pr:create"]).toBe("ai-pr");
  });
});

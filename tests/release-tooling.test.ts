import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import commitlintConfig from "../commitlint.config.cjs?raw";
import commitlintWorkflow from "../.github/workflows/commitlint.yml?raw";
import pnpmWorkspace from "../pnpm-workspace.yaml?raw";
import prWorkflow from "../.github/workflows/pr.yml?raw";
import qualityWorkflow from "../.github/workflows/quality.yml?raw";

describe("release tooling contract", () => {
  it("pins the governed commit and pull-request tools", () => {
    expect(packageJson.devDependencies["@verndale/ai-commit"]).toBe("2.7.0");
    expect(packageJson.devDependencies["@verndale/ai-pr"]).toBe("1.3.5");
    expect(packageJson.devDependencies.husky).toBe("9.1.7");
    expect(packageJson.devDependencies.dotenv).toBe("16.6.1");
  });

  it("keeps the push quality gate equivalent to the canonical verifier", () => {
    expect(packageJson.scripts.verify).toBe("pnpm run verify:ci");
    expect(packageJson.scripts["verify:push"]).toBe("pnpm run verify:ci");
    expect(packageJson.scripts["verify:ci"]).toContain("pnpm test");
    expect(packageJson.scripts["verify:ci"]).toContain("pnpm build");
    expect(packageJson.scripts.prepare).toBe("husky");
  });

  it("exposes the governed commit and pull-request entry points", () => {
    expect(packageJson.scripts.commit).toBe("ai-commit run");
    expect(packageJson.scripts["pr:create"]).toBe("ai-pr");
    expect(packageJson.scripts["lint:commit"]).toBe("commitlint --config commitlint.config.cjs");
  });

  it("enforces the full quality gate in GitHub Actions", () => {
    expect(qualityWorkflow).toContain("name: Quality");
    expect(qualityWorkflow).toContain("fetch-depth: 0");
    expect(qualityWorkflow).toContain("run: pnpm run verify:ci");
  });

  it("lints the PR title and every commit in the PR range", () => {
    expect(commitlintConfig.trim()).toBe('module.exports = require("@verndale/ai-commit");');
    expect(commitlintWorkflow).toContain("github.event.pull_request.title");
    expect(commitlintWorkflow).toContain("github.event.pull_request.base.sha");
    expect(commitlintWorkflow).toContain("github.event.pull_request.head.sha");
    expect(commitlintWorkflow).toContain("--config commitlint.config.cjs");
    expect(pnpmWorkspace).toContain('- "@commitlint/cli"');
  });

  it("does not create ordinary PRs for wiki automation branches", () => {
    expect(prWorkflow).toContain('"bot/wiki-**"');
    expect(prWorkflow).toContain("!startsWith(github.ref_name, 'bot/wiki-')");
  });
});

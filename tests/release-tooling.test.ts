import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import packageJson from "../package.json";
import commitlintConfig from "../commitlint.config.cjs?raw";
import commitlintWorkflow from "../.github/workflows/commitlint.yml?raw";
import pnpmWorkspace from "../pnpm-workspace.yaml?raw";
import prWorkflow from "../.github/workflows/pr.yml?raw";
import qualityWorkflow from "../.github/workflows/quality.yml?raw";
import { buildMetadata } from "../scripts/build-metadata.mjs";
import { validateDevelopmentBundle } from "../scripts/sync-development-bundle.mjs";

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

  it("keeps production builds out of the development manifest directory", () => {
    expect(packageJson.scripts["build"]).toBe("pnpm build:development-artifacts && pnpm build:development-bundle");
    expect(packageJson.scripts["build:development-artifacts"]).toBe("DESIGN_PASSPORT_CHANNEL=development pnpm build:artifacts");
    expect(packageJson.scripts["build:release"]).toBe("DESIGN_PASSPORT_CHANNEL=production pnpm build:artifacts");
    expect(packageJson.scripts["build:release"]).not.toContain("build:development-bundle");
  });

  it("rejects dirty production identity and exposes development dirtiness", () => {
    const dirty = { revision: "abcdef123456", dirty: true, dirtyDigest: "0123456789ab" };
    expect(() => buildMetadata({ channel: "production", source: dirty })).toThrow("clean Git checkout");
    expect(buildMetadata({ channel: "development", source: dirty })).toMatchObject({
      channel: "development", dirty: true, buildSha: "abcdef123456-dirty.0123456789ab",
    });
    expect(buildMetadata({ channel: "production", source: { revision: "abcdef123456", dirty: false } })).toMatchObject({
      channel: "production", dirty: false, buildSha: "abcdef123456",
    });
  });

  it("refuses production-stamped or mismatched bytes in the development copy step", () => {
    const code = Buffer.from("development code");
    const ui = Buffer.from("development ui");
    const sha = (value: Buffer) => createHash("sha256").update(value).digest("hex");
    const metadata = { schemaVersion: 1, buildSha: "abcdef123456", channel: "development", artifacts: { codeSha256: sha(code), uiSha256: sha(ui) } };
    expect(() => validateDevelopmentBundle({ ...metadata, channel: "production" }, { code, ui })).toThrow("development-stamped");
    expect(() => validateDevelopmentBundle(metadata, { code: Buffer.from("changed"), ui })).toThrow("mismatched");
    expect(() => validateDevelopmentBundle(metadata, { code, ui })).not.toThrow();
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

  it("creates pull requests only when manually dispatched", () => {
    expect(prWorkflow).toContain("workflow_dispatch:");
    expect(prWorkflow).not.toContain("\n  push:");
  });
});

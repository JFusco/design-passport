import { createRequire } from "node:module";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { checkSkills, hashSkillFolder } = require("../scripts/check-skills.cjs") as {
  checkSkills(root?: string): string[];
  hashSkillFolder(directory: string): string;
};

async function skillFixture() {
  const root = await mkdtemp(join(tmpdir(), "design-passport-skills-"));
  const skill = join(root, ".agents", "skills", "example");
  const links = join(root, ".claude", "skills");
  await mkdir(skill, { recursive: true });
  await mkdir(links, { recursive: true });
  await writeFile(join(skill, "SKILL.md"), "# Example\n", "utf8");
  await symlink("../../.agents/skills/example", join(links, "example"));
  await writeFile(join(root, "skills-lock.json"), `${JSON.stringify({
    version: 1,
    sourceSnapshot: "fixture",
    skills: {
      example: {
        source: "fixture",
        sourcePath: "skills/example",
        license: "MIT",
        computedHash: hashSkillFolder(skill),
      },
    },
  }, null, 2)}\n`, "utf8");
  return { root, skill, links };
}

describe("repository-local skill provenance", () => {
  it("matches the locked content and Claude links", () => {
    expect(checkSkills()).toEqual([]);
  });

  it("detects drift, unlocked and missing skills, and invalid Claude links", async () => {
    const drift = await skillFixture();
    await writeFile(join(drift.skill, "SKILL.md"), "# Changed\n", "utf8");
    expect(checkSkills(drift.root)).toContain("example: committed content differs from its locked hash");

    const unlocked = await skillFixture();
    await mkdir(join(unlocked.root, ".agents", "skills", "extra"));
    await writeFile(join(unlocked.root, ".agents", "skills", "extra", "SKILL.md"), "# Extra\n", "utf8");
    expect(checkSkills(unlocked.root)).toContain("extra: canonical skill is not locked");

    const missing = await skillFixture();
    await rm(missing.skill, { recursive: true });
    expect(checkSkills(missing.root)).toContain("example: locked skill folder is missing");

    const badLink = await skillFixture();
    await rm(join(badLink.links, "example"));
    await symlink("../../.agents/skills/missing", join(badLink.links, "example"));
    expect(checkSkills(badLink.root)).toContain("example: Claude link does not resolve to ../../.agents/skills/example");
  });
});

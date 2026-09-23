import { mkdtemp, mkdir, readFile, rm, stat, symlink, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLearningEnvelope } from "../src/core/knowledge-loop";
import { buildReadinessReport } from "../src/core/report";
import { evaluateRules } from "../src/core/rules";
import { hashValue } from "../src/core/stable";
import { reviewView } from "../src/companion/view-models";
import {
  importLearning,
  readKnowledgeState,
  recordDecision,
  rebuildKnowledge,
  reviseCandidate,
  withWorkspaceWrite,
  workspacePaths,
} from "../src/companion/repository";
import { healthyGraph, profile } from "./fixtures";

function learningJson(auditIdentity = "base") {
  const p = profile();
  const graph = healthyGraph(p);
  graph.snapshotHash = hashValue(`snapshot:${auditIdentity}`);
  const generatedAt = auditIdentity === "base" ? "2026-09-23T12:00:00Z" : "2026-09-24T12:00:00Z";
  const report = buildReadinessReport({
    graph,
    profile: p,
    scope: "selection",
    targetRootIds: ["root:desktop"],
    findings: evaluateRules(graph, p, ["root:desktop"]),
    now: new Date(generatedAt),
  });
  return JSON.stringify(buildLearningEnvelope({
    projectScope: "project:companion-test",
    report,
    pluginVersion: "test",
    knowledgeVersion: "1.0.0",
    now: new Date(generatedAt),
  }));
}

async function temporaryWorkspace() {
  const root = await mkdtemp(join(tmpdir(), "design-passport-companion-"));
  await mkdir(join(root, "knowledge", "candidates"), { recursive: true });
  await mkdir(join(root, "src", "generated"), { recursive: true });
  return workspacePaths(root);
}

describe("companion filesystem repository", () => {
  it("keeps valid imports, reports invalid and duplicate files, and makes reads side-effect-free", async () => {
    const paths = await temporaryWorkspace();
    const first = await importLearning(paths, [
      { name: "valid.json", content: learningJson() },
      { name: "invalid.json", content: "{" },
    ]);
    expect(first).toMatchObject({ imported: 1, invalid: 1, duplicates: 0, rebuildRequired: false });
    const duplicate = await importLearning(paths, [{ name: "again.json", content: learningJson() }]);
    expect(duplicate).toMatchObject({ imported: 0, duplicates: 1, invalid: 0 });

    const before = {
      candidates: await readFile(paths.candidates, "utf8"),
      pack: await readFile(paths.teamPack, "utf8"),
      candidateTime: (await stat(paths.candidates)).mtimeMs,
      packTime: (await stat(paths.teamPack)).mtimeMs,
    };
    const state = await readKnowledgeState(paths);
    expect(state.envelopes).toHaveLength(1);
    expect(await readFile(paths.candidates, "utf8")).toBe(before.candidates);
    expect(await readFile(paths.teamPack, "utf8")).toBe(before.pack);
    expect((await stat(paths.candidates)).mtimeMs).toBe(before.candidateTime);
    expect((await stat(paths.teamPack)).mtimeMs).toBe(before.packTime);
  });

  it("serializes writers and rejects stale candidate revisions", async () => {
    const paths = await temporaryWorkspace();
    await importLearning(paths, [{ name: "valid.json", content: learningJson() }]);
    const candidate = (await readKnowledgeState(paths)).candidates[0]!;
    await expect(reviseCandidate(paths, {
      candidateId: candidate.candidateId,
      candidateDigest: "sha256:stale",
      wording: candidate.wording,
      proposedScope: candidate.proposedScope,
      exceptions: [],
    })).rejects.toMatchObject({ code: "conflict" });

    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const first = withWorkspaceWrite(paths, () => held);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(withWorkspaceWrite(paths, async () => undefined)).rejects.toMatchObject({ code: "busy" });
    release();
    await first;

    const saved = await reviseCandidate(paths, {
      candidateId: candidate.candidateId,
      candidateDigest: candidate.digest,
      wording: "Use the documented project pattern.",
      proposedScope: "project",
      exceptions: [],
    });
    await expect(recordDecision(paths, {
      candidateId: candidate.candidateId,
      candidateDigest: candidate.digest,
      action: "approve",
      scope: "project",
      rationale: "Reviewed.",
    })).rejects.toMatchObject({ code: "conflict" });
    expect(saved.candidate.digest).not.toBe(candidate.digest);
  });

  it("preserves reviewed edits and prior rationale when new evidence rebuilds a draft", async () => {
    const paths = await temporaryWorkspace();
    await importLearning(paths, [{ name: "first.json", content: learningJson() }]);
    const original = (await readKnowledgeState(paths)).candidates[0]!;
    const saved = await reviseCandidate(paths, {
      candidateId: original.candidateId,
      candidateDigest: original.digest,
      wording: "Use the reviewed project pattern.",
      proposedScope: "shared",
      exceptions: ["Except in compact navigation."],
    });
    await recordDecision(paths, {
      candidateId: saved.candidate.candidateId,
      candidateDigest: saved.candidate.digest,
      action: "approve",
      scope: "project",
      rationale: "Reviewed against the current library.",
    });

    const result = await importLearning(paths, [{ name: "second.json", content: learningJson("second-audit") }]);
    expect(result).toMatchObject({ imported: 1, rebuildRequired: false });
    const state = await readKnowledgeState(paths);
    const rebuilt = state.candidates.find((candidate) => candidate.candidateId === original.candidateId)!;
    expect(rebuilt).toMatchObject({
      wording: "Use the reviewed project pattern.",
      proposedScope: "shared",
      exceptions: ["Except in compact navigation."],
    });
    expect(rebuilt.supportCount + rebuilt.contradictCount).toBe(2);
    expect(rebuilt.digest).not.toBe(saved.candidate.digest);
    expect(reviewView(state).find((candidate) => candidate.id === rebuilt.candidateId)).toMatchObject({
      status: "changed",
      previousDecision: { rationale: "Reviewed against the current library." },
    });
  });

  it("rejects symlinked managed directories without writing through them", async () => {
    const paths = await temporaryWorkspace();
    const outside = await mkdtemp(join(tmpdir(), "design-passport-outside-"));
    await mkdir(paths.knowledge, { recursive: true });
    await symlink(outside, paths.observations);
    const result = await importLearning(paths, [{ name: "valid.json", content: learningJson() }]);
    expect(result).toMatchObject({ imported: 0, invalid: 1 });
    expect(await readFile(join(outside, "missing.json"), "utf8").catch(() => "missing")).toBe("missing");
  });

  it("keeps an accepted import and recovers once a failed rebuild can be retried", async () => {
    const paths = await temporaryWorkspace();
    const outside = await mkdtemp(join(tmpdir(), "design-passport-generated-outside-"));
    await rm(join(paths.root, "src", "generated"), { recursive: true, force: true });
    await symlink(outside, join(paths.root, "src", "generated"));

    const imported = await importLearning(paths, [{ name: "valid.json", content: learningJson() }]);
    expect(imported).toMatchObject({ imported: 1, rebuildRequired: true });
    const interrupted = await readKnowledgeState(paths);
    expect(interrupted.envelopes).toHaveLength(1);
    expect(interrupted.rebuildRequired).toBe(true);
    const duplicate = await importLearning(paths, [{ name: "duplicate.json", content: learningJson() }]);
    expect(duplicate).toMatchObject({ imported: 0, duplicates: 1, rebuildRequired: true });
    expect(duplicate.rebuildMessage).toMatch(/previous change was saved/i);
    const invalid = await importLearning(paths, [{ name: "invalid.json", content: "{" }]);
    expect(invalid).toMatchObject({ imported: 0, invalid: 1, rebuildRequired: true });

    await unlink(join(paths.root, "src", "generated"));
    await mkdir(join(paths.root, "src", "generated"), { recursive: true });
    const recovered = await rebuildKnowledge(paths);
    expect(recovered).toMatchObject({ rebuildRequired: false });
    expect(recovered.envelopes).toHaveLength(1);
    expect((await readKnowledgeState(paths)).rebuildRequired).toBe(false);
  });
});

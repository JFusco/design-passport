import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, realpath, rename, stat, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { DesignReferencePackV1, KnowledgeCandidateV1, KnowledgeDecisionV1, ReviewLearningEnvelopeV1, TeamKnowledgePackV1 } from "../core/contracts";
import {
  assertKnowledgeCandidate,
  assertKnowledgeDecision,
  assertLearningEnvelope,
  assertReferencePack,
  assertTeamKnowledgePack,
  buildKnowledgeDecision,
  buildReferencePack,
  compileTeamKnowledgePack,
  generateCandidateDrafts,
  projectGuidanceFact,
  reviseKnowledgeCandidate,
} from "../core/knowledge-loop";
import { hashValue } from "../core/stable";
import { CompanionError } from "./errors";

const LOCK_STALE_MS = 5 * 60_000;
export const MAX_IMPORT_FILES = 10;
export const MAX_IMPORT_FILE_BYTES = 1_000_000;
export const MAX_IMPORT_TOTAL_BYTES = 5_000_000;

export interface WorkspacePaths {
  root: string;
  knowledge: string;
  candidates: string;
  decisions: string;
  observations: string;
  projectPacks: string;
  teamPack: string;
  bundledTeamPack: string;
  localState: string;
  lock: string;
  rebuildRequired: string;
}

export interface KnowledgeState {
  envelopes: ReviewLearningEnvelopeV1[];
  candidates: KnowledgeCandidateV1[];
  decisions: KnowledgeDecisionV1[];
  teamPack: TeamKnowledgePackV1;
  rebuildRequired: boolean;
}

export interface ImportInput { name: string; content: string }
export interface ImportFileResult { name: string; status: "imported" | "duplicate" | "invalid"; message: string }
export interface ImportBatchResult {
  files: ImportFileResult[];
  imported: number;
  duplicates: number;
  invalid: number;
  rebuildRequired: boolean;
  rebuildMessage?: string;
}

export async function resolveWorkspaceRoot(input: string): Promise<string> {
  try {
    return await realpath(resolve(input));
  } catch {
    throw new CompanionError("not-configured", "The configured workspace root does not exist.", 503);
  }
}

export function workspacePaths(root: string): WorkspacePaths {
  const absolute = resolve(root);
  const knowledge = join(absolute, "knowledge");
  const localState = join(absolute, ".design-passport-local");
  return {
    root: absolute,
    knowledge,
    candidates: join(knowledge, "candidates", "current.json"),
    decisions: join(knowledge, "decisions"),
    observations: join(knowledge, "observations"),
    projectPacks: join(knowledge, "project-packs"),
    teamPack: join(knowledge, "releases", "team-knowledge-pack.v1.json"),
    bundledTeamPack: join(absolute, "src", "generated", "team-knowledge.pack.json"),
    localState,
    lock: join(localState, "knowledge-write.lock"),
    rebuildRequired: join(localState, "knowledge-rebuild-required.json"),
  };
}

function assertWithinRoot(root: string, path: string): void {
  const rel = relative(root, resolve(path));
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return;
  throw new CompanionError("invalid-input", "A managed path escaped the configured workspace.", 400);
}

async function assertNoSymlink(root: string, target: string): Promise<void> {
  assertWithinRoot(root, target);
  const parts = relative(root, resolve(target)).split(/[\\/]/u).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new CompanionError("invalid-input", "Managed knowledge paths cannot contain symbolic links.", 400);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

async function ensureDirectory(paths: WorkspacePaths, directory: string): Promise<void> {
  assertWithinRoot(paths.root, directory);
  await assertNoSymlink(paths.root, dirname(directory));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await assertNoSymlink(paths.root, directory);
}

export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readJsonFiles<T>(paths: WorkspacePaths, directory: string): Promise<T[]> {
  await assertNoSymlink(paths.root, directory);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(files.map((entry) => readJsonFile<T>(join(directory, entry.name))));
}

async function atomicWriteJsonAt(destination: string, value: unknown): Promise<void> {
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(destination), `.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export async function atomicWriteExternalJson(destination: string, value: unknown): Promise<void> {
  return atomicWriteJsonAt(resolve(destination), value);
}

export async function atomicWriteJson(paths: WorkspacePaths, destination: string, value: unknown): Promise<void> {
  assertWithinRoot(paths.root, destination);
  await ensureDirectory(paths, dirname(destination));
  await assertNoSymlink(paths.root, destination);
  await atomicWriteJsonAt(destination, value);
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

async function acquireLock(paths: WorkspacePaths): Promise<() => Promise<void>> {
  await ensureDirectory(paths, paths.localState);
  const token = `${process.pid}:${randomUUID()}`;
  const tryOpen = async () => open(paths.lock, "wx", 0o600);
  let handle;
  try {
    handle = await tryOpen();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const info = await stat(paths.lock).catch(() => undefined);
    if (!info || Date.now() - info.mtimeMs <= LOCK_STALE_MS) throw new CompanionError("busy", "Another companion write is in progress. Try again in a moment.", 423);
    await unlink(paths.lock).catch(() => undefined);
    try { handle = await tryOpen(); }
    catch { throw new CompanionError("busy", "Another companion write is in progress. Try again in a moment.", 423); }
  }
  try {
    await handle.writeFile(`${token}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await unlink(paths.lock).catch(() => undefined);
    throw error;
  }
  return async () => {
    await handle.close();
    const current = await readFile(paths.lock, "utf8").catch(() => "");
    if (current === `${token}\n`) await unlink(paths.lock).catch(() => undefined);
  };
}

export async function withWorkspaceWrite<T>(paths: WorkspacePaths, operation: () => Promise<T>): Promise<T> {
  const release = await acquireLock(paths);
  try { return await operation(); }
  finally { await release(); }
}

async function loadCandidates(paths: WorkspacePaths): Promise<KnowledgeCandidateV1[]> {
  await assertNoSymlink(paths.root, paths.candidates);
  try {
    const candidates = await readJsonFile<KnowledgeCandidateV1[]>(paths.candidates);
    for (const candidate of candidates) assertKnowledgeCandidate(candidate);
    return candidates;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function loadDecisions(paths: WorkspacePaths): Promise<KnowledgeDecisionV1[]> {
  const decisions = await readJsonFiles<KnowledgeDecisionV1>(paths, paths.decisions);
  for (const decision of decisions) assertKnowledgeDecision(decision);
  return decisions;
}

async function loadEnvelopes(paths: WorkspacePaths): Promise<ReviewLearningEnvelopeV1[]> {
  const envelopes = await readJsonFiles<ReviewLearningEnvelopeV1>(paths, paths.observations);
  for (const envelope of envelopes) assertLearningEnvelope(envelope);
  return envelopes;
}

async function markRebuildRequired(paths: WorkspacePaths, reason: string): Promise<void> {
  await atomicWriteJson(paths, paths.rebuildRequired, { schemaVersion: 1, reason, markedAt: new Date().toISOString() });
}

async function clearRebuildRequired(paths: WorkspacePaths): Promise<void> {
  await unlink(paths.rebuildRequired).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}

async function rebuildUnlocked(paths: WorkspacePaths): Promise<KnowledgeState> {
  const envelopes = await loadEnvelopes(paths);
  const envelopeTime = envelopes.map((envelope) => envelope.generatedAt).sort().at(-1) ?? "1970-01-01T00:00:00.000Z";
  const generated = generateCandidateDrafts(envelopes, new Date(envelopeTime));
  const current = await loadCandidates(paths);
  const currentByGroup = new Map(current.map((candidate) => [candidate.groupKey, candidate]));
  const candidates = generated.map((candidate) => {
    const existing = currentByGroup.get(candidate.groupKey);
    if (!existing) return candidate;
    const unchanged = JSON.stringify(existing.evidenceEnvelopeDigests) === JSON.stringify(candidate.evidenceEnvelopeDigests)
      && existing.supportCount === candidate.supportCount && existing.contradictCount === candidate.contradictCount;
    return unchanged ? existing : reviseKnowledgeCandidate(candidate, {
      wording: existing.wording,
      proposedScope: existing.proposedScope,
      exceptions: existing.exceptions,
    }, new Date(envelopeTime));
  });
  await atomicWriteJson(paths, paths.candidates, candidates);
  const decisions = await loadDecisions(paths);
  const buildTime = [...decisions.map((decision) => decision.decidedAt), ...candidates.map((candidate) => candidate.generatedAt)].sort().at(-1)
    ?? "1970-01-01T00:00:00.000Z";
  const teamPack = compileTeamKnowledgePack({ knowledgeVersion: "1.0.0", candidates, decisions, now: new Date(buildTime) });
  await atomicWriteJson(paths, paths.teamPack, teamPack);
  await atomicWriteJson(paths, paths.bundledTeamPack, teamPack);
  const latest = new Map<string, KnowledgeDecisionV1>();
  for (const decision of [...decisions].sort((left, right) => left.decidedAt.localeCompare(right.decidedAt))) latest.set(decision.candidateId, decision);
  const scopes = [...new Set(candidates.map((candidate) => candidate.projectScope))].sort();
  for (const scope of scopes) {
    const approved = candidates.filter((candidate) => {
      const decision = latest.get(candidate.candidateId);
      return candidate.projectScope === scope && decision?.action === "approve" && decision.scope === "project" && decision.candidateDigest === candidate.digest;
    });
    const facts = approved.map(projectGuidanceFact);
    const source = {
      schemaVersion: 1 as const,
      sourceId: `project-guidance:${scope}`,
      projectScope: scope,
      role: "style-guide" as const,
      contentDigest: hashValue(approved.map((candidate) => candidate.digest).sort()),
      completeness: { complete: true, availableDomains: [...new Set(facts.map((fact) => fact.domain))].sort(), warnings: [] },
    };
    const pack = buildReferencePack({ packVersion: "1.0.0", source, facts }, new Date(buildTime));
    await atomicWriteJson(paths, join(paths.projectPacks, `${scope}.json`), pack);
  }
  await clearRebuildRequired(paths);
  return { envelopes, candidates, decisions, teamPack, rebuildRequired: false };
}

export async function rebuildKnowledge(paths: WorkspacePaths): Promise<KnowledgeState> {
  return withWorkspaceWrite(paths, async () => {
    await markRebuildRequired(paths, "manual-rebuild");
    return rebuildUnlocked(paths);
  });
}

export async function readKnowledgeState(paths: WorkspacePaths): Promise<KnowledgeState> {
  const [envelopes, candidates, decisions, rebuildRequired] = await Promise.all([
    loadEnvelopes(paths), loadCandidates(paths), loadDecisions(paths), exists(paths.rebuildRequired),
  ]);
  let teamPack: TeamKnowledgePackV1;
  try {
    teamPack = await readJsonFile<TeamKnowledgePackV1>(paths.teamPack);
    assertTeamKnowledgePack(teamPack);
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    teamPack = compileTeamKnowledgePack({ knowledgeVersion: "1.0.0", candidates: [], decisions: [], now: new Date("1970-01-01T00:00:00.000Z") });
  }
  return { envelopes, candidates, decisions, teamPack, rebuildRequired };
}

export async function listProjectGuidancePacks(paths: WorkspacePaths): Promise<DesignReferencePackV1[]> {
  const packs = await readJsonFiles<DesignReferencePackV1>(paths, paths.projectPacks);
  for (const pack of packs) assertReferencePack(pack, "style-guide");
  return packs.filter((pack) => pack.facts.length > 0)
    .sort((left, right) => left.source.projectScope.localeCompare(right.source.projectScope));
}

export async function importLearning(paths: WorkspacePaths, inputs: ImportInput[]): Promise<ImportBatchResult> {
  if (inputs.length === 0) throw new CompanionError("invalid-input", "Choose at least one learning file.", 400);
  if (inputs.length > MAX_IMPORT_FILES) throw new CompanionError("invalid-input", `Choose no more than ${MAX_IMPORT_FILES} files at once.`, 400);
  const sizes = inputs.map((input) => Buffer.byteLength(input.content, "utf8"));
  if (sizes.reduce((sum, size) => sum + size, 0) > MAX_IMPORT_TOTAL_BYTES) throw new CompanionError("invalid-input", "The selected files exceed the 5 MB combined limit.", 413);
  return withWorkspaceWrite(paths, async () => {
    const files: ImportFileResult[] = [];
    let imported = 0;
    for (const [index, input] of inputs.entries()) {
      if ((sizes[index] ?? 0) > MAX_IMPORT_FILE_BYTES) {
        files.push({ name: input.name, status: "invalid", message: "File exceeds the 1 MB limit." });
        continue;
      }
      try {
        const envelope = JSON.parse(input.content) as unknown;
        assertLearningEnvelope(envelope);
        const typed = envelope as ReviewLearningEnvelopeV1;
        const destination = join(paths.observations, `${typed.digest.replace(":", "-")}.json`);
        await ensureDirectory(paths, paths.observations);
        await assertNoSymlink(paths.root, destination);
        if (await exists(destination)) {
          files.push({ name: input.name, status: "duplicate", message: "Already imported." });
        } else {
          await atomicWriteJson(paths, destination, typed);
          imported += 1;
          files.push({ name: input.name, status: "imported", message: "Imported." });
        }
      } catch (error) {
        files.push({ name: input.name, status: "invalid", message: error instanceof SyntaxError ? "File is not valid JSON." : "File is not a valid Design Passport learning export." });
      }
    }
    let rebuildRequired = await exists(paths.rebuildRequired);
    let rebuildMessage = rebuildRequired ? "A previous change was saved, but knowledge still needs to be rebuilt. Use Retry rebuild." : undefined;
    if (imported > 0) {
      await markRebuildRequired(paths, "learning-import");
      try {
        await rebuildUnlocked(paths);
        rebuildRequired = false;
        rebuildMessage = undefined;
      }
      catch { rebuildRequired = true; rebuildMessage = "The files were saved, but knowledge needs to be rebuilt. Use Retry rebuild."; }
    }
    return {
      files,
      imported,
      duplicates: files.filter((file) => file.status === "duplicate").length,
      invalid: files.filter((file) => file.status === "invalid").length,
      rebuildRequired,
      ...(rebuildMessage ? { rebuildMessage } : {}),
    };
  });
}

export async function reviseCandidate(paths: WorkspacePaths, input: {
  candidateId: string; candidateDigest: string; wording: string; proposedScope: "project" | "shared"; exceptions: string[];
}): Promise<{ candidate: KnowledgeCandidateV1; rebuildRequired: boolean }> {
  return withWorkspaceWrite(paths, async () => {
    const candidates = await loadCandidates(paths);
    const index = candidates.findIndex((candidate) => candidate.candidateId === input.candidateId && candidate.digest === input.candidateDigest);
    if (index < 0) throw new CompanionError("conflict", "This draft changed. Reload it before saving.", 409);
    const current = candidates[index];
    if (!current) throw new CompanionError("not-found", "The selected draft no longer exists.", 404);
    const candidate = reviseKnowledgeCandidate(current, { wording: input.wording, proposedScope: input.proposedScope, exceptions: input.exceptions });
    candidates[index] = candidate;
    await atomicWriteJson(paths, paths.candidates, candidates);
    await markRebuildRequired(paths, "candidate-revision");
    try { await rebuildUnlocked(paths); return { candidate, rebuildRequired: false }; }
    catch { return { candidate, rebuildRequired: true }; }
  });
}

export async function recordDecision(paths: WorkspacePaths, input: {
  candidateId: string; candidateDigest: string; action: "approve" | "reject" | "defer"; scope: "project" | "shared"; rationale: string;
}): Promise<{ decision: KnowledgeDecisionV1; rebuildRequired: boolean }> {
  return withWorkspaceWrite(paths, async () => {
    const candidates = await loadCandidates(paths);
    const candidate = candidates.find((item) => item.candidateId === input.candidateId && item.digest === input.candidateDigest);
    if (!candidate) throw new CompanionError("conflict", "This draft changed. Reload it before deciding.", 409);
    const decision = buildKnowledgeDecision({
      decisionId: `decision:${randomUUID()}`, candidateId: candidate.candidateId, candidateDigest: candidate.digest,
      action: input.action, scope: input.scope, rationale: input.rationale,
    });
    const destination = join(paths.decisions, `${decision.decisionId}.json`);
    await atomicWriteJson(paths, destination, decision);
    await markRebuildRequired(paths, "knowledge-decision");
    try { await rebuildUnlocked(paths); return { decision, rebuildRequired: false }; }
    catch { return { decision, rebuildRequired: true }; }
  });
}

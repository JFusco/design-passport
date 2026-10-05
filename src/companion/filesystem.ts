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
  compileTeamKnowledgePack,
} from "../core/knowledge-loop";
import { CompanionError } from "./errors";

const LOCK_STALE_MS = 5 * 60_000;
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
}

export interface KnowledgeState {
  envelopes: ReviewLearningEnvelopeV1[];
  candidates: KnowledgeCandidateV1[];
  decisions: KnowledgeDecisionV1[];
  teamPack: TeamKnowledgePackV1;
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
  if (directory !== paths.root) await assertNoSymlink(paths.root, dirname(directory));
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

export async function readFilesystemKnowledgeState(paths: WorkspacePaths): Promise<KnowledgeState> {
  const [envelopes, candidates, decisions] = await Promise.all([
    loadEnvelopes(paths), loadCandidates(paths), loadDecisions(paths),
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
  return { envelopes, candidates, decisions, teamPack };
}

export async function listFilesystemProjectGuidancePacks(paths: WorkspacePaths): Promise<DesignReferencePackV1[]> {
  const packs = await readJsonFiles<DesignReferencePackV1>(paths, paths.projectPacks);
  for (const pack of packs) assertReferencePack(pack, "style-guide");
  return packs.filter((pack) => pack.facts.length > 0)
    .sort((left, right) => left.source.projectScope.localeCompare(right.source.projectScope));
}

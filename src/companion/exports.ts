import { createHash } from "node:crypto";
import { lstat, mkdir, readFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { databaseSnapshot, readKnowledgeState } from "./repository";
import { atomicWriteJson, withWorkspaceWrite, workspacePaths, type WorkspacePaths } from "./filesystem";
import { CompanionError } from "./errors";

export async function exportRelease(paths: WorkspacePaths) {
  const state = await readKnowledgeState(paths);
  await withWorkspaceWrite(paths, async () => {
    await atomicWriteJson(paths, paths.teamPack, state.teamPack);
    await atomicWriteJson(paths, paths.bundledTeamPack, state.teamPack);
  });
  return state;
}

async function newPrivateDirectory(destination: string): Promise<string> {
  const absolute = resolve(destination);
  let ancestor = absolute;
  while (ancestor !== parse(ancestor).root) {
    try {
      const info = await lstat(ancestor);
      if (ancestor === absolute) throw new CompanionError("invalid-input", "The backup destination already exists. Choose a new directory.", 400);
      if (info.isSymbolicLink()) throw new CompanionError("invalid-input", "Backup destinations cannot contain symbolic links.", 400);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    ancestor = dirname(ancestor);
  }
  await mkdir(absolute, { mode: 0o700 });
  return absolute;
}

export async function exportKnowledge(paths: WorkspacePaths, destination: string): Promise<string> {
  // Snapshot completes before filesystem writing. No filesystem or network
  // operations run inside the database transaction.
  const snapshot = await databaseSnapshot(paths);
  return withWorkspaceWrite(paths, async () => {
    const root = await newPrivateDirectory(destination);
    const output = workspacePaths(root);
    const files: Array<{ path: string; sha256: string }> = [];
    const write = async (path: string, value: unknown) => {
      await atomicWriteJson(output, join(root, path), value);
      const digest = createHash("sha256").update(await readFile(join(root, path))).digest("hex");
      files.push({ path, sha256: digest });
    };
    for (const envelope of snapshot.state.envelopes) await write(`knowledge/observations/${envelope.digest.replace(":", "-")}.json`, envelope);
    for (const decision of snapshot.state.decisions) await write(`knowledge/decisions/${decision.decisionId.replace(":", "-")}.json`, decision);
    await write("knowledge/candidates/current.json", snapshot.state.candidates);
    for (const [index, pack] of snapshot.projectPacks.entries()) await write(`knowledge/project-packs/${index}.json`, pack);
    await write("knowledge/releases/team-knowledge-pack.v1.json", snapshot.state.teamPack);
    await write("src/generated/team-knowledge.pack.json", snapshot.state.teamPack);
    for (const source of snapshot.records.audit_exports ?? []) await write(`audits/${source.id}.json`, source.payload);
    await write("database-history.v1.json", { schemaVersion: 1, tables: snapshot.records });
    // A partial directory is intentionally retained for diagnosis. Only this
    // final manifest declares a complete backup; retry uses a new destination.
    await atomicWriteJson(output, join(root, "completion-manifest.v1.json"), {
      schemaVersion: 1, completedAt: new Date().toISOString(),
      counts: Object.fromEntries(Object.entries(snapshot.records).map(([table, rows]) => [table, rows.length])), files,
    });
    return root;
  });
}

export async function verifyKnowledgeExport(root: string): Promise<void> {
  try {
    const manifest = JSON.parse(await readFile(join(root, "completion-manifest.v1.json"), "utf8")) as { schemaVersion: number; files: Array<{ path: string; sha256: string }> };
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error();
    for (const entry of manifest.files) {
      if (!entry.path || entry.path.startsWith("/") || entry.path.split(/[\\/]/u).includes("..")) throw new Error();
      const digest = createHash("sha256").update(await readFile(join(root, entry.path))).digest("hex");
      if (digest !== entry.sha256) throw new Error();
    }
  } catch { throw new CompanionError("invalid-input", "The backup is incomplete or its file digests do not match.", 400); }
}

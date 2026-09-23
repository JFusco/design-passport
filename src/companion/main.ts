import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { basename, dirname, join, resolve } from "node:path";
import type { MultiFileReviewReportV1, ReadinessReport, ReviewSourceV1 } from "../core/contracts";
import { buildMultiFileReviewReport } from "../core/knowledge-loop";
import { validateReviewBatch } from "../core/review-source";
import { assertContract } from "../core/schema";
import { hashValue } from "../core/stable";
import { createReferencePack, fetchFigmaSource } from "./figma";
import {
  atomicWriteExternalJson,
  importLearning,
  readJsonFile,
  rebuildKnowledge,
  resolveWorkspaceRoot,
  workspacePaths,
} from "./repository";

type Options = Record<string, string | true>;

function args(argv: string[]): { area?: string; action?: string; values: Options; positional: string[] } {
  const [area, action, ...tail] = argv;
  const values: Options = {};
  const positional: string[] = [];
  for (let index = 0; index < tail.length; index += 1) {
    const value = tail[index];
    if (value?.startsWith("--")) {
      const key = value.slice(2);
      const next = tail[index + 1];
      if (!next || next.startsWith("--")) values[key] = true;
      else { values[key] = next; index += 1; }
    } else if (value) positional.push(value);
  }
  return {
    ...(area ? { area } : {}),
    ...(action ? { action } : {}),
    values,
    positional,
  };
}

function requiredOption(options: Options, key: string): string {
  const value = options[key];
  if (typeof value !== "string" || !value) throw new Error(`Missing required --${key}`);
  return value;
}

function roleOption(value: string): "style-guide" | "reference" {
  if (value !== "style-guide" && value !== "reference") throw new Error("pack role must be style-guide or reference");
  return value;
}

async function makePack(options: Options): Promise<void> {
  const output = resolve(requiredOption(options, "out"));
  const result = await createReferencePack({
    url: requiredOption(options, "url"),
    sourceId: requiredOption(options, "source-id"),
    projectScope: requiredOption(options, "project-scope"),
    role: roleOption(requiredOption(options, "role")),
    ...(typeof options["pack-version"] === "string" ? { packVersion: options["pack-version"] } : {}),
  }, process.env.FIGMA_TOKEN ?? "");
  await atomicWriteExternalJson(output, result.pack);
  process.stdout.write(`${output}\n`);
  for (const warning of result.warnings) process.stderr.write(`Companion warning: ${warning}\n`);
}

async function ingest(options: Options): Promise<void> {
  const config = resolve(requiredOption(options, "config"));
  const output = resolve(requiredOption(options, "out"));
  const batch = validateReviewBatch(await readJsonFile(config));
  const results: Array<{ sourceId: string; role: string; status: "complete" | "failed"; error?: string }> = [];
  const targets: Array<{ source: ReviewSourceV1; report: ReadinessReport }> = [];
  const references: Array<{ sourceId: string; packDigest: string }> = [];
  for (const sourceInput of batch.sources) {
    try {
      if (sourceInput.role === "target") {
        const readinessProfile = sourceInput.readinessProfilePath
          ? await readJsonFile(resolve(dirname(config), sourceInput.readinessProfilePath))
          : sourceInput.readinessProfile;
        assertContract("readiness-profile", readinessProfile);
      }
      const fetched = await fetchFigmaSource(sourceInput.url, sourceInput.role !== "target", process.env.FIGMA_TOKEN ?? "");
      if (sourceInput.role === "target") {
        if (!sourceInput.reportPath) throw new Error("Remote target facts are insufficient for grading; provide reportPath from an unchanged local plugin review");
        const report = await readJsonFile<ReadinessReport>(resolve(dirname(config), sourceInput.reportPath));
        assertContract("readiness-report", report);
        const source: ReviewSourceV1 = {
          schemaVersion: 1,
          sourceId: sourceInput.sourceId,
          projectScope: sourceInput.projectScope,
          role: "target",
          contentDigest: hashValue({ sourceId: sourceInput.sourceId, documentVersion: fetched.file.version ?? "unavailable" }),
          completeness: { complete: true, availableDomains: ["tokens", "components", "naming", "layout", "breakpoints", "accessibility"], warnings: [] },
        };
        assertContract("review-source", source);
        targets.push({ source, report });
        await atomicWriteExternalJson(join(output, "sources", `${source.sourceId}.json`), source);
      } else {
        const result = await createReferencePack({ url: sourceInput.url, sourceId: sourceInput.sourceId, projectScope: batch.projectScope, role: sourceInput.role }, process.env.FIGMA_TOKEN ?? "");
        await atomicWriteExternalJson(join(output, "packs", `${sourceInput.sourceId}.json`), result.pack);
        references.push({ sourceId: sourceInput.sourceId, packDigest: result.pack.digest });
      }
      results.push({ sourceId: sourceInput.sourceId, role: sourceInput.role, status: "complete" });
    } catch (error) {
      results.push({ sourceId: sourceInput.sourceId, role: sourceInput.role, status: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }
  let report: MultiFileReviewReportV1 | undefined;
  if (targets.length > 0 && targets.length === batch.sources.filter((source) => source.role === "target").length) {
    report = buildMultiFileReviewReport({
      projectScope: batch.projectScope,
      targets,
      references,
      warnings: results.filter((result) => result.status === "failed").map((result) => `${result.sourceId} failed`),
    });
    await atomicWriteExternalJson(join(output, "multi-file-review.json"), report);
  }
  const manifest = { schemaVersion: 1, projectScope: batch.projectScope, results, ...(report ? { reportDigest: report.digest } : {}) };
  await atomicWriteExternalJson(join(output, "batch-result.json"), manifest);
  process.stdout.write(`${join(output, "batch-result.json")}\n`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 2;
}

async function importLearningFiles(files: string[], root: string): Promise<void> {
  if (files.length === 0) throw new Error("learning import requires at least one envelope file");
  const inputs = await Promise.all(files.map(async (path) => ({ name: basename(path), content: await readFile(resolve(path), "utf8") })));
  const result = await importLearning(workspacePaths(root), inputs);
  process.stdout.write(`${result.imported} new unique contribution${result.imported === 1 ? "" : "s"}\n`);
  for (const file of result.files.filter((item) => item.status !== "imported")) process.stderr.write(`${file.name}: ${file.message}\n`);
  if (result.invalid > 0 || result.rebuildRequired) process.exitCode = 2;
}

async function availablePort(requested: number): Promise<number> {
  if (requested > 0) return requested;
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function review(options: Options, root: string): Promise<void> {
  const requested = Number(options.port ?? 0);
  if (!Number.isInteger(requested) || requested < 0 || requested > 65_535) throw new Error("--port must be between 0 and 65535");
  const port = await availablePort(requested);
  const appRoot = join(root, "apps", "companion");
  try { await readFile(join(appRoot, ".next", "BUILD_ID"), "utf8"); }
  catch { throw new Error("The companion production build is missing. Run pnpm companion:build first."); }
  const nextBin = join(appRoot, "node_modules", "next", "dist", "bin", "next");
  const capability = randomBytes(32).toString("hex");
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: appRoot,
    env: { ...process.env, DESIGN_PASSPORT_WORKSPACE_ROOT: root, DESIGN_PASSPORT_CAPABILITY: capability, DESIGN_PASSPORT_EXPECTED_ORIGIN: origin },
    stdio: ["inherit", "pipe", "pipe"],
  });
  let announced = false;
  const announce = () => {
    if (announced) return;
    announced = true;
    process.stdout.write(`Design Passport companion: ${origin}/bootstrap?cap=${capability}\n`);
  };
  child.stdout.on("data", (chunk: Buffer) => { process.stdout.write(chunk); if (/ready/iu.test(chunk.toString("utf8"))) announce(); });
  child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  const forwardInterrupt = () => child.kill("SIGINT");
  const forwardTermination = () => child.kill("SIGTERM");
  process.once("SIGINT", forwardInterrupt);
  process.once("SIGTERM", forwardTermination);
  await new Promise<void>((resolveChild, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      process.removeListener("SIGINT", forwardInterrupt);
      process.removeListener("SIGTERM", forwardTermination);
      if (code && code !== 0) reject(new Error(`Companion server exited with code ${code}`));
      else if (signal && signal !== "SIGINT" && signal !== "SIGTERM") reject(new Error(`Companion server stopped after ${signal}`));
      else resolveChild();
    });
  });
}

function usage(): string {
  return `Design Passport local companion\n\nCommands:\n  pack create --url URL --source-id ID --project-scope ID --role style-guide|reference --out FILE\n  batch ingest --config FILE --out DIR\n  learning import FILE [FILE...]\n  knowledge build\n  knowledge review [--port 0]\n`;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const command = args(argv);
  const root = await resolveWorkspaceRoot(process.env.DESIGN_PASSPORT_WORKSPACE_ROOT ?? process.cwd());
  if (command.area === "pack" && command.action === "create") return makePack(command.values);
  if (command.area === "batch" && command.action === "ingest") return ingest(command.values);
  if (command.area === "learning" && command.action === "import") return importLearningFiles(command.positional, root);
  if (command.area === "knowledge" && command.action === "build") {
    const state = await rebuildKnowledge(workspacePaths(root));
    process.stdout.write(`${state.candidates.length} candidate draft${state.candidates.length === 1 ? "" : "s"}\n`);
    return;
  }
  if (command.area === "knowledge" && command.action === "review") return review(command.values, root);
  process.stdout.write(usage());
}

if (process.argv[1]?.endsWith("companion.mjs") || process.argv[1]?.endsWith("main.ts")) {
  main().catch((error) => {
    process.stderr.write(`Companion error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as bundle } from "esbuild";

const ownDirectory = path.dirname(fileURLToPath(import.meta.url));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
  const key = args[index];
  if (!["--source-dir", "--source-revision", "--out", "--allowed-write-files", "--development-plugin-id"].includes(key) || args[index + 1] === undefined || options[key] !== undefined) {
    throw new Error("Usage: node scripts/qa/build-native-harness.mjs --source-dir DIR --out DIR [--source-revision COMMIT_SHA] [--allowed-write-files COPY_KEY,COPY_KEY] [--development-plugin-id FIGMA_ASSIGNED_ID]");
  }
  options[key] = args[index + 1];
}
if (!options["--source-dir"] || !options["--out"]) throw new Error("Both --source-dir and --out are required");
const sourceDirectory = path.resolve(options["--source-dir"]);
const outputDirectory = path.resolve(options["--out"]);
const manifest = JSON.parse(await readFile(path.join(sourceDirectory, "manifest.json"), "utf8"));
const developmentPluginId = options["--development-plugin-id"];
if (developmentPluginId !== undefined && !/^[0-9]{10,30}$/.test(developmentPluginId)) throw new Error("--development-plugin-id requires an ID assigned by Figma's development plugin creation flow");
const sourceCodePath = path.resolve(sourceDirectory, manifest.main);
const sourceUiPath = path.resolve(sourceDirectory, manifest.ui);
if ([sourceCodePath, sourceUiPath].some((input) => ["code.js", "index.html"].some((name) => input === path.join(outputDirectory, name)))) {
  throw new Error("The harness output must not overwrite the production bundle");
}
const [productionCode, productionUi, runtime, controls] = await Promise.all([
  readFile(sourceCodePath), readFile(sourceUiPath),
  readFile(path.join(ownDirectory, "native-harness-runtime.js"), "utf8"),
  readFile(path.join(ownDirectory, "native-harness-ui.html"), "utf8"),
]);
let fixtureBundle = "";
try {
  const result = await bundle({ entryPoints: [path.join(ownDirectory, "native-fixtures.ts")], bundle: true, write: false, format: "iife", globalName: "NativeQaFixtures", target: "es2020", platform: "browser", logLevel: "silent" });
  fixtureBundle = result.outputFiles[0].text;
} catch (error) {
  throw new Error("Build the QA fixture helper before generating the native harness", { cause: error });
}
const explicitRevision = options["--source-revision"];
if (explicitRevision && !/^[a-f0-9]{40}$/i.test(explicitRevision)) throw new Error("--source-revision requires a full commit SHA");
let revision = explicitRevision ?? "unavailable";
let revisionSource = explicitRevision ? "explicit-archive" : "unavailable";
let gitRevision;
let dirty = null;
let diffSha256;
try {
  gitRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: sourceDirectory, encoding: "utf8" }).trim();
  revision = gitRevision;
  revisionSource = "git";
  dirty = Boolean(execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: sourceDirectory, encoding: "utf8" }).trim());
  diffSha256 = hash(execFileSync("git", ["diff", "HEAD", "--binary"], { cwd: sourceDirectory }));
} catch { /* Byte digests remain authoritative outside a checkout. */ }
if (gitRevision && explicitRevision && gitRevision !== explicitRevision) throw new Error("Explicit source revision does not match this checkout's HEAD");
const allowedWriteFileKeys = [...new Set((options["--allowed-write-files"] ?? "").split(",").map((key) => key.trim()).filter(Boolean))];
if (allowedWriteFileKeys.some((key) => !/^[A-Za-z0-9_-]+$/.test(key))) throw new Error("Write allowlist entries must be explicit Figma file keys");
const metadata = {
  kind: "design-passport-native-qa", schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { revision, revisionSource, dirty, ...(diffSha256 ? { diffSha256 } : {}), productionCodeSha256: hash(productionCode), productionUiSha256: hash(productionUi) },
  harnessSourceSha256: hash(runtime + controls + fixtureBundle),
  capabilities: { targetedRecheck: productionCode.includes(Buffer.from('"recheck-audit"')), fixtureBuilder: Boolean(fixtureBundle) },
  allowedWriteFileKeys,
  pluginIdentity: { productionId: manifest.id, developmentId: developmentPluginId ?? manifest.id, isolatedStorage: Boolean(developmentPluginId && developmentPluginId !== manifest.id) },
  coldSessionNote: "First audit in this plugin session; persisted context is retained. A truly cold baseline requires a fresh private file key with no existing context.",
};
const config = JSON.stringify(metadata).replaceAll("<", "\\u003c");
const code = Buffer.concat([productionCode, Buffer.from(`\n;/* Native QA wrapper; production bytes above are unchanged. */\n${fixtureBundle}\n${runtime.replace("/*__QA_CONFIG__*/", config)}\n`)]);
const ui = Buffer.concat([productionUi, Buffer.from(`\n${controls.replace("/*__QA_CONFIG__*/", config)}\n`)]);
const outputManifest = { ...manifest, ...(developmentPluginId ? { id: developmentPluginId } : {}), name: `${manifest.name} — Native QA`, main: "code.js", ui: "index.html" };
const build = { ...metadata, output: { codeSha256: hash(code), uiSha256: hash(ui) } };
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "code.js"), code),
  writeFile(path.join(outputDirectory, "index.html"), ui),
  writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(outputManifest, null, 2)}\n`),
  writeFile(path.join(outputDirectory, "qa-build.json"), `${JSON.stringify(build, null, 2)}\n`),
  writeFile(path.join(outputDirectory, "production-code.js"), productionCode),
  writeFile(path.join(outputDirectory, "production-ui.html"), productionUi),
]);
console.log(JSON.stringify({ outputDirectory, ...build }, null, 2));

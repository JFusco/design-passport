import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateDevelopmentBundle(metadata, artifacts) {
  if (!metadata || metadata.schemaVersion !== 1 || metadata.channel !== "development" || typeof metadata.buildSha !== "string" || !metadata.buildSha) {
    throw new Error("Development copy requires development-stamped build metadata");
  }
  if (metadata.artifacts?.codeSha256 !== sha256(artifacts.code)
    || metadata.artifacts?.uiSha256 !== sha256(artifacts.ui)) {
    throw new Error("Development copy refused stale or mismatched build artifacts");
  }
}

export async function syncDevelopmentBundle(root = process.cwd()) {
  const [metadataBytes, code, ui] = await Promise.all([
    readFile(path.join(root, "dist/build-metadata.json")),
    readFile(path.join(root, "dist/code.js")),
    readFile(path.join(root, "dist/index.html")),
  ]);
  let metadata;
  try { metadata = JSON.parse(metadataBytes.toString("utf8")); }
  catch { throw new Error("Development copy requires valid build metadata"); }
  validateDevelopmentBundle(metadata, { code, ui });
  await mkdir(path.join(root, "development/dist"), { recursive: true });
  await Promise.all([
    copyFile(path.join(root, "dist/code.js"), path.join(root, "development/dist/code.js")),
    copyFile(path.join(root, "dist/index.html"), path.join(root, "development/dist/index.html")),
  ]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await syncDevelopmentBundle();
}

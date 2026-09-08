import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "node_modules", "@verndale", "ui-design-brain");
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
if (packageJson.version !== "1.17.0") {
  throw new Error(`Expected @verndale/ui-design-brain 1.17.0, received ${packageJson.version}`);
}

const catalogRoot = path.join(packageRoot, "skills", "ui-design-brain");
const manifestRaw = await readFile(path.join(catalogRoot, "patterns-manifest.json"), "utf8");
const manifest = JSON.parse(manifestRaw);
const authority = JSON.parse(await readFile(path.join(catalogRoot, "catalog-manifest.json"), "utf8"));
if (manifest.length !== 80) throw new Error(`Expected 80 canonical patterns, received ${manifest.length}`);

const patterns = [];
for (const entry of manifest) {
  const guidance = await readFile(path.join(catalogRoot, entry.file), "utf8");
  patterns.push({ ...entry, guidance });
}

const catalogDigest = authority.manifestDigest;
const output = `${JSON.stringify({
  schemaVersion: 1,
  catalogVersion: packageJson.version,
  catalogDigest,
  authoritySourceDigest: authority.sourceDigest,
  authority: authority.authority,
  patterns,
}, null, 2)}\n`;
const destination = path.join(root, "src", "generated", "ui-design-brain.catalog.json");

if (process.argv.includes("--check")) {
  const current = await readFile(destination, "utf8").catch(() => "");
  if (current !== output) throw new Error("Generated UI Design Brain catalog is missing or stale; run pnpm catalog:sync");
} else {
  await writeFile(destination, output, "utf8");
}

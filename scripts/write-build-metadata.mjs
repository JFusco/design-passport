import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { buildMetadata } from "./build-metadata.mjs";

import { verifyBuiltGuidance } from "./conductor-release.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const [code, ui] = await Promise.all([
  readFile("dist/code.js"),
  readFile("dist/index.html"),
]);
const metadata = buildMetadata();
await writeFile("dist/build-metadata.json", `${JSON.stringify({
  schemaVersion: 1,
  ...metadata,
  ...(metadata.channel === "production" ? { guidance: await verifyBuiltGuidance(code) } : {}),
  artifacts: { codeSha256: sha256(code), uiSha256: sha256(ui) },
}, null, 2)}\n`);

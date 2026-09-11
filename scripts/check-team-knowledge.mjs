import { readFile } from "node:fs/promises";

const release = await readFile(new URL("../knowledge/releases/team-knowledge-pack.v1.json", import.meta.url), "utf8");
const bundled = await readFile(new URL("../src/generated/team-knowledge.pack.json", import.meta.url), "utf8");
if (release !== bundled) {
  throw new Error("Bundled team knowledge has drifted from the reviewed release pack. Run `pnpm companion knowledge build` and review both files.");
}

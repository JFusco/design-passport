import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// Read-only synthetic benchmark: no files, Figma edits, or network calls.
// Use the same diagnostics with a real Figma file before claiming a speedup.
const pageCount = Number(process.argv[2] ?? 65);
const nodesPerRoot = Number(process.argv[3] ?? 100);
if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 100 || !Number.isInteger(nodesPerRoot) || nodesPerRoot < 1 || nodesPerRoot > 1_000) throw new Error("Use 1–100 pages and 1–1000 child nodes per root");
const runtime = await build({
  stdin: {
    contents: `
      import { contextFixture } from "./tests/context-cache-fixtures";
      import { FigmaAdapter } from "./src/figma/adapter";
      const fixture = contextFixture(${pageCount}, ${nodesPerRoot});
      const cold = await fixture.adapter.buildKnowledge(fixture.readinessProfile, () => {}, {contextCache:fixture.cache});
      const restarted = new FigmaAdapter();
      restarted.getCollectionOptions = async () => [];
      const cached = await restarted.buildKnowledge(fixture.readinessProfile, () => {}, {contextCache:fixture.cache});
      const full = await restarted.buildKnowledge(fixture.readinessProfile, () => {}, {forceFullCapture:true});
      const stripTime = ({builtAt,...rest}) => rest;
      if (JSON.stringify(stripTime(cached.graph)) !== JSON.stringify(stripTime(full.graph))) throw new Error("Cached capture differs from forced full capture");
      console.log(JSON.stringify({fixture:"synthetic Plugin API doubles; excludes Figma bridge latency", pages:${pageCount}, nodes:${pageCount * (nodesPerRoot + 1)}, cacheBytes:JSON.stringify([...fixture.cacheValues.values()]).length, outputsEqual:true, cold:cold.diagnostics, reopened:cached.diagnostics, forcedFull:full.diagnostics},null,2));
    `,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
    sourcefile: "context-cache-benchmark.ts",
    loader: "ts",
  },
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
await import(`data:text/javascript;base64,${Buffer.from(runtime.outputFiles[0].text).toString("base64")}`);

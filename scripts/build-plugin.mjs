import { build } from "esbuild";
import { buildDefines } from "./build-metadata.mjs";

await build({
  entryPoints: ["src/plugin/main.ts"],
  bundle: true,
  outfile: "dist/code.js",
  format: "iife",
  target: "es2020",
  platform: "browser",
  logLevel: "warning",
  define: buildDefines(),
});

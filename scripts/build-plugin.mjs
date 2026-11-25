import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildDefines } from "./build-metadata.mjs";
import { releaseBanner, verifiedReleaseInput } from "./conductor-release.mjs";

export async function buildPlugin(root = process.cwd(), define = buildDefines()) {
  const production = define.__DESIGN_PASSPORT_BUILD_CHANNEL__ === '"production"';
  const input = production ? await verifiedReleaseInput(root) : undefined;
  await build({
    absWorkingDir: root,
    entryPoints: ["src/plugin/main.ts"],
    bundle: true,
    outfile: "dist/code.js",
    format: "iife",
    target: "es2020",
    platform: "browser",
    logLevel: "warning",
    define,
    ...(input ? {
      // Pin this compilation to the same verified bytes and receipt even if
      // another prepare command replaces the files during the build.
      banner: { js: releaseBanner(input.receipt) },
      plugins: [{
        name:"verified-team-guidance",
        setup(builder) {
          let bundled = false;
          builder.onResolve({filter:/^\.\.\/generated\/team-knowledge\.pack\.json$/}, () => ({
            path: "team-knowledge.pack.json", namespace: "conductor-export",
          }));
          builder.onLoad({filter:/.*/, namespace:"conductor-export"}, () => {
            bundled = true;
            return {contents:input.bytes,loader:"json"};
          });
          builder.onEnd(() => {
            if (!bundled) return {errors:[{text:"The production entry point did not include the verified guidance."}]};
          });
        },
      }],
    } : {}),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildPlugin();

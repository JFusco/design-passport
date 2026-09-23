import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export function gitSourceIdentity() {
  const revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" });
  const dirty = status.trim().length > 0;
  const dirtyDigest = dirty
    ? createHash("sha256")
      .update(status)
      .update("\0")
      .update(execFileSync("git", ["diff", "--binary", "HEAD"], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 }))
      .digest("hex")
      .slice(0, 12)
    : undefined;
  return { revision, dirty, ...(dirtyDigest ? { dirtyDigest } : {}) };
}

export function buildMetadata(options = {}) {
  const source = options.source ?? gitSourceIdentity();
  const requestedChannel = options.channel ?? process.env.DESIGN_PASSPORT_CHANNEL ?? "development";
  if (requestedChannel !== "production" && requestedChannel !== "development") {
    throw new Error("DESIGN_PASSPORT_CHANNEL must be production or development");
  }
  if (requestedChannel === "production" && source.dirty) {
    throw new Error("Production builds require a clean Git checkout");
  }
  const revision = options.buildSha ?? process.env.DESIGN_PASSPORT_BUILD_SHA ?? source.revision;
  const buildSha = source.dirty ? `${revision}-dirty.${source.dirtyDigest ?? "unknown"}` : revision;
  return { buildSha, channel: requestedChannel, revision: source.revision, dirty: source.dirty };
}

export function buildDefines() {
  const metadata = buildMetadata();
  return {
    __DESIGN_PASSPORT_BUILD_SHA__: JSON.stringify(metadata.buildSha),
    __DESIGN_PASSPORT_BUILD_CHANNEL__: JSON.stringify(metadata.channel),
  };
}

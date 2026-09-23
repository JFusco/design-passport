import { execFileSync } from "node:child_process";

export function buildMetadata() {
  const buildSha = process.env.DESIGN_PASSPORT_BUILD_SHA
    || execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
  const requestedChannel = process.env.DESIGN_PASSPORT_CHANNEL || "development";
  if (requestedChannel !== "production" && requestedChannel !== "development") {
    throw new Error("DESIGN_PASSPORT_CHANNEL must be production or development");
  }
  return { buildSha, channel: requestedChannel };
}

export function buildDefines() {
  const metadata = buildMetadata();
  return {
    __DESIGN_PASSPORT_BUILD_SHA__: JSON.stringify(metadata.buildSha),
    __DESIGN_PASSPORT_BUILD_CHANNEL__: JSON.stringify(metadata.channel),
  };
}

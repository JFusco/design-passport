import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import source from "../src/core/conductor-contracts.source.json";
import { WORKSPACE_CONTRACT_VERSION } from "../src/core/conductor-contracts";
describe("pinned Conductor contract", () => {
  it("matches the recorded canonical source digests and negotiated version", () => {
    expect(source.contractVersion).toBe(WORKSPACE_CONTRACT_VERSION);
    for (const [name, provenance] of Object.entries(source.files)) {
      expect(createHash("sha256").update(readFileSync(new URL(`../src/core/${name}`, import.meta.url))).digest("hex")).toBe(provenance.sha256);
    }
  });
});

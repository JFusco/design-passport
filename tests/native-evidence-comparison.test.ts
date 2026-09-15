import { describe, expect, it } from "vitest";
import { compareNativeEvidence } from "../scripts/qa/compare-native-evidence.mjs";
import { buildReadinessReport } from "../src/core/report";
import { hashValue } from "../src/core/stable";
import { healthyGraph, profile } from "./fixtures";

function reports() {
  const p = profile();
  const input = { graph: healthyGraph(p), profile: p, scope: "file" as const, targetRootIds: ["root:desktop"] };
  return ["2026-09-14T10:00:00Z", "2026-09-14T10:01:00Z"].map((date) => buildReadinessReport({ ...input, now: new Date(date) }));
}

describe("native evidence comparison", () => {
  it("excludes only generation identity while requiring repair and build evidence for complete parity", () => {
    const [left, right] = reports();
    expect(left!.snapshotHash).not.toBe(right!.snapshotHash);
    expect(compareNativeEvidence(left, right, undefined, undefined)).toMatchObject({ reportsMatch: true, comparisonPassed: true, releaseParityEvidenceComplete: false, plansMatch: null, sameBuild: null });
    const wrap = (report: unknown, plans: unknown[], build = "same-built-plugin") => ({ kind: "design-passport-native-qa-evidence", metadata: { source: { productionCodeSha256: build, productionUiSha256: "same-ui" }, harnessSourceSha256: "same-harness" }, runs: [{ number: 1, status: "completed", report, plans, elapsedMs: 123, handlerCompleteElapsedMs: 456, handlerReturned: "fulfilled", timingOrigin: "qa-send" }] });
    expect(compareNativeEvidence(wrap(left, []), wrap(right, []), 1, 1)).toMatchObject({ releaseParityEvidenceComplete: true, timing: [{ includesPreflight: true, handlerCompleteElapsedMs: 456, reportVisibleElapsedMs: 123, completeBenchmarkTiming: true }, { includesPreflight: true, completeBenchmarkTiming: true }] });
    expect(compareNativeEvidence(wrap(left, []), wrap(right, [{ id: "different-repair" }]), 1, 1).comparisonPassed).toBe(false);
    expect(compareNativeEvidence(wrap(left, []), wrap(right, [], "another-build"), 1, 1).comparisonPassed).toBe(false);
  });

  it("rejects corrupted reports and detects changed document hashes even with identical grades", () => {
    const [left, right] = reports();
    right!.target.knowledgeSnapshotHash = "another-document-revision";
    expect(() => compareNativeEvidence(left, right, undefined, undefined)).toThrow("snapshot hash");
    const { snapshotHash: _previous, ...material } = right!;
    right!.snapshotHash = hashValue(material);
    expect(compareNativeEvidence(left, right, undefined, undefined)).toMatchObject({ reportsMatch: false, sameKnowledgeSnapshot: false, differingReportFields: ["target"], comparisonPassed: false });
  });
});

#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { hashValue } from "../../src/core/stable.ts";

function selectRun(input, number) {
  if (input?.kind === "design-passport-native-qa-evidence") {
    const run = number === undefined
      ? input.runs.findLast((item) => item.status === "completed" && item.report)
      : input.runs.find((item) => item.number === number && item.status === "completed" && item.report);
    if (!run) throw new Error("The selected evidence has no completed report run");
    const source = input.metadata?.source;
    const build = source?.productionCodeSha256 && source?.productionUiSha256 && input.metadata.harnessSourceSha256
      ? { code: source.productionCodeSha256, ui: source.productionUiSha256, harness: input.metadata.harnessSourceSha256 }
      : undefined;
    return { ...run, build };
  }
  if (number !== undefined) throw new Error("Run numbers apply only to native harness exports");
  if (![1, 2, 3].includes(input?.schemaVersion) || !input.target || !Array.isArray(input.findings)) throw new Error("Expected a report or native harness export");
  return { report: input };
}

function reportMaterial(report) {
  const { snapshotHash, ...material } = report;
  if (hashValue(material) !== snapshotHash) throw new Error("A report snapshot hash does not match its original contents");
  // Snapshot identity includes generatedAt. Verify it above, then exclude only
  // the timestamp and its derived hash. Knowledge/document hashes stay intact.
  const { generatedAt, ...comparable } = material;
  return comparable;
}

export function compareNativeEvidence(leftInput, rightInput, leftNumber, rightNumber) {
  const left = selectRun(leftInput, leftNumber);
  const right = selectRun(rightInput, rightNumber);
  const leftReport = reportMaterial(left.report);
  const rightReport = reportMaterial(right.report);
  const sameBuild = left.build && right.build ? isDeepStrictEqual(left.build, right.build) : null;
  const reportsMatch = isDeepStrictEqual(leftReport, rightReport);
  const plansAvailable = Array.isArray(left.plans) && Array.isArray(right.plans);
  const plansMatch = plansAvailable ? isDeepStrictEqual(left.plans, right.plans) : null;
  return {
    reportsMatch,
    plansMatch,
    sameBuild,
    sameKnowledgeSnapshot: left.report.target.knowledgeSnapshotHash === right.report.target.knowledgeSnapshotHash,
    differingReportFields: [...new Set([...Object.keys(leftReport), ...Object.keys(rightReport)])].filter((field) => !isDeepStrictEqual(leftReport[field], rightReport[field])),
    excluded: ["generatedAt", "snapshotHash (validated against complete original report, including generatedAt)"],
    comparisonPassed: reportsMatch && plansMatch !== false && sameBuild !== false,
    releaseParityEvidenceComplete: reportsMatch && plansMatch === true && sameBuild === true,
    timing: [left, right].map((run) => ({
      run: run.number ?? null,
      mode: run.refresh?.mode ?? null,
      intent: run.request?.request?.mode ?? null,
      reportVisibleElapsedMs: run.reportVisibleElapsedMs ?? run.elapsedMs ?? null,
      handlerCompleteElapsedMs: run.handlerCompleteElapsedMs ?? null,
      includesPreflight: run.timingOrigin === "qa-send",
      completeBenchmarkTiming: run.timingOrigin === "qa-send" && Number.isFinite(run.handlerCompleteElapsedMs)
        && run.handlerCompleteElapsedMs >= 0 && ["fulfilled", "resolved"].includes(run.handlerReturned),
    })),
    note: "Report-only exports can establish report equality; they cannot establish repair-plan equality, build identity, batch equality, or a median performance improvement.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [leftPath, rightPath, leftRun, rightRun, ...extra] = process.argv.slice(2);
    if (!leftPath || !rightPath || extra.length || [leftRun, rightRun].some((number) => number !== undefined && !/^[1-9][0-9]*$/.test(number))) throw new Error("Usage: node scripts/qa/compare-native-evidence.mjs LEFT.json RIGHT.json [LEFT_RUN RIGHT_RUN]");
    const [left, right] = await Promise.all([leftPath, rightPath].map(async (file) => JSON.parse(await readFile(file, "utf8"))));
    const comparison = compareNativeEvidence(left, right, leftRun ? Number(leftRun) : undefined, rightRun ? Number(rightRun) : undefined);
    console.log(JSON.stringify(comparison, null, 2));
    if (!comparison.comparisonPassed) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

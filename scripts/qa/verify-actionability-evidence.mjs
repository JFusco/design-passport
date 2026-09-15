#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

const [fixturePath, cleanupPath, navigationPath] = process.argv.slice(2);
if (!fixturePath || !cleanupPath || !navigationPath || process.argv.length !== 5) {
  throw new Error("Usage: node scripts/qa/verify-actionability-evidence.mjs FIXTURE.json CLEANUP.json NAVIGATION.json");
}

const [fixtureEvidence, cleanupEvidence, navigationEvidence] = await Promise.all(
  [fixturePath, cleanupPath, navigationPath].map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const completed = (evidence) => evidence.runs.filter((run) => run.status === "completed" && run.report);
const eventMessages = (evidence, type) => evidence.events
  .filter((event) => event.message?.type === type)
  .map((event) => event.message.message);

for (const [label, evidence] of [["fixture", fixtureEvidence], ["cleanup", cleanupEvidence], ["navigation", navigationEvidence]]) {
  assert(evidence.kind === "design-passport-native-qa-evidence", `${label} is not native Design Passport evidence`);
  assert(evidence.metadata?.source?.productionCodeSha256 && evidence.metadata?.source?.productionUiSha256,
    `${label} does not identify the production bundles that ran`);
  assert(evidence.metadata?.pluginIdentity?.isolatedStorage === true, `${label} did not use isolated plugin storage`);
}

const initial = completed(fixtureEvidence).at(-1);
assert(initial?.report.findings.length === 260 && initial.plans?.length === 3, "The initial fixture report or plans changed");
assert(initial.report.grade.score === 45.1 && initial.report.grade.letter === "F", "The initial fixture grade changed");

const cleanupRuns = completed(cleanupEvidence);
assert(cleanupRuns.length === 7, `Expected seven completed cleanup/recheck runs; received ${cleanupRuns.length}`);
const [before, lowRisk, structural, afterUndo, applyAll, component, issue] = cleanupRuns;
assert(before.report.findings.length === 260 && before.plans?.length === 3, "The cleanup session did not start from the verified fixture");
assert(lowRisk.request?.type === "apply-plan" && lowRisk.report.findings.length === 259 && lowRisk.plans?.length === 2,
  "Low-risk cleanup did not remove exactly one finding and one plan");
assert(lowRisk.report.grade.score === 46.3, "Low-risk cleanup did not produce the expected grade improvement");
assert(structural.request?.type === "apply-plan" && structural.report.findings.length === 257 && structural.plans?.length === 1,
  "Checkpoint-backed structural cleanup did not produce the expected report");
assert(afterUndo.refresh?.requested === "changes" && afterUndo.refresh.mode === "incremental"
  && afterUndo.report.findings.length === 259 && afterUndo.plans?.length === 2,
  "Undo followed by Recheck changes did not restore the prior structural finding and plan");
assert(applyAll.request?.type === "apply-all" && applyAll.report.findings.length === 255 && applyAll.plans?.length === 0,
  "Validated structural apply-all did not leave an idempotent zero-plan result");
assert(component.refresh?.requested === "component" && component.refresh.resolvedCount === 0 && component.refresh.remainingCount === 7,
  "Component recheck did not report the expected bounded result");
assert(issue.refresh?.requested === "issue" && issue.refresh.resolvedCount === 0 && issue.refresh.remainingCount === 1,
  "Issue recheck did not report the expected bounded result");

const mutations = eventMessages(cleanupEvidence, "mutation-result");
for (const expected of [
  "Applied 8 operations. Rescanning the complete file…",
  "Applied 1 operations after a version-history checkpoint. Rescanning the complete file…",
  "Applied 2 validated structural operations in isolated undo groups. Rescanning the complete file…",
]) assert(mutations.includes(expected), `Missing native mutation evidence: ${expected}`);

const latestNavigationRun = completed(navigationEvidence).at(-1);
assert(latestNavigationRun?.refresh?.mode === "incremental" && latestNavigationRun.refresh.requested === "changes",
  "The navigation build was not refreshed live before navigation testing");
assert(latestNavigationRun.report.findings.length === 255 && latestNavigationRun.plans?.length === 0,
  "The navigation build changed the verified post-cleanup report or recreated repairs");
const renderedFinding = latestNavigationRun.report.findings.find((finding) => finding.nodeId === "I2004:736;2004:729"
  && finding.ruleId === "accessibility.text-contrast-node");
assert(renderedFinding?.provenance?.navigationNodeId === "2004:736",
  "The rendered instance occurrence does not retain an explicit owning-instance navigation target");
const instanceInspection = navigationEvidence.inspections.find((inspection) => inspection.nodes?.some((node) => node?.id === "2004:736"));
assert(instanceInspection, "Native navigation did not select and inspect the owning instance");

const pageInspection = navigationEvidence.inspections.findLast((inspection) => inspection.nodes?.[0]?.id === "2004:691")?.nodes[0];
assert(pageInspection?.type === "PAGE" && pageInspection.children?.length === 7,
  "Temporary validation clones or other stray roots remain on the fixture page");
const manual = navigationEvidence.inspections.findLast((inspection) => inspection.nodes?.[0]?.id === "2004:774")?.nodes[0];
const cleanup = navigationEvidence.inspections.findLast((inspection) => inspection.nodes?.[0]?.id === "2004:764")?.nodes[0];
assert(manual?.layoutMode === "HORIZONTAL" && manual.children?.length === 2, "The manual layout repair postcondition failed");
assert(cleanup?.layoutMode === "HORIZONTAL" && cleanup.children?.length === 3, "The cleanup panel repair postcondition failed");
for (const node of [manual, cleanup]) {
  assert(node.annotationLabels?.includes("AI source frame"), `${node.name} lost its source annotation`);
  assert(node.children.every((child) => child.x >= -0.5 && child.y >= -0.5
    && child.x + child.width <= node.width + 0.5 && child.y + child.height <= node.height + 0.5),
  `${node.name} contains a child outside the accepted 0.5px boundary`);
}

console.log(JSON.stringify({
  fixture: { findings: initial.report.findings.length, plans: initial.plans.length, grade: initial.report.grade },
  cleanup: {
    lowRiskOperations: 8,
    checkpointOperations: 1,
    isolatedStructuralOperations: 2,
    finalFindings: applyAll.report.findings.length,
    finalPlans: applyAll.plans.length,
    grade: applyAll.report.grade,
    componentRecheckRemaining: component.refresh.remainingCount,
    issueRecheckRemaining: issue.refresh.remainingCount,
  },
  navigation: { renderedNodeId: renderedFinding.nodeId, navigationNodeId: renderedFinding.provenance.navigationNodeId },
  pageTopLevelNodes: pageInspection.children.length,
  result: "passed",
}, null, 2));

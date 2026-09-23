#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";

const [evidencePath] = process.argv.slice(2);
if (!evidencePath) throw new Error("Usage: node scripts/qa/verify-scanner-fixture-evidence.mjs EVIDENCE.json");
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

assert(evidence.kind === "design-passport-native-qa-evidence", "Not a native Design Passport QA export");
assert(evidence.metadata?.source?.productionCodeSha256 && evidence.metadata?.source?.productionUiSha256,
  "The export does not identify the production bundles that ran");
assert(evidence.metadata?.pluginIdentity?.isolatedStorage === true, "The native run did not use isolated plugin storage");

const fixtures = (evidence.inspections ?? []).filter((item) => item.type === "qa-fixture-created");
assert(fixtures.length > 0, "No native scanner fixture was created in this evidence");
const fixture = fixtures.at(-1).result;
assert(fixture && fixture.pageId && fixture.rootIds?.length === 7, "The latest fixture record is incomplete");
assert(new Set(fixture.expectations?.map((item) => item.key)).size === 25, "Expected all 25 native fixture cases");

const run = [...(evidence.runs ?? [])].reverse().find((item) => item.status === "completed" && item.report
  && same(item.report.target?.rootIds, fixture.rootIds));
assert(run, "No completed report targets the latest fixture roots");
assert(run.handlerReturned === "fulfilled" && Number.isFinite(run.handlerCompleteElapsedMs), "The production handler did not finish cleanly");
assert(run.knowledge?.complete === true && run.knowledge?.cancelled === false, "The supporting knowledge graph is incomplete");
const report = run.report;
assert(report.schemaVersion === 3, `Expected report schema 3, received ${report.schemaVersion}`);
assert(report.rulesetVersion === "1.0.0-beta.4", `Expected ruleset 1.0.0-beta.4, received ${report.rulesetVersion}`);
assert(report.producer?.pluginVersion === "0.4.0" && report.producer?.rulesetVersion === "1.0.0-beta.4"
  && report.producer?.buildSha && ["production", "development"].includes(report.producer.channel), "Report producer identity is incomplete");
assert(report.target.scope === "page" && report.target.knowledgeComplete === true, "The captured page target is not complete");
assert(same(report.target.rootIds, fixture.rootIds), "The report did not preserve the fixture's captured target");

const findings = report.findings ?? [];
const one = (ruleId, nodeId) => {
  const matches = findings.filter((item) => item.ruleId === ruleId && (nodeId === undefined || item.nodeId === nodeId));
  assert(matches.length === 1, `Expected one ${ruleId}${nodeId ? ` finding for ${nodeId}` : ""}; found ${matches.length}`);
  return matches[0];
};
const measured = (ruleId, nodeId) => one(ruleId, nodeId).evidence.measured;
const id = (label) => {
  const value = fixture.nodeIds?.[label];
  assert(typeof value === "string" && value.length > 0, `Fixture node ID is missing for ${label}`);
  return value;
};

for (const finding of findings) {
  assert(["requirement", "recommendation", "governance"].includes(finding.category), `Finding ${finding.id} has no v2 category`);
  if (finding.category !== "requirement") {
    assert(finding.scoreImpact === false, `${finding.id} is advisory but affects scoring`);
    assert(finding.hardBlocker !== true, `${finding.id} is advisory but blocks readiness`);
    assert(finding.status !== "fail", `${finding.id} is advisory but is presented as a failure`);
  }
}

const typographyRoot = id("Typography");
const styledId = id("styled text");
const overrideId = id("style override");
const mixedId = id("mixed runs");
const typographyCoverage = measured("token.application.started", typographyRoot);
assert(typographyCoverage.eligible === 35 && typographyCoverage.bound === 12,
  `Expected 12 of 35 typography-root fields to have variable/style evidence; received ${typographyCoverage.bound} of ${typographyCoverage.eligible}`);
const mixedReview = one("token.application.typography-review", mixedId);
assert(mixedReview.category === "recommendation" && mixedReview.scoreImpact === false
  && same(mixedReview.evidence.measured.mixedFields, ["fontSize"]), "Mixed text was not isolated as non-scoring font-size review");
assert(!findings.some((item) => item.ruleId === "token.application.typography-review" && [styledId, overrideId].includes(item.nodeId)),
  "Resolved styled text was incorrectly sent to typography review");

const overrideInspection = [...(evidence.inspections ?? [])].reverse().find((item) => item.type === "qa-inspection"
  && item.nodes?.some((node) => node?.id === overrideId));
const nativeOverride = overrideInspection?.nodes?.find((node) => node?.id === overrideId)?.textStyleEvidence;
assert(nativeOverride?.textStyleId === fixture.styleIds?.body, "The native editor override lost its applied text style identity");
assert(nativeOverride?.segments?.length === 1 && nativeOverride.segments[0].fontWeight === 700
  && nativeOverride.segments[0].textStyleOverrides?.includes("SEMANTIC_WEIGHT"),
  "The native editor did not expose the expected SEMANTIC_WEIGHT override");
const percent = fixture.textStyleEvidence?.percentage?.segments?.[0];
assert(percent?.letterSpacing?.unit === "PERCENT" && percent?.lineHeight?.unit === "PERCENT",
  "The native percentage typography units were not retained");
assert(fixture.variableBindingEvidence?.bodyFontSize && fixture.variableBindingEvidence?.actionFontSize
  && fixture.variableBindingEvidence.bodyFontSize !== fixture.variableBindingEvidence.actionFontSize,
  "Equal-valued body and action typography did not retain distinct semantic variable identities");
for (const finding of findings.filter((item) => item.ruleId === "token.application.repeated-literal")) {
  const field = finding.evidence.measured.field;
  const occurrences = finding.suggestedValue?.nodeIds ?? [];
  if (["fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight"].includes(field)) {
    assert(!occurrences.includes(styledId), `Style-controlled ${field} was repeated as literal debt`);
    if (!["fontStyle", "fontWeight"].includes(field)) assert(!occurrences.includes(overrideId), `Non-overridden ${field} was repeated as literal debt`);
  }
}

const property = fixture.propertyEvidence;
assert(property?.noStroke?.strokes?.length === 0, "The no-stroke fixture contains a stroke paint");
assert(property?.hiddenStroke?.strokes?.[0]?.visible === false, "The hidden-stroke fixture is visible");
assert(property?.transparentStroke?.strokes?.[0]?.opacity === 0, "The transparent-stroke fixture is opaque");
assert(property?.visibleStroke?.strokeWeight === 2 && property.visibleStroke.strokes?.[0]?.visible === true,
  "The visible-stroke control is not rendered");
assert(property?.inertRadius?.cornerRadius === 8 && property.inertRadius.fillCount === 0 && property.inertRadius.strokeCount === 0,
  "The inert-radius control has rendering evidence");
assert(property?.surfaceRadius?.cornerRadius === 8 && property.surfaceRadius.fillCount === 1,
  "The rendered-radius surface control is incomplete");
assert(same(property?.mixedCorners, { topLeft: 4, topRight: 12, bottomLeft: 0, bottomRight: 8 }),
  "The native mixed-corner values changed");
assert(property?.clippingRadius?.clipsContent === true && property?.radiusMask?.isMask === true,
  "Clipping and mask radius evidence is incomplete");
const geometryCoverage = measured("token.application.started", id("Geometry"));
assert(geometryCoverage.eligible === 16, `Expected 16 rendered geometry fields; received ${geometryCoverage.eligible}`);
for (const finding of findings.filter((item) => item.ruleId === "token.application.repeated-literal")) {
  if (!["strokes", "strokeWeight", "cornerRadius"].includes(finding.evidence.measured.field)) continue;
  const occurrences = finding.suggestedValue?.nodeIds ?? [];
  for (const excluded of [id("no stroke"), id("hidden stroke"), id("transparent stroke"), id("inert radius")]) {
    assert(!occurrences.includes(excluded), `Inert property on ${excluded} was repeated as literal debt`);
  }
}

const transparent = one("accessibility.contrast-unresolved", id("source white text"));
assert(transparent.status === "needs-review" && transparent.scoreImpact === false
  && transparent.evidence.measured.backgroundResolvable === false
  && transparent.evidence.measured.backgroundSourceNodeIds?.length === 0,
  "The isolated transparent definition used an assumed background");
const paintAggregate = measured("accessibility.text-contrast", id("Paint contexts"));
assert(paintAggregate.resolved === 3 && paintAggregate.failures === 0 && paintAggregate.unresolved === 1,
  "Placed-instance, translucent, or paint-order contrast evidence did not resolve as expected");

const disabled = one("accessibility.contrast-disabled", id("disabled true label"));
assert(disabled.status === "not-applicable" && disabled.scoreImpact === false
  && disabled.evidence.measured.disabledEvidence?.some((item) => item.property === "disabled" && item.disabled === true),
  "Explicit Boolean disabled evidence did not establish the exemption");
const enabled = one("accessibility.text-contrast-node", id("disabled false label"));
assert(enabled.status === "fail" && enabled.evidence.measured.minimum === 4.5
  && enabled.evidence.measured.backgroundSourceNodeIds?.includes(id("disabled false")),
  "The enabled Boolean instance did not retain its low-contrast failure and measured source");
const conflicting = one("accessibility.contrast-unresolved", id("conflicting state label"));
assert(conflicting.status === "needs-review" && conflicting.scoreImpact === false
  && conflicting.evidence.measured.interactionState === "conflicting"
  && conflicting.evidence.measured.backgroundSourceNodeIds?.includes(id("conflicting state")),
  "Conflicting state evidence was not retained as sourced review");
for (const label of ["inactive label", "unchecked label"]) {
  assert(one("accessibility.text-contrast-node", id(label)).status === "fail", `${label} was incorrectly treated as disabled`);
}

const targetFinding = one("accessibility.target-minimum", id("Button 23 tight"));
const targets = new Map(targetFinding.evidence.measured.targetEvidence.map((item) => [item.nodeId, item.assessment]));
assert(targetFinding.status === "fail" && targetFinding.evidence.measured.undersizedCount === 1
  && targetFinding.evidence.measured.spacingExceptionCount === 1 && targetFinding.evidence.measured.reviewCount === 2,
  "Target-size summary does not match the native geometry");
for (const [label, assessment] of [["Button 23.99 spaced", "spacing-exception"], ["Button 24 minimum", "minimum"],
  ["Button 44 preferred", "minimum"], ["Button 23 tight", "undersized"], ["Button overlapping", "review"], ["Button overlap peer", "review"]]) {
  assert(targets.get(id(label)) === assessment, `${label} expected ${assessment}; received ${targets.get(id(label))}`);
}
const preferred = one("accessibility.target-preferred", id("Button 23.99 spaced"));
assert(preferred.category === "recommendation" && preferred.scoreImpact === false && preferred.evidence.measured.belowPreferredCount === 6,
  "The 44px target guidance is not advisory or has the wrong count");

const repeatedLayout = findings.filter((item) => item.ruleId === "token.application.repeated-literal"
  && item.rootId === id("Cleanup candidates") && ["itemSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].includes(item.evidence.measured.field));
assert(repeatedLayout.length === 5 && repeatedLayout.every((item) => item.category === "recommendation" && item.scoreImpact === false),
  "Repeated layout tokenization is missing or affects scoring");
assert(one("naming.whitespace", id("repeated container 3")).fixability === "automatic", "The whitespace cleanup is not automatic");
const inferred = one("structure.inferred-auto-layout", id("Manual layout acceptance"));
assert(inferred.fixability === "guarded" && inferred.scoreImpact === false && inferred.evidence.measured.tolerancePx === 0.5,
  "The inferred-layout repair does not retain its guarded tolerance");
assert(findings.some((item) => item.category === "governance" && item.ruleId === "naming.pattern-novel" && item.scoreImpact === false),
  "Vocabulary governance is missing or affects scoring");

console.log(JSON.stringify({
  evidencePath,
  productionCodeSha256: evidence.metadata.source.productionCodeSha256,
  productionUiSha256: evidence.metadata.source.productionUiSha256,
  pageId: fixture.pageId,
  rootIds: fixture.rootIds,
  fixtureCases: fixture.expectations.length,
  findings: findings.length,
  issueGroups: report.issueGroups?.length ?? 0,
  grade: report.grade,
  ready: report.ready,
  handlerCompleteElapsedMs: run.handlerCompleteElapsedMs,
  result: "passed",
}, null, 2));

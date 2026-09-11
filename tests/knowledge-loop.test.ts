import { describe, expect, it } from "vitest";
import type { DesignReferencePackV1, KnowledgeCandidateV1, ReviewLearningEnvelopeV1 } from "../src/core/contracts";
import {
  assertReferencePack,
  buildKnowledgeDecision,
  buildKnowledgeInsights,
  buildLearningEnvelope,
  buildMultiFileReviewReport,
  buildProjectStyleGuideBinding,
  buildReferencePack,
  compileTeamKnowledgePack,
  generateCandidateDrafts,
  knowledgeDomainForContext,
  parseProjectStyleGuideBinding,
  reviseKnowledgeCandidate,
  validateSessionPackUse,
} from "../src/core/knowledge-loop";
import { buildReadinessReport } from "../src/core/report";
import { evaluateRules } from "../src/core/rules";
import { hashValue } from "../src/core/stable";
import { healthyGraph, profile } from "./fixtures";

function pack(role: "style-guide" | "reference" = "style-guide", facts?: DesignReferencePackV1["facts"]): DesignReferencePackV1 {
  return buildReferencePack({
    packVersion: "1.0.0",
    source: {
      schemaVersion: 1,
      sourceId: role === "style-guide" ? "source:style" : "source:reference",
      projectScope: "project:ui-library",
      role,
      contentDigest: hashValue("source"),
      completeness: { complete: true, availableDomains: ["layout"], warnings: [] },
    },
    facts: facts ?? [{
      factId: "fact:spacing",
      domain: "layout",
      label: "Spacing",
      guidance: "Use the documented project spacing scale.",
      matcher: { kind: "numeric-node-field", field: "itemSpacing", allowedValues: [8] },
      provenance: "figma-derived",
    }],
  }, new Date("2026-09-10T12:00:00.000Z"));
}

function report() {
  const p = profile();
  const graph = healthyGraph(p);
  return buildReadinessReport({ graph, profile: p, scope: "selection", targetRootIds: ["root:desktop"], findings: evaluateRules(graph, p, ["root:desktop"]) });
}

describe("project-scoped advisory packs", () => {
  it("binds a validated style guide to one file fingerprint only", () => {
    const binding = buildProjectStyleGuideBinding(pack(), "file-key", new Date("2026-09-10T12:00:00.000Z"));
    expect(parseProjectStyleGuideBinding(JSON.stringify(binding), "file-key")).toEqual(binding);
    expect(() => parseProjectStyleGuideBinding(JSON.stringify(binding), "copied-file-key")).toThrow(/different Figma file/i);
  });

  it("allows session-only style guidance when no stable file key exists", () => {
    expect(validateSessionPackUse(pack("style-guide"), false)).toBe("style-guide");
    expect(() => validateSessionPackUse(pack("style-guide"), true)).toThrow(/Connect project style guide/i);
    expect(validateSessionPackUse(pack("reference"), true)).toBe("reference");
  });

  it("rejects wrong-role, unsafe, malformed, and oversized packs", () => {
    expect(() => assertReferencePack(pack("reference"), "style-guide")).toThrow(/role/i);
    const unsafe = pack();
    unsafe.facts[0]!.guidance = "See https://example.com/private";
    expect(() => assertReferencePack(unsafe)).toThrow(/URL/i);
    const extra = { ...pack(), unknown: true };
    expect(() => assertReferencePack(extra)).toThrow(/schema/i);
    const oversized = pack();
    oversized.facts = Array.from({ length: 1_000 }, (_, index) => ({
      factId: `fact:${index}`,
      domain: "layout" as const,
      label: "Spacing",
      guidance: "x".repeat(200),
      matcher: { kind: "informational" as const },
      provenance: "figma-derived" as const,
    }));
    oversized.digest = hashValue(oversized);
    expect(() => assertReferencePack(oversized)).toThrow(/digest|90 KB/i);
  });

  it("creates source-qualified insights without changing any report or certification field", () => {
    const graph = healthyGraph();
    const before = report();
    const frozen = structuredClone(before);
    const insights = buildKnowledgeInsights({ graph, targetRootIds: ["root:desktop"], projectPack: pack(), referencePacks: [pack("reference")] });
    expect(insights.some((insight) => insight.origin === "project" && insight.targetNodeId === "root:desktop")).toBe(true);
    expect(insights.some((insight) => insight.origin === "reference")).toBe(true);
    expect(before).toEqual(frozen);
  });
});

describe("human-gated knowledge loop", () => {
  it("uses timestamp-independent envelope identity and neutral unique-contribution counts", () => {
    const first = buildLearningEnvelope({ projectScope: "project:ui-library", report: report(), pluginVersion: "1", knowledgeVersion: "1", now: new Date("2026-09-10T12:00:00Z") });
    const second = buildLearningEnvelope({ projectScope: "project:ui-library", report: report(), pluginVersion: "1", knowledgeVersion: "1", now: new Date("2026-09-11T12:00:00Z") });
    expect(second.digest).toBe(first.digest);
    const candidates = generateCandidateDrafts([first, second, ...Array.from({ length: 98 }, () => structuredClone(first))]);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.evidenceEnvelopeDigests.length === 1)).toBe(true);
    expect(JSON.stringify(candidates)).not.toMatch(/corroborated|conflicted|confidence|eligible/i);
    expect(candidates.every((candidate) => !candidate.wording.includes("axis:") && !candidate.wording.includes("component."))).toBe(true);
    for (const uniqueCount of [1, 2, 100]) {
      const unique = Array.from({ length: uniqueCount }, (_, index) => buildLearningEnvelope({
        projectScope: "project:ui-library",
        report: report(),
        pluginVersion: `1.${index}`,
        knowledgeVersion: "1",
        now: new Date("2026-09-10T12:00:00Z"),
      }));
      const draft = generateCandidateDrafts(unique)[0]!;
      expect(draft.evidenceEnvelopeDigests).toHaveLength(uniqueCount);
      expect(draft.supportCount + draft.contradictCount).toBe(uniqueCount);
    }
  });

  it("contributes actionable findings without turning passing checks or untouched grades into drafts", () => {
    const readiness = report();
    const actionableRuleIds = new Set(readiness.findings.filter((finding) => finding.status !== "pass" && finding.status !== "not-applicable").map((finding) => finding.ruleId));
    const envelope = buildLearningEnvelope({ projectScope: "project:ui-library", report: readiness, pluginVersion: "1", knowledgeVersion: "1" });
    expect(envelope.observations.every((observation) => observation.kind !== "rescan-outcome")).toBe(true);
    expect(envelope.observations.filter((observation) => observation.kind === "repeated-finding").every((observation) => actionableRuleIds.has(observation.ruleId!))).toBe(true);
    expect(envelope.observations.filter((observation) => observation.kind === "repeated-finding").every((observation) => Boolean(observation.canonicalLabel))).toBe(true);
  });

  it("shows supporting and contradictory evidence without inferring a state", () => {
    const first = buildLearningEnvelope({ projectScope: "project:ui-library", report: report(), pluginVersion: "1", knowledgeVersion: "1", now: new Date("2026-09-10T12:00:00Z") });
    const observation = first.observations[0]!;
    const base = { ...first, observations: [{ ...observation, direction: observation.direction === "support" ? "contradict" as const : "support" as const }] };
    const second = { ...base, digest: "" } as ReviewLearningEnvelopeV1;
    const material = { ...second } as Record<string, unknown>;
    delete material.digest;
    delete material.generatedAt;
    second.digest = hashValue(material);
    const candidate = generateCandidateDrafts([first, second]).find((item) => item.groupKey.includes("h53:"));
    expect(candidate).toBeDefined();
    expect((candidate!.supportCount + candidate!.contradictCount)).toBeGreaterThan(0);
    expect(candidate).not.toHaveProperty("state");
  });

  it("publishes only a human-approved current shared candidate digest", () => {
    const envelope = buildLearningEnvelope({ projectScope: "project:ui-library", report: report(), pluginVersion: "1", knowledgeVersion: "1", now: new Date("2026-09-10T12:00:00Z") });
    const candidate = generateCandidateDrafts([envelope], new Date("2026-09-10T12:00:00Z"))[0]!;
    const approval = buildKnowledgeDecision({ decisionId: "decision:1", candidateId: candidate.candidateId, candidateDigest: candidate.digest, action: "approve", scope: "shared", rationale: "Client-neutral and useful." }, new Date("2026-09-10T13:00:00Z"));
    const compiled = compileTeamKnowledgePack({ knowledgeVersion: "1", candidates: [candidate], decisions: [approval] });
    expect(compiled.entries).toHaveLength(1);
    expect(compiled.entries[0]?.domain).toBe(knowledgeDomainForContext(candidate.context));
    const edited = reviseKnowledgeCandidate(candidate, { wording: `${candidate.wording} Apply carefully.`, proposedScope: "shared", exceptions: [] }, new Date("2026-09-10T14:00:00Z"));
    expect(edited.digest).not.toBe(candidate.digest);
    expect(compileTeamKnowledgePack({ knowledgeVersion: "1", candidates: [edited], decisions: [approval] }).entries).toHaveLength(0);
    for (const action of ["reject", "defer"] as const) {
      const decision = buildKnowledgeDecision({ decisionId: `decision:${action}`, candidateId: candidate.candidateId, candidateDigest: candidate.digest, action, scope: "shared", rationale: "Reviewed." });
      expect(compileTeamKnowledgePack({ knowledgeVersion: "1", candidates: [candidate], decisions: [decision] }).entries).toHaveLength(0);
    }
  });

  it("keeps published guidance in its designer-facing knowledge domain", () => {
    expect(knowledgeDomainForContext("axis:accessibility")).toBe("accessibility");
    expect(knowledgeDomainForContext("axis:responsive-completeness")).toBe("breakpoints");
    expect(knowledgeDomainForContext("axis:layer-naming")).toBe("naming");
    expect(knowledgeDomainForContext("axis:token-application")).toBe("tokens");
    expect(knowledgeDomainForContext("operation:convert-to-component")).toBe("components");
    expect(knowledgeDomainForContext("operation:apply-inferred-auto-layout")).toBe("layout");
  });
});

describe("multi-file wrapper", () => {
  it("is order-independent, weakest-target limited, and always non-certifying", () => {
    const strong = report();
    const weak = structuredClone(strong);
    weak.grade = { score: 41, letter: "F" };
    weak.ready = false;
    const source = (sourceId: string) => ({ schemaVersion: 1 as const, sourceId, projectScope: "project:ui-library", role: "target" as const, contentDigest: hashValue(sourceId), completeness: { complete: true, availableDomains: ["layout" as const], warnings: [] } });
    const left = buildMultiFileReviewReport({ projectScope: "project:ui-library", targets: [{ source: source("target:b"), report: strong }, { source: source("target:a"), report: weak }], now: new Date("2026-09-10T12:00:00Z") });
    const right = buildMultiFileReviewReport({ projectScope: "project:ui-library", targets: [{ source: source("target:a"), report: weak }, { source: source("target:b"), report: strong }], now: new Date("2026-09-10T12:00:00Z") });
    expect(left.digest).toBe(right.digest);
    expect(left.grade).toEqual(weak.grade);
    expect(left.limitingTargetSourceId).toBe("target:a");
    expect(left.certificationEligible).toBe(false);
  });
});

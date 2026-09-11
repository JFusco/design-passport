import type {
  DesignKnowledgeGraph,
  DesignReferencePackV1,
  KnowledgeCandidateV1,
  KnowledgeDecisionV1,
  KnowledgeInsight,
  LearningObservationV1,
  MultiFileReviewReportV1,
  ProjectStyleGuideBindingV1,
  ReadinessReport,
  ReferenceFactV1,
  ReferenceDomainV1,
  ReviewLearningEnvelopeV1,
  ReviewSourceV1,
  TeamKnowledgePackV1,
} from "./contracts";
import { assertContract } from "./schema";
import { hashValue, utf8ByteLength } from "./stable";

export const REFERENCE_PACK_MAX_BYTES = 90_000;
export const EMPTY_TEAM_KNOWLEDGE_PACK: TeamKnowledgePackV1 = {
  schemaVersion: 1,
  knowledgeVersion: "1.0.0",
  entries: [],
  generatedAt: "2026-09-10T00:00:00.000Z",
  digest: hashValue({ schemaVersion: 1, knowledgeVersion: "1.0.0", entries: [] }),
};

function assertNoUnsafeStrings(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    if (/https?:\/\//iu.test(value)) throw new Error(`Unsafe URL found at ${path}`);
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(value)) throw new Error(`Unsafe email found at ${path}`);
    if (/(?:^|\s)(?:\/[A-Za-z0-9._-]+){3,}(?:\s|$)/u.test(value)) throw new Error(`Unsafe local path found at ${path}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeStrings(item, `${path}[${index}]`));
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (/^(?:url|fileKey|nodeId|screenshot|sourceCode|email|localPath|waiverContent)$/iu.test(key)) throw new Error(`Unsafe field ${key} found at ${path}`);
    assertNoUnsafeStrings(item, `${path}.${key}`);
  }
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function referenceFactMaterial(fact: ReferenceFactV1): ReferenceFactV1 {
  if (fact.matcher.kind === "numeric-node-field") {
    return { ...fact, matcher: { ...fact.matcher, allowedValues: [...fact.matcher.allowedValues].sort((a, b) => a - b) } };
  }
  if (fact.matcher.kind === "node-name") {
    return {
      ...fact,
      matcher: {
        ...fact.matcher,
        nodeTypes: sortedUnique(fact.matcher.nodeTypes),
        allowedValues: sortedUnique(fact.matcher.allowedValues),
      },
    };
  }
  return fact;
}

function referencePackMaterial(pack: Omit<DesignReferencePackV1, "digest" | "generatedAt">): unknown {
  return {
    ...pack,
    source: {
      ...pack.source,
      completeness: {
        ...pack.source.completeness,
        availableDomains: sortedUnique(pack.source.completeness.availableDomains),
        warnings: sortedUnique(pack.source.completeness.warnings),
      },
    },
    facts: [...pack.facts].map(referenceFactMaterial).sort((left, right) => left.factId.localeCompare(right.factId)),
  };
}

export function buildReferencePack(
  input: Omit<DesignReferencePackV1, "schemaVersion" | "generatedAt" | "digest">,
  now = new Date(),
): DesignReferencePackV1 {
  const base = { schemaVersion: 1 as const, ...input };
  const pack: DesignReferencePackV1 = {
    ...base,
    generatedAt: now.toISOString(),
    digest: hashValue(referencePackMaterial(base)),
  };
  assertReferencePack(pack);
  return pack;
}

export function assertReferencePack(value: unknown, role?: "style-guide" | "reference"): asserts value is DesignReferencePackV1 {
  assertContract("design-reference-pack", value);
  const pack = value as DesignReferencePackV1;
  if (role && pack.source.role !== role) throw new Error(`Reference pack role must be ${role}`);
  if (pack.source.role === "target") throw new Error("A target source cannot be imported as advisory guidance");
  assertNoUnsafeStrings(pack);
  const { digest: _digest, generatedAt: _generatedAt, ...base } = pack;
  if (hashValue(referencePackMaterial(base)) !== pack.digest) throw new Error("Reference pack digest does not match its contents");
  if (utf8ByteLength(JSON.stringify(pack)) > REFERENCE_PACK_MAX_BYTES) throw new Error("Reference pack exceeds the 90 KB import limit");
}

export function parseReferencePack(raw: string, role?: "style-guide" | "reference"): DesignReferencePackV1 {
  if (utf8ByteLength(raw) > REFERENCE_PACK_MAX_BYTES) throw new Error("Reference pack exceeds the 90 KB import limit");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Reference pack is not valid JSON");
  }
  assertReferencePack(value, role);
  return value;
}

export function validateSessionPackUse(pack: DesignReferencePackV1, fileKeyAvailable: boolean): "style-guide" | "reference" {
  assertReferencePack(pack);
  if (pack.source.role === "target") throw new Error("A target source cannot be used as advisory guidance");
  if (pack.source.role === "style-guide" && fileKeyAvailable) {
    throw new Error("This saved Figma file can connect the project style guide directly. Choose Connect project style guide instead");
  }
  return pack.source.role;
}

export function targetFileFingerprint(fileKey: string): string {
  if (!fileKey) throw new Error("A stable Figma file key is required for persistent guidance");
  return hashValue({ domain: "design-passport:file-binding:v1", fileKey });
}

function bindingMaterial(binding: Omit<ProjectStyleGuideBindingV1, "digest" | "boundAt">): unknown {
  return {
    schemaVersion: binding.schemaVersion,
    targetFileFingerprint: binding.targetFileFingerprint,
    projectScope: binding.projectScope,
    packDigest: binding.pack.digest,
  };
}

export function buildProjectStyleGuideBinding(
  pack: DesignReferencePackV1,
  fileKey: string,
  now = new Date(),
): ProjectStyleGuideBindingV1 {
  assertReferencePack(pack, "style-guide");
  const base = {
    schemaVersion: 1 as const,
    targetFileFingerprint: targetFileFingerprint(fileKey),
    projectScope: pack.source.projectScope,
    pack,
  };
  const binding: ProjectStyleGuideBindingV1 = {
    ...base,
    boundAt: now.toISOString(),
    digest: hashValue(bindingMaterial(base)),
  };
  assertProjectStyleGuideBinding(binding, fileKey);
  return binding;
}

export function assertProjectStyleGuideBinding(value: unknown, fileKey?: string): asserts value is ProjectStyleGuideBindingV1 {
  assertContract("project-style-guide-binding", value);
  const binding = value as ProjectStyleGuideBindingV1;
  assertReferencePack(binding.pack, "style-guide");
  if (binding.projectScope !== binding.pack.source.projectScope) throw new Error("Project binding and style-guide scope do not match");
  const { digest: _digest, boundAt: _boundAt, ...base } = binding;
  if (hashValue(bindingMaterial(base)) !== binding.digest) throw new Error("Project binding digest does not match its contents");
  if (fileKey && binding.targetFileFingerprint !== targetFileFingerprint(fileKey)) throw new Error("Project style guide belongs to a different Figma file");
  if (utf8ByteLength(JSON.stringify(binding)) > REFERENCE_PACK_MAX_BYTES) throw new Error("Project style-guide binding exceeds the 90 KB storage limit");
}

export function parseProjectStyleGuideBinding(raw: string, fileKey?: string): ProjectStyleGuideBindingV1 {
  if (utf8ByteLength(raw) > REFERENCE_PACK_MAX_BYTES) throw new Error("Project style-guide binding exceeds the 90 KB storage limit");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Stored project style guide is not valid JSON");
  }
  assertProjectStyleGuideBinding(value, fileKey);
  return value;
}

function numericNodeValue(node: DesignKnowledgeGraph["nodes"][string], field: Extract<ReferenceFactV1["matcher"], { kind: "numeric-node-field" }>["field"]): number | undefined {
  if (field === "frameWidth") return node.width;
  if (field === "cornerRadius") return node.cornerRadius;
  return node.layout?.[field];
}

function labelForOrigin(origin: KnowledgeInsight["origin"]): string {
  if (origin === "project") return "Project guidance";
  if (origin === "reference") return "Reference suggestion";
  return "Shared guidance";
}

export function knowledgeDomainForContext(context: string): ReferenceDomainV1 {
  if (context === "axis:token-foundation" || context === "axis:token-application" || context === "operation:bind-variable") return "tokens";
  if (context === "axis:component-hygiene" || context === "axis:pipeline-readiness"
    || context === "operation:reconnect-instance" || context === "operation:convert-to-component" || context === "operation:group-variants") return "components";
  if (context === "axis:layer-naming" || context.startsWith("naming:") || context === "operation:rename-node" || context === "operation:normalize-export-name") return "naming";
  if (context === "axis:responsive-completeness") return "breakpoints";
  if (context === "axis:accessibility") return "accessibility";
  return "layout";
}

export function buildKnowledgeInsights(input: {
  graph: DesignKnowledgeGraph;
  targetRootIds: string[];
  projectPack?: DesignReferencePackV1;
  referencePacks?: DesignReferencePackV1[];
  teamPack?: TeamKnowledgePackV1;
}): KnowledgeInsight[] {
  const targetRoots = new Set(input.targetRootIds);
  const inScope = Object.values(input.graph.nodes).filter((node) => targetRoots.has(node.rootId));
  const packs: Array<{ origin: KnowledgeInsight["origin"]; pack: DesignReferencePackV1 }> = [
    ...(input.projectPack ? [{ origin: "project" as const, pack: input.projectPack }] : []),
    ...(input.referencePacks ?? []).map((pack) => ({ origin: "reference" as const, pack })),
  ];
  const insights: KnowledgeInsight[] = [];

  for (const { origin, pack } of packs) {
    for (const fact of pack.facts) {
      if (fact.matcher.kind === "informational") {
        insights.push({
          id: hashValue({ origin, sourceId: pack.source.sourceId, factId: fact.factId }),
          origin,
          sourceId: pack.source.sourceId,
          domain: fact.domain,
          title: `${labelForOrigin(origin)} · ${fact.label}`,
          message: fact.guidance,
          factId: fact.factId,
        });
        continue;
      }
      for (const node of inScope) {
        let mismatch = false;
        let measured: string | number | undefined;
        if (fact.matcher.kind === "numeric-node-field") {
          measured = numericNodeValue(node, fact.matcher.field);
          mismatch = measured !== undefined && !fact.matcher.allowedValues.includes(measured);
        } else if (fact.matcher.nodeTypes.includes(node.type)) {
          measured = node.name;
          mismatch = !fact.matcher.allowedValues.some((allowed) => allowed.toLocaleLowerCase("en-US") === node.name.toLocaleLowerCase("en-US"));
        }
        if (!mismatch) continue;
        insights.push({
          id: hashValue({ origin, sourceId: pack.source.sourceId, factId: fact.factId, targetNodeId: node.id }),
          origin,
          sourceId: pack.source.sourceId,
          domain: fact.domain,
          title: `${labelForOrigin(origin)} · ${fact.label}`,
          message: `${fact.guidance} Current value: ${String(measured)}.`,
          factId: fact.factId,
          targetNodeId: node.id,
        });
      }
    }
  }

  for (const entry of input.teamPack?.entries ?? []) {
    insights.push({
      id: hashValue({ origin: "shared", candidateDigest: entry.candidateDigest }),
      origin: "shared",
      sourceId: "design-passport-shared",
      domain: entry.domain,
      title: "Shared guidance",
      message: entry.wording,
      factId: entry.candidateId,
    });
  }
  return insights.sort((left, right) => left.origin.localeCompare(right.origin)
    || left.domain.localeCompare(right.domain)
    || left.title.localeCompare(right.title)
    || (left.targetNodeId ?? "").localeCompare(right.targetNodeId ?? ""));
}

function reportIdentityMaterial(report: ReadinessReport): unknown {
  return {
    rulesetVersion: report.rulesetVersion,
    catalogVersion: report.catalogVersion,
    catalogDigest: report.catalogDigest,
    profileHash: report.profileHash,
    scope: report.target.scope,
    grade: report.grade,
    ready: report.ready,
    findingCounts: Object.entries(report.findings.reduce<Record<string, number>>((counts, finding) => {
      const key = `${finding.ruleId}:${finding.status}`;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {})).sort(([left], [right]) => left.localeCompare(right)),
    operationCounts: Object.entries(report.appliedChanges.flatMap((plan) => plan.operations).reduce<Record<string, number>>((counts, operation) => {
      counts[operation.kind] = (counts[operation.kind] ?? 0) + 1;
      return counts;
    }, {})).sort(([left], [right]) => left.localeCompare(right)),
  };
}

function envelopeMaterial(envelope: Omit<ReviewLearningEnvelopeV1, "digest" | "generatedAt">): unknown {
  return {
    ...envelope,
    observations: [...envelope.observations].sort((left, right) => left.observationKey.localeCompare(right.observationKey)),
  };
}

export function buildLearningEnvelope(input: {
  projectScope: string;
  report: ReadinessReport;
  pluginVersion: string;
  knowledgeVersion: string;
  now?: Date;
}): ReviewLearningEnvelopeV1 {
  const groups = new Map<string, LearningObservationV1>();
  for (const finding of input.report.findings) {
    if (finding.status === "pass" || finding.status === "not-applicable") continue;
    const kind = finding.status === "waived" ? "waiver-applied" : "repeated-finding";
    const direction = finding.status === "waived" ? "contradict" : "support";
    const context = `axis:${finding.axis}`;
    const key = `${kind}:${finding.ruleId}:${context}:${direction}`;
    const existing = groups.get(key);
    groups.set(key, {
      observationKey: hashValue({ kind, ruleId: finding.ruleId, context, direction }),
      kind,
      context,
      direction,
      ruleId: finding.ruleId,
      canonicalLabel: finding.title,
      count: (existing?.count ?? 0) + 1,
    });
  }
  for (const operation of input.report.appliedChanges.flatMap((plan) => plan.operations)) {
    if (operation.kind === "confirm-pattern") {
      const canonicalLabel = typeof operation.value === "object" && operation.value !== null && !Array.isArray(operation.value)
        && typeof operation.value.canonicalName === "string" ? operation.value.canonicalName : undefined;
      const context = "naming:contextual-alias";
      const key = `naming-decision:${context}:${canonicalLabel ?? "confirmed"}`;
      const existing = groups.get(key);
      groups.set(key, {
        observationKey: hashValue({ kind: "naming-decision", context, canonicalLabel }),
        kind: "naming-decision",
        context,
        direction: "support",
        ...(canonicalLabel ? { canonicalLabel } : {}),
        count: (existing?.count ?? 0) + 1,
      });
      continue;
    }
    const context = `operation:${operation.kind}`;
    const key = `accepted-fix:${context}`;
    const existing = groups.get(key);
    groups.set(key, {
      observationKey: hashValue({ kind: "accepted-fix", context }),
      kind: "accepted-fix",
      context,
      direction: "support",
      count: (existing?.count ?? 0) + 1,
    });
  }
  if (input.report.appliedChanges.length > 0) {
    const summaryContext = `grade:${input.report.grade.letter}`;
    groups.set(`rescan:${summaryContext}`, {
      observationKey: hashValue({ kind: "rescan-outcome", context: summaryContext, ready: input.report.ready }),
      kind: "rescan-outcome",
      context: summaryContext,
      direction: input.report.ready ? "support" : "contradict",
      count: 1,
    });
  }
  if (groups.size === 0) throw new Error("This review does not contain actionable learnings to contribute");
  const base = {
    schemaVersion: 1 as const,
    projectScope: input.projectScope,
    producer: {
      pluginVersion: input.pluginVersion,
      rulesetVersion: input.report.rulesetVersion,
      catalogVersion: input.report.catalogVersion,
      knowledgeVersion: input.knowledgeVersion,
    },
    reportDigest: hashValue(reportIdentityMaterial(input.report)),
    observations: [...groups.values()].sort((left, right) => left.observationKey.localeCompare(right.observationKey)),
  };
  const envelope: ReviewLearningEnvelopeV1 = {
    ...base,
    generatedAt: (input.now ?? new Date()).toISOString(),
    digest: hashValue(envelopeMaterial(base)),
  };
  assertContract("review-learning-envelope", envelope);
  assertLearningEnvelope(envelope);
  return envelope;
}

export function assertLearningEnvelope(value: unknown): asserts value is ReviewLearningEnvelopeV1 {
  assertContract("review-learning-envelope", value);
  const envelope = value as ReviewLearningEnvelopeV1;
  assertNoUnsafeStrings(envelope);
  const { digest: _digest, generatedAt: _generatedAt, ...base } = envelope;
  if (hashValue(envelopeMaterial(base)) !== envelope.digest) throw new Error("Learning envelope digest does not match its contents");
}

function candidateMaterial(candidate: Omit<KnowledgeCandidateV1, "digest" | "generatedAt">): unknown {
  return {
    ...candidate,
    exceptions: sortedUnique(candidate.exceptions),
    evidenceEnvelopeDigests: sortedUnique(candidate.evidenceEnvelopeDigests),
  };
}

export function assertKnowledgeCandidate(value: unknown): asserts value is KnowledgeCandidateV1 {
  assertContract("knowledge-candidate", value);
  const candidate = value as KnowledgeCandidateV1;
  const { digest: _digest, generatedAt: _generatedAt, ...base } = candidate;
  if (hashValue(candidateMaterial(base)) !== candidate.digest) throw new Error("Knowledge candidate digest does not match its contents");
  assertNoUnsafeStrings(candidate);
}

function candidateWording(observation: LearningObservationV1): string {
  const context = humanizeMachineLabel(observation.context);
  const rule = observation.canonicalLabel ?? humanizeMachineLabel(observation.ruleId ?? "design review");
  if (observation.kind === "accepted-fix") return `Consider the ${context} fix when the same measured condition appears.`;
  if (observation.kind === "waiver-applied") return `Review ${rule} for a documented project exception before treating it as universally applicable.`;
  if (observation.kind === "rescan-outcome") return `Use the ${context} outcome as supporting evidence, not as an automatic readiness decision.`;
  if (observation.kind === "naming-decision") return `Prefer the approved canonical pattern ${observation.canonicalLabel ?? "for this context"}.`;
  return `Review recurring ${rule} findings under ${context}, then apply the documented project guidance when the same situation appears.`;
}

function humanizeMachineLabel(value: string): string {
  const words = value.replace(/^[^:]+:/u, "").replace(/[._-]+/gu, " ").trim();
  return words ? words[0]!.toLocaleUpperCase("en-US") + words.slice(1) : "Design review";
}

export function generateCandidateDrafts(envelopes: ReviewLearningEnvelopeV1[], now = new Date()): KnowledgeCandidateV1[] {
  const groups = new Map<string, { observation: LearningObservationV1; projectScope: string; envelopes: Set<string>; support: number; contradict: number }>();
  for (const envelope of envelopes) {
    assertLearningEnvelope(envelope);
    for (const observation of envelope.observations) {
      const groupKey = hashValue({ projectScope: envelope.projectScope, observationKey: observation.observationKey, context: observation.context });
      const existing = groups.get(groupKey) ?? { observation, projectScope: envelope.projectScope, envelopes: new Set<string>(), support: 0, contradict: 0 };
      if (!existing.envelopes.has(envelope.digest)) {
        existing.envelopes.add(envelope.digest);
        if (observation.direction === "support") existing.support += 1;
        else existing.contradict += 1;
      }
      groups.set(groupKey, existing);
    }
  }
  return [...groups.entries()].map(([groupKey, group]) => {
    const base = {
      schemaVersion: 1 as const,
      candidateId: `candidate:${groupKey.slice(4)}`,
      groupKey,
      observationKey: group.observation.observationKey,
      context: group.observation.context,
      sourceRoles: ["target" as const],
      projectScope: group.projectScope,
      wording: candidateWording(group.observation),
      proposedScope: "project" as const,
      exceptions: [],
      evidenceEnvelopeDigests: [...group.envelopes].sort(),
      supportCount: group.support,
      contradictCount: group.contradict,
    };
    const candidate: KnowledgeCandidateV1 = {
      ...base,
      generatedAt: now.toISOString(),
      digest: hashValue(candidateMaterial(base)),
    };
    assertContract("knowledge-candidate", candidate);
    return candidate;
  }).sort((left, right) => left.groupKey.localeCompare(right.groupKey));
}

export function reviseKnowledgeCandidate(
  candidate: KnowledgeCandidateV1,
  edits: Pick<KnowledgeCandidateV1, "wording" | "proposedScope" | "exceptions">,
  now = new Date(),
): KnowledgeCandidateV1 {
  assertContract("knowledge-candidate", candidate);
  const wording = edits.wording.normalize("NFKC").trim();
  if (!wording) throw new Error("Candidate wording cannot be empty");
  const base = {
    schemaVersion: 1 as const,
    candidateId: candidate.candidateId,
    groupKey: candidate.groupKey,
    observationKey: candidate.observationKey,
    context: candidate.context,
    sourceRoles: [...candidate.sourceRoles].sort(),
    projectScope: candidate.projectScope,
    wording,
    proposedScope: edits.proposedScope,
    exceptions: sortedUnique(edits.exceptions.map((value) => value.normalize("NFKC").trim()).filter(Boolean)),
    evidenceEnvelopeDigests: [...candidate.evidenceEnvelopeDigests],
    supportCount: candidate.supportCount,
    contradictCount: candidate.contradictCount,
  };
  const revised: KnowledgeCandidateV1 = {
    ...base,
    generatedAt: now.toISOString(),
    digest: hashValue(candidateMaterial(base)),
  };
  assertKnowledgeCandidate(revised);
  return revised;
}

function decisionMaterial(decision: Omit<KnowledgeDecisionV1, "digest" | "decidedAt">): unknown {
  return decision;
}

export function buildKnowledgeDecision(
  input: Omit<KnowledgeDecisionV1, "schemaVersion" | "decidedAt" | "digest">,
  now = new Date(),
): KnowledgeDecisionV1 {
  if (!input.rationale.trim()) throw new Error("A knowledge decision requires a rationale");
  const base = { schemaVersion: 1 as const, ...input, rationale: input.rationale.trim() };
  const decision: KnowledgeDecisionV1 = {
    ...base,
    decidedAt: now.toISOString(),
    digest: hashValue(decisionMaterial(base)),
  };
  assertContract("knowledge-decision", decision);
  assertNoUnsafeStrings(decision);
  return decision;
}

export function assertKnowledgeDecision(value: unknown): asserts value is KnowledgeDecisionV1 {
  assertContract("knowledge-decision", value);
  const decision = value as KnowledgeDecisionV1;
  const { digest: _digest, decidedAt: _decidedAt, ...base } = decision;
  if (hashValue(decisionMaterial(base)) !== decision.digest) throw new Error("Knowledge decision digest does not match its contents");
  assertNoUnsafeStrings(decision);
}

function teamPackMaterial(pack: Omit<TeamKnowledgePackV1, "digest" | "generatedAt">): unknown {
  return {
    ...pack,
    entries: [...pack.entries].map((entry) => ({ ...entry, contexts: sortedUnique(entry.contexts) }))
      .sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
  };
}

export function assertTeamKnowledgePack(value: unknown): asserts value is TeamKnowledgePackV1 {
  assertContract("team-knowledge-pack", value);
  const pack = value as TeamKnowledgePackV1;
  const { digest: _digest, generatedAt: _generatedAt, ...base } = pack;
  if (hashValue(teamPackMaterial(base)) !== pack.digest) throw new Error("Team knowledge pack digest does not match its contents");
  assertNoUnsafeStrings(pack);
}

export function compileTeamKnowledgePack(input: {
  knowledgeVersion: string;
  candidates: KnowledgeCandidateV1[];
  decisions: KnowledgeDecisionV1[];
  now?: Date;
}): TeamKnowledgePackV1 {
  const latestDecision = new Map<string, KnowledgeDecisionV1>();
  for (const decision of [...input.decisions].sort((left, right) => left.decidedAt.localeCompare(right.decidedAt) || left.decisionId.localeCompare(right.decisionId))) {
    assertKnowledgeDecision(decision);
    latestDecision.set(decision.candidateId, decision);
  }
  const entries = input.candidates.flatMap((candidate) => {
    assertKnowledgeCandidate(candidate);
    const decision = latestDecision.get(candidate.candidateId);
    if (!decision || decision.action !== "approve" || decision.scope !== "shared" || decision.candidateDigest !== candidate.digest) return [];
    return [{
      candidateId: candidate.candidateId,
      candidateDigest: candidate.digest,
      decisionId: decision.decisionId,
      domain: knowledgeDomainForContext(candidate.context),
      wording: candidate.wording,
      contexts: [candidate.context],
    }];
  });
  const base = { schemaVersion: 1 as const, knowledgeVersion: input.knowledgeVersion, entries };
  const pack: TeamKnowledgePackV1 = {
    ...base,
    generatedAt: (input.now ?? new Date()).toISOString(),
    digest: hashValue(teamPackMaterial(base)),
  };
  assertTeamKnowledgePack(pack);
  return pack;
}

function multiFileMaterial(report: Omit<MultiFileReviewReportV1, "digest" | "generatedAt">): unknown {
  return {
    ...report,
    targets: report.targets.map(({ source, report: targetReport }) => ({
      source,
      reportDigest: hashValue(reportIdentityMaterial(targetReport)),
    })).sort((left, right) => left.source.sourceId.localeCompare(right.source.sourceId)),
    references: [...report.references].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    warnings: sortedUnique(report.warnings),
  };
}

export function buildMultiFileReviewReport(input: {
  projectScope: string;
  targets: Array<{ source: ReviewSourceV1; report: ReadinessReport }>;
  references?: Array<{ sourceId: string; packDigest: string }>;
  warnings?: string[];
  now?: Date;
}): MultiFileReviewReportV1 {
  if (input.targets.length === 0) throw new Error("A multi-file report requires at least one target");
  if (new Set(input.targets.map(({ source }) => source.sourceId)).size !== input.targets.length) throw new Error("Target source IDs must be unique");
  for (const { source } of input.targets) {
    if (source.role !== "target") throw new Error("Multi-file target entries must use the target role");
    if (source.projectScope !== input.projectScope) throw new Error("All targets must belong to the same project scope");
  }
  const targets = [...input.targets].sort((left, right) => left.source.sourceId.localeCompare(right.source.sourceId));
  const limiting = [...targets].sort((left, right) => left.report.grade.score - right.report.grade.score || left.source.sourceId.localeCompare(right.source.sourceId))[0];
  if (!limiting) throw new Error("Unable to determine the limiting target");
  const base = {
    schemaVersion: 1 as const,
    projectScope: input.projectScope,
    targets,
    references: [...(input.references ?? [])].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    limitingTargetSourceId: limiting.source.sourceId,
    grade: limiting.report.grade,
    ready: targets.every(({ report }) => report.ready),
    certificationEligible: false as const,
    warnings: sortedUnique(input.warnings ?? []),
  };
  const wrapper: MultiFileReviewReportV1 = {
    ...base,
    generatedAt: (input.now ?? new Date()).toISOString(),
    digest: hashValue(multiFileMaterial(base)),
  };
  assertContract("multi-file-review-report", wrapper);
  return wrapper;
}

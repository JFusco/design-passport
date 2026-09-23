import type { KnowledgeCandidateV1, KnowledgeDecisionV1 } from "../core/contracts";
import type { KnowledgeState } from "./repository";

export type ReviewStatus = "awaiting" | "approved" | "rejected" | "deferred" | "changed";

export interface ReviewCandidateView {
  id: string;
  revision: string;
  context: string;
  projectScope: string;
  wording: string;
  proposedScope: "project" | "shared";
  exceptions: string[];
  supportCount: number;
  contradictCount: number;
  contributionCount: number;
  evidence: Array<{
    direction: "support" | "contradict";
    kind: string;
    label: string;
    context: string;
    count: number;
    observedAt: string;
  }>;
  status: ReviewStatus;
  currentDecision?: {
    action: "approve" | "reject" | "defer";
    scope: "project" | "shared";
    rationale: string;
    decidedAt: string;
  };
  previousDecision?: {
    action: "approve" | "reject" | "defer";
    scope: "project" | "shared";
    rationale: string;
    decidedAt: string;
  };
}

function latestDecision(candidate: KnowledgeCandidateV1, decisions: KnowledgeDecisionV1[]): KnowledgeDecisionV1 | undefined {
  return decisions.filter((decision) => decision.candidateId === candidate.candidateId)
    .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt) || left.decisionId.localeCompare(right.decisionId)).at(-1);
}

export function reviewView(state: KnowledgeState): ReviewCandidateView[] {
  return state.candidates.map((candidate) => {
    const latest = latestDecision(candidate, state.decisions);
    const current = latest?.candidateDigest === candidate.digest ? latest : undefined;
    const status: ReviewStatus = current
      ? ({ approve: "approved", reject: "rejected", defer: "deferred" } as const)[current.action]
      : latest ? "changed" : "awaiting";
    const decisionView = latest ? {
      action: latest.action,
      scope: latest.scope,
      rationale: latest.rationale,
      decidedAt: latest.decidedAt,
    } : undefined;
    const evidence = state.envelopes.flatMap((envelope) => envelope.observations
      .filter((observation) => observation.observationKey === candidate.observationKey && envelope.projectScope === candidate.projectScope)
      .map((observation) => ({
        direction: observation.direction,
        kind: observation.kind,
        label: observation.canonicalLabel ?? observation.ruleId ?? observation.context,
        context: observation.context,
        count: observation.count,
        observedAt: envelope.generatedAt,
      })))
      .sort((left, right) => right.observedAt.localeCompare(left.observedAt)
        || left.direction.localeCompare(right.direction)
        || left.label.localeCompare(right.label));
    return {
      id: candidate.candidateId,
      revision: candidate.digest,
      context: candidate.context,
      projectScope: candidate.projectScope,
      wording: candidate.wording,
      proposedScope: candidate.proposedScope,
      exceptions: [...candidate.exceptions],
      supportCount: candidate.supportCount,
      contradictCount: candidate.contradictCount,
      contributionCount: candidate.evidenceEnvelopeDigests.length,
      evidence,
      status,
      ...(current && decisionView ? { currentDecision: decisionView } : {}),
      ...(!current && decisionView ? { previousDecision: decisionView } : {}),
    };
  });
}

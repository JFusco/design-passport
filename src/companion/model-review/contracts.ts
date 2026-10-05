import type {
  KnowledgeCandidateV1,
  KnowledgeDecisionV1,
} from "../../core/contracts";
export interface CandidateRevision {
  candidateId: string;
  digest: string;
}
export interface Recommendation {
  candidateId: string;
  candidateDigest: string;
  disposition: "approve" | "reject" | "defer";
  reason: string;
  evidenceRefs: string[];
  priority: "high" | "normal" | "low";
  edit: { wording: string; exceptions: string[] } | null;
}
export interface SavedRecommendation extends Recommendation {
  id: string;
  applied: boolean;
  alreadyApproved: boolean;
}
export type Outcome =
  "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
export interface PricePolicy {
  version: string;
  currency: "USD";
  model: string;
  acceptedModelIds: string[];
  serviceTier: string;
  contextTier: string;
  input: string;
  cached: string;
  cacheWrite: string;
  output: string;
  checkedAt: string;
  source: string;
}
export interface SharedProjection {
  model: string;
  instructions: string;
  input: string;
  reasoning: { effort: "high" };
  text: {
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  tools: [];
  tool_choice: "none";
  parallel_tool_calls: false;
  truncation: "disabled";
}
export interface SnapshotCandidate {
  candidateId: string;
  digest: string;
  wording: string;
  exceptions: string[];
  ref: string;
}
export interface Snapshot {
  version: 1;
  candidates: SnapshotCandidate[];
  evidence: Array<Record<string, unknown> & { ref: string }>;
  currentness: string;
  authoritativeRefs: string[];
}
export interface Preview {
  project: string;
  selection: CandidateRevision[];
  snapshot: Snapshot;
  snapshotSha256: string;
  contextDigest: string;
  digest: string;
  projection: SharedProjection;
  promptVersion: string;
  schemaVersion: string;
  pricePolicy: PricePolicy;
  reservation: string;
  omissions: string[];
  guideVersion: string | null;
}
export interface FrozenReview extends Preview {
  mappings: Record<string, { kind: string; id: string; findingIds?: string[] }>;
}
export interface Accounting {
  version: number;
  status: "reserved" | "unknown" | "estimated" | "billed" | "zero";
  amount: string | null;
  discrepancy: boolean;
  acknowledged: boolean;
  settlementId: string | null;
}
export interface RunHistory {
  id: string;
  outcome: Outcome;
  registeredAt: string;
  durationMs: number;
  accounting: Accounting;
}
export interface RunDetail {
  id: string;
  project: string;
  outcome: Outcome;
  registeredAt: string;
  endedAt: string | null;
  serverNow: string;
  durationMs: number;
  providerId: string | null;
  providerStatus: string | null;
  providerCompletedAt: string | null;
  error: string | null;
  frozen: FrozenReview;
  recommendations: SavedRecommendation[];
  contextDigest: string;
  accounting: Accounting;
  events: Array<{
    id: string;
    kind: string;
    payload: Record<string, unknown>;
    recorded_at: string;
  }>;
  retryOf: string | null;
}
export interface ProjectSummary {
  allowance: string;
  knownCost: string;
  reservations: string;
  available: string;
  runCount: number;
  unresolvedCostCount: number;
  discrepancies: number;
  enabled: boolean;
  activeGuide: string | null;
}
export interface ApplyInput {
  requestId: string;
  runId: string;
  expectedContext: string;
  selections: Array<{
    recommendationId: string;
    rationale: string;
    edit: { wording: string; exceptions: string[] } | null;
  }>;
}
export interface ApplyResult {
  decisions: KnowledgeDecisionV1[];
  mappings: Array<{ recommendationId: string; decisionId: string }>;
  contextDigest: string;
}
export interface ProviderResponse {
  id?: string;
  status?: string;
  model?: string;
  service_tier?: string;
  completed_at?: number | null;
  usage?: Record<string, unknown> | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  incomplete_details?: { reason?: string } | null;
  error?: { type?: string; code?: string } | null;
  requestId?: string;
}
export interface SourceMaterial {
  candidates: KnowledgeCandidateV1[];
  decisions: KnowledgeDecisionV1[];
}

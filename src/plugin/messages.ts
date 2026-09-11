import type { BootstrapData, SelectionSummary, VariableCollectionOption } from "../figma/adapter";
import type {
  BindableField,
  ChangePlan,
  KnowledgeInsight,
  ProjectStyleGuideBindingV1,
  JsonValue,
  ReadinessProfile,
  ReadinessReport,
  ReviewLearningEnvelopeV1,
  ScanProgress,
  ScanRequest,
  ScanScope,
} from "../core/contracts";

export interface KnowledgeSummary {
  complete: boolean;
  cancelled: boolean;
  builtAt: string;
  snapshotHash: string;
  pageCount: number;
  loadedPageCount: number;
  nodeCount: number;
  componentCount: number;
  instanceCount: number;
  responsiveFamilyCount: number;
  repeatedStructureGroupCount: number;
  sourceFrameCount: number;
  pages: Array<{ id: string; name: string; role: string; nodeCount: number }>;
  patternInventory: Array<{ label: string; kind: string; definitions: number; instances: number }>;
  responsiveFamilies: Array<{ artifact: string; breakpointNames: string[]; widths: number[]; hasCollision: boolean }>;
  repeatedStructures: Array<{ signature: string; occurrenceCount: number }>;
  tokenCollections: Array<{ name: string; remote: boolean; variableCount: number }>;
}

export interface AuditTargetSummary {
  scope: ScanScope;
  selectionCount?: number;
}

export type UiToPluginMessage =
  | { type: "initialize" }
  | { type: "save-profile"; profile: ReadinessProfile }
  | { type: "scan"; request: ScanRequest }
  | { type: "refresh-audit" }
  | { type: "cancel-scan" }
  | { type: "navigate"; nodeId: string }
  | { type: "apply-plan"; planId: string; undoOnlyAcknowledged: boolean }
  | { type: "apply-all"; planIds: string[]; undoOnlyAcknowledged: boolean }
  | { type: "certify" }
  | { type: "certify-components" }
  | { type: "import-project-style-guide"; raw: string }
  | { type: "remove-project-style-guide" }
  | { type: "add-session-reference"; raw: string }
  | { type: "clear-session-references" }
  | { type: "preview-contribution" }
  | { type: "export-contribution"; digest: string }
  | { type: "export"; format: "json" | "markdown" }
  | { type: "waive"; findingId: string; reason: string }
  | { type: "clear-waiver"; findingId: string }
  | { type: "confirm-pattern"; findingId: string; canonicalName: string }
  | {
    type: "create-token";
    collectionId: string;
    name: string;
    field: BindableField;
    nodeIds: string[];
    rawValue: JsonValue;
  };

export type PluginToUiMessage =
  | { type: "bootstrap"; data: BootstrapData; rulesetVersion: string; catalogVersion: string; catalogDigest: string }
  | { type: "collections-result"; collections: VariableCollectionOption[] }
  | { type: "audit-started"; target: AuditTargetSummary }
  | { type: "progress"; progress: ScanProgress }
  | {
    type: "scan-result";
    report: ReadinessReport;
    plans: ChangePlan[];
    knowledge: KnowledgeSummary;
    collections: VariableCollectionOption[];
    insights: KnowledgeInsight[];
    projectStyleGuide: BootstrapData["projectStyleGuide"];
    sessionReferenceCount: number;
  }
  | { type: "knowledge-stale" }
  | { type: "selection"; summary: SelectionSummary }
  | { type: "profile-saved"; data: BootstrapData }
  | { type: "profile-invalidated"; data: BootstrapData }
  | { type: "mutation-result"; message: string }
  | { type: "certified"; count: number; target: "source frames" | "components"; removedVariantAnnotations: number }
  | { type: "project-style-guide-result"; action: "imported" | "removed"; binding?: ProjectStyleGuideBindingV1; status: BootstrapData["projectStyleGuide"] }
  | { type: "session-reference-result"; count: number; projectStyleGuide: BootstrapData["projectStyleGuide"] }
  | { type: "contribution-preview"; envelope: ReviewLearningEnvelopeV1; content: string }
  | { type: "export-result"; format: "json" | "markdown"; filename: string; content: string }
  | { type: "scan-cancelled" }
  | { type: "error"; message: string };

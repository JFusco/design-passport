import type { BootstrapData, VariableCollectionOption } from "../figma/adapter";
import type {
  BindableField,
  ChangePlan,
  JsonValue,
  ReadinessProfile,
  ReadinessReport,
  ScanProgress,
  ScanRequest,
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

export type UiToPluginMessage =
  | { type: "initialize" }
  | { type: "save-profile"; profile: ReadinessProfile }
  | { type: "scan"; request: ScanRequest }
  | { type: "cancel-scan" }
  | { type: "navigate"; nodeId: string }
  | { type: "apply-plan"; planId: string; undoOnlyAcknowledged: boolean }
  | { type: "apply-all"; planIds: string[]; undoOnlyAcknowledged: boolean }
  | { type: "certify" }
  | { type: "import-code-connect"; raw: string }
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
  | { type: "progress"; progress: ScanProgress }
  | { type: "scan-result"; report: ReadinessReport; plans: ChangePlan[]; knowledge: KnowledgeSummary; collections: VariableCollectionOption[] }
  | { type: "knowledge-stale" }
  | { type: "selection"; count: number }
  | { type: "profile-saved"; profile: ReadinessProfile }
  | { type: "mutation-result"; message: string }
  | { type: "certified"; count: number }
  | { type: "code-connect-result"; accepted: number; rejected: Array<{ index: number; reason: string }> }
  | { type: "export-result"; format: "json" | "markdown"; filename: string; content: string }
  | { type: "scan-cancelled" }
  | { type: "error"; message: string };

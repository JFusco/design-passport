import type { BindableField, JsonValue } from "../core/contracts";
import type { BootstrapData } from "../figma/adapter";

export type Tab = "overview" | "modules" | "findings" | "cleanup" | "context" | "profile";

export interface BootstrapEnvelope {
  data: BootstrapData;
  rulesetVersion: string;
  catalogVersion: string;
  catalogDigest: string;
}

export interface TokenWizardState {
  findingId: string;
  collectionId: string;
  name: string;
  field: BindableField;
  nodeIds: string[];
  rawValue: JsonValue;
}

export interface WaiverDraft {
  findingId: string;
  reason: string;
}

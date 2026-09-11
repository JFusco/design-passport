export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const AXES = [
  "token-foundation",
  "token-application",
  "layer-naming",
  "structure-auto-layout",
  "component-hygiene",
  "responsive-completeness",
  "accessibility",
  "pipeline-readiness",
] as const;

export type Axis = (typeof AXES)[number];
export type FindingStatus = "pass" | "fail" | "needs-review" | "waived" | "not-applicable";
export type Severity = 1 | 2 | 4;
export type Fixability = "automatic" | "guarded" | "manual";
export type ScanScope = "selection" | "page" | "file";
export type GradeLetter = "A" | "B" | "C" | "D" | "F";

export interface PageRoleBinding {
  pageIds: string[];
  externalLibraryKeys: string[];
}

export interface ReadinessProfile {
  schemaVersion: 1;
  profileId: "verndale-web-v1";
  artifactKind: "product" | "library";
  pageRoles: {
    foundations: PageRoleBinding;
    components: PageRoleBinding;
    screens: PageRoleBinding;
  };
  breakpoints: Array<{ name: string; width: number; variableModeName?: string }>;
  tokenSourceCollectionKeys: string[];
  namingPolicy: "code-aligned-strict";
  requireCodeConnect?: boolean;
}

export interface PatternResolution {
  input: string;
  normalizedInput: string;
  kind: "canonical" | "alias" | "contextual" | "novel" | "none";
  canonicalName?: string;
  qualifier?: string;
  candidates?: string[];
  requiresConfirmation: boolean;
  catalogVersion: string;
}

export interface SourceRef {
  kind: "figma" | "wcag" | "ui-design-brain" | "medium" | "plugin";
  label: string;
  url?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  axis: Axis;
  severity: Severity;
  rootId: string;
  nodeId: string;
  nodePath: string;
  status: FindingStatus;
  title: string;
  message: string;
  evidence: {
    summary: string;
    measured: Record<string, JsonValue>;
    inference?: { statement: string; confidence: number };
  };
  sourceRefs: SourceRef[];
  patternResolution?: PatternResolution;
  fixability: Fixability;
  confidence: number;
  hardBlocker?: boolean;
  scoreImpact?: boolean;
  suggestedValue?: JsonValue;
  waiver?: { reason: string; createdAt: string; createdBy: string; expiresAt?: string };
}

export type ChangeOperation =
  | { kind: "rename-node"; nodeId: string; value: { name: string } }
  | { kind: "confirm-pattern"; nodeId: string; value: { canonicalName: string; sourceName: string; catalogVersion: string } }
  | { kind: "set-annotation"; nodeId: string; value: { label: string } }
  | { kind: "normalize-export-name"; nodeId: string; value: { name: string } }
  | { kind: "bind-variable"; nodeId: string; value: { field: BindableField; variableId: string; paintIndex?: number } }
  | { kind: "apply-inferred-auto-layout"; nodeId: string; value: { tolerance: number } }
  | { kind: "reconnect-instance"; nodeId: string; value: { componentId: string } }
  | { kind: "convert-to-component"; nodeId: string; value: { name: string } }
  | { kind: "group-variants"; nodeId: string; value: { componentIds: string[] } }
  | { kind: "set-certification"; nodeId: string; value: CertificationSummary };

export type BindableField =
  | "fills"
  | "strokes"
  | "cornerRadius"
  | "itemSpacing"
  | "counterAxisSpacing"
  | "gridRowGap"
  | "gridColumnGap"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "width"
  | "height"
  | "opacity"
  | "strokeWeight"
  | "fontFamily"
  | "fontSize"
  | "fontStyle"
  | "fontWeight"
  | "letterSpacing"
  | "lineHeight"
  | "paragraphSpacing"
  | "paragraphIndent";

export interface ChangePlan {
  id: string;
  findingIds: string[];
  risk: "low" | "guarded" | "structural";
  operations: ChangeOperation[];
  expectedPostconditions: string[];
  rollbackBoundary: "risk-group" | "operation";
}

export interface AxisScore {
  axis: Axis;
  score: number;
  passedWeight: number;
  applicableWeight: number;
  multiplier: 1 | 2;
  statusCounts: Record<FindingStatus, number>;
}

export interface Grade {
  score: number;
  letter: GradeLetter;
  uncappedScore?: number;
  capReason?: string;
}

export interface VariantCoverage {
  variantId: string;
  variantName: string;
  variantProperties: Record<string, string>;
  nodeCount: number;
  findingIds: string[];
}

export interface FrameResult {
  rootId: string;
  rootName: string;
  rootType: string;
  pageId: string;
  pageName: string;
  grade: Grade;
  ready: boolean;
  blockerIds: string[];
  axisScores: AxisScore[];
  variantCoverage?: VariantCoverage[];
}

export interface ReadinessReport {
  schemaVersion: 1;
  rulesetVersion: string;
  catalogVersion: string;
  catalogDigest: string;
  profileHash: string;
  target: {
    scope: ScanScope;
    rootIds: string[];
    knowledgeSnapshotHash: string;
    knowledgeComplete: boolean;
  };
  axes: AxisScore[];
  frames: FrameResult[];
  grade: Grade;
  ready: boolean;
  blockers: string[];
  findings: Finding[];
  appliedChanges: ChangePlan[];
  generatedAt: string;
  snapshotHash: string;
}

export interface CertificationSummary {
  schemaVersion: 1;
  grade: GradeLetter;
  score: number;
  rulesetVersion: string;
  catalogVersion: string;
  certifiedAt: string;
  snapshotHash: string;
  knowledgeSnapshotHash: string;
}

export interface VariableCandidate {
  id: string;
  key: string;
  name: string;
  collectionId: string;
  collectionKey: string;
  collectionName: string;
  type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  remote: boolean;
  evidenceLevel: "full" | "summary";
  semantic: boolean;
  aliased?: boolean;
  scopes: string[];
  modeNames: string[];
  webSyntax?: string;
}

export interface PaintSnapshot {
  type: string;
  visible: boolean;
  opacity: number;
  color?: { r: number; g: number; b: number };
  boundVariableId?: string;
  inferredVariableIds: string[];
}

export interface EffectSnapshot {
  type: string;
  visible: boolean;
  eligibleFieldCount: number;
  boundFieldCount: number;
  boundVariableIds: string[];
  valueHash: string;
}

export interface NodeSnapshot {
  id: string;
  rootId: string;
  pageId: string;
  parentId?: string;
  path: string;
  name: string;
  type: string;
  visible: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  childIds: string[];
  descendantCount: number;
  layout?: {
    mode: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
    primarySizing?: string;
    counterSizing?: string;
    itemSpacing?: number;
    counterAxisSpacing?: number;
    gridRowGap?: number;
    gridColumnGap?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    clipsContent?: boolean;
    inferredAvailable: boolean;
  };
  fills: PaintSnapshot[];
  strokes: PaintSnapshot[];
  effects: EffectSnapshot[];
  cornerRadius?: number;
  strokeWeight?: number;
  boundFields: string[];
  boundVariableIds: Partial<Record<BindableField, string[]>>;
  inferredBindings: Partial<Record<BindableField, string[]>>;
  text?: {
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    fontStyle?: string;
    letterSpacingPx?: number;
    lineHeightPx?: number;
    paragraphSpacing?: number;
    paragraphIndent?: number;
    charactersLength: number;
    contentHash: string;
    textColor?: { r: number; g: number; b: number; a: number };
    backgroundColor?: { r: number; g: number; b: number; a: number };
    backgroundResolvable: boolean;
  };
  variantProperties?: Record<string, string>;
  component?: {
    kind: "component" | "component-set";
    key?: string;
    descriptionLength: number;
    documentationLinkCount: number;
    propertyDefinitions: Array<{ name: string; type: string; values: string[] }>;
  };
  instance?: {
    mainComponentId?: string;
    mainComponentName?: string;
    mainComponentKey?: string;
    detached: boolean;
  };
  hasAnnotations: boolean;
  devResourceCount: number;
  exportSettings: Array<{ format: string; suffix: string }>;
  structuralSignature?: string;
  contentSignature?: string;
  certification?: CertificationSummary;
  confirmedPattern?: { canonicalName: string; sourceName: string; catalogVersion: string };
  sourceMarked?: boolean;
  devStatus?: "READY_FOR_DEV" | "COMPLETED";
}

export interface PageSnapshot {
  id: string;
  name: string;
  role: "foundations" | "components" | "screens" | "unmapped";
  loaded: boolean;
  nodeCount: number;
  rootNodeIds: string[];
}

export interface ResponsiveFamily {
  artifact: string;
  memberIds: string[];
  breakpointNames: string[];
  widths: number[];
  hasCollision: boolean;
  contentSignaturesMatch: boolean;
  bindingParity: boolean;
}

export interface CodeConnectEvidence {
  nodeId: string;
  label: string;
  language: string;
  sourceFingerprint: string;
  verifiedForFile: boolean;
}

export interface DesignKnowledgeGraph {
  schemaVersion: 1;
  fileName: string;
  fileKey?: string;
  builtAt: string;
  complete: boolean;
  cancelled: boolean;
  pageCount: number;
  loadedPageCount: number;
  pages: PageSnapshot[];
  nodes: Record<string, NodeSnapshot>;
  variables: VariableCandidate[];
  responsiveFamilies: ResponsiveFamily[];
  componentIds: string[];
  instanceIds: string[];
  repeatedStructureGroups: Array<{ signature: string; nodeIds: string[] }>;
  sourceFrameIds: string[];
  codeConnect: CodeConnectEvidence[];
  snapshotHash: string;
}

export interface ScanRequest {
  scope: ScanScope;
  profile: ReadinessProfile;
  refreshKnowledge: boolean;
}

export interface ScanProgress {
  phase: "loading-pages" | "indexing" | "analyzing" | "complete";
  completed: number;
  total: number;
  pageName?: string;
  message: string;
}

export type ReviewSourceRoleV1 = "target" | "style-guide" | "reference";
export type ReferenceDomainV1 = "tokens" | "components" | "naming" | "layout" | "breakpoints" | "accessibility";
export type KnowledgeOriginV1 = "project" | "reference" | "shared";

export interface ReviewSourceV1 {
  schemaVersion: 1;
  sourceId: string;
  projectScope: string;
  role: ReviewSourceRoleV1;
  contentDigest: string;
  completeness: {
    complete: boolean;
    availableDomains: ReferenceDomainV1[];
    warnings: string[];
  };
}

export type ReferenceMatcherV1 =
  | { kind: "informational" }
  | {
    kind: "numeric-node-field";
    field: "itemSpacing" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "cornerRadius" | "frameWidth";
    allowedValues: number[];
  }
  | { kind: "node-name"; nodeTypes: string[]; allowedValues: string[] };

export interface ReferenceFactV1 {
  factId: string;
  domain: ReferenceDomainV1;
  label: string;
  guidance: string;
  matcher: ReferenceMatcherV1;
  provenance: "figma-derived" | "approved-project" | "shared";
  candidateDigest?: string;
}

export interface DesignReferencePackV1 {
  schemaVersion: 1;
  packVersion: string;
  source: ReviewSourceV1;
  facts: ReferenceFactV1[];
  generatedAt: string;
  digest: string;
}

export interface ProjectStyleGuideBindingV1 {
  schemaVersion: 1;
  targetFileFingerprint: string;
  projectScope: string;
  pack: DesignReferencePackV1;
  boundAt: string;
  digest: string;
}

export interface KnowledgeInsight {
  id: string;
  origin: KnowledgeOriginV1;
  sourceId: string;
  domain: ReferenceDomainV1;
  title: string;
  message: string;
  factId: string;
  targetNodeId?: string;
}

export type LearningObservationKindV1 =
  | "naming-decision"
  | "repeated-finding"
  | "waiver-applied"
  | "accepted-fix"
  | "rescan-outcome";

export interface LearningObservationV1 {
  observationKey: string;
  kind: LearningObservationKindV1;
  context: string;
  direction: "support" | "contradict";
  ruleId?: string;
  canonicalLabel?: string;
  count: number;
}

export interface ReviewLearningEnvelopeV1 {
  schemaVersion: 1;
  projectScope: string;
  producer: {
    pluginVersion: string;
    rulesetVersion: string;
    catalogVersion: string;
    knowledgeVersion: string;
  };
  reportDigest: string;
  observations: LearningObservationV1[];
  generatedAt: string;
  digest: string;
}

export interface KnowledgeCandidateV1 {
  schemaVersion: 1;
  candidateId: string;
  groupKey: string;
  observationKey: string;
  context: string;
  sourceRoles: ReviewSourceRoleV1[];
  projectScope: string;
  wording: string;
  proposedScope: "project" | "shared";
  exceptions: string[];
  evidenceEnvelopeDigests: string[];
  supportCount: number;
  contradictCount: number;
  generatedAt: string;
  digest: string;
}

export interface KnowledgeDecisionV1 {
  schemaVersion: 1;
  decisionId: string;
  candidateId: string;
  candidateDigest: string;
  action: "approve" | "reject" | "defer";
  scope: "project" | "shared";
  rationale: string;
  decidedAt: string;
  digest: string;
}

export interface TeamKnowledgePackV1 {
  schemaVersion: 1;
  knowledgeVersion: string;
  entries: Array<{
    candidateId: string;
    candidateDigest: string;
    decisionId: string;
    domain: ReferenceDomainV1;
    wording: string;
    contexts: string[];
  }>;
  generatedAt: string;
  digest: string;
}

export interface MultiFileReviewReportV1 {
  schemaVersion: 1;
  projectScope: string;
  targets: Array<{ source: ReviewSourceV1; report: ReadinessReport }>;
  references: Array<{ sourceId: string; packDigest: string }>;
  limitingTargetSourceId: string;
  grade: Grade;
  ready: boolean;
  certificationEligible: false;
  warnings: string[];
  generatedAt: string;
  digest: string;
}

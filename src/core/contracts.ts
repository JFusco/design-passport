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
export type RuleMode = "required" | "advisory" | "off";
export type BuildChannel = "production" | "development";

export const CONFIGURABLE_POLICY_IDS = [
  "layer-naming",
  "component-property-grammar",
  "component-value-grammar",
  "canonical-component-names",
  "source-name-uniqueness",
  "catalog-vocabulary",
  "component-descriptions",
  "detached-designs",
  "spacer-layers",
] as const;

export type ConfigurablePolicyId = (typeof CONFIGURABLE_POLICY_IDS)[number];

export interface PageRoleBinding {
  pageIds: string[];
  externalLibraryKeys: string[];
}

export interface ReadinessProfile {
  schemaVersion: 2;
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
  ruleModes: Record<ConfigurablePolicyId, RuleMode>;
}

export interface ProducerIdentity {
  pluginVersion: string;
  rulesetVersion: string;
  buildSha: string;
  channel: BuildChannel;
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

export type FindingCategory = "requirement" | "recommendation" | "governance";

export interface FindingProvenance {
  kind: "direct" | "inherited" | "style" | "unknown";
  /** Selectable owning node for rendered evidence that Figma cannot select directly. */
  navigationNodeId?: string;
  sourceNodeId?: string;
  sourceStyleId?: string;
  sourceLabel?: string;
  property?: string;
  contextKey?: string;
  relatedComponentId?: string;
}

export interface FindingGroup {
  id: string;
  kind: "source" | "related";
  primaryFindingId: string;
  findingIds: string[];
  occurrenceCount: number;
  sourceNodeId?: string;
  sourceStyleId?: string;
  sourceLabel?: string;
  property?: string;
  contextKey?: string;
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
  /** Absent only on historical v1 findings. */
  category?: FindingCategory;
  provenance?: FindingProvenance;
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
  | { kind: "acknowledge-detachment"; nodeId: string; value: { nodeId: string; acknowledgedAt: string } }
  | { kind: "clear-detachment-acknowledgement"; nodeId: string }
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

export type TokenCoverageDisposition = "bound" | "inherited" | "ignored" | "missing";
export type TokenCoverageField = BindableField | "effects";
export type TokenCoverageReason =
  | "variable"
  | "text-style"
  | "component-instance"
  | "not-rendered"
  | "inert-default"
  | "not-owner"
  | "unresolved-style"
  | "mixed"
  | "unsupported-unit"
  | "documentation-scaffold"
  | "unbound";

export interface TokenCoverageGroup {
  disposition: TokenCoverageDisposition;
  field: TokenCoverageField;
  reason: TokenCoverageReason;
  count: number;
  samples: Array<{ nodeId: string; nodePath: string }>;
  truncated: boolean;
}

export interface TokenCoverageSummary {
  counts: Record<TokenCoverageDisposition, number>;
  applicable: number;
  coverage: number | null;
  groups: TokenCoverageGroup[];
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
  tokenCoverage?: TokenCoverageSummary;
}

export interface ReadinessReport {
  schemaVersion: 1 | 2 | 3;
  producer?: ProducerIdentity;
  rulesetVersion: string;
  catalogVersion: string;
  catalogDigest: string;
  profileHash: string;
  target: {
    scope: ScanScope;
    rootIds: string[];
    knowledgeSnapshotHash: string;
    knowledgeComplete: boolean;
    resolution?: {
      mode: "exact" | "component-sources";
      requestedNodeIds: string[];
      excludedNodeIds: string[];
    };
  };
  axes: AxisScore[];
  frames: FrameResult[];
  grade: Grade;
  ready: boolean;
  blockers: string[];
  findings: Finding[];
  /** v2 presentation groups preserve the raw findings used for scoring and waivers. */
  issueGroups?: FindingGroup[];
  appliedChanges: ChangePlan[];
  generatedAt: string;
  snapshotHash: string;
}

export interface CertificationSummary {
  schemaVersion: 1 | 2;
  grade: GradeLetter;
  score: number;
  rulesetVersion: string;
  catalogVersion: string;
  certifiedAt: string;
  snapshotHash: string;
  knowledgeSnapshotHash: string;
  pluginVersion?: string;
  buildSha?: string;
  channel?: BuildChannel;
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
  /** Rendered occurrence evidence; its inherited source debt is evaluated at the definition. */
  evidenceRole?: "instance-descendant";
  owningInstanceId?: string;
  /** Live override evidence from the owning component instance. */
  instanceEvidence?: {
    overridesKnown: boolean;
    directOverrideFields?: string[];
    scaleFactor?: number;
  };
  renderVisible?: boolean;
  absoluteBounds?: { x: number; y: number; width: number; height: number };
  hasPointerInteraction?: boolean;
  interactionProperties?: Record<string, string>;
  clipsContent?: boolean;
  isMask?: boolean;
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
  layoutItem?: {
    horizontalSizing?: string;
    verticalSizing?: string;
    grow?: number;
    positioning?: string;
  };
  fills: PaintSnapshot[];
  strokes: PaintSnapshot[];
  effects: EffectSnapshot[];
  cornerRadius?: number;
  cornerRadii?: { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number };
  strokeWeight?: number;
  strokeWeights?: { top: number; right: number; bottom: number; left: number };
  /** Original property keys retain evidence of partially bound mixed geometry. */
  boundGeometryFields?: string[];
  boundFields: string[];
  boundVariableIds: Partial<Record<BindableField, string[]>>;
  inferredBindings: Partial<Record<BindableField, string[]>>;
  text?: {
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    fontStyle?: string;
    letterSpacingPx?: number;
    letterSpacing?: { unit: "PIXELS" | "PERCENT"; value: number };
    lineHeightPx?: number;
    lineHeight?: { unit: "PIXELS" | "PERCENT"; value: number } | { unit: "AUTO" };
    mixedFields?: BindableField[];
    style?: {
      id?: string;
      key?: string;
      name?: string;
      remote?: boolean;
      status: "resolved" | "unavailable" | "mixed";
      controlledFields: BindableField[];
      overriddenFields: BindableField[];
      /** Figma's explicit semantic override markers, when the runtime exposes them. */
      explicitOverrideKinds?: string[];
    };
    paragraphSpacing?: number;
    paragraphIndent?: number;
    charactersLength: number;
    contentHash: string;
    textColor?: { r: number; g: number; b: number; a: number };
    backgroundColor?: { r: number; g: number; b: number; a: number };
    backgroundResolvable: boolean;
    backgroundSourceNodeIds?: string[];
    backgroundReason?: string;
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
    directOverrideFields?: string[];
    overridesKnown?: boolean;
    scaleFactor?: number;
  };
  hasAnnotations: boolean;
  devResourceCount: number;
  exportSettings: Array<{ format: string; suffix: string }>;
  structuralSignature?: string;
  contentSignature?: string;
  certification?: CertificationSummary;
  confirmedPattern?: { canonicalName: string; sourceName: string; catalogVersion: string };
  intentionalDetachment?: { nodeId: string; acknowledgedAt: string };
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

export interface DesignKnowledgeGraph {
  schemaVersion: 1;
  /** Hash of variable values, modes, aliases, applied styles and library inventory. */
  resourceFingerprint?: string;
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
  snapshotHash: string;
}

export interface ScanRequest {
  scope: ScanScope;
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
  exceptions?: string[];
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
  /** False when shown only through the optional all-guidance view. */
  applicable?: boolean;
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
    exceptions?: string[];
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

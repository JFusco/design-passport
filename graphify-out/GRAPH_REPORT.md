# Graph Report - design-passport  (2026-10-03)

## Corpus Check
- 117 files · ~70,212 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1040 nodes · 3186 edges · 39 communities (36 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `84889dc0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- adapter.ts
- runtime.ts
- mutations.ts
- report.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- node-fields.ts
- plugin/main.ts
- contracts.ts
- ReadinessReport
- constants.ts
- handleMessage
- messages.ts
- scan-lifecycle.ts
- KnowledgeSessionState
- presentation.ts
- ChangePlan
- catalog.ts
- message-validation.ts
- ReadinessProfile
- session-state.ts
- rules.ts
- FigmaAdapter
- analyzeCurrentGraph
- Findings.tsx
- layout.tsx
- proxy.ts
- next.config.ts
- knowledge.ts
- stable.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 69 edges
2. `handleMessage()` - 42 edges
3. `ReadinessProfile` - 32 edges
4. `Finding` - 29 edges
5. `DesignKnowledgeGraph` - 25 edges
6. `assertContract()` - 24 edges
7. `snapshotBase()` - 24 edges
8. `FigmaAdapter` - 24 edges
9. `buildReadinessReport()` - 22 edges
10. `analyzeCurrentGraph()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `recordDecision()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importLearning()`  [EXTRACTED]
  apps/companion/app/api/learnings/import/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (39 total, 3 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.05
Nodes (110): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), args(), availablePort() (+102 more)

### Community 1 - "adapter.ts"
Cohesion: 0.05
Nodes (85): CertificationSummary, ScanProgress, populateGraphMetrics(), postOrder(), sourceFrameIds(), annotateInstanceDescendants(), BINDABLE_FIELDS, bindingSignature() (+77 more)

### Community 2 - "runtime.ts"
Cohesion: 0.06
Nodes (62): POST(), runtime, POST(), runtime, GET(), runtime, safeFilename(), POST() (+54 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (45): FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties(), applyChangePlan() (+37 more)

### Community 4 - "report.ts"
Cohesion: 0.18
Nodes (23): AXES, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES, classifyFinding(), collapseDisabledPolicyFindings(), CONFIGURABLE_RULES (+15 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.08
Nodes (42): FindingCategory, Grade, AuditSaveStatus, AuditViewState, canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditSummary (+34 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (41): SOURCES, channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES (+33 more)

### Community 7 - "App.tsx"
Cohesion: 0.15
Nodes (21): producerLabel(), profileDomainErrors(), App(), download(), EMPTY_SELECTION_SUMMARY, ProfileEditor(), root, auditCompletionNotice() (+13 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - "node-fields.ts"
Cohesion: 0.18
Nodes (27): collectDescendants(), assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent() (+19 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.09
Nodes (25): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore, FullKnowledgeRebuildRequired, BatchAuditSummary (+17 more)

### Community 12 - "contracts.ts"
Cohesion: 0.09
Nodes (26): PRODUCER_IDENTITY, RULESET_VERSION, AxisScore, BuildChannel, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot, Fixability (+18 more)

### Community 13 - "ReadinessReport"
Cohesion: 0.30
Nodes (10): ReadinessReport, AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts(), RecheckFindings, Modules(), ModulesProps (+2 more)

### Community 14 - "constants.ts"
Cohesion: 0.16
Nodes (18): AXIS_LABELS, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+10 more)

### Community 15 - "handleMessage"
Cohesion: 0.22
Nodes (15): validateSessionPackUse(), historicalAuditContent(), assertDocumentMutationAllowed(), assertInitialized(), errorMessage(), handleDocumentChange(), handleMessage(), initialize() (+7 more)

### Community 16 - "messages.ts"
Cohesion: 0.14
Nodes (23): GradeLetter, ScanRequest, ScanScope, PageOption, SelectionSummary, AuditRefreshResult, AuditTargetSummary, BrandMark() (+15 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.22
Nodes (13): CapturedAuditTarget, AuditMetadata, PluginToUiMessage, friendlyImportError(), pluginMessageForError(), AuditTargetIntent, auditTargetSummary(), CapturedAuditAttempt (+5 more)

### Community 19 - "presentation.ts"
Cohesion: 0.22
Nodes (15): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+7 more)

### Community 20 - "ChangePlan"
Cohesion: 0.48
Nodes (6): ChangePlan, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (15): canonical, CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern() (+7 more)

### Community 22 - "message-validation.ts"
Cohesion: 0.08
Nodes (37): AI_SOURCE_FRAME_ANNOTATION, DEFAULT_PROFILE, ChangeOperation, MultiFileReviewReportV1, BINDABLE_FIELDS, isBindableField(), operationForFinding(), operationKey() (+29 more)

### Community 24 - "ReadinessProfile"
Cohesion: 0.20
Nodes (14): DesignKnowledgeGraph, ReadinessProfile, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), resolveTargetRoots(), targetRootIds() (+6 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.16
Nodes (23): canonicalPatternName(), Finding, FindingStatus, evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree() (+15 more)

### Community 27 - "FigmaAdapter"
Cohesion: 0.23
Nodes (5): FigmaAdapter, summarizeSelection(), activeProjectStyleGuidePack(), currentProjectStyleGuideStatus(), storedProjectStyleGuideBinding()

### Community 29 - "analyzeCurrentGraph"
Cohesion: 0.21
Nodes (14): isKnowledgeFresh(), analyzeCurrentGraph(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), currentKnowledgeAvailable() (+6 more)

### Community 30 - "Findings.tsx"
Cohesion: 0.12
Nodes (28): getPatternChecklist(), Axis, FindingGroup, FrameResult, TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason (+20 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - "knowledge.ts"
Cohesion: 0.39
Nodes (8): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 43 - "stable.ts"
Cohesion: 0.18
Nodes (16): BindableField, FindingProvenance, JsonValue, NodeSnapshot, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource() (+8 more)

## Knowledge Gaps
- **160 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `adapter.ts`, `report.ts`, `audit-storage.ts`, `knowledge.ts`, `App.tsx`, `stable.ts`, `plugin/main.ts`, `handleMessage`, `message-validation.ts`, `ReadinessProfile`, `analyzeCurrentGraph`, `Findings.tsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.05247376311844078 - nodes in this community are weakly interconnected._
- **Should `adapter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05036630036630037 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05759623861298854 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0988235294117647 - nodes in this community are weakly interconnected._
# Graph Report - design-passport  (2026-10-02)

## Corpus Check
- 117 files · ~71,813 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1054 nodes · 3247 edges · 39 communities (36 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b36fc9e`
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
- Overview.tsx
- messages.ts
- profile.ts
- scan-lifecycle.ts
- analyzeCurrentGraph
- Findings.tsx
- presentation.ts
- rules.ts
- catalog.ts
- handleMessage
- pipeline.ts
- DesignKnowledgeGraph
- session-state.ts
- finding.ts
- FigmaAdapter
- knowledge.ts
- KnowledgeSessionState
- breakdown.ts
- layout.tsx
- proxy.ts
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 70 edges
2. `handleMessage()` - 53 edges
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
Nodes (114): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), args(), availablePort() (+106 more)

### Community 1 - "adapter.ts"
Cohesion: 0.05
Nodes (78): NodeSnapshot, ScanProgress, sourceFrameIds(), annotateInstanceDescendants(), BINDABLE_FIELDS, bindingSignature(), boundFields(), boundVariableIds() (+70 more)

### Community 2 - "runtime.ts"
Cohesion: 0.06
Nodes (59): POST(), runtime, POST(), runtime, GET(), runtime, safeFilename(), POST() (+51 more)

### Community 3 - "mutations.ts"
Cohesion: 0.07
Nodes (64): AI_SOURCE_FRAME_ANNOTATION, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY, PROFILE_DATA_KEY_V2 (+56 more)

### Community 4 - "report.ts"
Cohesion: 0.07
Nodes (62): AXIS_MULTIPLIERS, AXES, ChangeOperation, ChangePlan, ConfigurablePolicyId, Finding, FindingProvenance, attachFindingProvenance() (+54 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.08
Nodes (44): Grade, CapturedAuditTarget, AuditSaveStatus, AuditViewState, canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditSummary (+36 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 7 - "App.tsx"
Cohesion: 0.11
Nodes (32): producerLabel(), GradeLetter, SelectionSummary, AuditRefreshResult, App(), download(), EMPTY_SELECTION_SUMMARY, postMessage() (+24 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - "node-fields.ts"
Cohesion: 0.18
Nodes (27): assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke() (+19 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.09
Nodes (26): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore, FullKnowledgeRebuildRequired, activeProjectStyleGuidePack() (+18 more)

### Community 12 - "contracts.ts"
Cohesion: 0.11
Nodes (23): AxisScore, CONFIGURABLE_POLICY_IDS, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1, LearningObservationV1 (+15 more)

### Community 13 - "Overview.tsx"
Cohesion: 0.15
Nodes (21): AXIS_LABELS, ReadinessReport, PageOption, AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts(), RecheckFindings (+13 more)

### Community 14 - "messages.ts"
Cohesion: 0.17
Nodes (20): TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason, TokenCoveragePageQuery, isBindableField(), jsonValue(), parseUiMessage() (+12 more)

### Community 15 - "profile.ts"
Cohesion: 0.13
Nodes (17): DEFAULT_PROFILE, MultiFileReviewReportV1, assertProfileSemantics(), cloneProfile(), freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate (+9 more)

### Community 16 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (16): ScanScope, BatchAuditSummary, runPageBatch(), AuditTargetSummary, PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+8 more)

### Community 17 - "analyzeCurrentGraph"
Cohesion: 0.22
Nodes (16): isKnowledgeFresh(), analyzeCurrentGraph(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), currentKnowledgeAvailable() (+8 more)

### Community 18 - "Findings.tsx"
Cohesion: 0.25
Nodes (14): getPatternChecklist(), BindableField, FindingCategory, FindingGroup, JsonValue, VariableCollectionOption, Findings(), FindingsProps (+6 more)

### Community 19 - "presentation.ts"
Cohesion: 0.24
Nodes (13): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance(), GuidanceProps (+5 more)

### Community 20 - "rules.ts"
Cohesion: 0.24
Nodes (14): collectDescendants(), collectBoundVariableIds(), hasResponsiveVariableSignal(), evaluateRules(), createFinding(), findingOrder(), evaluatePipelineRules(), evaluateResponsiveRules() (+6 more)

### Community 21 - "catalog.ts"
Cohesion: 0.15
Nodes (14): canonical, CATALOG_DIGEST, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern(), normalizeLookup() (+6 more)

### Community 22 - "handleMessage"
Cohesion: 0.18
Nodes (15): captureCertificationMetadata(), copyAnnotations(), recordWrittenCertificationMetadata(), restoreCertificationMetadata(), historicalAuditContent(), assertDocumentMutationAllowed(), assertInitialized(), documentMutationIds() (+7 more)

### Community 23 - "pipeline.ts"
Cohesion: 0.26
Nodes (10): PRODUCER_IDENTITY, canonicalPatternName(), CATALOG_VERSION, RULESET_VERSION, BuildChannel, ProducerIdentity, evaluateNamingRules(), ABBREVIATED_COMPONENT_VALUE (+2 more)

### Community 24 - "DesignKnowledgeGraph"
Cohesion: 0.23
Nodes (11): DesignKnowledgeGraph, PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), populateGraphMetrics(), postOrder() (+3 more)

### Community 25 - "session-state.ts"
Cohesion: 0.18
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "finding.ts"
Cohesion: 0.24
Nodes (10): SOURCES, FindingStatus, Severity, evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree() (+2 more)

### Community 27 - "FigmaAdapter"
Cohesion: 0.27
Nodes (4): FigmaAdapter, summarizeSelection(), currentProjectStyleGuideStatus(), initialize()

### Community 28 - "knowledge.ts"
Cohesion: 0.39
Nodes (8): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 30 - "breakdown.ts"
Cohesion: 0.50
Nodes (7): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

## Knowledge Gaps
- **160 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `adapter.ts`, `report.ts`, `audit-storage.ts`, `plugin/main.ts`, `contracts.ts`, `messages.ts`, `analyzeCurrentGraph`, `handleMessage`, `DesignKnowledgeGraph`, `knowledge.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `adapter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054491899852724596 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06044303797468355 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0661189358372457 - nodes in this community are weakly interconnected._
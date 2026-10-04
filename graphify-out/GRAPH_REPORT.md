# Graph Report - design-passport  (2026-10-04)

## Corpus Check
- 117 files · ~70,289 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1040 nodes · 3188 edges · 47 communities (44 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c5625aa3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- adapter.ts
- runtime.ts
- mutations.ts
- repository.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- .buildKnowledge
- plugin/main.ts
- contracts.ts
- ReadinessReport
- constants.ts
- handleMessage
- Overview.tsx
- scan-lifecycle.ts
- KnowledgeSessionState
- presentation.ts
- companion/main.ts
- catalog.ts
- message-validation.ts
- snapshotBase
- review-source.ts
- session-state.ts
- node-fields.ts
- FigmaAdapter
- assertReferencePack
- analyzeCurrentGraph
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- context-cache.ts
- VariableCollectionOption
- text-style.ts
- profile.ts
- finding-groups.ts
- breakdown.ts
- schema.ts
- componentSnapshot

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

## Communities (47 total, 3 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.18
Nodes (32): assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertTeamKnowledgePack(), buildKnowledgeDecision(), buildKnowledgeInsights(), buildLearningEnvelope() (+24 more)

### Community 1 - "adapter.ts"
Cohesion: 0.14
Nodes (23): CertificationSummary, BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments(), capturePageFragments() (+15 more)

### Community 2 - "runtime.ts"
Cohesion: 0.06
Nodes (62): POST(), runtime, POST(), runtime, GET(), runtime, safeFilename(), POST() (+54 more)

### Community 3 - "mutations.ts"
Cohesion: 0.09
Nodes (51): BindableField, JsonValue, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), normalizeStableValue() (+43 more)

### Community 4 - "repository.ts"
Cohesion: 0.18
Nodes (27): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), clearRebuildRequired(), ensureDirectory(), exists(), ImportBatchResult (+19 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.08
Nodes (42): FindingCategory, Grade, AuditSaveStatus, AuditViewState, canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditSummary (+34 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (41): SOURCES, channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES (+33 more)

### Community 7 - "App.tsx"
Cohesion: 0.15
Nodes (21): profileDomainErrors(), App(), download(), EMPTY_SELECTION_SUMMARY, ProfileEditor(), root, auditCompletionNotice(), auditRefreshNotice() (+13 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - ".buildKnowledge"
Cohesion: 0.14
Nodes (19): ScanProgress, populateGraphMetrics(), postOrder(), sourceFrameIds(), annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences() (+11 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.10
Nodes (24): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore, FullKnowledgeRebuildRequired, historicalAuditContent() (+16 more)

### Community 12 - "contracts.ts"
Cohesion: 0.10
Nodes (21): AxisScore, BuildChannel, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1 (+13 more)

### Community 13 - "ReadinessReport"
Cohesion: 0.30
Nodes (10): ReadinessReport, AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts(), RecheckFindings, Modules(), ModulesProps (+2 more)

### Community 14 - "constants.ts"
Cohesion: 0.12
Nodes (17): AXIS_LABELS, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DEFAULT_PROFILE, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME (+9 more)

### Community 15 - "handleMessage"
Cohesion: 0.29
Nodes (11): validateSessionPackUse(), assertCurrentReport(), assertDocumentMutationAllowed(), assertInitialized(), currentKnowledgeAvailable(), handleMessage(), invalidateProfileIfNeeded(), markKnowledgeDirty() (+3 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.14
Nodes (23): producerLabel(), GradeLetter, ScanScope, PageOption, SelectionSummary, AuditRefreshResult, AuditTargetSummary, BrandMark() (+15 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (16): CapturedAuditTarget, AuditMetadata, BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+8 more)

### Community 19 - "presentation.ts"
Cohesion: 0.22
Nodes (15): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+7 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.16
Nodes (24): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), args(), availablePort() (+16 more)

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (15): canonical, CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern() (+7 more)

### Community 22 - "message-validation.ts"
Cohesion: 0.12
Nodes (26): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, ChangePlan, BINDABLE_FIELDS, isBindableField(), operationForFinding(), operationKey(), operationOrder() (+18 more)

### Community 23 - "snapshotBase"
Cohesion: 0.20
Nodes (22): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), devStatusSnapshot(), effectSnapshots(), enrichLiveEvidence(), geometryEvidence() (+14 more)

### Community 24 - "review-source.ts"
Cohesion: 0.19
Nodes (16): DesignReferencePackV1, ReferenceDomainV1, ReferenceFactV1, ReviewSourceRoleV1, declaredBreakpointWidths(), declaredGuidanceFacts(), FigmaNode, GUIDANCE_DOMAINS (+8 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "node-fields.ts"
Cohesion: 0.05
Nodes (95): canonicalPatternName(), AXES, DesignKnowledgeGraph, Finding, FindingStatus, NodeSnapshot, ReadinessProfile, ResponsiveFamily (+87 more)

### Community 27 - "FigmaAdapter"
Cohesion: 0.16
Nodes (6): FigmaAdapter, summarizeSelection(), activeProjectStyleGuidePack(), currentProjectStyleGuideStatus(), initialize(), storedProjectStyleGuideBinding()

### Community 28 - "assertReferencePack"
Cohesion: 0.32
Nodes (11): ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildProjectStyleGuideBinding(), buildReferencePack(), combineProjectStyleGuidePacks(), parseProjectStyleGuideBinding() (+3 more)

### Community 29 - "analyzeCurrentGraph"
Cohesion: 0.22
Nodes (15): isKnowledgeFresh(), analyzeCurrentGraph(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), ensureDocumentChangeWatcher(), ensureKnowledge() (+7 more)

### Community 30 - "messages.ts"
Cohesion: 0.16
Nodes (22): getPatternChecklist(), FindingGroup, ScanRequest, TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason, TokenCoveragePageQuery (+14 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - "context-cache.ts"
Cohesion: 0.27
Nodes (9): baseSnapshot(), ContextCachePort, contextFragment, newBuildDiagnostics(), readContextFragment(), record(), restPageFingerprint, restSubtreeCovers() (+1 more)

### Community 40 - "VariableCollectionOption"
Cohesion: 0.24
Nodes (9): PRODUCER_IDENTITY, BootstrapData, KnowledgeBuildResult, KnowledgeBuildDiagnostics, listVariableCollectionOptions(), loadRemoteCollections(), settleWithin(), VariableCollectionOption (+1 more)

### Community 41 - "text-style.ts"
Cohesion: 0.25
Nodes (5): mapConcurrent(), material(), mixedTypographyFields(), TextStyleEvidenceReader, TextStyleMaterial

### Community 42 - "profile.ts"
Cohesion: 0.36
Nodes (7): assertProfileSemantics(), cloneProfile(), normalizeReadinessProfile(), profileSemanticErrors(), ReadinessProfileV1, reconcileProfilePages(), validateContract()

### Community 43 - "finding-groups.ts"
Cohesion: 0.24
Nodes (15): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), groupsForFindings(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+7 more)

### Community 44 - "breakdown.ts"
Cohesion: 0.50
Nodes (7): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown

### Community 45 - "schema.ts"
Cohesion: 0.33
Nodes (5): MultiFileReviewReportV1, ContractName, ContractValidationResult, reportRelationshipErrors(), validators

### Community 46 - "componentSnapshot"
Cohesion: 0.50
Nodes (3): componentSnapshot(), canReadComponentPropertyDefinitions(), ComponentSnapshotNodeType

## Knowledge Gaps
- **160 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `adapter.ts`, `mutations.ts`, `repository.ts`, `audit-storage.ts`, `App.tsx`, `.buildKnowledge`, `plugin/main.ts`, `handleMessage`, `companion/main.ts`, `message-validation.ts`, `snapshotBase`, `review-source.ts`, `node-fields.ts`, `assertReferencePack`, `analyzeCurrentGraph`, `messages.ts`, `context-cache.ts`, `text-style.ts`, `finding-groups.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `adapter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05759623861298854 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08766803039158387 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08482523444160273 - nodes in this community are weakly interconnected._
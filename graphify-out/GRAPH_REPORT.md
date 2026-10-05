# Graph Report - design-passport  (2026-10-05)

## Corpus Check
- 146 files · ~87,353 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1269 nodes · 4077 edges · 63 communities (61 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f53dfe9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- knowledge-loop.ts
- .buildKnowledge
- requireRequestAccess
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- transaction
- plugin/main.ts
- core/contracts.ts
- stable.ts
- ReadinessReport
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- ensureKnowledge
- presentation.ts
- companion/main.ts
- catalog.ts
- finding-groups.ts
- runtime.ts
- adapter.ts
- session-state.ts
- ReadinessProfile
- handleMessage
- history.ts
- analyzeCurrentGraph
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- snapshotBase
- node-fields.ts
- review-source.ts
- model-reviews/route.ts
- graph.ts
- policy.ts
- NodeSnapshot
- audit-state.ts
- rules/component.ts
- model-review/contracts.ts
- model-review/repository.ts
- view-models.ts
- constants.ts
- profile.ts
- invalid
- Findings.tsx
- revise/route.ts
- collections.ts
- filesystem.ts
- errors.ts
- knowledge.ts
- assertProjectStyleGuideBinding
- schema.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 69 edges
2. `handleMessage()` - 42 edges
3. `transaction()` - 40 edges
4. `ReadinessProfile` - 32 edges
5. `requireRequestAccess()` - 31 edges
6. `Finding` - 30 edges
7. `failure()` - 29 edges
8. `invalid()` - 26 edges
9. `assertContract()` - 26 edges
10. `DesignKnowledgeGraph` - 25 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `auditDetail()`  [EXTRACTED]
  apps/companion/app/api/audits/[id]/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `previewAuditProjects()`  [EXTRACTED]
  apps/companion/app/api/audits/preview/route.ts → src/companion/repository.ts
- `GET()` --calls--> `learningDetail()`  [EXTRACTED]
  apps/companion/app/api/learnings/[id]/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importLearning()`  [EXTRACTED]
  apps/companion/app/api/learnings/import/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (63 total, 2 thin omitted)

### Community 0 - "knowledge-loop.ts"
Cohesion: 0.15
Nodes (40): derive(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertReferencePack(), assertTeamKnowledgePack(), buildKnowledgeDecision() (+32 more)

### Community 1 - ".buildKnowledge"
Cohesion: 0.16
Nodes (17): ScanProgress, annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences(), findPage(), graphDescendantIds(), inferredBindings() (+9 more)

### Community 2 - "requireRequestAccess"
Cohesion: 0.17
Nodes (23): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+15 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (46): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties() (+38 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.16
Nodes (23): assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS, ImportFileResult, ImportInput, ImportKind, nonempty() (+15 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.10
Nodes (33): canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditV1, AuditCodecMeasurement, AuditMetadata, auditPacket(), AuditSaveGuard (+25 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 7 - "App.tsx"
Cohesion: 0.12
Nodes (26): GradeLetter, AuditRefreshResult, App(), download(), EMPTY_SELECTION_SUMMARY, root, analyzingDetail(), AUDIT_CANCELLED_NOTICE (+18 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "transaction"
Cohesion: 0.17
Nodes (20): GET(), dynamic, HistoryDetailPage(), dynamic, metadata, ModelReviewsPage(), DashboardPage(), dynamic (+12 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.09
Nodes (25): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore, FullKnowledgeRebuildRequired, historicalAuditContent() (+17 more)

### Community 12 - "core/contracts.ts"
Cohesion: 0.09
Nodes (27): PRODUCER_IDENTITY, RULESET_VERSION, AxisScore, BuildChannel, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot, Fixability (+19 more)

### Community 13 - "stable.ts"
Cohesion: 0.11
Nodes (28): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, ChangePlan, BINDABLE_FIELDS, isBindableField(), operationForFinding(), operationKey(), operationOrder() (+20 more)

### Community 14 - "ReadinessReport"
Cohesion: 0.19
Nodes (17): HistoricalAuditExportV1, FrameResult, ReadinessReport, VariantCoverage, AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts() (+9 more)

### Community 15 - "report.ts"
Cohesion: 0.20
Nodes (20): AXES, affectsScore(), blocksReadiness(), CATEGORIES, collapseDisabledPolicyFindings(), CONFIGURABLE_RULES, configurablePolicyIdForFinding(), axisScores() (+12 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.25
Nodes (12): producerLabel(), PageOption, SelectionSummary, BrandMark(), BrandMarkProps, Overview(), OverviewProps, PageBatch() (+4 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (17): ScanScope, CapturedAuditTarget, BatchAuditSummary, runPageBatch(), AuditTargetSummary, PluginToUiMessage, friendlyImportError(), pluginMessageForError() (+9 more)

### Community 18 - "ensureKnowledge"
Cohesion: 0.19
Nodes (6): isKnowledgeFresh(), assertCurrentReport(), currentKnowledgeAvailable(), ensureKnowledge(), verifiedKnowledgeAvailable(), KnowledgeSessionState

### Community 19 - "presentation.ts"
Cohesion: 0.22
Nodes (15): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+7 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.15
Nodes (24): closeDatabases(), database(), databaseError(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment(), runtimeKeys, exportKnowledge() (+16 more)

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (16): canonical, CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern() (+8 more)

### Community 22 - "finding-groups.ts"
Cohesion: 0.33
Nodes (9): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding(), relatedComponent() (+1 more)

### Community 23 - "runtime.ts"
Cohesion: 0.10
Nodes (25): AuditImportForm(), Preview, dynamic, ImportAuditsPage(), GET(), FileResult, ImportForm(), ImportResult (+17 more)

### Community 24 - "adapter.ts"
Cohesion: 0.13
Nodes (19): BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments(), capturePageFragments(), collectionMaterial() (+11 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "ReadinessProfile"
Cohesion: 0.14
Nodes (28): canonicalPatternName(), SOURCES, DesignKnowledgeGraph, Finding, FindingStatus, ReadinessProfile, Severity, applyFindingPolicy() (+20 more)

### Community 27 - "handleMessage"
Cohesion: 0.14
Nodes (13): FigmaAdapter, summarizeSelection(), activeProjectStyleGuidePack(), assertDocumentMutationAllowed(), assertInitialized(), currentProjectStyleGuideStatus(), errorMessage(), handleMessage() (+5 more)

### Community 28 - "history.ts"
Cohesion: 0.23
Nodes (11): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+3 more)

### Community 29 - "analyzeCurrentGraph"
Cohesion: 0.21
Nodes (14): analyzeCurrentGraph(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), ensureDocumentChangeWatcher(), handleDocumentChange(), markKnowledgeDirty() (+6 more)

### Community 30 - "messages.ts"
Cohesion: 0.24
Nodes (13): ScanRequest, TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason, TokenCoveragePageQuery, TokenCoveragePageRequest, TokenCoveragePageResult (+5 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.13
Nodes (12): ProviderResponse, SharedProjection, generationBody(), validateProjection(), Lease, Clock, ModelReviewRunner, RunnerRepository (+4 more)

### Community 40 - "snapshotBase"
Cohesion: 0.20
Nodes (24): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), componentSnapshot(), devStatusSnapshot(), enrichLiveEvidence(), geometryEvidence() (+16 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.17
Nodes (27): assessIgnoringInstanceOwnership(), assessTokenProperty(), CODE_RELEVANT_FIELDS, collectBoundVariableIds(), documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke() (+19 more)

### Community 42 - "review-source.ts"
Cohesion: 0.13
Nodes (26): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), ingest(), DesignReferencePackV1 (+18 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.14
Nodes (16): ajv, edit, fields, required, runtime, selection, str, validators (+8 more)

### Community 44 - "graph.ts"
Cohesion: 0.24
Nodes (11): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), populateGraphMetrics(), postOrder(), resolveTargetRoots() (+3 more)

### Community 45 - "policy.ts"
Cohesion: 0.20
Nodes (16): Snapshot, assertNoCredentials(), assertSafe(), editSchema, INSTRUCTIONS, integer(), POLICY, projection() (+8 more)

### Community 46 - "NodeSnapshot"
Cohesion: 0.16
Nodes (12): NodeSnapshot, baseSnapshot(), ContextCachePort, contextFragment, readContextFragment(), record(), restPageFingerprint, restSubtreeCovers() (+4 more)

### Community 47 - "audit-state.ts"
Cohesion: 0.35
Nodes (9): Axis, FindingCategory, Grade, AuditSaveStatus, AuditViewState, SavedAuditSummary, SavedAudits(), SavedAuditsProps (+1 more)

### Community 48 - "rules/component.ts"
Cohesion: 0.57
Nodes (6): bindingCoverage, evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

### Community 49 - "model-review/contracts.ts"
Cohesion: 0.15
Nodes (19): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyResult, FrozenReview (+11 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.20
Nodes (27): decimal(), estimate(), money(), accountIn(), cancel(), claim(), cleanupDone(), completeReconciliation() (+19 more)

### Community 51 - "view-models.ts"
Cohesion: 0.18
Nodes (16): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+8 more)

### Community 52 - "constants.ts"
Cohesion: 0.16
Nodes (18): AXIS_LABELS, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+10 more)

### Community 53 - "profile.ts"
Cohesion: 0.13
Nodes (20): DEFAULT_PROFILE, CertificationSummary, assertProfileSemantics(), cloneProfile(), freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate (+12 more)

### Community 54 - "invalid"
Cohesion: 0.33
Nodes (16): POST(), conflict(), digest(), invalid(), uuid(), apply(), attachGuide(), preview() (+8 more)

### Community 55 - "Findings.tsx"
Cohesion: 0.28
Nodes (12): BindableField, FindingGroup, JsonValue, findingImpactLabel(), Findings(), FindingsProps, TokenWizard(), statusClass() (+4 more)

### Community 56 - "revise/route.ts"
Cohesion: 0.26
Nodes (12): POST(), runtime, POST(), runtime, dynamic, metadata, ReviewPage(), boundedBody() (+4 more)

### Community 57 - "collections.ts"
Cohesion: 0.83
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

### Community 58 - "filesystem.ts"
Cohesion: 0.28
Nodes (14): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteExternalJson(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), listFilesystemProjectGuidancePacks() (+6 more)

### Community 59 - "errors.ts"
Cohesion: 0.23
Nodes (8): GET(), runtime, safeFilename(), fixtureFile, fixtureVariables, CompanionError, CompanionErrorCode, listProjectGuidancePacks()

### Community 60 - "knowledge.ts"
Cohesion: 0.39
Nodes (8): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 61 - "assertProjectStyleGuideBinding"
Cohesion: 0.43
Nodes (6): ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), bindingMaterial(), buildProjectStyleGuideBinding(), parseProjectStyleGuideBinding(), targetFileFingerprint()

### Community 62 - "schema.ts"
Cohesion: 0.33
Nodes (5): MultiFileReviewReportV1, ContractName, ContractValidationResult, reportRelationshipErrors(), validators

## Knowledge Gaps
- **191 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `knowledge-loop.ts` to `.buildKnowledge`, `companion/repository.ts`, `audit-storage.ts`, `plugin/main.ts`, `core/contracts.ts`, `stable.ts`, `report.ts`, `ensureKnowledge`, `companion/main.ts`, `finding-groups.ts`, `adapter.ts`, `handleMessage`, `messages.ts`, `snapshotBase`, `review-source.ts`, `graph.ts`, `NodeSnapshot`, `audit-state.ts`, `knowledge.ts`, `assertProjectStyleGuideBinding`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `knowledge-loop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14878048780487804 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10463659147869674 - nodes in this community are weakly interconnected._
- **Should `accessibility.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09393939393939393 - nodes in this community are weakly interconnected._
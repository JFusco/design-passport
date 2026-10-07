# Graph Report - design-passport-81  (2026-10-07)

## Corpus Check
- 152 files · ~94,946 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1321 nodes · 4357 edges · 66 communities (61 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85207e4b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- .buildKnowledge
- failure
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- model-reviews/page.tsx
- plugin/main.ts
- core/contracts.ts
- ChangePlan
- model-review/contracts.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- ensureKnowledge
- presentation.ts
- companion/main.ts
- catalog.ts
- stable.ts
- runtime.ts
- micro-check.ts
- session-state.ts
- rules.ts
- handleMessage
- history.ts
- Finding
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- adapter.ts
- node-fields.ts
- review-source.ts
- model-review/repository.ts
- graph.ts
- policy.ts
- NodeSnapshot
- audit-state.ts
- learnings/import/page.tsx
- DesignKnowledgeGraph
- transaction
- view-models.ts
- constants.ts
- profile.ts
- breakdown.ts
- Findings.tsx
- collections.ts
- FullKnowledgeRebuildRequired
- filesystem.ts
- errors.ts
- knowledge.ts
- database.ts
- FigmaAdapter
- profile-inference.ts
- TextStyleEvidenceReader
- assets.d.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 73 edges
2. `handleMessage()` - 47 edges
3. `transaction()` - 40 edges
4. `Finding` - 34 edges
5. `ReadinessProfile` - 33 edges
6. `requireRequestAccess()` - 31 edges
7. `failure()` - 29 edges
8. `DesignKnowledgeGraph` - 28 edges
9. `invalid()` - 26 edges
10. `assertContract()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviewView()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/view-models.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviewView()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/view-models.ts

## Import Cycles
- None detected.

## Communities (66 total, 5 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.12
Nodes (47): derive(), emptyPack(), ProjectStyleGuideBindingV1, assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertProjectStyleGuideBinding() (+39 more)

### Community 1 - ".buildKnowledge"
Cohesion: 0.15
Nodes (21): finalizeKnowledgeGraph(), annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), collectionMaterial(), enrichInferences(), findPage(), graphDescendantIds() (+13 more)

### Community 2 - "failure"
Cohesion: 0.16
Nodes (20): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+12 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (46): FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties(), applyChangePlan() (+38 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.12
Nodes (27): POST(), runtime, AuditImportForm(), Preview, assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS (+19 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.08
Nodes (45): isBindableField(), validateContract(), canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, AuditCodecMeasurement, auditPacket(), AuditSaveGuard (+37 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 7 - "App.tsx"
Cohesion: 0.10
Nodes (35): GradeLetter, ScanProgress, ScanScope, AuditRefreshResult, AuditTargetSummary, ContextStatus, App(), download() (+27 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "model-reviews/page.tsx"
Cohesion: 0.21
Nodes (15): dynamic, ImportAuditsPage(), dynamic, metadata, ModelReviewsPage(), DashboardPage(), dynamic, dynamic (+7 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.09
Nodes (28): applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate(), Waiver, historicalAuditContent(), HistoricalAuditExportV1 (+20 more)

### Community 12 - "core/contracts.ts"
Cohesion: 0.12
Nodes (20): CONFIGURABLE_POLICY_IDS, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1, LearningObservationV1, PageRoleBinding (+12 more)

### Community 13 - "ChangePlan"
Cohesion: 0.50
Nodes (7): ChangePlan, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, designerText(), fieldLabel()

### Community 14 - "model-review/contracts.ts"
Cohesion: 0.14
Nodes (21): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyInput, ApplyResult (+13 more)

### Community 15 - "report.ts"
Cohesion: 0.17
Nodes (23): AXES, ConfigurablePolicyId, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES, classifyFinding(), collapseDisabledPolicyFindings() (+15 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.15
Nodes (22): HistoricalAuditExportV1, producerLabel(), AXIS_LABELS, ReadinessReport, PageOption, SelectionSummary, AuditRecheckRequest, RecheckFindings (+14 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.17
Nodes (14): BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError, AuditTargetIntent, auditTargetSummary() (+6 more)

### Community 18 - "ensureKnowledge"
Cohesion: 0.11
Nodes (11): hasCompleteKnowledge(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), currentKnowledgeAvailable(), ensureDocumentChangeWatcher(), ensureKnowledge() (+3 more)

### Community 19 - "presentation.ts"
Cohesion: 0.22
Nodes (14): KnowledgeInsight, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance(), GuidanceProps (+6 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.14
Nodes (24): closeDatabases(), runtimeChildEnvironment(), exportKnowledge(), exportRelease(), newPrivateDirectory(), withWorkspaceWrite(), workspacePaths, readImportFiles() (+16 more)

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (20): canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases (+12 more)

### Community 22 - "stable.ts"
Cohesion: 0.20
Nodes (18): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), groupsForFindings(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+10 more)

### Community 23 - "runtime.ts"
Cohesion: 0.15
Nodes (21): GET(), runtime, GET(), runtime, GET(), dynamic, HistoryDetailPage(), PackForm() (+13 more)

### Community 24 - "micro-check.ts"
Cohesion: 0.47
Nodes (5): GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure(), microFieldGroup, TOKEN_PROPERTIES

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.14
Nodes (24): SOURCES, FindingStatus, Severity, collectDescendants(), collectBoundVariableIds(), hasResponsiveVariableSignal(), evaluateComponentRules(), hasDescription() (+16 more)

### Community 27 - "handleMessage"
Cohesion: 0.30
Nodes (14): assertDocumentMutationAllowed(), errorMessage(), generateContext(), handleMessage(), initialize(), invalidateProfileIfNeeded(), markKnowledgeDirty(), post() (+6 more)

### Community 28 - "history.ts"
Cohesion: 0.23
Nodes (11): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+3 more)

### Community 29 - "Finding"
Cohesion: 0.27
Nodes (13): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, Finding, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation (+5 more)

### Community 30 - "messages.ts"
Cohesion: 0.26
Nodes (12): TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, TokenCoveragePageRequest, TokenCoveragePageResult, UiToPluginMessage, aggregate() (+4 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.13
Nodes (13): ProviderResponse, SharedProjection, generationBody(), validateProjection(), Lease, Clock, ModelReviewRunner, RunnerRepository (+5 more)

### Community 40 - "adapter.ts"
Cohesion: 0.13
Nodes (37): BINDABLE_FIELDS, boundFields(), boundVariableIds(), canonicalBindableField(), CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries (+29 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.15
Nodes (29): TokenCoverageGroup, TokenCoverageSummary, VariableCandidate, assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds() (+21 more)

### Community 42 - "review-source.ts"
Cohesion: 0.13
Nodes (26): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), ingest(), DesignReferencePackV1 (+18 more)

### Community 43 - "model-review/repository.ts"
Cohesion: 0.15
Nodes (24): ajv, edit, fields, GET(), required, runtime, selection, str (+16 more)

### Community 44 - "graph.ts"
Cohesion: 0.24
Nodes (11): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), populateGraphMetrics(), postOrder(), resolveTargetRoots() (+3 more)

### Community 45 - "policy.ts"
Cohesion: 0.18
Nodes (30): POST(), assertNoCredentials(), assertSafe(), conflict(), digest(), editSchema, INSTRUCTIONS, integer() (+22 more)

### Community 46 - "NodeSnapshot"
Cohesion: 0.21
Nodes (12): NodeSnapshot, KnowledgeBuildResult, baseSnapshot(), ContextCachePort, contextFragment, KnowledgeBuildDiagnostics, newBuildDiagnostics(), readContextFragment() (+4 more)

### Community 47 - "audit-state.ts"
Cohesion: 0.29
Nodes (11): Grade, CapturedAuditTarget, AuditSaveStatus, AuditViewState, SavedAuditSummary, SavedAuditV1, AuditMetadata, SavedAudits() (+3 more)

### Community 48 - "learnings/import/page.tsx"
Cohesion: 0.29
Nodes (6): FileResult, ImportForm(), ImportResult, dynamic, ImportLearningsPage(), metadata

### Community 49 - "DesignKnowledgeGraph"
Cohesion: 0.21
Nodes (15): DesignKnowledgeGraph, actionableFinding(), AGGREGATES, stableIssueKey(), findingMicroFields(), mergeIssueReview(), analyzeCurrentGraph(), auditPages() (+7 more)

### Community 50 - "transaction"
Cohesion: 0.25
Nodes (20): transaction(), accountIn(), cancel(), claim(), cleanupDone(), completeReconciliation(), dispatch(), event() (+12 more)

### Community 51 - "view-models.ts"
Cohesion: 0.23
Nodes (13): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+5 more)

### Community 52 - "constants.ts"
Cohesion: 0.12
Nodes (15): PRODUCER_IDENTITY, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+7 more)

### Community 53 - "profile.ts"
Cohesion: 0.22
Nodes (12): CertificationSummary, cloneProfile(), normalizeReadinessProfile(), ReadinessProfileV1, reconcileProfilePages(), certificationSummary(), confirmedPattern(), parseCertificationSummary() (+4 more)

### Community 54 - "breakdown.ts"
Cohesion: 0.50
Nodes (7): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown

### Community 55 - "Findings.tsx"
Cohesion: 0.18
Nodes (20): AxisScore, BindableField, FindingCategory, FindingGroup, JsonValue, WaiverStore, BootstrapData, VariableCollectionOption (+12 more)

### Community 56 - "collections.ts"
Cohesion: 0.83
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

### Community 58 - "filesystem.ts"
Cohesion: 0.22
Nodes (17): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteExternalJson(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), KnowledgeState (+9 more)

### Community 59 - "errors.ts"
Cohesion: 0.14
Nodes (15): GET(), runtime, safeFilename(), POST(), runtime, PackResult, figmaTransport(), fixtureFile (+7 more)

### Community 60 - "knowledge.ts"
Cohesion: 0.33
Nodes (7): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 61 - "database.ts"
Cohesion: 0.26
Nodes (10): host, initializeModelReview(), database(), databaseError(), loadRuntimeEnvironment(), processState, runtimeKeys, Snapshot (+2 more)

### Community 63 - "FigmaAdapter"
Cohesion: 0.24
Nodes (4): assertProfileSemantics(), profileSemanticErrors(), FigmaAdapter, summarizeSelection()

### Community 64 - "profile-inference.ts"
Cohesion: 0.40
Nodes (5): DEFAULT_PROFILE, freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate

## Knowledge Gaps
- **196 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `.buildKnowledge`, `companion/repository.ts`, `audit-storage.ts`, `plugin/main.ts`, `core/contracts.ts`, `report.ts`, `ensureKnowledge`, `companion/main.ts`, `stable.ts`, `handleMessage`, `Finding`, `messages.ts`, `adapter.ts`, `node-fields.ts`, `review-source.ts`, `graph.ts`, `NodeSnapshot`, `audit-state.ts`, `DesignKnowledgeGraph`, `knowledge.ts`, `TextStyleEvidenceReader`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _196 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.12326530612244897 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `companion/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12473118279569892 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08411580594679187 - nodes in this community are weakly interconnected._
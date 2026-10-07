# Graph Report - design-passport-81  (2026-10-07)

## Corpus Check
- 152 files · ~94,643 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1321 nodes · 4356 edges · 67 communities (62 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6ee4d9e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- knowledge-loop.ts
- .buildKnowledge
- runtime.ts
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- model-reviews/page.tsx
- plugin/main.ts
- ReadinessProfile
- Finding
- breakdown.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- KnowledgeSessionState
- presentation.ts
- companion/main.ts
- catalog.ts
- finding-groups.ts
- AuditImportForm.tsx
- adapter.ts
- session-state.ts
- rules.ts
- handleMessage
- history.ts
- ensureKnowledge
- core/contracts.ts
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
- messages.ts
- hashValue
- analyzeCurrentGraph
- model-review/repository.ts
- ModelReviewController.tsx
- constants.ts
- profile.ts
- invalid
- Findings.tsx
- revise/route.ts
- collections.ts
- filesystem.ts
- errors.ts
- knowledge.ts
- database.ts
- schema.ts
- DesignKnowledgeGraph
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

## Communities (67 total, 5 thin omitted)

### Community 0 - "knowledge-loop.ts"
Cohesion: 0.15
Nodes (28): LearningObservationV1, ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildKnowledgeInsights(), buildMultiFileReviewReport(), buildProjectStyleGuideBinding() (+20 more)

### Community 1 - ".buildKnowledge"
Cohesion: 0.21
Nodes (15): finalizeKnowledgeGraph(), sourceFrameIds(), annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences(), findPage(), isSceneNode() (+7 more)

### Community 2 - "runtime.ts"
Cohesion: 0.13
Nodes (30): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+22 more)

### Community 3 - "mutations.ts"
Cohesion: 0.07
Nodes (61): ChangeOperation, JsonValue, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation, priority() (+53 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.16
Nodes (22): assertAudit(), assertProjectScope(), exactKeys(), HistoricalAuditExportV1, IMPORT_LIMITS, ImportFileResult, ImportInput, ImportKind (+14 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.08
Nodes (45): isBindableField(), validateContract(), canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, AuditCodecMeasurement, auditPacket(), AuditSaveGuard (+37 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 7 - "App.tsx"
Cohesion: 0.12
Nodes (28): ScanProgress, ContextStatus, App(), download(), EMPTY_SELECTION_SUMMARY, ContextStatusPanel(), LABELS, root (+20 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "model-reviews/page.tsx"
Cohesion: 0.18
Nodes (19): dynamic, ImportAuditsPage(), dynamic, HistoryDetailPage(), dynamic, metadata, ModelReviewsPage(), DashboardPage() (+11 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.11
Nodes (18): buildKnowledgeSummary(), activeProjectStyleGuidePack(), adapter, appliedChanges, auditStorage, codecMetrics, collections, commandGate (+10 more)

### Community 12 - "ReadinessProfile"
Cohesion: 0.20
Nodes (15): CONFIGURABLE_POLICY_IDS, ReadinessProfile, RuleMode, profileDomainErrors(), BootstrapData, VariableCollectionOption, PageExclusions(), suggestedExcludedPage() (+7 more)

### Community 13 - "Finding"
Cohesion: 0.40
Nodes (9): ChangePlan, Finding, BuildReportInput, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, designerText() (+1 more)

### Community 14 - "breakdown.ts"
Cohesion: 0.50
Nodes (7): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown

### Community 15 - "report.ts"
Cohesion: 0.17
Nodes (23): AXES, AxisScore, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES, classifyFinding(), collapseDisabledPolicyFindings() (+15 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.16
Nodes (21): producerLabel(), AXIS_LABELS, PageOption, SelectionSummary, AuditRecheckRequest, RecheckFindings, BrandMark(), BrandMarkProps (+13 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.17
Nodes (14): BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError, AuditTargetIntent, auditTargetSummary() (+6 more)

### Community 19 - "presentation.ts"
Cohesion: 0.24
Nodes (12): ProjectStyleGuideStatus, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance(), GuidanceProps, originLabel(), summarizeContribution() (+4 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.20
Nodes (19): closeDatabases(), runtimeChildEnvironment(), exportKnowledge(), exportRelease(), newPrivateDirectory(), withWorkspaceWrite(), workspacePaths, readImportFiles() (+11 more)

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (20): canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases (+12 more)

### Community 22 - "finding-groups.ts"
Cohesion: 0.19
Nodes (17): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), groupsForFindings(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+9 more)

### Community 23 - "AuditImportForm.tsx"
Cohesion: 0.12
Nodes (15): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, dynamic, ImportLearningsPage(), metadata (+7 more)

### Community 24 - "adapter.ts"
Cohesion: 0.08
Nodes (31): EffectSnapshot, PaintSnapshot, BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments() (+23 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.14
Nodes (23): AI_SOURCE_FRAME_ANNOTATION, SOURCES, FindingStatus, Severity, collectDescendants(), evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription() (+15 more)

### Community 27 - "handleMessage"
Cohesion: 0.18
Nodes (14): assertProfileSemantics(), profileSemanticErrors(), historicalAuditContent(), assertDocumentMutationAllowed(), assertInitialized(), handleDocumentChange(), handleMessage(), initialize() (+6 more)

### Community 28 - "history.ts"
Cohesion: 0.23
Nodes (11): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+3 more)

### Community 29 - "ensureKnowledge"
Cohesion: 0.21
Nodes (13): hasCompleteKnowledge(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), currentKnowledgeAvailable(), ensureDocumentChangeWatcher(), ensureKnowledge() (+5 more)

### Community 30 - "core/contracts.ts"
Cohesion: 0.13
Nodes (20): ConfigurablePolicyId, Fixability, GradeLetter, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1, PageRoleBinding, ReferenceMatcherV1 (+12 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.11
Nodes (15): Outcome, ProviderResponse, SharedProjection, generationBody(), recommendations(), validateProjection(), Lease, Clock (+7 more)

### Community 40 - "snapshotBase"
Cohesion: 0.20
Nodes (24): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), componentSnapshot(), devStatusSnapshot(), enrichLiveEvidence(), geometryEvidence() (+16 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.14
Nodes (30): TokenCoverageSummary, VariableCandidate, assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, collectBoundVariableIds(), documentationScaffoldNodeIds() (+22 more)

### Community 42 - "review-source.ts"
Cohesion: 0.13
Nodes (26): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), ingest(), DesignReferencePackV1 (+18 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.13
Nodes (22): ajv, edit, fields, GET(), required, runtime, selection, str (+14 more)

### Community 44 - "graph.ts"
Cohesion: 0.27
Nodes (10): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), populateGraphMetrics(), postOrder(), resolveTargetRoots() (+2 more)

### Community 45 - "policy.ts"
Cohesion: 0.11
Nodes (30): Accounting, ApplyResult, CandidateRevision, FrozenReview, Preview, PricePolicy, ProjectSummary, Recommendation (+22 more)

### Community 46 - "NodeSnapshot"
Cohesion: 0.29
Nodes (9): NodeSnapshot, baseSnapshot(), ContextCachePort, contextFragment, readContextFragment(), record(), restPageFingerprint, restSubtreeCovers() (+1 more)

### Community 47 - "messages.ts"
Cohesion: 0.18
Nodes (21): FindingCategory, Grade, KnowledgeInsight, ReadinessReport, ScanRequest, ScanScope, CapturedAuditTarget, AuditSaveStatus (+13 more)

### Community 48 - "hashValue"
Cohesion: 0.21
Nodes (23): loadDecisions(), loadEnvelopes(), readFilesystemKnowledgeState(), derive(), emptyPack(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope() (+15 more)

### Community 49 - "analyzeCurrentGraph"
Cohesion: 0.19
Nodes (19): actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate() (+11 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.28
Nodes (22): transaction(), accountIn(), attachGuide(), cancel(), claim(), cleanupDone(), completeReconciliation(), dispatch() (+14 more)

### Community 51 - "ModelReviewController.tsx"
Cohesion: 0.17
Nodes (17): active(), EditDraft, ModelReviewController(), readRun(), request(), decisionDateFormatter, humanize(), matchesCandidate() (+9 more)

### Community 52 - "constants.ts"
Cohesion: 0.12
Nodes (15): PRODUCER_IDENTITY, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+7 more)

### Community 53 - "profile.ts"
Cohesion: 0.22
Nodes (12): CertificationSummary, cloneProfile(), normalizeReadinessProfile(), ReadinessProfileV1, reconcileProfilePages(), certificationSummary(), confirmedPattern(), parseCertificationSummary() (+4 more)

### Community 54 - "invalid"
Cohesion: 0.39
Nodes (15): POST(), conflict(), digest(), invalid(), uuid(), apply(), preview(), reconcile() (+7 more)

### Community 55 - "Findings.tsx"
Cohesion: 0.26
Nodes (12): BindableField, FindingGroup, WaiverStore, Findings(), FindingsProps, TokenWizard(), statusClass(), defaultTokenCollectionId() (+4 more)

### Community 56 - "revise/route.ts"
Cohesion: 0.33
Nodes (7): POST(), runtime, POST(), runtime, boundedBody(), recordDecision(), reviseCandidate()

### Community 57 - "collections.ts"
Cohesion: 0.83
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

### Community 58 - "filesystem.ts"
Cohesion: 0.27
Nodes (14): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteExternalJson(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), KnowledgeState (+6 more)

### Community 59 - "errors.ts"
Cohesion: 0.18
Nodes (13): GET(), runtime, safeFilename(), POST(), runtime, figmaTransport(), fixtureFile, fixtureVariables (+5 more)

### Community 60 - "knowledge.ts"
Cohesion: 0.33
Nodes (7): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 61 - "database.ts"
Cohesion: 0.29
Nodes (9): host, initializeModelReview(), database(), databaseError(), loadRuntimeEnvironment(), processState, runtimeKeys, assertFixtureEnvironment() (+1 more)

### Community 62 - "schema.ts"
Cohesion: 0.33
Nodes (5): MultiFileReviewReportV1, ContractName, ContractValidationResult, reportRelationshipErrors(), validators

### Community 63 - "DesignKnowledgeGraph"
Cohesion: 0.29
Nodes (5): DesignKnowledgeGraph, FigmaAdapter, summarizeSelection(), auditPages(), runScan()

### Community 64 - "profile-inference.ts"
Cohesion: 0.40
Nodes (5): DEFAULT_PROFILE, freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate

## Knowledge Gaps
- **196 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `knowledge-loop.ts`, `.buildKnowledge`, `mutations.ts`, `companion/repository.ts`, `audit-storage.ts`, `plugin/main.ts`, `ReadinessProfile`, `report.ts`, `companion/main.ts`, `finding-groups.ts`, `adapter.ts`, `handleMessage`, `ensureKnowledge`, `core/contracts.ts`, `snapshotBase`, `node-fields.ts`, `review-source.ts`, `graph.ts`, `NodeSnapshot`, `messages.ts`, `analyzeCurrentGraph`, `knowledge.ts`, `TextStyleEvidenceReader`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _196 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `knowledge-loop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14623655913978495 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12955465587044535 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07080745341614907 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08411580594679187 - nodes in this community are weakly interconnected._
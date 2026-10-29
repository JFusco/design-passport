# Graph Report - design-passport  (2026-10-29)

## Corpus Check
- 173 files · ~108,907 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1428 nodes · 4671 edges · 67 communities (63 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f256b01d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- accessibility.ts
- runtime.ts
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- failure
- App.tsx
- devDependencies
- compilerOptions
- requirePageAccess
- plugin/main.ts
- core/operations/interaction-state.ts
- ChangePlan
- model-review/contracts.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- KnowledgeSessionState
- presentation.ts
- companion/main.ts
- catalog.ts
- stable.ts
- background.ts
- .refreshTrackedFragments
- session-state.ts
- Finding
- handleMessage
- review-source.ts
- conductor-contracts.ts
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- snapshotBase
- node-fields.ts
- issue-review.ts
- model-reviews/route.ts
- ProfileEditor.tsx
- policy.ts
- graph.ts
- filesystem.ts
- history.ts
- assertReferencePack
- model-review/repository.ts
- view-models.ts
- core/contracts.ts
- adapter.ts
- finding-groups.ts
- Findings.tsx
- analyzeCurrentGraph
- .buildKnowledge
- database.ts
- AuditImportForm.tsx
- ReadinessReport
- text-style.ts
- VariableCollectionOption
- AuditSaveStatus
- constants.ts
- rules/component.ts
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
- `POST()` --calls--> `multipartInputs()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/imports.ts
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviewView()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/view-models.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (67 total, 4 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.16
Nodes (36): derive(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertTeamKnowledgePack(), buildKnowledgeDecision(), buildKnowledgeInsights() (+28 more)

### Community 1 - "accessibility.ts"
Cohesion: 0.31
Nodes (12): isLargeText(), assessTarget(), evaluateAccessibilityRules(), insideDefinition(), interactiveCandidates(), isDescendant(), overlappingBounds(), renderedInGraph() (+4 more)

### Community 2 - "runtime.ts"
Cohesion: 0.22
Nodes (14): GET(), runtime, GET(), runtime, GET(), isConfigured(), requireRequestAccess(), secureEqual() (+6 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (43): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties() (+35 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.14
Nodes (28): POST(), runtime, POST(), runtime, assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS (+20 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.10
Nodes (36): canonicalAuditTargetKey(), isAuditViewState(), SavedAuditV1, AuditCodecMeasurement, auditPacket(), AuditSaveGuard, AuditStorage, AuditStorageOptions (+28 more)

### Community 6 - "failure"
Cohesion: 0.13
Nodes (26): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+18 more)

### Community 7 - "App.tsx"
Cohesion: 0.17
Nodes (20): App(), download(), EMPTY_SELECTION_SUMMARY, postMessage(), root, auditCompletionNotice(), auditRefreshNotice(), isAuditInterruptible() (+12 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "requirePageAccess"
Cohesion: 0.19
Nodes (16): dynamic, ImportAuditsPage(), dynamic, HistoryDetailPage(), DashboardPage(), dynamic, dynamic, metadata (+8 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.10
Nodes (20): FullKnowledgeRebuildRequired, historicalAuditContent(), HistoricalAuditExportV1, HistoricalAuditSource, adapter, appliedChanges, assertInitialized(), auditStorage (+12 more)

### Community 12 - "core/operations/interaction-state.ts"
Cohesion: 0.31
Nodes (11): FALSE_VALUES, hasInactiveVariantState(), interactionState, normalizedProperties(), normalizePropertyName(), normalizePropertyValue(), resolvedState(), stateEvidence() (+3 more)

### Community 13 - "ChangePlan"
Cohesion: 0.42
Nodes (8): ChangePlan, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, designerText(), fieldLabel()

### Community 14 - "model-review/contracts.ts"
Cohesion: 0.14
Nodes (20): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyInput, ApplyResult (+12 more)

### Community 15 - "report.ts"
Cohesion: 0.13
Nodes (30): AXES, ConfigurablePolicyId, Grade, GradeLetter, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES (+22 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.14
Nodes (24): producerLabel(), ScanScope, PageOption, SelectionSummary, AuditRefreshResult, AuditTargetSummary, BrandMark(), BrandMarkProps (+16 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (16): CapturedAuditTarget, AuditMetadata, BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+8 more)

### Community 19 - "presentation.ts"
Cohesion: 0.16
Nodes (19): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, ContextStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker() (+11 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.23
Nodes (19): closeDatabases(), runtimeChildEnvironment(), createReferencePack(), atomicWriteExternalJson(), workspacePaths, readImportFiles(), args(), availablePort() (+11 more)

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (15): canonical, CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern() (+7 more)

### Community 22 - "stable.ts"
Cohesion: 0.07
Nodes (40): AI_SOURCE_FRAME_ANNOTATION, DEFAULT_PROFILE, ChangeOperation, MultiFileReviewReportV1, BINDABLE_FIELDS, isBindableField(), operationForFinding(), operationKey() (+32 more)

### Community 23 - "background.ts"
Cohesion: 0.22
Nodes (17): channel(), composite(), contrastRatio(), relativeLuminance(), Rgba, contains(), fillStack(), hasVisiblePaint() (+9 more)

### Community 24 - ".refreshTrackedFragments"
Cohesion: 0.15
Nodes (15): ScanProgress, finalizeKnowledgeGraph(), annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences(), FigmaAdapter, findPage() (+7 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "Finding"
Cohesion: 0.16
Nodes (23): canonicalPatternName(), SOURCES, DesignKnowledgeGraph, Finding, FindingStatus, NodeSnapshot, ReadinessProfile, BuildReportInput (+15 more)

### Community 27 - "handleMessage"
Cohesion: 0.19
Nodes (15): activeProjectStyleGuidePack(), assertDocumentMutationAllowed(), currentProjectStyleGuideStatus(), ensureDocumentChangeWatcher(), handleDocumentChange(), handleMessage(), initialize(), invalidateProfileIfNeeded() (+7 more)

### Community 28 - "review-source.ts"
Cohesion: 0.13
Nodes (23): fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), DesignReferencePackV1, ReferenceDomainV1, ReferenceFactV1 (+15 more)

### Community 29 - "conductor-contracts.ts"
Cohesion: 0.05
Nodes (80): assertContractVersion(), CanvasInstructions, CanvasJob, DesignSubmission, ExistingFrameDestination, integer(), JobState, keys() (+72 more)

### Community 30 - "messages.ts"
Cohesion: 0.29
Nodes (11): TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, TokenCoveragePageRequest, TokenCoveragePageResult, aggregate(), CoverageEvidenceGroup() (+3 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.15
Nodes (9): ProviderResponse, SharedProjection, recommendations(), Lease, Clock, ModelReviewRunner, RunnerRepository, terminal() (+1 more)

### Community 40 - "snapshotBase"
Cohesion: 0.19
Nodes (23): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), devStatusSnapshot(), effectSnapshots(), enrichLiveEvidence(), geometryEvidence() (+15 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.14
Nodes (31): bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName, assessIgnoringInstanceOwnership(), assessTokenProperty() (+23 more)

### Community 42 - "issue-review.ts"
Cohesion: 0.20
Nodes (16): actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate() (+8 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.13
Nodes (19): ajv, edit, fields, GET(), required, runtime, selection, str (+11 more)

### Community 44 - "ProfileEditor.tsx"
Cohesion: 0.21
Nodes (11): CONFIGURABLE_POLICY_IDS, RuleMode, BootstrapData, AuditResultData, PageExclusions(), suggestedExcludedPage(), PageRole, POLICY_LABELS (+3 more)

### Community 45 - "policy.ts"
Cohesion: 0.15
Nodes (27): Snapshot, assertNoCredentials(), assertSafe(), conflict(), digest(), editSchema, generationBody(), INSTRUCTIONS (+19 more)

### Community 46 - "graph.ts"
Cohesion: 0.18
Nodes (13): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), isConductorAuditExcluded(), nestedComponentSources(), populateGraphMetrics(), postOrder() (+5 more)

### Community 47 - "filesystem.ts"
Cohesion: 0.19
Nodes (19): exportKnowledge(), exportRelease(), newPrivateDirectory(), acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), atomicWriteJsonAt() (+11 more)

### Community 48 - "history.ts"
Cohesion: 0.18
Nodes (14): GET(), runtime, GET(), runtime, GET(), runtime, dynamic, HistoryPage() (+6 more)

### Community 49 - "assertReferencePack"
Cohesion: 0.28
Nodes (11): listFilesystemProjectGuidancePacks(), ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildProjectStyleGuideBinding(), parseProjectStyleGuideBinding(), parseReferencePack() (+3 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.19
Nodes (37): POST(), transaction(), decimal(), estimate(), integer(), invalid(), money(), uuid() (+29 more)

### Community 51 - "view-models.ts"
Cohesion: 0.25
Nodes (12): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+4 more)

### Community 52 - "core/contracts.ts"
Cohesion: 0.11
Nodes (18): PRODUCER_IDENTITY, RULESET_VERSION, BuildChannel, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1 (+10 more)

### Community 53 - "adapter.ts"
Cohesion: 0.10
Nodes (32): CertificationSummary, BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments(), capturePageFragments() (+24 more)

### Community 54 - "finding-groups.ts"
Cohesion: 0.23
Nodes (16): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), groupsForFindings(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+8 more)

### Community 55 - "Findings.tsx"
Cohesion: 0.19
Nodes (19): Axis, AxisScore, BindableField, FindingCategory, FindingGroup, JsonValue, WaiverStore, AuditViewState (+11 more)

### Community 56 - "analyzeCurrentGraph"
Cohesion: 0.20
Nodes (18): hasCompleteKnowledge(), buildKnowledgeSummary(), analyzeCurrentGraph(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages() (+10 more)

### Community 57 - ".buildKnowledge"
Cohesion: 0.27
Nodes (12): referencedVariableIds(), variableCandidates(), baseSnapshot(), ContextCachePort, contextFragment, mapConcurrent(), newBuildDiagnostics(), readContextFragment() (+4 more)

### Community 58 - "database.ts"
Cohesion: 0.29
Nodes (9): host, initializeModelReview(), database(), databaseError(), loadRuntimeEnvironment(), processState, runtimeKeys, assertFixtureEnvironment() (+1 more)

### Community 59 - "AuditImportForm.tsx"
Cohesion: 0.12
Nodes (15): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, dynamic, ImportLearningsPage(), metadata (+7 more)

### Community 60 - "ReadinessReport"
Cohesion: 0.25
Nodes (13): HistoricalAuditExportV1, FrameResult, ReadinessReport, VariantCoverage, AuditRecheckRequest, RecheckFindings, Modules(), ModulesProps (+5 more)

### Community 61 - "text-style.ts"
Cohesion: 0.31
Nodes (4): material(), mixedTypographyFields(), TextStyleEvidenceReader, TextStyleMaterial

### Community 62 - "VariableCollectionOption"
Cohesion: 0.36
Nodes (6): KnowledgeBuildResult, KnowledgeBuildDiagnostics, listVariableCollectionOptions(), loadRemoteCollections(), settleWithin(), VariableCollectionOption

### Community 63 - "AuditSaveStatus"
Cohesion: 0.60
Nodes (5): AuditSaveStatus, SavedAuditSummary, SavedAudits(), SavedAuditsProps, gradeClass()

### Community 64 - "constants.ts"
Cohesion: 0.15
Nodes (12): AXIS_LABELS, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+4 more)

### Community 65 - "rules/component.ts"
Cohesion: 0.67
Nodes (5): evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

## Knowledge Gaps
- **208 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+203 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `companion/repository.ts`, `audit-storage.ts`, `App.tsx`, `plugin/main.ts`, `report.ts`, `companion/main.ts`, `stable.ts`, `.refreshTrackedFragments`, `handleMessage`, `review-source.ts`, `messages.ts`, `snapshotBase`, `node-fields.ts`, `issue-review.ts`, `graph.ts`, `assertReferencePack`, `adapter.ts`, `finding-groups.ts`, `Findings.tsx`, `analyzeCurrentGraph`, `.buildKnowledge`, `text-style.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10195035460992907 - nodes in this community are weakly interconnected._
- **Should `companion/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10218579234972677 - nodes in this community are weakly interconnected._
- **Should `failure` be split into smaller, more focused modules?**
  _Cohesion score 0.13015873015873017 - nodes in this community are weakly interconnected._
# Graph Report - design-passport  (2026-10-28)

## Corpus Check
- 170 files · ~105,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1408 nodes · 4602 edges · 65 communities (62 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53dadd36`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- knowledge-loop.ts
- FigmaAdapter
- runtime.ts
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- imports.ts
- App.tsx
- devDependencies
- compilerOptions
- model-reviews/page.tsx
- plugin/main.ts
- ReadinessReport
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
- accessibility.ts
- .stageMicroCheck
- session-state.ts
- rules.ts
- handleMessage
- review-source.ts
- conductor-contracts.ts
- core/contracts.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- adapter.ts
- node-fields.ts
- issue-review.ts
- model-reviews/route.ts
- ProfileEditor.tsx
- policy.ts
- graph.ts
- filesystem.ts
- history.ts
- hashValue
- model-review/repository.ts
- view-models.ts
- constants.ts
- ReadinessProfile
- finding-groups.ts
- Findings.tsx
- DesignKnowledgeGraph
- .buildKnowledge
- figma.ts
- AuditImportForm.tsx
- knowledge.ts
- text-style.ts
- collections.ts
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
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `previewAuditProjects()`  [EXTRACTED]
  apps/companion/app/api/audits/preview/route.ts → src/companion/repository.ts
- `POST()` --calls--> `boundedBody()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/imports.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (65 total, 3 thin omitted)

### Community 0 - "knowledge-loop.ts"
Cohesion: 0.15
Nodes (33): emptyPack(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertTeamKnowledgePack(), buildKnowledgeDecision(), buildKnowledgeInsights() (+25 more)

### Community 1 - "FigmaAdapter"
Cohesion: 0.14
Nodes (8): assertProfileSemantics(), profileSemanticErrors(), FigmaAdapter, summarizeSelection(), activeProjectStyleGuidePack(), currentProjectStyleGuideStatus(), initialize(), storedProjectStyleGuideBinding()

### Community 2 - "runtime.ts"
Cohesion: 0.16
Nodes (17): GET(), dynamic, HistoryDetailPage(), dynamic, ImportLearningsPage(), metadata, PackForm(), dynamic (+9 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (46): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties() (+38 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.13
Nodes (27): assertAudit(), assertProjectScope(), exactKeys(), ImportFileResult, ImportInput, nonempty(), record(), sha256() (+19 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.07
Nodes (53): MultiFileReviewReportV1, isBindableField(), ContractName, ContractValidationResult, reportRelationshipErrors(), validateContract(), validators, CapturedAuditTarget (+45 more)

### Community 6 - "imports.ts"
Cohesion: 0.11
Nodes (34): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+26 more)

### Community 7 - "App.tsx"
Cohesion: 0.10
Nodes (36): Axis, FindingCategory, profileDomainErrors(), AuditViewState, SaveAuditInput, AuditRefreshResult, KnowledgeSummary, App() (+28 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "model-reviews/page.tsx"
Cohesion: 0.17
Nodes (18): POST(), runtime, dynamic, ImportAuditsPage(), dynamic, metadata, ModelReviewsPage(), DashboardPage() (+10 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.10
Nodes (22): sanitizeWaiverStore(), FullKnowledgeRebuildRequired, historicalAuditContent(), HistoricalAuditExportV1, HistoricalAuditSource, buildKnowledgeSummary(), adapter, appliedChanges (+14 more)

### Community 12 - "ReadinessReport"
Cohesion: 0.29
Nodes (11): HistoricalAuditExportV1, FrameResult, ReadinessReport, VariantCoverage, Modules(), ModulesProps, IssueSummary, ModuleBreakdown (+3 more)

### Community 13 - "ChangePlan"
Cohesion: 0.36
Nodes (9): ChangePlan, BuildReportInput, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, designerText() (+1 more)

### Community 14 - "model-review/contracts.ts"
Cohesion: 0.13
Nodes (23): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyInput, ApplyResult (+15 more)

### Community 15 - "report.ts"
Cohesion: 0.16
Nodes (23): AXIS_MULTIPLIERS, AXES, Grade, GradeLetter, affectsScore(), blocksReadiness(), CATEGORIES, collapseDisabledPolicyFindings() (+15 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.16
Nodes (18): PRODUCER_IDENTITY, producerLabel(), RULESET_VERSION, BuildChannel, ProducerIdentity, PageOption, SelectionSummary, BrandMark() (+10 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.16
Nodes (15): ScanScope, BatchAuditSummary, runPageBatch(), AuditTargetSummary, PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+7 more)

### Community 18 - "ensureKnowledge"
Cohesion: 0.16
Nodes (4): ensureDocumentChangeWatcher(), ensureKnowledge(), handleDocumentChange(), KnowledgeSessionState

### Community 19 - "presentation.ts"
Cohesion: 0.14
Nodes (22): KnowledgeInsight, ProjectStyleGuideStatus, AuditSaveStatus, SavedAuditSummary, ContextStatus, ContextPanel(), ContextPanelProps, JsonFilePicker() (+14 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.14
Nodes (27): closeDatabases(), databaseError(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment(), runtimeKeys, exportKnowledge(), exportRelease() (+19 more)

### Community 21 - "catalog.ts"
Cohesion: 0.14
Nodes (20): canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases (+12 more)

### Community 22 - "stable.ts"
Cohesion: 0.22
Nodes (15): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation, priority() (+7 more)

### Community 23 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 24 - ".stageMicroCheck"
Cohesion: 0.23
Nodes (10): annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), InstanceProvenance, isSceneNode(), GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure() (+2 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.15
Nodes (21): SOURCES, FindingStatus, Severity, applyFindingPolicy(), classifyFinding(), collectDescendants(), collectBoundVariableIds(), hasResponsiveVariableSignal() (+13 more)

### Community 27 - "handleMessage"
Cohesion: 0.20
Nodes (17): validateSessionPackUse(), assertCurrentReport(), assertDocumentMutationAllowed(), assertInitialized(), errorMessage(), generateContext(), handleMessage(), invalidateProfileIfNeeded() (+9 more)

### Community 28 - "review-source.ts"
Cohesion: 0.19
Nodes (16): ReferenceDomainV1, ReferenceFactV1, ReviewSourceRoleV1, ReviewSourceV1, declaredBreakpointWidths(), declaredGuidanceFacts(), FigmaNode, GUIDANCE_DOMAINS (+8 more)

### Community 29 - "conductor-contracts.ts"
Cohesion: 0.06
Nodes (60): assertContractVersion(), CanvasInstructions, CanvasJob, DesignSubmission, ExistingFrameDestination, integer(), JobState, keys() (+52 more)

### Community 30 - "core/contracts.ts"
Cohesion: 0.13
Nodes (23): EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1, LearningObservationV1, PageRoleBinding, PaintSnapshot (+15 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.14
Nodes (11): ProviderResponse, SharedProjection, generationBody(), validateProjection(), Clock, ModelReviewRunner, RunnerRepository, terminal() (+3 more)

### Community 40 - "adapter.ts"
Cohesion: 0.12
Nodes (40): BINDABLE_FIELDS, boundFields(), boundVariableIds(), canonicalBindableField(), CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries (+32 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.19
Nodes (25): assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke() (+17 more)

### Community 42 - "issue-review.ts"
Cohesion: 0.20
Nodes (15): actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers(), validDate(), Waiver (+7 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.13
Nodes (20): ajv, edit, fields, GET(), required, runtime, selection, str (+12 more)

### Community 44 - "ProfileEditor.tsx"
Cohesion: 0.23
Nodes (11): CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, RuleMode, BootstrapData, VariableCollectionOption, AuditResultData, PageExclusions(), suggestedExcludedPage() (+3 more)

### Community 45 - "policy.ts"
Cohesion: 0.18
Nodes (30): POST(), assertNoCredentials(), assertSafe(), conflict(), digest(), editSchema, INSTRUCTIONS, integer() (+22 more)

### Community 46 - "graph.ts"
Cohesion: 0.24
Nodes (12): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), isConductorAuditExcluded(), nestedComponentSources(), populateGraphMetrics(), postOrder() (+4 more)

### Community 47 - "filesystem.ts"
Cohesion: 0.24
Nodes (16): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), KnowledgeState, listFilesystemProjectGuidancePacks() (+8 more)

### Community 48 - "history.ts"
Cohesion: 0.28
Nodes (9): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+1 more)

### Community 49 - "hashValue"
Cohesion: 0.31
Nodes (12): ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildProjectStyleGuideBinding(), buildReferencePack(), combineProjectStyleGuidePacks(), parseProjectStyleGuideBinding() (+4 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.23
Nodes (28): transaction(), decimal(), estimate(), money(), accountIn(), cancel(), claim(), cleanupDone() (+20 more)

### Community 51 - "view-models.ts"
Cohesion: 0.23
Nodes (13): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+5 more)

### Community 52 - "constants.ts"
Cohesion: 0.14
Nodes (20): AXIS_LABELS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY, PROFILE_DATA_KEY_V2 (+12 more)

### Community 53 - "ReadinessProfile"
Cohesion: 0.14
Nodes (18): DEFAULT_PROFILE, CertificationSummary, ReadinessProfile, cloneProfile(), freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate (+10 more)

### Community 54 - "finding-groups.ts"
Cohesion: 0.33
Nodes (8): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding(), relatedComponent()

### Community 55 - "Findings.tsx"
Cohesion: 0.24
Nodes (14): AxisScore, BindableField, Finding, FindingGroup, JsonValue, WaiverStore, IssueReviewState, FindingsProps (+6 more)

### Community 56 - "DesignKnowledgeGraph"
Cohesion: 0.25
Nodes (12): DesignKnowledgeGraph, hasCompleteKnowledge(), analyzeCurrentGraph(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), currentKnowledgeAvailable() (+4 more)

### Community 57 - ".buildKnowledge"
Cohesion: 0.16
Nodes (20): NodeSnapshot, ScanProgress, finalizeKnowledgeGraph(), enrichInferences(), findPage(), graphDescendantIds(), inferredBindings(), restFragmentRoot() (+12 more)

### Community 58 - "figma.ts"
Cohesion: 0.21
Nodes (12): POST(), runtime, figmaTransport(), fixtureFile, fixtureVariables, createReferencePack(), fetchFigmaSource(), figmaFetchJson() (+4 more)

### Community 59 - "AuditImportForm.tsx"
Cohesion: 0.21
Nodes (8): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, PackResult, CompanionActionResult, ImportBatchResult

### Community 60 - "knowledge.ts"
Cohesion: 0.33
Nodes (7): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 61 - "text-style.ts"
Cohesion: 0.17
Nodes (10): collectionMaterial(), referencedVariableIds(), variableAliases(), variableCandidates(), variableEnvironmentReader(), variableMaterial(), mapConcurrent(), material() (+2 more)

### Community 62 - "collections.ts"
Cohesion: 0.83
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

### Community 63 - "rules/component.ts"
Cohesion: 0.67
Nodes (5): evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

## Knowledge Gaps
- **204 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `knowledge-loop.ts`, `companion/repository.ts`, `audit-storage.ts`, `App.tsx`, `plugin/main.ts`, `report.ts`, `ensureKnowledge`, `companion/main.ts`, `stable.ts`, `.stageMicroCheck`, `handleMessage`, `review-source.ts`, `core/contracts.ts`, `adapter.ts`, `issue-review.ts`, `graph.ts`, `finding-groups.ts`, `DesignKnowledgeGraph`, `.buildKnowledge`, `knowledge.ts`, `text-style.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `knowledge-loop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14616755793226383 - nodes in this community are weakly interconnected._
- **Should `FigmaAdapter` be split into smaller, more focused modules?**
  _Cohesion score 0.1380952380952381 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `companion/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12962962962962962 - nodes in this community are weakly interconnected._
# Graph Report - design-passport  (2026-10-29)

## Corpus Check
- 173 files · ~110,495 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1433 nodes · 4685 edges · 69 communities (65 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9011aeb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- runtime.ts
- requireRequestAccess
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- errors.ts
- App.tsx
- devDependencies
- compilerOptions
- view-models.ts
- plugin/main.ts
- conductor-workspace.ts
- TokenCoverage.tsx
- model-review/contracts.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- ensureKnowledge
- presentation.ts
- companion/main.ts
- catalog.ts
- FigmaAdapter
- accessibility.ts
- .refreshTrackedFragments
- session-state.ts
- Finding
- handleMessage
- review-source.ts
- conductor-existing-controller.ts
- conductor-contracts.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- adapter.ts
- node-fields.ts
- analyzeCurrentGraph
- model-reviews/route.ts
- ProfileEditor.tsx
- policy.ts
- graph.ts
- filesystem.ts
- review/page.tsx
- knowledge-loop.ts
- model-review/repository.ts
- ReviewController.tsx
- constants.ts
- micro-check.ts
- finding-groups.ts
- Findings.tsx
- runMicroCheck
- .buildKnowledge
- breakdown.ts
- http.ts
- conductor-controller.ts
- text-style.ts
- transaction
- ReadinessProfile
- core/contracts.ts
- conductor-change-controller.ts
- assets.d.ts
- variableEnvironmentReader
- FullKnowledgeRebuildRequired

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
- `GET()` --calls--> `auditDetail()`  [EXTRACTED]
  apps/companion/app/api/audits/[id]/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `multipartInputs()`  [EXTRACTED]
  apps/companion/app/api/learnings/import/route.ts → src/companion/imports.ts

## Import Cycles
- None detected.

## Communities (69 total, 4 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.17
Nodes (29): loadDecisions(), loadEnvelopes(), readFilesystemKnowledgeState(), derive(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings() (+21 more)

### Community 1 - "runtime.ts"
Cohesion: 0.16
Nodes (18): GET(), dynamic, HistoryDetailPage(), dynamic, ImportLearningsPage(), metadata, PackForm(), dynamic (+10 more)

### Community 2 - "requireRequestAccess"
Cohesion: 0.19
Nodes (19): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+11 more)

### Community 3 - "mutations.ts"
Cohesion: 0.06
Nodes (66): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, JsonValue, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation (+58 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.12
Nodes (29): POST(), runtime, assertAudit(), assertProjectScope(), exactKeys(), HistoricalAuditExportV1, IMPORT_LIMITS, ImportFileResult (+21 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.07
Nodes (55): Grade, isBindableField(), CapturedAuditTarget, AuditSaveStatus, canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditSummary (+47 more)

### Community 6 - "errors.ts"
Cohesion: 0.16
Nodes (14): GET(), runtime, safeFilename(), POST(), runtime, figmaTransport(), fixtureFile, fixtureVariables (+6 more)

### Community 7 - "App.tsx"
Cohesion: 0.12
Nodes (28): GradeLetter, AuditViewState, AuditRefreshResult, App(), download(), EMPTY_SELECTION_SUMMARY, postMessage(), root (+20 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "view-models.ts"
Cohesion: 0.23
Nodes (12): POST(), runtime, POST(), runtime, DashboardPage(), dynamic, boundedBody(), readDashboard() (+4 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.12
Nodes (18): activeProjectStyleGuidePack(), adapter, appliedChanges, auditStorage, codecMetrics, collections, commandGate, conductor (+10 more)

### Community 12 - "conductor-workspace.ts"
Cohesion: 0.21
Nodes (16): CanvasJob, WorkspaceBinding, WorkspaceIdentity, WorkspaceLease, WorkspaceRole, instructionDigest(), sha256(), assertCurrentConductorBinding() (+8 more)

### Community 13 - "TokenCoverage.tsx"
Cohesion: 0.21
Nodes (14): ChangePlan, TokenCoverageGroup, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, aggregate() (+6 more)

### Community 14 - "model-review/contracts.ts"
Cohesion: 0.12
Nodes (23): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyInput, ApplyResult (+15 more)

### Community 15 - "report.ts"
Cohesion: 0.19
Nodes (21): AXES, affectsScore(), blocksReadiness(), CATEGORIES, collapseDisabledPolicyFindings(), CONFIGURABLE_RULES, configurablePolicyIdForFinding(), findingImpactLabel() (+13 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.17
Nodes (19): PageOption, SelectionSummary, AuditRecheckRequest, RecheckFindings, BrandMark(), BrandMarkProps, Modules(), ModulesProps (+11 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (16): ScanScope, BatchAuditSummary, runPageBatch(), AuditTargetSummary, PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+8 more)

### Community 18 - "ensureKnowledge"
Cohesion: 0.18
Nodes (4): ensureDocumentChangeWatcher(), ensureKnowledge(), handleDocumentChange(), KnowledgeSessionState

### Community 19 - "presentation.ts"
Cohesion: 0.20
Nodes (16): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, ContextPanel(), ContextPanelProps, JsonFilePicker(), ContextStatusPanel(), Guidance() (+8 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.19
Nodes (20): closeDatabases(), databaseError(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment(), runtimeKeys, workspacePaths, readImportFiles() (+12 more)

### Community 21 - "catalog.ts"
Cohesion: 0.13
Nodes (20): canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases (+12 more)

### Community 22 - "FigmaAdapter"
Cohesion: 0.09
Nodes (22): DEFAULT_PROFILE, MultiFileReviewReportV1, assertProfileSemantics(), cloneProfile(), freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate (+14 more)

### Community 23 - "accessibility.ts"
Cohesion: 0.09
Nodes (41): SOURCES, channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES (+33 more)

### Community 24 - ".refreshTrackedFragments"
Cohesion: 0.13
Nodes (18): deriveRepeatedStructures(), finalizeKnowledgeGraph(), populateGraphMetrics(), postOrder(), sourceFrameIds(), annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence() (+10 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "Finding"
Cohesion: 0.15
Nodes (24): Finding, FindingStatus, applyFindingPolicy(), classifyFinding(), collectBoundVariableIds(), hasResponsiveVariableSignal(), evaluateComponentRules(), hasDescription() (+16 more)

### Community 27 - "handleMessage"
Cohesion: 0.19
Nodes (19): historicalAuditContent(), buildKnowledgeSummary(), assertCurrentReport(), assertDocumentMutationAllowed(), assertInitialized(), assertKnowledgeRevision(), currentKnowledgeAvailable(), handleMessage() (+11 more)

### Community 28 - "review-source.ts"
Cohesion: 0.13
Nodes (24): fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), DesignReferencePackV1, ReferenceDomainV1, ReferenceFactV1 (+16 more)

### Community 29 - "conductor-existing-controller.ts"
Cohesion: 0.17
Nodes (16): readExistingFrame(), DesignChangeState, ContextResponse, createExistingFrameController(), ExistingDestination, ExistingFrameCommand, ExistingFrameState, parseDestinationOptions() (+8 more)

### Community 30 - "conductor-contracts.ts"
Cohesion: 0.23
Nodes (21): CanvasInstructions, ExistingFrameDestination, integer(), JobState, keys(), NativeInstruction, object(), parseCanvasInstructions() (+13 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.17
Nodes (7): ProviderResponse, SharedProjection, Clock, ModelReviewRunner, RunnerRepository, terminal(), Transport

### Community 40 - "adapter.ts"
Cohesion: 0.13
Nodes (39): BINDABLE_FIELDS, boundFields(), boundVariableIds(), canonicalBindableField(), CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries (+31 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.18
Nodes (26): assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke() (+18 more)

### Community 42 - "analyzeCurrentGraph"
Cohesion: 0.21
Nodes (17): actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate() (+9 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.12
Nodes (25): ajv, edit, fields, GET(), required, runtime, selection, str (+17 more)

### Community 44 - "ProfileEditor.tsx"
Cohesion: 0.20
Nodes (12): CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, RuleMode, profileDomainErrors(), PageExclusions(), suggestedExcludedPage(), PageRole, POLICY_LABELS (+4 more)

### Community 45 - "policy.ts"
Cohesion: 0.16
Nodes (25): Snapshot, assertNoCredentials(), conflict(), digest(), editSchema, generationBody(), INSTRUCTIONS, integer() (+17 more)

### Community 46 - "graph.ts"
Cohesion: 0.33
Nodes (9): AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, collectDescendants(), isAuditTargetNodeType(), isConductorAuditExcluded(), nestedComponentSources(), resolveTargetRoots(), targetRootIds() (+1 more)

### Community 47 - "filesystem.ts"
Cohesion: 0.20
Nodes (18): exportKnowledge(), exportRelease(), newPrivateDirectory(), acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteExternalJson(), atomicWriteJson() (+10 more)

### Community 48 - "review/page.tsx"
Cohesion: 0.16
Nodes (15): GET(), runtime, GET(), runtime, dynamic, ImportAuditsPage(), dynamic, HistoryPage() (+7 more)

### Community 49 - "knowledge-loop.ts"
Cohesion: 0.17
Nodes (21): listFilesystemProjectGuidancePacks(), ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildKnowledgeInsights(), buildProjectStyleGuideBinding(), candidateWording() (+13 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.29
Nodes (25): POST(), assertSafe(), decimal(), estimate(), invalid(), money(), recommendations(), uuid() (+17 more)

### Community 51 - "ReviewController.tsx"
Cohesion: 0.24
Nodes (12): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+4 more)

### Community 52 - "constants.ts"
Cohesion: 0.11
Nodes (23): PRODUCER_IDENTITY, producerLabel(), AXIS_LABELS, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX (+15 more)

### Community 53 - "micro-check.ts"
Cohesion: 0.47
Nodes (5): GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure(), microFieldGroup, TOKEN_PROPERTIES

### Community 54 - "finding-groups.ts"
Cohesion: 0.33
Nodes (8): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding(), relatedComponent()

### Community 55 - "Findings.tsx"
Cohesion: 0.18
Nodes (20): AxisScore, BindableField, FindingCategory, FindingGroup, WaiverStore, BootstrapData, VariableCollectionOption, IssueReviewState (+12 more)

### Community 56 - "runMicroCheck"
Cohesion: 0.23
Nodes (8): assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), errorMessage(), generateContext(), runMicroCheck(), runScan(), verifyAppliedChanges()

### Community 57 - ".buildKnowledge"
Cohesion: 0.22
Nodes (14): KnowledgeBuildResult, referencedVariableIds(), restFragmentRoot(), variableCandidates(), baseSnapshot(), ContextCachePort, contextFragment, KnowledgeBuildDiagnostics (+6 more)

### Community 58 - "breakdown.ts"
Cohesion: 0.50
Nodes (7): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown

### Community 59 - "http.ts"
Cohesion: 0.21
Nodes (8): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, PackResult, CompanionActionResult, ImportBatchResult

### Community 60 - "conductor-controller.ts"
Cohesion: 0.11
Nodes (25): assertContractVersion(), SubmissionResult, WORKSPACE_LIMITS, createDesignChangeController(), createConductorController(), CONDUCTOR_ENVIRONMENTS, boundPendingKey(), createPendingSendController() (+17 more)

### Community 61 - "text-style.ts"
Cohesion: 0.31
Nodes (3): material(), TextStyleEvidenceReader, TextStyleMaterial

### Community 62 - "transaction"
Cohesion: 0.27
Nodes (12): transaction(), claim(), cleanupDone(), dispatch(), observe(), owned(), pendingReconciliation(), releaseLease() (+4 more)

### Community 63 - "ReadinessProfile"
Cohesion: 0.27
Nodes (10): DesignKnowledgeGraph, NodeSnapshot, ReadinessProfile, bindingSignature(), deriveResponsiveFamilies(), hasCompleteKnowledge(), normalizedResponsiveRootName(), parseResponsiveName() (+2 more)

### Community 64 - "core/contracts.ts"
Cohesion: 0.11
Nodes (24): CertificationSummary, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1, LearningObservationV1, PageRoleBinding (+16 more)

### Community 65 - "conductor-change-controller.ts"
Cohesion: 0.50
Nodes (4): DesignSubmission, DesignChangeCommand, DesignChangeContext, Pending

### Community 67 - "variableEnvironmentReader"
Cohesion: 0.50
Nodes (4): collectionMaterial(), variableAliases(), variableEnvironmentReader(), variableMaterial()

## Knowledge Gaps
- **209 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+204 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `mutations.ts`, `companion/repository.ts`, `audit-storage.ts`, `plugin/main.ts`, `TokenCoverage.tsx`, `report.ts`, `ensureKnowledge`, `companion/main.ts`, `.refreshTrackedFragments`, `handleMessage`, `review-source.ts`, `adapter.ts`, `analyzeCurrentGraph`, `ProfileEditor.tsx`, `graph.ts`, `filesystem.ts`, `knowledge-loop.ts`, `finding-groups.ts`, `runMicroCheck`, `.buildKnowledge`, `text-style.ts`, `ReadinessProfile`, `variableEnvironmentReader`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _209 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06491228070175438 - nodes in this community are weakly interconnected._
- **Should `companion/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11693548387096774 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07028112449799197 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
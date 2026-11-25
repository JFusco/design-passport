# Graph Report - design-passport  (2026-11-25)

## Corpus Check
- 179 files · ~115,583 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1482 nodes · 4837 edges · 63 communities (59 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f866911c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- model-review/repository.ts
- mutations.ts
- audit-storage.ts
- failure
- accessibility.ts
- hashValue
- companion/repository.ts
- App.tsx
- devDependencies
- compilerOptions
- companion/main.ts
- Finding
- core/contracts.ts
- companion-send.ts
- node-fields.ts
- plugin/main.ts
- model-reviews/page.tsx
- Overview.tsx
- constants.ts
- .buildKnowledge
- planning.ts
- adapter.ts
- conductor-existing-controller.ts
- ModelReviewController.tsx
- catalog.ts
- conductor-pending-send.ts
- review-source.ts
- snapshotBase
- conductor-workspace.ts
- issue-review.ts
- filesystem.ts
- Findings.tsx
- conductor-contracts.ts
- conductor-controller.ts
- report.ts
- ensureKnowledge
- handleMessage
- runtime.ts
- scan-lifecycle.ts
- presentation.ts
- messages.ts
- .stageMicroCheck
- graph.ts
- analyzeCurrentGraph
- history.ts
- FigmaAdapter
- utf8ByteLength
- TokenCoverage.tsx
- layout.tsx
- stable.ts
- session-state.ts
- knowledge.ts
- TextStyleEvidenceReader
- componentMetadataSnapshot
- micro-check.ts
- VariableCollectionOption
- proxy.ts
- assets.d.ts
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 74 edges
2. `handleMessage()` - 47 edges
3. `transaction()` - 43 edges
4. `Finding` - 34 edges
5. `ReadinessProfile` - 33 edges
6. `requireRequestAccess()` - 31 edges
7. `failure()` - 29 edges
8. `DesignKnowledgeGraph` - 28 edges
9. `invalid()` - 26 edges
10. `assertContract()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --indirect_call--> `label()`  [INFERRED]
  apps/companion/app/page.tsx → src/plugin/audit-storage.ts
- `GET()` --calls--> `auditDetail()`  [EXTRACTED]
  apps/companion/app/api/audits/[id]/route.ts → src/companion/repository.ts
- `POST()` --calls--> `multipartInputs()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/imports.ts
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `boundedBody()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/imports.ts

## Import Cycles
- None detected.

## Communities (63 total, 4 thin omitted)

### Community 0 - "model-review/repository.ts"
Cohesion: 0.05
Nodes (104): ajv, edit, fields, GET(), POST(), required, runtime, selection (+96 more)

### Community 1 - "mutations.ts"
Cohesion: 0.10
Nodes (46): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties() (+38 more)

### Community 2 - "audit-storage.ts"
Cohesion: 0.08
Nodes (45): FindingCategory, Grade, CapturedAuditTarget, AuditViewState, canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditSummary (+37 more)

### Community 3 - "failure"
Cohesion: 0.13
Nodes (22): GET(), runtime, POST(), runtime, runtime, POST(), runtime, GET() (+14 more)

### Community 4 - "accessibility.ts"
Cohesion: 0.09
Nodes (41): SOURCES, channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES (+33 more)

### Community 5 - "hashValue"
Cohesion: 0.16
Nodes (35): assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertTeamKnowledgePack(), buildKnowledgeDecision(), buildKnowledgeInsights(), buildLearningEnvelope() (+27 more)

### Community 6 - "companion/repository.ts"
Cohesion: 0.11
Nodes (35): POST(), runtime, POST(), runtime, assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS (+27 more)

### Community 7 - "App.tsx"
Cohesion: 0.10
Nodes (33): GradeLetter, profileDomainErrors(), AuditRefreshResult, App(), download(), EMPTY_SELECTION_SUMMARY, postMessage(), ConductorPanel() (+25 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "companion/main.ts"
Cohesion: 0.13
Nodes (29): closeDatabases(), database(), databaseError(), legacyProviderDispatch(), legacyWorkerEnabled(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment() (+21 more)

### Community 11 - "Finding"
Cohesion: 0.13
Nodes (26): DesignKnowledgeGraph, Finding, FindingStatus, ReadinessProfile, Severity, hasCompleteKnowledge(), collectBoundVariableIds(), hasResponsiveVariableSignal() (+18 more)

### Community 12 - "core/contracts.ts"
Cohesion: 0.10
Nodes (26): PRODUCER_IDENTITY, RULESET_VERSION, BindableField, BuildChannel, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot, Fixability (+18 more)

### Community 13 - "companion-send.ts"
Cohesion: 0.11
Nodes (24): CompanionCommand, CompanionKind, CompanionSource, CompanionView, createCompanionSend(), emptyView(), identity(), limits (+16 more)

### Community 14 - "node-fields.ts"
Cohesion: 0.19
Nodes (25): assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke() (+17 more)

### Community 15 - "plugin/main.ts"
Cohesion: 0.08
Nodes (36): projectGuidanceRevision(), applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore (+28 more)

### Community 16 - "model-reviews/page.tsx"
Cohesion: 0.15
Nodes (20): POST(), GET(), runtime, dynamic, ImportAuditsPage(), dynamic, metadata, ModelReviewsPage() (+12 more)

### Community 17 - "Overview.tsx"
Cohesion: 0.25
Nodes (12): producerLabel(), PageOption, BrandMark(), BrandMarkProps, Overview(), reportSummary(), PageBatch(), PageBatchProps (+4 more)

### Community 18 - "constants.ts"
Cohesion: 0.12
Nodes (22): AXIS_LABELS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DEFAULT_PROFILE, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+14 more)

### Community 19 - ".buildKnowledge"
Cohesion: 0.17
Nodes (21): ScanProgress, deriveRepeatedStructures(), finalizeKnowledgeGraph(), populateGraphMetrics(), postOrder(), sourceFrameIds(), annotateInstanceDescendants(), referencedVariableIds() (+13 more)

### Community 20 - "planning.ts"
Cohesion: 0.12
Nodes (24): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, MultiFileReviewReportV1, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation (+16 more)

### Community 21 - "adapter.ts"
Cohesion: 0.11
Nodes (26): CertificationSummary, BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments(), capturePageFragments() (+18 more)

### Community 22 - "conductor-existing-controller.ts"
Cohesion: 0.18
Nodes (15): readExistingFrame(), DesignChangeState, ContextResponse, createExistingFrameController(), ExistingDestination, ExistingFrameCommand, ExistingFrameState, parseDestinationOptions() (+7 more)

### Community 23 - "ModelReviewController.tsx"
Cohesion: 0.08
Nodes (32): AuditImportForm(), Preview, LoadingSignal(), ImportForm(), dynamic, ImportLearningsPage(), metadata, active() (+24 more)

### Community 24 - "catalog.ts"
Cohesion: 0.13
Nodes (20): canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases (+12 more)

### Community 25 - "conductor-pending-send.ts"
Cohesion: 0.21
Nodes (14): SubmissionResult, createConductorController(), boundPendingKey(), createPendingSendController(), existingPendingKey(), LegacySendRefusedError, PendingSendPresentation, PendingSendTerminal (+6 more)

### Community 26 - "review-source.ts"
Cohesion: 0.13
Nodes (26): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), ingest(), DesignReferencePackV1 (+18 more)

### Community 27 - "snapshotBase"
Cohesion: 0.22
Nodes (22): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), devStatusSnapshot(), enrichLiveEvidence(), geometryEvidence(), hasChildren() (+14 more)

### Community 28 - "conductor-workspace.ts"
Cohesion: 0.15
Nodes (21): CanvasJob, DesignSubmission, WorkspaceBinding, WorkspaceIdentity, WorkspaceLease, WorkspaceRole, instructionDigest(), sha256() (+13 more)

### Community 29 - "issue-review.ts"
Cohesion: 0.36
Nodes (9): actionableFinding(), AGGREGATES, stableIssueKey(), findingMicroFields(), mergeIssueReview(), resolvedIssueKeys(), captureRecheckFindings(), recheckCounts() (+1 more)

### Community 30 - "filesystem.ts"
Cohesion: 0.27
Nodes (15): exportRelease(), acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteExternalJson(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory() (+7 more)

### Community 31 - "Findings.tsx"
Cohesion: 0.21
Nodes (17): Axis, AxisScore, FindingGroup, FrameResult, VariantCoverage, TokenCoveragePageResult, Findings(), FindingsProps (+9 more)

### Community 32 - "conductor-contracts.ts"
Cohesion: 0.20
Nodes (22): assertContractVersion(), CanvasInstructions, ExistingFrameDestination, integer(), JobState, keys(), NativeInstruction, object() (+14 more)

### Community 33 - "conductor-controller.ts"
Cohesion: 0.18
Nodes (10): WORKSPACE_LIMITS, CONDUCTOR_ENVIRONMENTS, PendingSendMetadata, ConductorAuthorizationError, ConductorCredentials, ConductorEnvironment, ConductorRequestTimeoutError, ConductorTransport (+2 more)

### Community 34 - "report.ts"
Cohesion: 0.17
Nodes (26): AXIS_MULTIPLIERS, AXES, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES, classifyFinding(), collapseDisabledPolicyFindings() (+18 more)

### Community 35 - "ensureKnowledge"
Cohesion: 0.17
Nodes (5): currentKnowledgeAvailable(), ensureKnowledge(), markKnowledgeDirty(), verifiedKnowledgeAvailable(), KnowledgeSessionState

### Community 36 - "handleMessage"
Cohesion: 0.19
Nodes (15): historicalAuditContent(), assertDocumentMutationAllowed(), assertInitialized(), auditExport(), ensureDocumentChangeWatcher(), handleDocumentChange(), handleMessage(), initialize() (+7 more)

### Community 37 - "runtime.ts"
Cohesion: 0.14
Nodes (22): GET(), runtime, GET(), runtime, GET(), dynamic, HistoryDetailPage(), PackForm() (+14 more)

### Community 38 - "scan-lifecycle.ts"
Cohesion: 0.17
Nodes (14): BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError, AuditTargetIntent, auditTargetSummary() (+6 more)

### Community 39 - "presentation.ts"
Cohesion: 0.14
Nodes (23): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, AuditSaveStatus, ContextStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps (+15 more)

### Community 40 - "messages.ts"
Cohesion: 0.15
Nodes (23): HistoricalAuditExportV1, ReadinessReport, ScanRequest, TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, isBindableField() (+15 more)

### Community 41 - ".stageMicroCheck"
Cohesion: 0.21
Nodes (8): bindingSignature(), captureInstanceEvidence(), enrichInferences(), findPage(), inferredBindings(), InstanceProvenance, isSceneNode(), VariableProvenance

### Community 42 - "graph.ts"
Cohesion: 0.36
Nodes (7): PageSnapshot, AuditTargetNodeType, isConductorAuditExcluded(), nestedComponentSources(), resolveTargetRoots(), targetRootIds(), TargetRootResolution

### Community 43 - "analyzeCurrentGraph"
Cohesion: 0.22
Nodes (12): buildKnowledgeSummary(), analyzeCurrentGraph(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), errorMessage(), generateContext() (+4 more)

### Community 44 - "history.ts"
Cohesion: 0.23
Nodes (11): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+3 more)

### Community 45 - "FigmaAdapter"
Cohesion: 0.20
Nodes (6): ScanScope, AUDIT_TARGET_NODE_TYPES, isAuditTargetNodeType(), FigmaAdapter, summarizeSelection(), AuditTargetSummary

### Community 46 - "utf8ByteLength"
Cohesion: 0.28
Nodes (11): listFilesystemProjectGuidancePacks(), ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildProjectStyleGuideBinding(), parseProjectStyleGuideBinding(), parseReferencePack() (+3 more)

### Community 47 - "TokenCoverage.tsx"
Cohesion: 0.21
Nodes (14): ChangePlan, TokenCoverageGroup, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, aggregate() (+6 more)

### Community 48 - "layout.tsx"
Cohesion: 0.24
Nodes (6): ContentMotion(), contentSelector, metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 49 - "stable.ts"
Cohesion: 0.19
Nodes (12): FindingProvenance, NodeSnapshot, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+4 more)

### Community 50 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 51 - "knowledge.ts"
Cohesion: 0.39
Nodes (6): ResponsiveFamily, bindingSignature(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 53 - "componentMetadataSnapshot"
Cohesion: 0.43
Nodes (5): canReadComponentPropertyDefinitions(), ComponentMetadata, componentMetadataSnapshot(), ComponentSnapshotNodeType, interactionPropertiesSnapshot()

### Community 54 - "micro-check.ts"
Cohesion: 0.47
Nodes (5): GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure(), microFieldGroup, TOKEN_PROPERTIES

### Community 56 - "VariableCollectionOption"
Cohesion: 0.32
Nodes (6): KnowledgeBuildResult, KnowledgeBuildDiagnostics, listVariableCollectionOptions(), loadRemoteCollections(), settleWithin(), VariableCollectionOption

## Knowledge Gaps
- **218 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `model-review/repository.ts`, `audit-storage.ts`, `companion/repository.ts`, `App.tsx`, `companion/main.ts`, `plugin/main.ts`, `.buildKnowledge`, `planning.ts`, `adapter.ts`, `review-source.ts`, `snapshotBase`, `issue-review.ts`, `report.ts`, `ensureKnowledge`, `handleMessage`, `.stageMicroCheck`, `graph.ts`, `analyzeCurrentGraph`, `utf8ByteLength`, `TokenCoverage.tsx`, `stable.ts`, `knowledge.ts`, `TextStyleEvidenceReader`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `ReadinessReport` connect `messages.ts` to `model-review/repository.ts`, `report.ts`, `audit-storage.ts`, `hashValue`, `companion/repository.ts`, `App.tsx`, `companion/main.ts`, `Finding`, `core/contracts.ts`, `plugin/main.ts`, `Overview.tsx`, `constants.ts`, `planning.ts`, `issue-review.ts`, `Findings.tsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `model-review/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05364173228346457 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08257229832572298 - nodes in this community are weakly interconnected._
# Graph Report - design-passport-context-fix  (2026-11-10)

## Corpus Check
- 173 files · ~110,664 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1433 nodes · 4685 edges · 70 communities (66 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c8cb00ca`
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
- Finding
- model-review/contracts.ts
- report.ts
- Overview.tsx
- ReadinessProfile
- KnowledgeSessionState
- presentation.ts
- companion/main.ts
- DesignKnowledgeGraph
- handleMessage
- background.ts
- .refreshTrackedFragments
- session-state.ts
- NodeSnapshot
- accessibility.ts
- review-source.ts
- conductor-existing-controller.ts
- conductor-contracts.ts
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
- review/page.tsx
- knowledge-loop.ts
- model-review/repository.ts
- ReviewController.tsx
- core/contracts.ts
- adapter.ts
- core/operations/interaction-state.ts
- Findings.tsx
- analyzeCurrentGraph
- .buildKnowledge
- componentMetadataSnapshot
- http.ts
- conductor-controller.ts
- text-style.ts
- transaction
- knowledge.ts
- messages.ts
- conductor-change-controller.ts
- assets.d.ts
- rules/component.ts
- micro-check.ts
- collections.ts

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

## Communities (70 total, 4 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.19
Nodes (24): ingest(), derive(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertTeamKnowledgePack(), buildKnowledgeDecision() (+16 more)

### Community 1 - "runtime.ts"
Cohesion: 0.16
Nodes (18): GET(), dynamic, HistoryDetailPage(), dynamic, ImportLearningsPage(), metadata, PackForm(), dynamic (+10 more)

### Community 2 - "requireRequestAccess"
Cohesion: 0.19
Nodes (19): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+11 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (46): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties() (+38 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.12
Nodes (29): POST(), runtime, assertAudit(), assertProjectScope(), exactKeys(), HistoricalAuditExportV1, IMPORT_LIMITS, ImportFileResult (+21 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.06
Nodes (67): Grade, MultiFileReviewReportV1, isBindableField(), assertProfileSemantics(), cloneProfile(), normalizeReadinessProfile(), profileSemanticErrors(), ReadinessProfileV1 (+59 more)

### Community 6 - "errors.ts"
Cohesion: 0.16
Nodes (14): GET(), runtime, safeFilename(), POST(), runtime, figmaTransport(), fixtureFile, fixtureVariables (+6 more)

### Community 7 - "App.tsx"
Cohesion: 0.11
Nodes (31): producerLabel(), GradeLetter, AuditViewState, AuditRefreshResult, App(), download(), EMPTY_SELECTION_SUMMARY, postMessage() (+23 more)

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
Cohesion: 0.08
Nodes (26): BatchAuditSummary, runPageBatch(), activeProjectStyleGuidePack(), adapter, appliedChanges, auditStorage, codecMetrics, collections (+18 more)

### Community 12 - "conductor-workspace.ts"
Cohesion: 0.21
Nodes (16): CanvasJob, WorkspaceBinding, WorkspaceIdentity, WorkspaceLease, WorkspaceRole, instructionDigest(), sha256(), assertCurrentConductorBinding() (+8 more)

### Community 13 - "Finding"
Cohesion: 0.35
Nodes (10): ChangePlan, Finding, BuildReportInput, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS (+2 more)

### Community 14 - "model-review/contracts.ts"
Cohesion: 0.12
Nodes (23): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyInput, ApplyResult (+15 more)

### Community 15 - "report.ts"
Cohesion: 0.05
Nodes (72): PRODUCER_IDENTITY, AI_SOURCE_FRAME_ANNOTATION, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DEFAULT_PROFILE, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX (+64 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.17
Nodes (20): AXIS_LABELS, PageOption, SelectionSummary, AuditRecheckRequest, RecheckFindings, BrandMark(), BrandMarkProps, Modules() (+12 more)

### Community 17 - "ReadinessProfile"
Cohesion: 0.21
Nodes (13): BindableField, ReadinessProfile, collectBoundVariableIds(), hasResponsiveVariableSignal(), evaluateRules(), findingOrder(), evaluateResponsiveRules(), pageRoleForNode() (+5 more)

### Community 19 - "presentation.ts"
Cohesion: 0.17
Nodes (18): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, ContextStatus, ContextPanel(), ContextPanelProps, JsonFilePicker(), ContextStatusPanel() (+10 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.15
Nodes (25): closeDatabases(), databaseError(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment(), runtimeKeys, exportKnowledge(), exportRelease() (+17 more)

### Community 21 - "DesignKnowledgeGraph"
Cohesion: 0.13
Nodes (16): canonical, CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern() (+8 more)

### Community 22 - "handleMessage"
Cohesion: 0.15
Nodes (14): FigmaAdapter, summarizeSelection(), historicalAuditContent(), assertCurrentReport(), assertDocumentMutationAllowed(), assertInitialized(), currentProjectStyleGuideStatus(), handleMessage() (+6 more)

### Community 23 - "background.ts"
Cohesion: 0.22
Nodes (17): channel(), composite(), contrastRatio(), relativeLuminance(), Rgba, contains(), fillStack(), hasVisiblePaint() (+9 more)

### Community 24 - ".refreshTrackedFragments"
Cohesion: 0.16
Nodes (16): ScanProgress, finalizeKnowledgeGraph(), populateGraphMetrics(), sourceFrameIds(), annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences() (+8 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "NodeSnapshot"
Cohesion: 0.24
Nodes (13): canonicalPatternName(), SOURCES, FindingStatus, NodeSnapshot, Severity, createFinding(), FindingInput, FindingOptions (+5 more)

### Community 27 - "accessibility.ts"
Cohesion: 0.30
Nodes (13): isLargeText(), interactionState, assessTarget(), evaluateAccessibilityRules(), insideDefinition(), interactiveCandidates(), isDescendant(), overlappingBounds() (+5 more)

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

### Community 40 - "snapshotBase"
Cohesion: 0.22
Nodes (22): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), devStatusSnapshot(), enrichLiveEvidence(), geometryEvidence(), hasChildren() (+14 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.19
Nodes (25): collectDescendants(), assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), fieldIsPresent(), hasRenderedStroke() (+17 more)

### Community 42 - "issue-review.ts"
Cohesion: 0.20
Nodes (16): actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate() (+8 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.12
Nodes (25): ajv, edit, fields, GET(), required, runtime, selection, str (+17 more)

### Community 44 - "ProfileEditor.tsx"
Cohesion: 0.18
Nodes (14): CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, RuleMode, profileDomainErrors(), BootstrapData, VariableCollectionOption, AuditResultData, PageExclusions() (+6 more)

### Community 45 - "policy.ts"
Cohesion: 0.16
Nodes (25): Snapshot, assertNoCredentials(), conflict(), digest(), editSchema, generationBody(), INSTRUCTIONS, integer() (+17 more)

### Community 46 - "graph.ts"
Cohesion: 0.31
Nodes (9): AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), isConductorAuditExcluded(), nestedComponentSources(), postOrder(), resolveTargetRoots(), targetRootIds() (+1 more)

### Community 47 - "filesystem.ts"
Cohesion: 0.24
Nodes (16): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteExternalJson(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), KnowledgeState (+8 more)

### Community 48 - "review/page.tsx"
Cohesion: 0.16
Nodes (15): GET(), runtime, GET(), runtime, dynamic, ImportAuditsPage(), dynamic, HistoryPage() (+7 more)

### Community 49 - "knowledge-loop.ts"
Cohesion: 0.18
Nodes (23): ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildKnowledgeInsights(), buildProjectStyleGuideBinding(), buildReferencePack(), candidateWording() (+15 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.29
Nodes (25): POST(), assertSafe(), decimal(), estimate(), invalid(), money(), recommendations(), uuid() (+17 more)

### Community 51 - "ReviewController.tsx"
Cohesion: 0.24
Nodes (12): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+4 more)

### Community 52 - "core/contracts.ts"
Cohesion: 0.13
Nodes (21): Axis, EffectSnapshot, Fixability, FrameResult, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1, LearningObservationV1 (+13 more)

### Community 53 - "adapter.ts"
Cohesion: 0.11
Nodes (26): CertificationSummary, BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments(), capturePageFragments() (+18 more)

### Community 54 - "core/operations/interaction-state.ts"
Cohesion: 0.32
Nodes (10): FALSE_VALUES, hasInactiveVariantState(), normalizedProperties(), normalizePropertyName(), normalizePropertyValue(), resolvedState(), stateEvidence(), TRUE_VALUES (+2 more)

### Community 55 - "Findings.tsx"
Cohesion: 0.21
Nodes (15): AxisScore, FindingCategory, FindingGroup, JsonValue, WaiverStore, IssueReviewState, Findings(), FindingsProps (+7 more)

### Community 56 - "analyzeCurrentGraph"
Cohesion: 0.18
Nodes (19): hasCompleteKnowledge(), buildKnowledgeSummary(), analyzeCurrentGraph(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), currentKnowledgeAvailable() (+11 more)

### Community 57 - ".buildKnowledge"
Cohesion: 0.24
Nodes (13): referencedVariableIds(), restFragmentRoot(), variableCandidates(), baseSnapshot(), ContextCachePort, contextFragment, mapConcurrent(), newBuildDiagnostics() (+5 more)

### Community 58 - "componentMetadataSnapshot"
Cohesion: 0.43
Nodes (5): canReadComponentPropertyDefinitions(), ComponentMetadata, componentMetadataSnapshot(), ComponentSnapshotNodeType, interactionPropertiesSnapshot()

### Community 59 - "http.ts"
Cohesion: 0.21
Nodes (8): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, PackResult, CompanionActionResult, ImportBatchResult

### Community 60 - "conductor-controller.ts"
Cohesion: 0.11
Nodes (25): assertContractVersion(), SubmissionResult, WORKSPACE_LIMITS, createDesignChangeController(), createConductorController(), CONDUCTOR_ENVIRONMENTS, boundPendingKey(), createPendingSendController() (+17 more)

### Community 61 - "text-style.ts"
Cohesion: 0.36
Nodes (3): material(), TextStyleEvidenceReader, TextStyleMaterial

### Community 62 - "transaction"
Cohesion: 0.27
Nodes (12): transaction(), claim(), cleanupDone(), dispatch(), observe(), owned(), pendingReconciliation(), releaseLease() (+4 more)

### Community 63 - "knowledge.ts"
Cohesion: 0.36
Nodes (7): bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName, eligibleTokenFields()

### Community 64 - "messages.ts"
Cohesion: 0.16
Nodes (20): ScanScope, TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, AuditTargetSummary, PluginToUiMessage, TokenCoveragePageRequest (+12 more)

### Community 65 - "conductor-change-controller.ts"
Cohesion: 0.50
Nodes (4): DesignSubmission, DesignChangeCommand, DesignChangeContext, Pending

### Community 67 - "rules/component.ts"
Cohesion: 0.67
Nodes (5): evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

### Community 68 - "micro-check.ts"
Cohesion: 0.47
Nodes (5): GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure(), microFieldGroup, TOKEN_PROPERTIES

### Community 69 - "collections.ts"
Cohesion: 0.83
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

## Knowledge Gaps
- **210 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `companion/repository.ts`, `audit-storage.ts`, `plugin/main.ts`, `report.ts`, `companion/main.ts`, `handleMessage`, `.refreshTrackedFragments`, `review-source.ts`, `snapshotBase`, `issue-review.ts`, `ProfileEditor.tsx`, `graph.ts`, `knowledge-loop.ts`, `adapter.ts`, `analyzeCurrentGraph`, `.buildKnowledge`, `text-style.ts`, `knowledge.ts`, `messages.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `companion/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11693548387096774 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056806227645697455 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1126984126984127 - nodes in this community are weakly interconnected._
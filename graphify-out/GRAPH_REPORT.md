# Graph Report - design-passport  (2026-10-28)

## Corpus Check
- 165 files · ~102,624 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1391 nodes · 4548 edges · 68 communities (61 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ae78f46`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- knowledge-loop.ts
- .refreshTrackedFragments
- runtime.ts
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- failure
- App.tsx
- devDependencies
- compilerOptions
- model-reviews/page.tsx
- plugin/main.ts
- breakdown.ts
- presentation.ts
- model-review/contracts.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- KnowledgeSessionState
- ContextPanel.tsx
- companion/main.ts
- catalog.ts
- planning.ts
- accessibility.ts
- micro-check.ts
- session-state.ts
- rules.ts
- handleMessage
- review-source.ts
- conductor-contracts.ts
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- adapter.ts
- node-fields.ts
- ReadinessReport
- model-reviews/route.ts
- core/contracts.ts
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
- audit-scope.ts
- .buildKnowledge
- errors.ts
- http.ts
- knowledge.ts
- TextStyleEvidenceReader
- .getCollectionOptions
- rules/component.ts
- schema.ts
- TransportError
- assets.d.ts
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
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `recordDecision()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importLearning()`  [EXTRACTED]
  apps/companion/app/api/learnings/import/route.ts → src/companion/repository.ts
- `GET()` --calls--> `invalid()`  [EXTRACTED]
  apps/companion/app/api/model-reviews/route.ts → src/companion/model-review/policy.ts

## Import Cycles
- None detected.

## Communities (68 total, 7 thin omitted)

### Community 0 - "knowledge-loop.ts"
Cohesion: 0.14
Nodes (35): loadDecisions(), loadEnvelopes(), readFilesystemKnowledgeState(), assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope(), assertNoUnsafeStrings(), assertTeamKnowledgePack() (+27 more)

### Community 1 - ".refreshTrackedFragments"
Cohesion: 0.17
Nodes (12): DesignKnowledgeGraph, BuildReportInput, annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences(), FigmaAdapter, findPage() (+4 more)

### Community 2 - "runtime.ts"
Cohesion: 0.21
Nodes (16): GET(), runtime, GET(), runtime, GET(), dynamic, HistoryDetailPage(), isConfigured() (+8 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (46): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties() (+38 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.14
Nodes (28): assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS, ImportFileResult, ImportInput, ImportKind, nonempty() (+20 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.08
Nodes (45): isBindableField(), canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditV1, AuditCodecMeasurement, auditPacket(), AuditSaveGuard (+37 more)

### Community 6 - "failure"
Cohesion: 0.19
Nodes (16): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+8 more)

### Community 7 - "App.tsx"
Cohesion: 0.13
Nodes (29): FindingCategory, Grade, JsonValue, AuditSaveStatus, AuditViewState, SavedAuditSummary, App(), download() (+21 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "model-reviews/page.tsx"
Cohesion: 0.16
Nodes (20): POST(), runtime, POST(), runtime, dynamic, ImportAuditsPage(), dynamic, metadata (+12 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.10
Nodes (21): historicalAuditContent(), HistoricalAuditExportV1, HistoricalAuditSource, activeProjectStyleGuidePack(), adapter, appliedChanges, auditStorage, codecMetrics (+13 more)

### Community 12 - "breakdown.ts"
Cohesion: 0.31
Nodes (9): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown, findingsForReview() (+1 more)

### Community 13 - "presentation.ts"
Cohesion: 0.35
Nodes (9): ChangePlan, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, designerText(), FIELD_LABELS (+1 more)

### Community 14 - "model-review/contracts.ts"
Cohesion: 0.12
Nodes (23): active(), EditDraft, ModelReviewController(), readRun(), request(), Accounting, ApplyInput, ApplyResult (+15 more)

### Community 15 - "report.ts"
Cohesion: 0.15
Nodes (28): AXES, FindingStatus, GradeLetter, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES, collapseDisabledPolicyFindings() (+20 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.17
Nodes (20): AXIS_LABELS, PageOption, SelectionSummary, AuditRecheckRequest, RecheckFindings, BrandMark(), BrandMarkProps, Modules() (+12 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (16): CapturedAuditTarget, AuditMetadata, BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+8 more)

### Community 19 - "ContextPanel.tsx"
Cohesion: 0.22
Nodes (14): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+6 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.16
Nodes (26): closeDatabases(), databaseError(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment(), runtimeKeys, createReferencePack(), fetchFigmaSource() (+18 more)

### Community 21 - "catalog.ts"
Cohesion: 0.15
Nodes (15): canonical, CATALOG_DIGEST, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern(), getPatternChecklist() (+7 more)

### Community 22 - "planning.ts"
Cohesion: 0.27
Nodes (12): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation, priority() (+4 more)

### Community 23 - "accessibility.ts"
Cohesion: 0.09
Nodes (41): SOURCES, channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES (+33 more)

### Community 24 - "micro-check.ts"
Cohesion: 0.47
Nodes (5): GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure(), microFieldGroup, TOKEN_PROPERTIES

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.12
Nodes (25): canonicalPatternName(), CATALOG_VERSION, BindableField, NodeSnapshot, Severity, classifyFinding(), collectBoundVariableIds(), hasResponsiveVariableSignal() (+17 more)

### Community 27 - "handleMessage"
Cohesion: 0.16
Nodes (30): hasCompleteKnowledge(), analyzeCurrentGraph(), assertCurrentReport(), assertDocumentMutationAllowed(), assertInitialized(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge() (+22 more)

### Community 28 - "review-source.ts"
Cohesion: 0.14
Nodes (21): figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), DesignReferencePackV1, ReferenceDomainV1, ReferenceFactV1, ReviewSourceRoleV1 (+13 more)

### Community 29 - "conductor-contracts.ts"
Cohesion: 0.07
Nodes (49): assertContractVersion(), CanvasInstructions, CanvasJob, DesignSubmission, integer(), JobState, keys(), NativeInstruction (+41 more)

### Community 30 - "messages.ts"
Cohesion: 0.16
Nodes (18): ScanProgress, ScanRequest, TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason, TokenCoveragePageQuery, ContextStatus (+10 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.16
Nodes (8): ProviderResponse, SharedProjection, Lease, Clock, ModelReviewRunner, RunnerRepository, terminal(), Transport

### Community 40 - "adapter.ts"
Cohesion: 0.12
Nodes (39): BINDABLE_FIELDS, boundFields(), boundVariableIds(), canonicalBindableField(), CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries (+31 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.20
Nodes (24): assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke(), isInheritedInstanceField() (+16 more)

### Community 42 - "ReadinessReport"
Cohesion: 0.18
Nodes (18): HistoricalAuditExportV1, ReadinessReport, actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers() (+10 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.14
Nodes (19): ajv, edit, fields, GET(), POST(), required, runtime, selection (+11 more)

### Community 44 - "core/contracts.ts"
Cohesion: 0.09
Nodes (23): producerLabel(), RULESET_VERSION, BuildChannel, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot, Fixability, JsonPrimitive (+15 more)

### Community 45 - "policy.ts"
Cohesion: 0.18
Nodes (27): assertNoCredentials(), assertSafe(), conflict(), digest(), editSchema, generationBody(), INSTRUCTIONS, integer() (+19 more)

### Community 46 - "graph.ts"
Cohesion: 0.18
Nodes (13): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), isConductorAuditExcluded(), nestedComponentSources(), populateGraphMetrics(), postOrder() (+5 more)

### Community 47 - "filesystem.ts"
Cohesion: 0.28
Nodes (13): exportKnowledge(), exportRelease(), newPrivateDirectory(), acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), atomicWriteJsonAt() (+5 more)

### Community 48 - "history.ts"
Cohesion: 0.23
Nodes (11): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+3 more)

### Community 49 - "hashValue"
Cohesion: 0.22
Nodes (16): listFilesystemProjectGuidancePacks(), ProjectStyleGuideBindingV1, assertProjectStyleGuideBinding(), assertReferencePack(), bindingMaterial(), buildProjectStyleGuideBinding(), buildReferencePack(), combineProjectStyleGuidePacks() (+8 more)

### Community 50 - "model-review/repository.ts"
Cohesion: 0.20
Nodes (34): transaction(), decimal(), estimate(), money(), uuid(), accountIn(), cancel(), claim() (+26 more)

### Community 51 - "view-models.ts"
Cohesion: 0.18
Nodes (16): decisionDateFormatter, humanize(), matchesCandidate(), normalizedExceptions(), ReviewController(), statusLabels, blocksModelApply(), LocalReviewDraft (+8 more)

### Community 52 - "constants.ts"
Cohesion: 0.17
Nodes (11): AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY, PROFILE_DATA_KEY_V2 (+3 more)

### Community 53 - "ReadinessProfile"
Cohesion: 0.13
Nodes (22): DEFAULT_PROFILE, CertificationSummary, ReadinessProfile, assertProfileSemantics(), cloneProfile(), freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate (+14 more)

### Community 54 - "finding-groups.ts"
Cohesion: 0.25
Nodes (14): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), groupsForFindings(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+6 more)

### Community 55 - "Findings.tsx"
Cohesion: 0.20
Nodes (17): PRODUCER_IDENTITY, AxisScore, Finding, FindingGroup, WaiverStore, BootstrapData, VariableCollectionOption, IssueReviewState (+9 more)

### Community 56 - "audit-scope.ts"
Cohesion: 0.25
Nodes (10): ScanScope, AuditRefreshResult, AuditTargetSummary, analyzingDetail(), AUDIT_CANCELLED_NOTICE, auditHeadline(), auditProgressPresentation, contextBoundary() (+2 more)

### Community 57 - ".buildKnowledge"
Cohesion: 0.15
Nodes (20): collectionMaterial(), KnowledgeBuildResult, referencedVariableIds(), restFragmentRoot(), roleForPage(), variableAliases(), variableCandidates(), variableEnvironmentReader() (+12 more)

### Community 58 - "errors.ts"
Cohesion: 0.18
Nodes (12): GET(), runtime, safeFilename(), POST(), runtime, figmaTransport(), fixtureFile, fixtureVariables (+4 more)

### Community 59 - "http.ts"
Cohesion: 0.12
Nodes (15): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, dynamic, ImportLearningsPage(), metadata (+7 more)

### Community 60 - "knowledge.ts"
Cohesion: 0.39
Nodes (7): bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 62 - ".getCollectionOptions"
Cohesion: 0.60
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

### Community 63 - "rules/component.ts"
Cohesion: 0.67
Nodes (5): evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

### Community 64 - "schema.ts"
Cohesion: 0.33
Nodes (5): MultiFileReviewReportV1, ContractName, ContractValidationResult, reportRelationshipErrors(), validators

## Knowledge Gaps
- **203 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `knowledge-loop.ts`, `.refreshTrackedFragments`, `companion/repository.ts`, `audit-storage.ts`, `App.tsx`, `plugin/main.ts`, `report.ts`, `companion/main.ts`, `planning.ts`, `rules.ts`, `handleMessage`, `review-source.ts`, `messages.ts`, `adapter.ts`, `ReadinessReport`, `policy.ts`, `graph.ts`, `finding-groups.ts`, `.buildKnowledge`, `knowledge.ts`, `TextStyleEvidenceReader`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `knowledge-loop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1380952380952381 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `companion/repository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1425287356321839 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08329979879275654 - nodes in this community are weakly interconnected._
# Graph Report - design-passport  (2026-10-27)

## Corpus Check
- 164 files · ~101,619 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1386 nodes · 4537 edges · 65 communities (61 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf5b4780`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- knowledge-loop.ts
- hashValue
- requireRequestAccess
- mutations.ts
- companion/repository.ts
- audit-storage.ts
- background.ts
- App.tsx
- devDependencies
- compilerOptions
- model-reviews/page.tsx
- plugin/main.ts
- ProfileEditor.tsx
- ChangePlan
- model-review/repository.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- KnowledgeSessionState
- presentation.ts
- companion/main.ts
- core/contracts.ts
- planning.ts
- accessibility.ts
- micro-check.ts
- session-state.ts
- finding.ts
- handleMessage
- core/operations/interaction-state.ts
- conductor-contracts.ts
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- .execute
- adapter.ts
- node-fields.ts
- analyzeCurrentGraph
- model-reviews/route.ts
- apply
- policy.ts
- Finding
- completeReconciliation
- rules/component.ts
- runMicroCheck
- transaction
- ModelReviewController.tsx
- constants.ts
- profile.ts
- finding-groups.ts
- Findings.tsx
- runtime.ts
- naming.ts
- guidance/route.ts
- AuditImportForm.tsx
- knowledge.ts
- AuditSaveStatus
- collections.ts
- .stageMicroCheck
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
- `GET()` --calls--> `auditDetail()`  [EXTRACTED]
  apps/companion/app/api/audits/[id]/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `previewAuditProjects()`  [EXTRACTED]
  apps/companion/app/api/audits/preview/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `recordDecision()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (65 total, 4 thin omitted)

### Community 0 - "knowledge-loop.ts"
Cohesion: 0.06
Nodes (78): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), KnowledgeState, listFilesystemProjectGuidancePacks() (+70 more)

### Community 1 - "hashValue"
Cohesion: 0.13
Nodes (27): ScanProgress, finalizeKnowledgeGraph(), populateGraphMetrics(), sourceFrameIds(), hashValue(), annotateInstanceDescendants(), collectionMaterial(), referencedVariableIds() (+19 more)

### Community 2 - "requireRequestAccess"
Cohesion: 0.13
Nodes (28): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+20 more)

### Community 3 - "mutations.ts"
Cohesion: 0.10
Nodes (45): FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds(), applyAutoLayoutProperties(), applyChangePlan() (+37 more)

### Community 4 - "companion/repository.ts"
Cohesion: 0.13
Nodes (30): assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS, ImportFileResult, ImportInput, ImportKind, nonempty() (+22 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.10
Nodes (39): CapturedAuditTarget, canonicalAuditTargetKey(), isAuditViewState(), SavedAuditV1, AuditCodecMeasurement, AuditMetadata, auditPacket(), AuditSaveGuard (+31 more)

### Community 6 - "background.ts"
Cohesion: 0.22
Nodes (17): channel(), composite(), contrastRatio(), relativeLuminance(), Rgba, contains(), fillStack(), hasVisiblePaint() (+9 more)

### Community 7 - "App.tsx"
Cohesion: 0.12
Nodes (30): profileDomainErrors(), AuditRefreshResult, App(), download(), EMPTY_SELECTION_SUMMARY, postMessage(), ProfileEditor(), root (+22 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (32): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+24 more)

### Community 10 - "model-reviews/page.tsx"
Cohesion: 0.13
Nodes (29): POST(), runtime, POST(), runtime, dynamic, ImportAuditsPage(), dynamic, HistoryDetailPage() (+21 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.09
Nodes (22): FullKnowledgeRebuildRequired, historicalAuditContent(), HistoricalAuditExportV1, HistoricalAuditSource, activeProjectStyleGuidePack(), adapter, appliedChanges, auditStorage (+14 more)

### Community 12 - "ProfileEditor.tsx"
Cohesion: 0.23
Nodes (11): CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, RuleMode, BootstrapData, VariableCollectionOption, AuditResultData, PageExclusions(), suggestedExcludedPage() (+3 more)

### Community 13 - "ChangePlan"
Cohesion: 0.42
Nodes (8): ChangePlan, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS, designerText(), fieldLabel()

### Community 14 - "model-review/repository.ts"
Cohesion: 0.19
Nodes (19): Accounting, ApplyInput, ApplyResult, CandidateRevision, FrozenReview, Outcome, Preview, ProjectSummary (+11 more)

### Community 15 - "report.ts"
Cohesion: 0.16
Nodes (23): AXIS_MULTIPLIERS, AXES, Grade, GradeLetter, affectsScore(), blocksReadiness(), CATEGORIES, collapseDisabledPolicyFindings() (+15 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.10
Nodes (36): HistoricalAuditExportV1, producerLabel(), AXIS_LABELS, PRODUCT_NAME, FrameResult, ReadinessReport, VariantCoverage, groupsForFindings() (+28 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.16
Nodes (15): ScanScope, BatchAuditSummary, runPageBatch(), AuditTargetSummary, PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+7 more)

### Community 19 - "presentation.ts"
Cohesion: 0.16
Nodes (19): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, ContextStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker() (+11 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.10
Nodes (36): fixtureFile, fixtureVariables, closeDatabases(), loadRuntimeEnvironment(), processState, runtimeChildEnvironment(), runtimeKeys, CompanionError (+28 more)

### Community 21 - "core/contracts.ts"
Cohesion: 0.08
Nodes (26): canonical, CATALOG_DIGEST, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern(), normalizeLookup() (+18 more)

### Community 22 - "planning.ts"
Cohesion: 0.27
Nodes (12): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, BINDABLE_FIELDS, operationForFinding(), operationKey(), operationOrder(), PlannedOperation, priority() (+4 more)

### Community 23 - "accessibility.ts"
Cohesion: 0.31
Nodes (12): isLargeText(), assessTarget(), evaluateAccessibilityRules(), insideDefinition(), interactiveCandidates(), isDescendant(), overlappingBounds(), renderedInGraph() (+4 more)

### Community 24 - "micro-check.ts"
Cohesion: 0.47
Nodes (5): GEOMETRY_PROPERTIES, MicroCheckRequired, microClosure(), microFieldGroup, TOKEN_PROPERTIES

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "finding.ts"
Cohesion: 0.22
Nodes (12): SOURCES, FindingStatus, Severity, classifyFinding(), createFinding(), FindingInput, FindingOptions, evaluateStructureRules() (+4 more)

### Community 27 - "handleMessage"
Cohesion: 0.18
Nodes (19): parseReferencePack(), validateSessionPackUse(), buildKnowledgeSummary(), assertDocumentMutationAllowed(), assertInitialized(), ensureDocumentChangeWatcher(), errorMessage(), generateContext() (+11 more)

### Community 28 - "core/operations/interaction-state.ts"
Cohesion: 0.31
Nodes (11): FALSE_VALUES, hasInactiveVariantState(), interactionState, normalizedProperties(), normalizePropertyName(), normalizePropertyValue(), resolvedState(), stateEvidence() (+3 more)

### Community 29 - "conductor-contracts.ts"
Cohesion: 0.07
Nodes (50): PRODUCER_IDENTITY, assertContractVersion(), CanvasInstructions, CanvasJob, DesignSubmission, integer(), JobState, keys() (+42 more)

### Community 30 - "messages.ts"
Cohesion: 0.15
Nodes (22): TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, isBindableField(), normalizeStableValue(), stableValue(), utf8ByteLength() (+14 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".execute"
Cohesion: 0.17
Nodes (7): ProviderResponse, SharedProjection, Clock, ModelReviewRunner, RunnerRepository, terminal(), Transport

### Community 40 - "adapter.ts"
Cohesion: 0.11
Nodes (44): BINDABLE_FIELDS, boundFields(), boundVariableIds(), canonicalBindableField(), CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries (+36 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.20
Nodes (23): assessIgnoringInstanceOwnership(), assessTokenProperty(), documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke(), isInheritedInstanceField(), normalizedField() (+15 more)

### Community 42 - "analyzeCurrentGraph"
Cohesion: 0.21
Nodes (17): actionableFinding(), AGGREGATES, stableIssueKey(), applyWaivers(), parseWaiver(), reanchorWaivers(), sanitizeWaiverStore(), validDate() (+9 more)

### Community 43 - "model-reviews/route.ts"
Cohesion: 0.14
Nodes (20): ajv, edit, fields, GET(), POST(), required, runtime, selection (+12 more)

### Community 44 - "apply"
Cohesion: 0.44
Nodes (12): conflict(), digest(), uuid(), apply(), reconcile(), runDetail(), runIn(), start() (+4 more)

### Community 45 - "policy.ts"
Cohesion: 0.16
Nodes (25): PricePolicy, Snapshot, assertNoCredentials(), assertSafe(), editSchema, generationBody(), INSTRUCTIONS, integer() (+17 more)

### Community 46 - "Finding"
Cohesion: 0.16
Nodes (21): DesignKnowledgeGraph, Finding, ReadinessProfile, applyFindingPolicy(), AuditTargetNodeType, collectDescendants(), isConductorAuditExcluded(), nestedComponentSources() (+13 more)

### Community 47 - "completeReconciliation"
Cohesion: 0.38
Nodes (10): decimal(), estimate(), money(), accountIn(), completeReconciliation(), ledger(), ledgerAccounting(), projectHistory() (+2 more)

### Community 48 - "rules/component.ts"
Cohesion: 0.57
Nodes (6): bindingCoverage, evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

### Community 49 - "runMicroCheck"
Cohesion: 0.21
Nodes (13): hasCompleteKnowledge(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), currentKnowledgeAvailable(), ensureKnowledge() (+5 more)

### Community 50 - "transaction"
Cohesion: 0.21
Nodes (19): databaseError(), transaction(), cancel(), claim(), cleanupDone(), dispatch(), event(), finish() (+11 more)

### Community 51 - "ModelReviewController.tsx"
Cohesion: 0.17
Nodes (17): active(), EditDraft, ModelReviewController(), readRun(), request(), decisionDateFormatter, humanize(), matchesCandidate() (+9 more)

### Community 52 - "constants.ts"
Cohesion: 0.14
Nodes (14): CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DEFAULT_PROFILE, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PROFILE_DATA_KEY, PROFILE_DATA_KEY_V2, PROFILE_DATA_KEY_V3 (+6 more)

### Community 53 - "profile.ts"
Cohesion: 0.16
Nodes (14): CertificationSummary, assertProfileSemantics(), cloneProfile(), normalizeReadinessProfile(), profileSemanticErrors(), ReadinessProfileV1, reconcileProfilePages(), certificationSummary() (+6 more)

### Community 54 - "finding-groups.ts"
Cohesion: 0.33
Nodes (9): FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding(), relatedComponent() (+1 more)

### Community 55 - "Findings.tsx"
Cohesion: 0.17
Nodes (21): getPatternChecklist(), Axis, AxisScore, BindableField, FindingCategory, FindingGroup, JsonValue, WaiverStore (+13 more)

### Community 56 - "runtime.ts"
Cohesion: 0.44
Nodes (7): GET(), isConfigured(), secureEqual(), SESSION_COOKIE, validCapability(), workspace(), resolveWorkspaceRoot()

### Community 57 - "naming.ts"
Cohesion: 0.50
Nodes (6): canonicalPatternName(), CATALOG_VERSION, evaluateNamingRules(), ABBREVIATED_COMPONENT_VALUE, DEFAULT_LAYER_NAME, GENERIC_COMPONENT_PROPERTY

### Community 58 - "guidance/route.ts"
Cohesion: 0.47
Nodes (5): GET(), runtime, safeFilename(), listProjectGuidancePacks(), packsIn()

### Community 59 - "AuditImportForm.tsx"
Cohesion: 0.12
Nodes (15): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, dynamic, ImportLearningsPage(), metadata (+7 more)

### Community 60 - "knowledge.ts"
Cohesion: 0.29
Nodes (8): NodeSnapshot, ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 61 - "AuditSaveStatus"
Cohesion: 0.60
Nodes (5): AuditSaveStatus, SavedAuditSummary, SavedAudits(), SavedAuditsProps, gradeClass()

### Community 62 - "collections.ts"
Cohesion: 0.83
Nodes (3): listVariableCollectionOptions(), loadRemoteCollections(), settleWithin()

### Community 63 - ".stageMicroCheck"
Cohesion: 0.15
Nodes (10): AUDIT_TARGET_NODE_TYPES, isAuditTargetNodeType(), bindingSignature(), captureInstanceEvidence(), FigmaAdapter, findPage(), InstanceProvenance, isSceneNode() (+2 more)

## Knowledge Gaps
- **203 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `knowledge-loop.ts`, `companion/repository.ts`, `audit-storage.ts`, `App.tsx`, `plugin/main.ts`, `report.ts`, `companion/main.ts`, `planning.ts`, `handleMessage`, `messages.ts`, `adapter.ts`, `analyzeCurrentGraph`, `policy.ts`, `Finding`, `runMicroCheck`, `finding-groups.ts`, `Findings.tsx`, `knowledge.ts`, `.stageMicroCheck`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `stableStringify()` connect `finding-groups.ts` to `hashValue`, `mutations.ts`, `companion/repository.ts`, `plugin/main.ts`, `apply`, `policy.ts`, `runMicroCheck`, `planning.ts`, `handleMessage`, `messages.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `knowledge-loop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05622489959839357 - nodes in this community are weakly interconnected._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.1251778093883357 - nodes in this community are weakly interconnected._
- **Should `requireRequestAccess` be split into smaller, more focused modules?**
  _Cohesion score 0.13076923076923078 - nodes in this community are weakly interconnected._
# Graph Report - design-passport  (2026-10-04)

## Corpus Check
- 134 files · ~75,707 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1126 nodes · 3498 edges · 50 communities (48 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26de3b6b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- knowledge-loop.ts
- adapter.ts
- requireRequestAccess
- mutations.ts
- repository.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- ReviewController.tsx
- plugin/main.ts
- contracts.ts
- recheck.ts
- constants.ts
- report.ts
- Overview.tsx
- scan-lifecycle.ts
- ensureKnowledge
- presentation.ts
- companion/main.ts
- DesignKnowledgeGraph
- stable.ts
- runtime.ts
- review-source.ts
- session-state.ts
- rules.ts
- handleMessage
- history.ts
- analyzeCurrentGraph
- messages.ts
- layout.tsx
- proxy.ts
- next.config.ts
- databasePage
- ProfileEditor.tsx
- node-fields.ts
- AuditImportForm.tsx
- Findings.tsx
- ReadinessProfile
- filesystem.ts
- knowledge.ts
- ChangePlan
- rules/component.ts
- download/[id]/route.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 69 edges
2. `handleMessage()` - 42 edges
3. `ReadinessProfile` - 32 edges
4. `Finding` - 29 edges
5. `requireRequestAccess()` - 28 edges
6. `failure()` - 26 edges
7. `assertContract()` - 26 edges
8. `DesignKnowledgeGraph` - 25 edges
9. `snapshotBase()` - 24 edges
10. `FigmaAdapter` - 24 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `importAudits()`  [EXTRACTED]
  apps/companion/app/api/audits/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `previewAuditProjects()`  [EXTRACTED]
  apps/companion/app/api/audits/preview/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviewView()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/view-models.ts

## Import Cycles
- None detected.

## Communities (50 total, 2 thin omitted)

### Community 0 - "knowledge-loop.ts"
Cohesion: 0.12
Nodes (47): loadDecisions(), loadEnvelopes(), readFilesystemKnowledgeState(), LearningObservationV1, ProjectStyleGuideBindingV1, assertKnowledgeCandidate(), assertKnowledgeDecision(), assertLearningEnvelope() (+39 more)

### Community 1 - "adapter.ts"
Cohesion: 0.05
Nodes (83): CertificationSummary, populateGraphMetrics(), postOrder(), sourceFrameIds(), annotateInstanceDescendants(), BINDABLE_FIELDS, bindingSignature(), boundFields() (+75 more)

### Community 2 - "requireRequestAccess"
Cohesion: 0.12
Nodes (32): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+24 more)

### Community 3 - "mutations.ts"
Cohesion: 0.09
Nodes (48): BindableField, JsonValue, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), aliasIds() (+40 more)

### Community 4 - "repository.ts"
Cohesion: 0.14
Nodes (33): transaction(), assertAudit(), assertProjectScope(), exactKeys(), IMPORT_LIMITS, ImportFileResult, ImportInput, ImportKind (+25 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.10
Nodes (34): CapturedAuditTarget, canonicalAuditTargetKey(), SavedAuditV1, AuditCodecMeasurement, AuditMetadata, auditPacket(), AuditSaveGuard, AuditStorage (+26 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 7 - "App.tsx"
Cohesion: 0.14
Nodes (26): Axis, FindingCategory, Grade, AuditSaveStatus, AuditViewState, SaveAuditInput, SavedAuditSummary, App() (+18 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - "ReviewController.tsx"
Cohesion: 0.13
Nodes (22): DashboardPage(), dynamic, dynamic, metadata, ReviewPage(), decisionDateFormatter, humanize(), LocalReviewDraft (+14 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.10
Nodes (24): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore, FullKnowledgeRebuildRequired, activeProjectStyleGuidePack() (+16 more)

### Community 12 - "contracts.ts"
Cohesion: 0.11
Nodes (18): PRODUCER_IDENTITY, RULESET_VERSION, AxisScore, BuildChannel, EffectSnapshot, FindingProvenance, FindingStatus, Fixability (+10 more)

### Community 13 - "recheck.ts"
Cohesion: 0.53
Nodes (5): AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts(), RecheckFindings

### Community 14 - "constants.ts"
Cohesion: 0.06
Nodes (46): HistoricalAuditExportV1, AXIS_LABELS, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DEFAULT_PROFILE, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX (+38 more)

### Community 15 - "report.ts"
Cohesion: 0.19
Nodes (21): AXES, affectsScore(), blocksReadiness(), CATEGORIES, collapseDisabledPolicyFindings(), CONFIGURABLE_RULES, configurablePolicyIdForFinding(), findingImpactLabel() (+13 more)

### Community 16 - "Overview.tsx"
Cohesion: 0.13
Nodes (23): producerLabel(), GradeLetter, ScanProgress, PageOption, SelectionSummary, AuditRefreshResult, BrandMark(), BrandMarkProps (+15 more)

### Community 17 - "scan-lifecycle.ts"
Cohesion: 0.16
Nodes (15): BatchAuditSummary, runPageBatch(), AuditTargetSummary, PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError, AuditTargetIntent (+7 more)

### Community 18 - "ensureKnowledge"
Cohesion: 0.19
Nodes (6): isKnowledgeFresh(), assertCurrentReport(), currentKnowledgeAvailable(), ensureKnowledge(), verifiedKnowledgeAvailable(), KnowledgeSessionState

### Community 19 - "presentation.ts"
Cohesion: 0.22
Nodes (14): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+6 more)

### Community 20 - "companion/main.ts"
Cohesion: 0.13
Nodes (29): closeDatabases(), database(), databaseError(), loadRuntimeEnvironment(), pools, runtimeChildEnvironment(), runtimeKeys, exportKnowledge() (+21 more)

### Community 21 - "DesignKnowledgeGraph"
Cohesion: 0.13
Nodes (16): canonical, CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern() (+8 more)

### Community 22 - "stable.ts"
Cohesion: 0.15
Nodes (22): AI_SOURCE_FRAME_ANNOTATION, ChangeOperation, attachFindingProvenance(), buildFindingGroups(), group(), inheritedRootSource(), PROPERTY_BY_RULE, propertyForFinding() (+14 more)

### Community 23 - "runtime.ts"
Cohesion: 0.21
Nodes (14): GET(), dynamic, ImportLearningsPage(), metadata, dynamic, metadata, NewPackPage(), isConfigured() (+6 more)

### Community 24 - "review-source.ts"
Cohesion: 0.14
Nodes (21): figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), DesignReferencePackV1, ReferenceDomainV1, ReferenceFactV1, ReviewSourceRoleV1 (+13 more)

### Community 25 - "session-state.ts"
Cohesion: 0.22
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.15
Nodes (26): canonicalPatternName(), SOURCES, Finding, NodeSnapshot, applyFindingPolicy(), classifyFinding(), collectDescendants(), collectBoundVariableIds() (+18 more)

### Community 27 - "handleMessage"
Cohesion: 0.14
Nodes (13): validateSessionPackUse(), FigmaAdapter, summarizeSelection(), historicalAuditContent(), assertDocumentMutationAllowed(), assertInitialized(), currentProjectStyleGuideStatus(), errorMessage() (+5 more)

### Community 28 - "history.ts"
Cohesion: 0.23
Nodes (11): GET(), runtime, GET(), runtime, dynamic, HistoryPage(), historyFilters(), historyResponse() (+3 more)

### Community 29 - "analyzeCurrentGraph"
Cohesion: 0.21
Nodes (14): analyzeCurrentGraph(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), ensureDocumentChangeWatcher(), handleDocumentChange(), markKnowledgeDirty() (+6 more)

### Community 30 - "messages.ts"
Cohesion: 0.15
Nodes (22): ScanRequest, TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason, TokenCoveragePageQuery, isBindableField(), isAuditViewState() (+14 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - "databasePage"
Cohesion: 0.24
Nodes (9): GET(), runtime, dynamic, ImportAuditsPage(), dynamic, HistoryDetailPage(), databasePage(), auditDetail() (+1 more)

### Community 40 - "ProfileEditor.tsx"
Cohesion: 0.20
Nodes (14): CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, RuleMode, profileDomainErrors(), BootstrapData, VariableCollectionOption, PageRole, POLICY_LABELS (+6 more)

### Community 41 - "node-fields.ts"
Cohesion: 0.17
Nodes (27): assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent(), hasRenderedStroke() (+19 more)

### Community 42 - "AuditImportForm.tsx"
Cohesion: 0.19
Nodes (9): AuditImportForm(), Preview, FileResult, ImportForm(), ImportResult, PackForm(), PackResult, CompanionActionResult (+1 more)

### Community 43 - "Findings.tsx"
Cohesion: 0.32
Nodes (9): getPatternChecklist(), FindingGroup, Findings(), FindingsProps, TokenWizard(), statusClass(), defaultTokenCollectionId(), isWaiverReasonValid() (+1 more)

### Community 44 - "ReadinessProfile"
Cohesion: 0.24
Nodes (11): PageSnapshot, ReadinessProfile, ScanScope, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), resolveTargetRoots() (+3 more)

### Community 45 - "filesystem.ts"
Cohesion: 0.38
Nodes (10): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), atomicWriteJsonAt(), ensureDirectory(), listFilesystemProjectGuidancePacks(), loadCandidates() (+2 more)

### Community 46 - "knowledge.ts"
Cohesion: 0.39
Nodes (8): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 47 - "ChangePlan"
Cohesion: 0.48
Nodes (6): ChangePlan, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS

### Community 48 - "rules/component.ts"
Cohesion: 0.67
Nodes (5): evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

### Community 49 - "download/[id]/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, auditDownload()

## Knowledge Gaps
- **172 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `knowledge-loop.ts` to `adapter.ts`, `repository.ts`, `audit-storage.ts`, `App.tsx`, `ProfileEditor.tsx`, `node-fields.ts`, `plugin/main.ts`, `ReadinessProfile`, `knowledge.ts`, `report.ts`, `ensureKnowledge`, `companion/main.ts`, `stable.ts`, `review-source.ts`, `handleMessage`, `messages.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `knowledge-loop.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `adapter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052028732284993204 - nodes in this community are weakly interconnected._
- **Should `requireRequestAccess` be split into smaller, more focused modules?**
  _Cohesion score 0.12424242424242424 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09292929292929293 - nodes in this community are weakly interconnected._
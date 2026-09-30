# Graph Report - design-passport  (2026-09-30)

## Corpus Check
- 117 files · ~71,275 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1049 nodes · 3231 edges · 50 communities (48 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a07fe8f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- requireRequestAccess
- report.ts
- node-fields.ts
- audit-storage.ts
- background.ts
- devDependencies
- DesignKnowledgeGraph
- plugin/main.ts
- compilerOptions
- App.tsx
- Overview.tsx
- mutations.ts
- adapter.ts
- messages.ts
- contracts.ts
- repository.ts
- handleMessage
- companion/main.ts
- stable.ts
- presentation.ts
- ReviewController.tsx
- scan-lifecycle.ts
- ensureKnowledge
- FigmaAdapter
- Findings.tsx
- recheck.ts
- runtime.ts
- session-state.ts
- graph.ts
- Finding
- audit-state.ts
- new/page.tsx
- NodeSnapshot
- layout.tsx
- accessibility.ts
- core/operations/interaction-state.ts
- post
- proxy.ts
- next.config.ts
- knowledge.ts
- ChangePlan
- core/waivers.ts
- rules/component.ts
- responsive.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 70 edges
2. `handleMessage()` - 50 edges
3. `ReadinessProfile` - 32 edges
4. `Finding` - 29 edges
5. `DesignKnowledgeGraph` - 25 edges
6. `assertContract()` - 24 edges
7. `snapshotBase()` - 24 edges
8. `FigmaAdapter` - 24 edges
9. `buildReadinessReport()` - 22 edges
10. `analyzeCurrentGraph()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviewView()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/view-models.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `recordDecision()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (50 total, 2 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.09
Nodes (60): DesignReferencePackV1, ProjectStyleGuideBindingV1, ReferenceDomainV1, ReferenceFactV1, ReviewSourceRoleV1, ReviewSourceV1, assertKnowledgeCandidate(), assertKnowledgeDecision() (+52 more)

### Community 1 - "requireRequestAccess"
Cohesion: 0.17
Nodes (22): POST(), runtime, POST(), runtime, GET(), runtime, safeFilename(), POST() (+14 more)

### Community 2 - "report.ts"
Cohesion: 0.08
Nodes (54): AXIS_LABELS, AXIS_MULTIPLIERS, AXES, AxisScore, ConfigurablePolicyId, FindingProvenance, FindingStatus, FrameResult (+46 more)

### Community 3 - "node-fields.ts"
Cohesion: 0.16
Nodes (29): collectDescendants(), assessIgnoringInstanceOwnership(), assessTokenProperty(), bindingCoverage, CODE_RELEVANT_FIELDS, documentationScaffoldNodeIds(), eligibleTokenFields(), fieldIsPresent() (+21 more)

### Community 4 - "audit-storage.ts"
Cohesion: 0.11
Nodes (31): canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, AuditCodecMeasurement, auditPacket(), AuditSaveGuard, AuditStorage, AuditStorageOptions (+23 more)

### Community 5 - "background.ts"
Cohesion: 0.22
Nodes (17): channel(), composite(), contrastRatio(), relativeLuminance(), Rgba, contains(), fillStack(), hasVisiblePaint() (+9 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 7 - "DesignKnowledgeGraph"
Cohesion: 0.14
Nodes (15): canonical, CATALOG_DIGEST, CatalogAlias, CatalogData, CatalogPattern, contextualAliases, getPattern(), normalizeLookup() (+7 more)

### Community 8 - "plugin/main.ts"
Cohesion: 0.10
Nodes (20): historicalAuditContent(), HistoricalAuditExportV1, HistoricalAuditSource, adapter, appliedChanges, assertInitialized(), auditStorage, codecMetrics (+12 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - "App.tsx"
Cohesion: 0.12
Nodes (30): CONFIGURABLE_POLICY_IDS, ReadinessProfile, RuleMode, profileDomainErrors(), BootstrapData, App(), download(), EMPTY_SELECTION_SUMMARY (+22 more)

### Community 11 - "Overview.tsx"
Cohesion: 0.13
Nodes (24): producerLabel(), GradeLetter, ReadinessReport, ScanScope, PageOption, SelectionSummary, AuditRefreshResult, AuditTargetSummary (+16 more)

### Community 12 - "mutations.ts"
Cohesion: 0.07
Nodes (65): AI_SOURCE_FRAME_ANNOTATION, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY, PROFILE_DATA_KEY_V2 (+57 more)

### Community 13 - "adapter.ts"
Cohesion: 0.05
Nodes (78): ScanProgress, populateGraphMetrics(), sourceFrameIds(), annotateInstanceDescendants(), BINDABLE_FIELDS, bindingSignature(), boundFields(), boundVariableIds() (+70 more)

### Community 14 - "messages.ts"
Cohesion: 0.26
Nodes (12): TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, TokenCoveragePageRequest, TokenCoveragePageResult, UiToPluginMessage, aggregate() (+4 more)

### Community 15 - "contracts.ts"
Cohesion: 0.10
Nodes (19): PRODUCER_IDENTITY, RULESET_VERSION, BuildChannel, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1 (+11 more)

### Community 16 - "repository.ts"
Cohesion: 0.18
Nodes (27): acquireLock(), assertNoSymlink(), assertWithinRoot(), atomicWriteJson(), atomicWriteJsonAt(), clearRebuildRequired(), ensureDirectory(), exists() (+19 more)

### Community 17 - "handleMessage"
Cohesion: 0.23
Nodes (17): activeProjectStyleGuidePack(), analyzeCurrentGraph(), assertCurrentReport(), assertDocumentMutationAllowed(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), currentKnowledgeAvailable() (+9 more)

### Community 18 - "companion/main.ts"
Cohesion: 0.18
Nodes (22): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), args(), availablePort() (+14 more)

### Community 19 - "stable.ts"
Cohesion: 0.08
Nodes (37): DEFAULT_PROFILE, ChangeOperation, MultiFileReviewReportV1, BINDABLE_FIELDS, isBindableField(), operationForFinding(), operationKey(), operationOrder() (+29 more)

### Community 20 - "presentation.ts"
Cohesion: 0.22
Nodes (15): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+7 more)

### Community 21 - "ReviewController.tsx"
Cohesion: 0.15
Nodes (19): dynamic, metadata, ReviewPage(), decisionDateFormatter, humanize(), LocalReviewDraft, matchesCandidate(), normalizedExceptions() (+11 more)

### Community 22 - "scan-lifecycle.ts"
Cohesion: 0.18
Nodes (12): BatchAuditSummary, runPageBatch(), friendlyImportError(), pluginMessageForError(), ScanCancelledError, AuditTargetIntent, auditTargetSummary(), captureTargetSnapshot() (+4 more)

### Community 23 - "ensureKnowledge"
Cohesion: 0.23
Nodes (3): isKnowledgeFresh(), ensureKnowledge(), KnowledgeSessionState

### Community 24 - "FigmaAdapter"
Cohesion: 0.17
Nodes (5): FigmaAdapter, summarizeSelection(), auditPages(), rescanActiveTarget(), runScan()

### Community 25 - "Findings.tsx"
Cohesion: 0.26
Nodes (13): getPatternChecklist(), BindableField, FindingGroup, JsonValue, VariableCollectionOption, Findings(), FindingsProps, TokenWizard() (+5 more)

### Community 26 - "recheck.ts"
Cohesion: 0.53
Nodes (5): AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts(), RecheckFindings

### Community 27 - "runtime.ts"
Cohesion: 0.22
Nodes (14): GET(), dynamic, ImportLearningsPage(), metadata, DashboardPage(), dynamic, isConfigured(), requirePageAccess() (+6 more)

### Community 28 - "session-state.ts"
Cohesion: 0.18
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 29 - "graph.ts"
Cohesion: 0.33
Nodes (8): AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), postOrder(), resolveTargetRoots(), targetRootIds(), TargetRootResolution

### Community 30 - "Finding"
Cohesion: 0.27
Nodes (12): canonicalPatternName(), CATALOG_VERSION, SOURCES, Finding, createFinding(), FindingInput, FindingOptions, evaluateNamingRules() (+4 more)

### Community 31 - "audit-state.ts"
Cohesion: 0.23
Nodes (14): Axis, FindingCategory, Grade, CapturedAuditTarget, AuditSaveStatus, AuditViewState, SavedAuditSummary, SavedAuditV1 (+6 more)

### Community 32 - "new/page.tsx"
Cohesion: 0.19
Nodes (9): FileResult, ImportForm(), ImportResult, PackForm(), PackResult, dynamic, metadata, NewPackPage() (+1 more)

### Community 33 - "NodeSnapshot"
Cohesion: 0.33
Nodes (7): NodeSnapshot, evaluateStructureRules(), GEOMETRY_NODE_TYPES, isEmptyNonInteractiveSpacer(), isMeasurableLayoutContainer(), spacerSizingEvidence(), TextStyleMaterial

### Community 34 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 35 - "accessibility.ts"
Cohesion: 0.31
Nodes (12): isLargeText(), assessTarget(), evaluateAccessibilityRules(), insideDefinition(), interactiveCandidates(), isDescendant(), overlappingBounds(), renderedInGraph() (+4 more)

### Community 36 - "core/operations/interaction-state.ts"
Cohesion: 0.31
Nodes (11): FALSE_VALUES, hasInactiveVariantState(), interactionState, normalizedProperties(), normalizePropertyName(), normalizePropertyValue(), resolvedState(), stateEvidence() (+3 more)

### Community 37 - "post"
Cohesion: 0.25
Nodes (8): ensureDocumentChangeWatcher(), handleDocumentChange(), initialize(), markKnowledgeDirty(), post(), restoreAudit(), restoreLastAudit(), storedProjectStyleGuideBinding()

### Community 45 - "knowledge.ts"
Cohesion: 0.39
Nodes (8): ResponsiveFamily, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName

### Community 46 - "ChangePlan"
Cohesion: 0.48
Nodes (6): ChangePlan, BuildReportInput, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS

### Community 47 - "core/waivers.ts"
Cohesion: 0.38
Nodes (6): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore

### Community 48 - "rules/component.ts"
Cohesion: 0.67
Nodes (5): evaluateComponentRules(), hasDescription(), inheritsComponentSetDescription(), isDescribedComponent(), subtree()

### Community 49 - "responsive.ts"
Cohesion: 0.60
Nodes (4): collectBoundVariableIds(), hasResponsiveVariableSignal(), evaluateResponsiveRules(), pageRoleForNode()

## Knowledge Gaps
- **159 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `NodeSnapshot`, `report.ts`, `audit-storage.ts`, `plugin/main.ts`, `App.tsx`, `knowledge.ts`, `adapter.ts`, `messages.ts`, `repository.ts`, `handleMessage`, `companion/main.ts`, `stable.ts`, `ensureKnowledge`, `graph.ts`, `audit-state.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `AuditStorage` connect `audit-storage.ts` to `plugin/main.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.08878968253968254 - nodes in this community are weakly interconnected._
- **Should `report.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07595628415300547 - nodes in this community are weakly interconnected._
- **Should `audit-storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10774410774410774 - nodes in this community are weakly interconnected._
# Graph Report - design-passport  (2026-09-29)

## Corpus Check
- 117 files · ~70,567 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1046 nodes · 3218 edges · 45 communities (43 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ba7a83b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- runtime.ts
- report.ts
- node-fields.ts
- audit-storage.ts
- accessibility.ts
- devDependencies
- catalog.ts
- plugin/main.ts
- compilerOptions
- App.tsx
- Overview.tsx
- mutations.ts
- snapshotBase
- messages.ts
- contracts.ts
- .buildKnowledge
- handleMessage
- adapter.ts
- profile.ts
- presentation.ts
- createSemanticTokenAndBind
- scan-lifecycle.ts
- ensureKnowledge
- FigmaAdapter
- Findings.tsx
- ReadinessReport
- NodeSnapshot
- session-state.ts
- graph.ts
- DesignKnowledgeGraph
- breakdown.ts
- geometry.ts
- text-style.ts
- layout.tsx
- annotationText
- profile-inference.ts
- applyInferredAutoLayout
- proxy.ts
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 70 edges
2. `handleMessage()` - 47 edges
3. `ReadinessProfile` - 32 edges
4. `Finding` - 29 edges
5. `DesignKnowledgeGraph` - 25 edges
6. `assertContract()` - 24 edges
7. `snapshotBase()` - 24 edges
8. `FigmaAdapter` - 23 edges
9. `buildReadinessReport()` - 22 edges
10. `analyzeCurrentGraph()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `recordDecision()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importLearning()`  [EXTRACTED]
  apps/companion/app/api/learnings/import/route.ts → src/companion/repository.ts
- `POST()` --calls--> `createReferencePack()`  [EXTRACTED]
  apps/companion/app/api/packs/route.ts → src/companion/figma.ts
- `POST()` --calls--> `rebuildKnowledge()`  [EXTRACTED]
  apps/companion/app/api/rebuild/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (45 total, 2 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.05
Nodes (113): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), args(), availablePort() (+105 more)

### Community 1 - "runtime.ts"
Cohesion: 0.06
Nodes (60): POST(), runtime, POST(), runtime, GET(), runtime, safeFilename(), POST() (+52 more)

### Community 2 - "report.ts"
Cohesion: 0.07
Nodes (61): AXES, ChangeOperation, ChangePlan, Finding, FindingProvenance, attachFindingProvenance(), buildFindingGroups(), group() (+53 more)

### Community 3 - "node-fields.ts"
Cohesion: 0.08
Nodes (58): SOURCES, FindingStatus, ResponsiveFamily, Severity, bindingSignature(), deriveRepeatedStructures(), deriveResponsiveFamilies(), finalizeKnowledgeGraph() (+50 more)

### Community 4 - "audit-storage.ts"
Cohesion: 0.09
Nodes (40): FindingCategory, Grade, AuditSaveStatus, AuditViewState, canonicalAuditTargetKey(), isAuditViewState(), SaveAuditInput, SavedAuditSummary (+32 more)

### Community 5 - "accessibility.ts"
Cohesion: 0.09
Nodes (40): channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES, hasInactiveVariantState() (+32 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 7 - "catalog.ts"
Cohesion: 0.10
Nodes (26): PRODUCER_IDENTITY, canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern (+18 more)

### Community 8 - "plugin/main.ts"
Cohesion: 0.08
Nodes (28): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore, FullKnowledgeRebuildRequired, historicalAuditContent() (+20 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - "App.tsx"
Cohesion: 0.15
Nodes (24): producerLabel(), profileDomainErrors(), App(), download(), EMPTY_SELECTION_SUMMARY, send(), ProfileEditor(), root (+16 more)

### Community 11 - "Overview.tsx"
Cohesion: 0.14
Nodes (22): GradeLetter, ScanScope, PageOption, SelectionSummary, AuditRefreshResult, AuditTargetSummary, BrandMark(), BrandMarkProps (+14 more)

### Community 12 - "mutations.ts"
Cohesion: 0.14
Nodes (22): AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY, PROFILE_DATA_KEY_V2 (+14 more)

### Community 13 - "snapshotBase"
Cohesion: 0.20
Nodes (24): boundFields(), boundVariableIds(), canonicalBindableField(), captureSupplement(), componentSnapshot(), devStatusSnapshot(), enrichLiveEvidence(), geometryEvidence() (+16 more)

### Community 14 - "messages.ts"
Cohesion: 0.17
Nodes (20): TokenCoverageDisposition, TokenCoverageField, TokenCoverageReason, TokenCoveragePageQuery, isBindableField(), jsonValue(), parseUiMessage(), profile() (+12 more)

### Community 15 - "contracts.ts"
Cohesion: 0.12
Nodes (19): AxisScore, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot, Fixability, JsonPrimitive, KnowledgeOriginV1, LearningObservationKindV1 (+11 more)

### Community 16 - ".buildKnowledge"
Cohesion: 0.16
Nodes (16): ScanProgress, annotateInstanceDescendants(), bindingSignature(), captureInstanceEvidence(), enrichInferences(), findPage(), graphDescendantIds(), inferredBindings() (+8 more)

### Community 17 - "handleMessage"
Cohesion: 0.20
Nodes (18): activeProjectStyleGuidePack(), analyzeCurrentGraph(), assertDocumentMutationAllowed(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), auditPages(), currentProjectStyleGuideStatus() (+10 more)

### Community 18 - "adapter.ts"
Cohesion: 0.13
Nodes (18): BINDABLE_FIELDS, CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries, captureFragments(), capturePageFragments(), certificationSummary() (+10 more)

### Community 19 - "profile.ts"
Cohesion: 0.16
Nodes (17): CertificationSummary, MultiFileReviewReportV1, cloneProfile(), normalizeReadinessProfile(), ReadinessProfileV1, reconcileProfilePages(), ContractName, ContractValidationResult (+9 more)

### Community 20 - "presentation.ts"
Cohesion: 0.21
Nodes (15): KnowledgeInsight, ReviewLearningEnvelopeV1, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance() (+7 more)

### Community 21 - "createSemanticTokenAndBind"
Cohesion: 0.17
Nodes (17): VariableCandidate, FIELD_SCOPES, FLOAT_FIELDS, isPreciselyScopedVariableForField(), scopesForBindableField(), variableTypeForBindableField(), createSemanticTokenAndBind(), isSceneNode() (+9 more)

### Community 22 - "scan-lifecycle.ts"
Cohesion: 0.15
Nodes (16): CapturedAuditTarget, AuditMetadata, BatchAuditSummary, runPageBatch(), PluginToUiMessage, friendlyImportError(), pluginMessageForError(), ScanCancelledError (+8 more)

### Community 23 - "ensureKnowledge"
Cohesion: 0.16
Nodes (9): isKnowledgeFresh(), assertCurrentReport(), currentKnowledgeAvailable(), ensureDocumentChangeWatcher(), ensureKnowledge(), handleDocumentChange(), markKnowledgeDirty(), verifiedKnowledgeAvailable() (+1 more)

### Community 24 - "FigmaAdapter"
Cohesion: 0.18
Nodes (6): assertProfileSemantics(), profileSemanticErrors(), FigmaAdapter, summarizeSelection(), initialize(), storedProjectStyleGuideBinding()

### Community 25 - "Findings.tsx"
Cohesion: 0.30
Nodes (10): BindableField, FindingGroup, JsonValue, FindingsProps, TokenWizard(), defaultTokenCollectionId(), isWaiverReasonValid(), BootstrapEnvelope (+2 more)

### Community 26 - "ReadinessReport"
Cohesion: 0.27
Nodes (11): AXIS_LABELS, ReadinessReport, AuditRecheckRequest, actionable(), captureRecheckFindings(), recheckCounts(), RecheckFindings, Modules() (+3 more)

### Community 27 - "NodeSnapshot"
Cohesion: 0.26
Nodes (10): NodeSnapshot, baseSnapshot(), ContextCachePort, contextFragment, newBuildDiagnostics(), readContextFragment(), record(), restPageFingerprint (+2 more)

### Community 28 - "session-state.ts"
Cohesion: 0.18
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 29 - "graph.ts"
Cohesion: 0.24
Nodes (11): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), populateGraphMetrics(), postOrder(), resolveTargetRoots() (+3 more)

### Community 30 - "DesignKnowledgeGraph"
Cohesion: 0.27
Nodes (9): DesignKnowledgeGraph, BootstrapData, KnowledgeBuildResult, KnowledgeBuildDiagnostics, listVariableCollectionOptions(), loadRemoteCollections(), settleWithin(), VariableCollectionOption (+1 more)

### Community 31 - "breakdown.ts"
Cohesion: 0.50
Nodes (7): Axis, FrameResult, VariantCoverage, IssueSummary, ModuleBreakdown, PageBreakdown, VariantBreakdown

### Community 32 - "geometry.ts"
Cohesion: 0.43
Nodes (7): assessGeometryChange(), Bounds, introducesClipping(), introducesOverlap(), maximumDelta(), overlapPairs(), overlaps()

### Community 33 - "text-style.ts"
Cohesion: 0.36
Nodes (3): material(), TextStyleEvidenceReader, TextStyleMaterial

### Community 34 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 35 - "annotationText"
Cohesion: 0.62
Nodes (6): applyOperation(), clearVariantCoverageAnnotations(), setCertification(), annotationText(), copyAnnotationForWrite(), preservedAnnotations()

### Community 36 - "profile-inference.ts"
Cohesion: 0.40
Nodes (5): DEFAULT_PROFILE, freshDefaultProfile(), inferProfileFromPages(), ProfileCollectionCandidate, ProfilePageCandidate

### Community 37 - "applyInferredAutoLayout"
Cohesion: 0.60
Nodes (6): applyAutoLayoutProperties(), applyInferredAutoLayout(), bounds(), hasChildren(), isAutoLayoutNode(), validateInferredAutoLayout()

## Knowledge Gaps
- **158 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `text-style.ts`, `report.ts`, `node-fields.ts`, `audit-storage.ts`, `plugin/main.ts`, `App.tsx`, `snapshotBase`, `messages.ts`, `.buildKnowledge`, `handleMessage`, `adapter.ts`, `ensureKnowledge`, `NodeSnapshot`, `graph.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.05027773821392964 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062037037037037036 - nodes in this community are weakly interconnected._
- **Should `report.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06873706004140787 - nodes in this community are weakly interconnected._
- **Should `node-fields.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07594381035996488 - nodes in this community are weakly interconnected._
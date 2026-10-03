# Graph Report - design-passport  (2026-10-03)

## Corpus Check
- 117 files · ~72,010 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1057 nodes · 3259 edges · 44 communities (41 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6beeeb2c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hashValue
- adapter.ts
- runtime.ts
- mutations.ts
- report.ts
- audit-storage.ts
- accessibility.ts
- App.tsx
- devDependencies
- compilerOptions
- node-fields.ts
- plugin/main.ts
- contracts.ts
- Overview.tsx
- handleMessage
- post
- messages.ts
- runScan
- audit-state.ts
- presentation.ts
- ChangePlan
- DesignKnowledgeGraph
- stable.ts
- variableEnvironmentReader
- graph.ts
- session-state.ts
- rules.ts
- analyzeCurrentGraph
- liveFragmentRoot
- ensureKnowledge
- Findings.tsx
- layout.tsx
- proxy.ts
- next.config.ts
- .buildKnowledge
- context-cache.ts
- text-style.ts
- core/waivers.ts
- VariableCollectionOption

## God Nodes (most connected - your core abstractions)
1. `hashValue()` - 70 edges
2. `handleMessage()` - 55 edges
3. `ReadinessProfile` - 32 edges
4. `Finding` - 29 edges
5. `DesignKnowledgeGraph` - 26 edges
6. `FigmaAdapter` - 25 edges
7. `assertContract()` - 24 edges
8. `snapshotBase()` - 24 edges
9. `buildReadinessReport()` - 22 edges
10. `analyzeCurrentGraph()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `reviseCandidate()`  [EXTRACTED]
  apps/companion/app/api/candidates/revise/route.ts → src/companion/repository.ts
- `POST()` --calls--> `readKnowledgeState()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `recordDecision()`  [EXTRACTED]
  apps/companion/app/api/decisions/route.ts → src/companion/repository.ts
- `POST()` --calls--> `importLearning()`  [EXTRACTED]
  apps/companion/app/api/learnings/import/route.ts → src/companion/repository.ts

## Import Cycles
- None detected.

## Communities (44 total, 3 thin omitted)

### Community 0 - "hashValue"
Cohesion: 0.05
Nodes (114): createReferencePack(), fetchFigmaSource(), figmaFetchJson(), FigmaSourceResult, ReferencePackInput, responseTextWithinLimit(), args(), availablePort() (+106 more)

### Community 1 - "adapter.ts"
Cohesion: 0.14
Nodes (34): BINDABLE_FIELDS, boundFields(), boundVariableIds(), canonicalBindableField(), CapturedInstanceEvidence, captureEntries(), CaptureEntry, CaptureFragmentEntries (+26 more)

### Community 2 - "runtime.ts"
Cohesion: 0.06
Nodes (59): POST(), runtime, POST(), runtime, GET(), runtime, safeFilename(), POST() (+51 more)

### Community 3 - "mutations.ts"
Cohesion: 0.06
Nodes (68): AI_SOURCE_FRAME_ANNOTATION, AXIS_MULTIPLIERS, CERTIFICATION_ANNOTATION_PREFIX, CERTIFICATION_DATA_KEY, DETACHMENT_INTENT_DATA_KEY, LEGACY_CERTIFICATION_ANNOTATION_PREFIX, PRODUCT_NAME, PROFILE_DATA_KEY (+60 more)

### Community 4 - "report.ts"
Cohesion: 0.16
Nodes (26): AXES, affectsScore(), applyFindingPolicy(), blocksReadiness(), CATEGORIES, classifyFinding(), collapseDisabledPolicyFindings(), CONFIGURABLE_RULES (+18 more)

### Community 5 - "audit-storage.ts"
Cohesion: 0.11
Nodes (32): CapturedAuditTarget, canonicalAuditTargetKey(), SavedAuditV1, AuditCodecMeasurement, AuditMetadata, auditPacket(), AuditSaveGuard, AuditStorage (+24 more)

### Community 6 - "accessibility.ts"
Cohesion: 0.09
Nodes (41): SOURCES, channel(), composite(), contrastRatio(), isLargeText(), relativeLuminance(), Rgba, FALSE_VALUES (+33 more)

### Community 7 - "App.tsx"
Cohesion: 0.15
Nodes (23): producerLabel(), profileDomainErrors(), App(), download(), EMPTY_SELECTION_SUMMARY, postMessage(), ProfileEditor(), root (+15 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, next, react, react-dom, server-only, devDependencies, postcss, tailwindcss (+25 more)

### Community 9 - "compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+22 more)

### Community 10 - "node-fields.ts"
Cohesion: 0.15
Nodes (29): ResponsiveFamily, bindingSignature(), deriveResponsiveFamilies(), normalizedResponsiveRootName(), parseResponsiveName(), ResponsiveName, assessIgnoringInstanceOwnership(), assessTokenProperty() (+21 more)

### Community 11 - "plugin/main.ts"
Cohesion: 0.09
Nodes (22): FullKnowledgeRebuildRequired, BatchAuditSummary, runPageBatch(), historicalAuditContent(), HistoricalAuditExportV1, HistoricalAuditSource, adapter, appliedChanges (+14 more)

### Community 12 - "contracts.ts"
Cohesion: 0.10
Nodes (28): PRODUCER_IDENTITY, RULESET_VERSION, AxisScore, BindableField, BuildChannel, CONFIGURABLE_POLICY_IDS, ConfigurablePolicyId, EffectSnapshot (+20 more)

### Community 13 - "Overview.tsx"
Cohesion: 0.14
Nodes (22): AXIS_LABELS, CERTIFICATION_PAUSED, CERTIFICATION_PAUSED_MESSAGE, ReadinessReport, PageOption, AuditRecheckRequest, actionable(), captureRecheckFindings() (+14 more)

### Community 14 - "handleMessage"
Cohesion: 0.21
Nodes (12): validateSessionPackUse(), captureCertificationMetadata(), copyAnnotations(), recordWrittenCertificationMetadata(), restoreCertificationMetadata(), assertDocumentMutationAllowed(), assertInitialized(), documentMutationIds() (+4 more)

### Community 15 - "post"
Cohesion: 0.33
Nodes (8): ensureDocumentChangeWatcher(), handleDocumentChange(), initialize(), markKnowledgeDirty(), post(), postSavedAudits(), restoreAudit(), restoreLastAudit()

### Community 16 - "messages.ts"
Cohesion: 0.14
Nodes (21): GradeLetter, ScanRequest, ScanScope, SelectionSummary, AuditRefreshResult, AuditTargetSummary, PluginToUiMessage, friendlyImportError() (+13 more)

### Community 17 - "runScan"
Cohesion: 0.29
Nodes (6): auditPages(), rescanActiveTarget(), runScan(), captureTargetSnapshot(), resolveAuditTarget(), runCapturedAuditAttempt()

### Community 18 - "audit-state.ts"
Cohesion: 0.28
Nodes (11): Axis, FindingCategory, Grade, AuditSaveStatus, AuditViewState, SaveAuditInput, SavedAuditSummary, SavedAudits() (+3 more)

### Community 19 - "presentation.ts"
Cohesion: 0.24
Nodes (13): KnowledgeInsight, ProjectStyleGuideStatus, KnowledgeSummary, ContextPanel(), ContextPanelProps, JsonFilePicker(), Guidance(), GuidanceProps (+5 more)

### Community 20 - "ChangePlan"
Cohesion: 0.48
Nodes (6): ChangePlan, ApplyPlanResult, Cleanup(), CleanupProps, operationPreview(), STRUCTURAL_OPERATIONS

### Community 21 - "DesignKnowledgeGraph"
Cohesion: 0.13
Nodes (22): canonical, canonicalPatternName(), CATALOG_DIGEST, CATALOG_VERSION, CatalogAlias, CatalogData, CatalogPattern, contextualAliases (+14 more)

### Community 22 - "stable.ts"
Cohesion: 0.07
Nodes (39): DEFAULT_PROFILE, ChangeOperation, MultiFileReviewReportV1, BINDABLE_FIELDS, isBindableField(), operationForFinding(), operationKey(), operationOrder() (+31 more)

### Community 23 - "variableEnvironmentReader"
Cohesion: 0.50
Nodes (4): collectionMaterial(), variableAliases(), variableEnvironmentReader(), variableMaterial()

### Community 24 - "graph.ts"
Cohesion: 0.33
Nodes (8): PageSnapshot, AUDIT_TARGET_NODE_TYPES, AuditTargetNodeType, isAuditTargetNodeType(), nestedComponentSources(), resolveTargetRoots(), targetRootIds(), TargetRootResolution

### Community 25 - "session-state.ts"
Cohesion: 0.18
Nodes (6): CommandGate, DocumentChangeSignal, isLocalMetadataOnly(), KnowledgeBuildToken, MutationChangeGuard, requiresTransientMutationGuard()

### Community 26 - "rules.ts"
Cohesion: 0.14
Nodes (25): Finding, FindingStatus, NodeSnapshot, Severity, collectBoundVariableIds(), hasResponsiveVariableSignal(), BuildReportInput, evaluateComponentRules() (+17 more)

### Community 27 - "analyzeCurrentGraph"
Cohesion: 0.28
Nodes (6): activeProjectStyleGuidePack(), analyzeCurrentGraph(), currentProjectStyleGuideStatus(), invalidateProfileIfNeeded(), storedProjectStyleGuideBinding(), profile()

### Community 29 - "ensureKnowledge"
Cohesion: 0.16
Nodes (9): isKnowledgeFresh(), assertCurrentReport(), assertKnowledgeRevision(), assertScanNotCancelled(), assertVerifiedKnowledge(), currentKnowledgeAvailable(), ensureKnowledge(), verifiedKnowledgeAvailable() (+1 more)

### Community 30 - "Findings.tsx"
Cohesion: 0.08
Nodes (43): FindingGroup, FindingProvenance, FrameResult, TokenCoverageDisposition, TokenCoverageField, TokenCoverageGroup, TokenCoverageReason, VariantCoverage (+35 more)

### Community 31 - "layout.tsx"
Cohesion: 0.33
Nodes (4): metadata, viewport, CumulativeLogo(), CumulativeLogoProps

### Community 39 - ".buildKnowledge"
Cohesion: 0.10
Nodes (24): ScanProgress, deriveRepeatedStructures(), finalizeKnowledgeGraph(), populateGraphMetrics(), postOrder(), sourceFrameIds(), annotateInstanceDescendants(), bindingSignature() (+16 more)

### Community 42 - "context-cache.ts"
Cohesion: 0.27
Nodes (9): baseSnapshot(), ContextCachePort, contextFragment, newBuildDiagnostics(), readContextFragment(), record(), restPageFingerprint, restSubtreeCovers() (+1 more)

### Community 43 - "text-style.ts"
Cohesion: 0.27
Nodes (4): material(), mixedTypographyFields(), TextStyleEvidenceReader, TextStyleMaterial

### Community 46 - "core/waivers.ts"
Cohesion: 0.38
Nodes (6): applyWaivers(), parseWaiver(), sanitizeWaiverStore(), validDate(), Waiver, WaiverStore

### Community 50 - "VariableCollectionOption"
Cohesion: 0.36
Nodes (6): KnowledgeBuildResult, KnowledgeBuildDiagnostics, listVariableCollectionOptions(), loadRemoteCollections(), settleWithin(), VariableCollectionOption

## Knowledge Gaps
- **160 isolated node(s):** `runtime`, `runtime`, `runtime`, `runtime`, `runtime` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hashValue()` connect `hashValue` to `adapter.ts`, `report.ts`, `audit-storage.ts`, `.buildKnowledge`, `App.tsx`, `node-fields.ts`, `context-cache.ts`, `text-style.ts`, `plugin/main.ts`, `handleMessage`, `audit-state.ts`, `stable.ts`, `variableEnvironmentReader`, `graph.ts`, `ensureKnowledge`, `Findings.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `version` connect `devDependencies` to `plugin/main.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `runtime`, `runtime`, `runtime` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hashValue` be split into smaller, more focused modules?**
  _Cohesion score 0.050137741046831955 - nodes in this community are weakly interconnected._
- **Should `adapter.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14414414414414414 - nodes in this community are weakly interconnected._
- **Should `runtime.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06044303797468355 - nodes in this community are weakly interconnected._
- **Should `mutations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06140350877192982 - nodes in this community are weakly interconnected._
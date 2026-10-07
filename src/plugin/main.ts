import { actionableFinding, stableIssueKey } from "../core/issue-key";
import { mergeIssueReview, resolvedIssueKeys, type IssueReviewState } from "./issue-review";
import { CATALOG_DIGEST, CATALOG_VERSION } from "../core/catalog";
import { PRODUCT_NAME } from "../core/constants";
import { RULESET_VERSION } from "../core/constants";
import { PRODUCER_IDENTITY } from "../core/build-info";
import type {
  ChangePlan,
  DesignKnowledgeGraph,
  DesignReferencePackV1,
  ReadinessProfile,
  ReadinessReport,
  ReviewLearningEnvelopeV1,
  ScanScope,
} from "../core/contracts";
import { hasCompleteKnowledge } from "../core/knowledge";
import {
  buildKnowledgeInsights,
  buildLearningEnvelope,
  assertTeamKnowledgePack,
  parseReferencePack,
  targetFileFingerprint,
  validateSessionPackUse,
} from "../core/knowledge-loop";
import type { TeamKnowledgePackV1 } from "../core/contracts";
import teamKnowledgePackJson from "../generated/team-knowledge.pack.json";
import { reportToMarkdown } from "../core/markdown";
import { tokenCoverageGroupPage } from "../core/operations/node-fields";
import { buildChangePlans } from "../core/planner";
import { buildReadinessReport } from "../core/report";
import { evaluateRules } from "../core/rules";
import { hashValue, stableStringify } from "../core/stable";
import { applyWaivers, reanchorWaivers, sanitizeWaiverStore, type WaiverStore } from "../core/waivers";
import { FigmaAdapter, FullKnowledgeRebuildRequired, type BootstrapData, type CapturedAuditTarget, type ProjectStyleGuideStatus, type VariableCollectionOption } from "../figma/adapter";
import { applyChangePlan, createSemanticTokenAndBind } from "../figma/mutations";
import { buildKnowledgeSummary } from "./knowledge-summary";
import { parseUiMessage } from "./message-validation";
import type { AuditRecheckRequest, AuditRefreshResult, AuditResultData, ContextStatus, PluginToUiMessage, UiToPluginMessage } from "./messages";
import { captureRecheckFindings, recheckCounts, selectedMicroFields } from "./recheck";
import { version as PLUGIN_VERSION } from "../../package.json";
import { resolveAuditTarget, runCapturedAuditAttempt, scanFailureMessages } from "./scan-lifecycle";
import { ScanCancelledError } from "./scan-errors";
import { CommandGate, KnowledgeSessionState, MutationChangeGuard, requiresTransientMutationGuard } from "./session-state";
import { AuditStorage } from "./audit-storage";
import type { AuditSaveStatus, AuditViewState, SavedAuditV1 } from "./audit-state";
import { canonicalAuditTargetKey } from "./audit-state";
import { runPageBatch } from "./batch-audit";
import { historicalAuditContent, type HistoricalAuditSource } from "./historical-export";

figma.skipInvisibleInstanceChildren = true;

const adapter = new FigmaAdapter();
const codecMetrics = { compressMs: 0, decompressMs: 0, compressedBytes: 0, rawBytes: 0 };
const auditStorage = new AuditStorage(figma.clientStorage, {
  onCodec: (measurement) => {
    if (measurement.operation === "compress") codecMetrics.compressMs += measurement.durationMs;
    else codecMetrics.decompressMs += measurement.durationMs;
    codecMetrics.compressedBytes += measurement.compressedBytes;
    codecMetrics.rawBytes += measurement.rawBytes;
  },
});
let bootstrap: BootstrapData;
let profile: ReadinessProfile;
let graph: DesignKnowledgeGraph | undefined;
let report: ReadinessReport | undefined;
let plans: ChangePlan[] = [];
let collections: VariableCollectionOption[] = [];
let appliedChanges: ChangePlan[] = [];
let graphProfileHash: string | undefined;
let activeScope: ScanScope = "selection";
let activeTarget: CapturedAuditTarget | undefined;
let initialized = false;
let initializeGeneration = 0;
const knowledgeState = new KnowledgeSessionState();
const commandGate = new CommandGate();
const mutationChangeGuard = new MutationChangeGuard();
let documentChangeWatching = false;
let sessionReferencePacks: DesignReferencePackV1[] = [];
let sessionStyleGuidePack: DesignReferencePackV1 | undefined;
let pendingContribution: ReviewLearningEnvelopeV1 | undefined;
let historicalAudit: SavedAuditV1 | undefined;
let exportSnapshot: HistoricalAuditSource | undefined;
let issueReviewState: IssueReviewState | undefined;
let activeSavedAuditId: string | undefined;
let activeViewState: AuditViewState | undefined;
let displayRevision = 0;
let mutationRecheckPending = false;
let lastRefresh: Pick<AuditRefreshResult, "mode" | "reason"> = { mode: "full", reason: "not-loaded" };

const TEAM_KNOWLEDGE_PACK = teamKnowledgePackJson as TeamKnowledgePackV1;
assertTeamKnowledgePack(TEAM_KNOWLEDGE_PACK);
const KNOWLEDGE_VERSION = TEAM_KNOWLEDGE_PACK.knowledgeVersion;

function post(message: PluginToUiMessage): void {
  figma.ui.postMessage(message);
}

function assertScanNotCancelled(): void {
  if (adapter.isScanCancelled()) throw new ScanCancelledError();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function postSavedAudits(): Promise<void> {
  if (!figma.fileKey) {
    post({ type: "saved-audits", audits: [] });
    return;
  }
  try {
    const audits = await auditStorage.listAudits(figma.fileKey);
    post({ type: "saved-audits", audits, ...(activeSavedAuditId ? { activeId: activeSavedAuditId } : {}) });
  } catch {
    post({ type: "audit-save-status", status: { state: "not-saved", message: "Saved audits could not be read. You can still run and export an audit." } });
  }
}

function restoreAudit(audit: SavedAuditV1): void {
  historicalAudit = audit;
  exportSnapshot = audit;
  report = audit.report;
  plans = audit.plans;
  activeScope = audit.target.scope;
  activeTarget = audit.target;
  activeSavedAuditId = audit.id;
  activeViewState = audit.viewState;
  issueReviewState = audit.issueReviewState;
  appliedChanges = [];
  pendingContribution = undefined;
  post({ type: "restored-audit", audit });
}

async function restoreLastAudit(generation: number, revision: number): Promise<void> {
  const started = Date.now();
  console.info("[Design Passport] restore started", { producer: PRODUCER_IDENTITY });
  const fileKey = figma.fileKey;
  if (!fileKey) {
    post({ type: "audit-save-status", status: { state: "session-only", message: "This file has no stable file key. Results are available for this session only." } });
    return;
  }
  const audits = await auditStorage.listAudits(fileKey);
  if (generation !== initializeGeneration || revision !== displayRevision) return;
  post({ type: "saved-audits", audits });
  const latest = [...audits].sort((left, right) => right.lastViewedAt.localeCompare(left.lastViewedAt) || right.generatedAt.localeCompare(left.generatedAt))[0];
  if (!latest) return;
  const candidates = [latest, ...audits.filter((audit) => audit.id !== latest.id).sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))];
  for (const candidate of candidates) {
    const audit = await auditStorage.loadAudit(fileKey, candidate.id);
    if (generation !== initializeGeneration || revision !== displayRevision) return;
    if (!audit) continue;
    restoreAudit(audit);
    console.info("[Design Passport] restore finished", { producer: PRODUCER_IDENTITY, durationMs: Date.now() - started });
    return;
  }
}

function currentKnowledgeAvailable(): boolean {
  return Boolean(graph && !knowledgeState.dirty && adapter.matchesDocumentTopology(graph)
    && hasCompleteKnowledge(graph) && knowledgeState.validationFresh() && graphProfileHash === hashValue(profile));
}

async function verifiedKnowledgeAvailable(): Promise<boolean> {
  if (!currentKnowledgeAvailable()) return false;
  if (!await adapter.matchesVariableEnvironment()) {
    markKnowledgeDirty();
    return false;
  }
  // The bridge calls above can overlap a document change or expiry.
  return currentKnowledgeAvailable();
}

async function assertVerifiedKnowledge(): Promise<void> {
  const verified = await verifiedKnowledgeAvailable();
  assertScanNotCancelled();
  if (!verified) throw new Error("The supporting file context changed or expired. Refresh the audit to continue.");
}

function assertKnowledgeRevision(): void {
  assertScanNotCancelled();
  if (!currentKnowledgeAvailable()) throw new Error("The supporting file context changed or expired. Refresh the audit to continue.");
}

function storedProjectStyleGuideBinding() {
  if (adapter.getProjectStyleGuideStatus().state !== "active") return undefined;
  try {
    return adapter.getProjectStyleGuideBinding();
  } catch {
    // A duplicated file can retain private root data whose target fingerprint no
    // longer matches. Treat that binding as unavailable so the deterministic
    // Passport audit still runs; the Context UI exposes the invalid status.
    return undefined;
  }
}

function activeProjectStyleGuidePack(): DesignReferencePackV1 | undefined {
  return storedProjectStyleGuideBinding()?.pack ?? sessionStyleGuidePack;
}

function currentProjectStyleGuideStatus(): ProjectStyleGuideStatus {
  const storedStatus = adapter.getProjectStyleGuideStatus();
  if (storedStatus.state !== "none" || !sessionStyleGuidePack) return storedStatus;
  return {
    state: "active",
    persistent: false,
    packVersion: sessionStyleGuidePack.packVersion,
    digest: sessionStyleGuidePack.digest,
    projectScope: sessionStyleGuidePack.source.projectScope,
    sourceId: sessionStyleGuidePack.source.sourceId,
  };
}

async function waiverKey(): Promise<string> {
  return `waivers:${figma.fileKey ?? figma.root.id}`;
}

async function loadWaivers(): Promise<WaiverStore> {
  const saved = sanitizeWaiverStore(await figma.clientStorage.getAsync(await waiverKey()));
  return report && !historicalAudit ? reanchorWaivers(saved, report.findings) : saved;
}

async function saveWaivers(waivers: WaiverStore): Promise<void> {
  await figma.clientStorage.setAsync(await waiverKey(), waivers);
}

async function runDocumentMutation<T>(expectedNodeIds: readonly string[], mutation: () => Promise<T>, includesTransientNodes = false, operations?: ChangePlan["operations"]): Promise<T> {
  assertDocumentMutationAllowed();
  try {
    const result = await mutation();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return result;
  } finally {
    mutationRecheckPending = true;
    if (operations && !includesTransientNodes) {
      const fields = (operation: ChangePlan["operations"][number]): string[] => {
        switch (operation.kind) {
          case "rename-node": case "normalize-export-name": return ["name"];
          case "bind-variable": return ["boundVariables"];
          case "set-annotation": return ["annotations"];
          case "confirm-pattern": case "acknowledge-detachment": case "clear-detachment-acknowledgement": return ["pluginData"];
          default: return ["unknown"];
        }
      };
      knowledgeState.recordChanges(operations.map((operation) => ({ id: operation.nodeId, origin: "LOCAL" as const, properties: fields(operation) })),
        operations.some((operation) => fields(operation).includes("unknown")) ? "unsupported-mutation" : undefined);
    } else knowledgeState.markDirty(expectedNodeIds, includesTransientNodes ? "structural-mutation" : "resource-mutation");
    post({ type: "knowledge-stale" });
  }
}

function assertInitialized(): void {
  if (!initialized) throw new Error("Initialize the plugin before sending commands");
}

function assertDocumentMutationAllowed(): void {
  if (figma.editorType !== "figma") {
    throw new Error("Document cleanup is available in Figma Design mode; Dev Mode supports audit, navigation, guidance, and report export");
  }
}

function invalidateProfileIfNeeded(): boolean {
  const state = adapter.reconcileProfile(profile, bootstrap.profileConfigured);
  if (state.profileConfigured) return false;
  profile = state.profile;
  bootstrap = { ...bootstrap, ...state };
  graph = undefined;
  appliedChanges = [];
  graphProfileHash = undefined;
  pendingContribution = undefined;
  // Setup changes invalidate verification, while the completed snapshot keeps
  // its original provenance and remains available for historical export.
  knowledgeState.markDirty();
  post({ type: "profile-invalidated", data: bootstrap });
  return true;
}

function markKnowledgeDirty(nodeIds?: readonly string[], fullBuildReason?: string): void {
  knowledgeState.markDirty(nodeIds, fullBuildReason);
  post({ type: "knowledge-stale" });
}

function handleDocumentChange(event: DocumentChangeEvent): void {
  const changes = event.documentChanges.map((change) => ({
    id: change.id,
    origin: change.origin,
    type: change.type,
    ...(change.type === "PROPERTY_CHANGE" ? { properties: change.properties } : {}),
  }));
  if (!mutationChangeGuard.hasUnexpectedChange(changes)) return;
  const supportedProperties = new Set([
    "name", "visible", "opacity", "fills", "strokes", "strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight",
    "cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "clipsContent", "isMask", "effects",
    "characters", "fontSize", "fontName", "fontWeight", "textStyleId", "letterSpacing", "lineHeight", "textCase", "textDecoration", "textAutoResize",
    "width", "height", "x", "y", "rotation", "relativeTransform", "size", "layoutMode", "itemSpacing", "counterAxisSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "layoutSizingHorizontal", "layoutSizingVertical", "primaryAxisSizingMode", "counterAxisSizingMode", "layoutAlign", "layoutGrow",
    "boundVariables", "explicitVariableModes", "resolvedVariableModes", "componentProperties", "variantProperties", "reactions", "annotations", "description", "exportSettings", "pluginData",
  ]);
  const unknown = changes.some((change) => change.type !== "PROPERTY_CHANGE" || !change.properties?.length
    || change.properties.some((property) => !supportedProperties.has(property)
      // Binding and applied-style edits are staged by micro-checks. Mode
      // changes still require whole-context capture.
      || ["explicitVariableModes", "resolvedVariableModes"].includes(property))
    || !graph?.nodes[change.id]);
  knowledgeState.recordChanges(changes, unknown ? "structural-or-unknown-change" : undefined);
  post({ type: "knowledge-stale" });
}

async function ensureDocumentChangeWatcher(): Promise<void> {
  if (documentChangeWatching) return;
  post({
    type: "progress",
    progress: {
      phase: "loading-pages",
      completed: 0,
      total: figma.root.children.length,
      message: "Preparing whole-file change tracking",
    },
  });
  await figma.loadAllPagesAsync();
  if (!documentChangeWatching) {
    figma.on("documentchange", handleDocumentChange);
    documentChangeWatching = true;
  }
  assertScanNotCancelled();
}

async function assertCurrentReport(action: string): Promise<{ graph: DesignKnowledgeGraph; report: ReadinessReport }> {
  if (historicalAudit) throw new Error(`This is a saved historical audit. Refresh it before ${action}`);
  if (!graph || !report) throw new Error(`Run an audit before ${action}`);
  if (!await verifiedKnowledgeAvailable()
    || report.target.knowledgeSnapshotHash !== graph.snapshotHash) {
    throw new Error(`Whole-file knowledge is stale; rescan before ${action}`);
  }
  return { graph, report };
}

async function postContextStatus(outcome?: ContextStatus["outcome"], reason?: string): Promise<void> {
  const state: ContextStatus["state"] = graph ? currentKnowledgeAvailable() ? "current" : "outdated"
    : figma.fileKey && await auditStorage.hasContext(figma.fileKey).catch(() => false) ? "cached" : "missing";
  post({ type: "context-status", status: { state,
    ...(reason ? { reason } : state === "cached" ? { reason: "Cached, will validate on audit." } : state === "outdated" ? { reason: knowledgeState.dirty ? "The design changed. Check supported issues or regenerate context." : "Context validation expired." } : {}),
    ...(graph ? { knowledge: buildKnowledgeSummary(graph) } : {}),
    ...(knowledgeState.wholeContextValidatedAt === undefined ? {} : { validatedAt: new Date(knowledgeState.wholeContextValidatedAt).toISOString() }),
    ...(outcome ? { outcome } : {}) } });
}

async function generateContext(regenerate: boolean): Promise<void> {
  adapter.beginScan();
  post({ type: "context-status", status: { state: "generating" } });
  try {
    await ensureKnowledge(regenerate, regenerate);
    await postContextStatus("completed");
  } catch (error) {
    await postContextStatus(adapter.isScanCancelled() ? "cancelled" : "failed", errorMessage(error));
  }
}

async function ensureKnowledge(refresh: boolean, forceFullCapture = false, mutationRetry = false): Promise<DesignKnowledgeGraph> {
  assertScanNotCancelled();
  // An explicit audit/context boundary can validate an aged, unchanged capture.
  if (graph && !refresh && !knowledgeState.dirty && adapter.matchesDocumentTopology(graph) && graphProfileHash === hashValue(profile) && hasCompleteKnowledge(graph)) {
    const revision = knowledgeState.documentRevision;
    const unchanged = await adapter.matchesVariableEnvironment();
    assertScanNotCancelled();
    if (unchanged && revision === knowledgeState.documentRevision && !knowledgeState.dirty) knowledgeState.validateWholeContext(revision);
  }
  let rebuildReason = !graph ? "not-loaded" : refresh ? "requested-refresh" : knowledgeState.dirty ? "document-changed"
    : !adapter.matchesDocumentTopology(graph) ? "page-topology-changed" : graphProfileHash !== hashValue(profile) ? "profile-changed"
      : !knowledgeState.validationFresh() ? "expired" : undefined;
  if (graph && !rebuildReason && !await verifiedKnowledgeAvailable()) rebuildReason = "variable-environment-changed";
  if (!graph || rebuildReason) {
    await ensureDocumentChangeWatcher();
    assertScanNotCancelled();
    const token = knowledgeState.beginBuild();
    const fileKey = figma.fileKey;
    let stagedFragments: Awaited<ReturnType<typeof auditStorage.stageContexts>> | undefined;
    try {
      const changeJournal = knowledgeState.changes;
      const journalRequiresFull = Boolean(changeJournal.fullBuildReason && changeJournal.fullBuildReason !== "not-loaded");
      let forceFull = forceFullCapture || journalRequiresFull || Boolean(graph && (rebuildReason === "profile-changed"
        || rebuildReason === "page-topology-changed" || rebuildReason === "variable-environment-changed"));
      let previousGraph = !forceFull && changeJournal.nodeIds.length > 0 ? graph : undefined;
      // Full builds must not retain the previous large graph. The saved report
      // remains available as historical output if replacement fails.
      graph = undefined;
      const cachePort = fileKey ? {
          get: (key: string) => auditStorage.loadContext(fileKey, key),
          set: async (key: string, value: () => unknown) => {
            stagedFragments ??= await auditStorage.stageContexts(fileKey);
            stagedFragments.set(key, value);
          },
        } : undefined;
      let result;
      try {
        result = await adapter.buildKnowledge(profile, (progress) => post({ type: "progress", progress }), {
          forceFullCapture: forceFull,
          dirtyNodeIds: changeJournal.nodeIds,
          ...(previousGraph ? { previousGraph, previousCollections: collections } : {}),
          ...(cachePort ? { contextCache: cachePort } : {}),
        });
      } catch (error) {
        if (adapter.isScanCancelled()) throw new ScanCancelledError();
        if (!(error instanceof FullKnowledgeRebuildRequired)) throw error;
        stagedFragments?.discard();
        graph = undefined;
        previousGraph = undefined;
        forceFull = true;
        result = await adapter.buildKnowledge(profile, (progress) => post({ type: "progress", progress }), {
          forceFullCapture: true,
          dirtyNodeIds: changeJournal.nodeIds,
          ...(cachePort ? { contextCache: cachePort } : {}),
        });
      }
      assertScanNotCancelled();
      const resourcesMatch = await adapter.matchesVariableEnvironment();
      assertScanNotCancelled();
      const accepted = knowledgeState.completeBuild(token, result.graph.complete && resourcesMatch);
      if (!accepted) {
        if (result.graph.cancelled) throw new ScanCancelledError();
        // A plugin mutation can deliver its queued event while capture is in
        // flight. Capture once more from the new revision; never ignore the
        // event or retry indefinitely while a designer keeps editing.
        if (mutationRecheckPending && !mutationRetry && !adapter.isScanCancelled()) return ensureKnowledge(true, true, true);
        throw new Error("The design changed while whole-file knowledge was being built; run the audit again");
      }
      graph = result.graph;
      collections = result.collections;
      graphProfileHash = hashValue(profile);
      const refreshMode = !forceFull && (previousGraph || result.diagnostics.reusedFragments > 0) ? "incremental" : "full";
      const recordedBuildReason = changeJournal.fullBuildReason === "not-loaded" ? undefined : changeJournal.fullBuildReason;
      const detectedBuildReason = rebuildReason === "not-loaded" ? undefined : rebuildReason;
      lastRefresh = {
        mode: refreshMode,
        reason: forceFullCapture
          ? "requested-full-rescan"
          : recordedBuildReason ?? detectedBuildReason ?? (refreshMode === "incremental" ? "validated-fragments" : "initial-full-build"),
      };
      // Exact annotation signatures remain safe after a build: a delayed event
      // with different live output still invalidates, regardless of its node ID.
      mutationRecheckPending = false;
      const contextStorageStarted = Date.now();
      if (fileKey && !adapter.isScanCancelled() && !knowledgeState.dirty) {
        await stagedFragments?.flush();
      }
      assertScanNotCancelled();
      if (!await adapter.matchesVariableEnvironment()) throw new Error("Resources changed while context was being accepted. Generate context again.");
      assertScanNotCancelled();
      knowledgeState.validateWholeContext(token.revision);
      console.info("[Design Passport] context build", {
        producer: PRODUCER_IDENTITY, reason: rebuildReason, ...result.diagnostics,
        contextStorageMs: Date.now() - contextStorageStarted, codec: { ...codecMetrics },
      });
    } catch (error) {
      if (knowledgeState.buildActive) knowledgeState.abandonBuild(token);
      throw error;
    } finally { stagedFragments?.discard(); }
  } else {
    lastRefresh = { mode: "session", reason: "verified-current-session" };
    console.info("[Design Passport] context reuse", { producer: PRODUCER_IDENTITY, source: "current-session" });
  }
  assertScanNotCancelled();
  await postContextStatus();
  return graph;
}

async function analyzeCurrentGraph(scope: ScanScope, targetIds: readonly string[], cancellable = false, capturedTarget = activeTarget, recheck?: ReturnType<typeof captureRecheckFindings>, micro?: {
  graph: DesignKnowledgeGraph; assertRevision(): void; assertCurrent(): Promise<void>; commit(): void;
  verification: NonNullable<ReadinessReport["verification"]>; checkedKeys: string[];
  request: Extract<AuditRecheckRequest, { mode: "issue" | "component" }>; selectedKeys: string[];
}): Promise<AuditSaveStatus> {
  const currentGraph = micro?.graph ?? graph;
  const assertRevision = () => micro ? micro.assertRevision() : assertKnowledgeRevision();
  const assertCurrent = () => micro ? micro.assertCurrent() : assertVerifiedKnowledge();
  if (!currentGraph) throw new Error("Build whole-file knowledge before analyzing targets");
  if (!capturedTarget) throw new Error("Capture an audit target before evaluating the design");
  // This preparation cannot publish or mutate the document. Full resource
  // verification follows the asynchronous waiver read and surrounds saving.
  assertRevision();
  if (cancellable) assertScanNotCancelled();
  const rootIds = [...targetIds];
  if (rootIds.length === 0) {
    if (scope === "selection") throw new Error("Select at least one frame, component, or component set to audit");
    throw new Error(`No source frames were found for the ${scope} scope and current page-role mapping`);
  }
  post({ type: "progress", progress: { phase: "analyzing", completed: 0, total: rootIds.length, message: `Evaluating ${rootIds.length} source target${rootIds.length === 1 ? "" : "s"}` } });
  const analysisStarted = Date.now();
  const rawFindings = evaluateRules(currentGraph, profile, rootIds);
  const waivers = await loadWaivers();
  if (cancellable) assertScanNotCancelled();
  await assertCurrent();
  const findings = applyWaivers(rawFindings, waivers);
  const requestedNodeIds = capturedTarget.scope === "selection" ? [...new Set(capturedTarget.nodeIds)] : [];
  const excludedNodeIds = requestedNodeIds.filter((id) => !rootIds.includes(id));
  const targetResolution: NonNullable<ReadinessReport["target"]["resolution"]> = {
    mode: excludedNodeIds.length > 0 ? "component-sources" : "exact",
    requestedNodeIds,
    excludedNodeIds,
  };
  const nextReport = buildReadinessReport({ graph: currentGraph, profile, scope, targetRootIds: rootIds, appliedChanges, findings, targetResolution, ...(micro ? { verification: micro.verification } : {}) });
  const sameReview = report?.profileHash === nextReport.profileHash && activeTarget && canonicalAuditTargetKey(activeTarget) === canonicalAuditTargetKey(capturedTarget);
  const nextReview = mergeIssueReview(sameReview ? issueReviewState : undefined, sameReview ? report : undefined, nextReport, micro?.checkedKeys ?? (sameReview && report ? [...new Set(report.findings.filter(actionableFinding).map(stableIssueKey))] : []));
  const nextPlans = buildChangePlans(findings);
  const projectPack = activeProjectStyleGuidePack();
  const insights = buildKnowledgeInsights({
    graph: currentGraph,
    targetRootIds: rootIds,
    findings,
    operations: nextPlans.flatMap((plan) => plan.operations),
    ...(projectPack ? { projectPack } : {}),
    referencePacks: sessionReferencePacks,
    teamPack: TEAM_KNOWLEDGE_PACK,
  });
  bootstrap = { ...bootstrap, projectStyleGuide: currentProjectStyleGuideStatus() };
  const knowledge = buildKnowledgeSummary(currentGraph);
  console.info("[Design Passport] report evaluation", { elapsedMs: Date.now() - analysisStarted, targets: rootIds.length, findings: findings.length });
  let saveStatus: AuditSaveStatus = { state: "session-only", message: "This file has no stable file key. Results are available for this session only." };
  let savedAuditId: string | undefined;
  let savedAt: string | undefined;
  let published = false;
  const publish = (status: AuditSaveStatus, audit?: SavedAuditV1): void => {
    savedAuditId = audit?.id;
    savedAt = audit?.savedAt;
    micro?.commit();
    issueReviewState = nextReview;
    report = nextReport;
    plans = nextPlans;
    historicalAudit = undefined;
    activeScope = capturedTarget.scope;
    activeTarget = capturedTarget;
    exportSnapshot = { report: nextReport, target: capturedTarget, provenance: { pluginVersion: PLUGIN_VERSION, knowledgeVersion: KNOWLEDGE_VERSION }, ...(savedAt ? { savedAt } : {}) };
    activeSavedAuditId = savedAuditId;
    pendingContribution = undefined;
    published = true;
    const data: AuditResultData = {
      report: nextReport, plans: nextPlans, knowledge, collections, insights, projectStyleGuide: bootstrap.projectStyleGuide,
      sessionReferenceCount: sessionReferencePacks.length, saveStatus: status, issueReviewState: nextReview, waivers,
      ...(savedAuditId ? { savedAuditId } : {}),
      ...(recheck ? { refresh: { ...lastRefresh, requested: recheck.request.mode, ...recheckCounts(recheck, nextReport) } } : {}),
    };
    if (micro) {
      const actionable = new Set(nextReport.findings.filter(actionableFinding).map(stableIssueKey));
      const resolved = micro.selectedKeys.every((key) => !actionable.has(key));
      const limiting = nextReport.frames.find((frame) => frame.grade.score === nextReport.grade.score);
      post({ type: "micro-check-result", requestId: micro.request.requestId, reportHash: micro.request.reportHash, checkedKeys: micro.checkedKeys,
        outcome: resolved ? "resolved" : "unresolved", reason: resolved ? `Verified fixes. ${nextReport.grade.capReason ?? `The hero follows the limiting module, ${limiting?.rootName ?? "this target"}. Supporting rows have no independent point award.`}` : "Verified fields. This issue still needs work or remains waived with its deduction.", data });
    } else post({ type: "scan-result", ...data });
  };
  if (figma.fileKey && capturedTarget) {
    const started = Date.now();
    const saved = await auditStorage.saveAudit({
      fileKey: figma.fileKey,
      target: capturedTarget,
      report: nextReport,
      plans: nextPlans,
      knowledge,
      insights,
      profile,
      issueReviewState: nextReview,
      provenance: { pluginVersion: PLUGIN_VERSION, knowledgeVersion: KNOWLEDGE_VERSION },
      ...(activeViewState && activeTarget && canonicalAuditTargetKey(activeTarget) === canonicalAuditTargetKey(capturedTarget)
        ? { viewState: activeViewState } : {}),
    }, {
      assertCurrent: async (phase) => { if (phase === "prepare") assertRevision(); else await assertCurrent(); },
      commit: (audit) => publish({ state: "saved" }, audit),
    });
    console.info("[Design Passport] report persistence", { elapsedMs: Date.now() - started, state: saved.status.state });
    saveStatus = saved.status;
    if (published && saveStatus.state !== "saved") {
      activeSavedAuditId = undefined;
      post({ type: "audit-save-status", status: saveStatus });
    }
  }
  if (!published) {
    // Session-only results and storage failures still require a current revision.
    await assertCurrent();
    publish(saveStatus);
  }
  await postSavedAudits();
  return saveStatus;
}

async function runScan(
  target: CapturedAuditTarget,
  refreshKnowledge: boolean,
  recheckRequest?: AuditRecheckRequest,
): Promise<void> {
  const recheck = recheckRequest ? captureRecheckFindings(recheckRequest, report, graph, Boolean(historicalAudit)) : undefined;
  await runCapturedAuditAttempt(target, {
    begin: () => adapter.beginScan(),
    post,
    execute: async (capturedTarget) => {
      assertScanNotCancelled();
      const current = await ensureKnowledge(refreshKnowledge, recheckRequest?.mode === "full");
      await adapter.assertTargetSources(capturedTarget, current);
      const rootIds = adapter.targetRootIds(capturedTarget, current);
      await analyzeCurrentGraph(capturedTarget.scope, rootIds, true, capturedTarget, recheck);
    },
    commit: (capturedTarget) => {
      activeScope = capturedTarget.scope;
      activeTarget = capturedTarget;
    },
  });
}

async function runMicroCheck(request: Extract<AuditRecheckRequest, { mode: "issue" | "component" }>): Promise<void> {
  adapter.beginScan();
  let checkedKeys: string[] = [];
  try {
    const captured = captureRecheckFindings(request, report, graph, Boolean(historicalAudit));
    checkedKeys = captured.findingIds;
    post({ type: "micro-check-started", requestId: request.requestId, reportHash: request.reportHash, checkedKeys });
    const started = Date.now();
    if (!graph || !report || !activeTarget || report.target.knowledgeSnapshotHash !== graph.snapshotHash || graphProfileHash !== hashValue(profile)
      || !adapter.matchesDocumentTopology(graph) || !hasCompleteKnowledge(graph) || !knowledgeState.validationFresh() || knowledgeState.changes.fullBuildReason) throw new Error("Supporting context changed or expired. Regenerate audit to verify.");
    const selected = selectedMicroFields(captured, report);
    if (selected.size === 0) throw new Error("This issue needs a full regeneration to verify.");
    const revision = knowledgeState.documentRevision;
    const journal = knowledgeState.changes;
    const staged = await adapter.stageMicroCheck(graph, profile, journal.properties, selected);
    const verified = new Map(staged.nodeIds.map((id) => [id, new Set(journal.properties[id] ?? [])]));
    const target = activeTarget;
    const oldReport = report;
    const roots = adapter.targetRootIds(target, staged.graph);
    if (stableStringify([...roots].sort()) !== stableStringify([...oldReport.target.rootIds].sort())) throw new Error("The captured target changed. Regenerate audit to verify.");
    await adapter.assertTargetSources(target, staged.graph);
    checkedKeys = [...new Set(oldReport.findings.filter(actionableFinding).map(stableIssueKey))];
    const assertRevision = (): void => {
      assertScanNotCancelled();
      if (report !== oldReport || historicalAudit || graphProfileHash !== hashValue(profile) || !knowledgeState.validationFresh()
        || !adapter.matchesDocumentTopology(staged.graph) || !knowledgeState.canCommitMicroCheck(revision, verified)) throw new Error("The design changed or context expired during Check again. Regenerate audit to verify.");
    };
    const assertCurrent = async (): Promise<void> => { assertRevision(); if (!await staged.verify()) throw new Error("Checked evidence changed. Regenerate audit to verify."); assertRevision(); };
    await assertCurrent();
    const remaining = 100 - (Date.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    await analyzeCurrentGraph(target.scope, roots, true, target, captured, {
      graph: staged.graph, assertRevision, assertCurrent, checkedKeys, request, selectedKeys: captured.findingIds,
      verification: { kind: "micro-check", verifiedAt: new Date().toISOString(), checkedKeys, predecessorReportHash: oldReport.snapshotHash },
      commit: () => { assertRevision(); staged.commit(); knowledgeState.commitMicroCheck(revision, verified); graph = staged.graph; mutationRecheckPending = false; },
    });
    await postContextStatus();
  } catch (error) {
    post({ type: "micro-check-result", requestId: request.requestId, reportHash: request.reportHash, checkedKeys, outcome: "requires-regeneration", reason: errorMessage(error) });
  }
}

async function verifyAppliedChanges(changes: readonly ChangePlan[]): Promise<void> {
  if (!report) return;
  const issueId = changes.flatMap((plan) => plan.findingIds).find((id) => report!.findings.some((finding) => finding.id === id));
  if (issueId) await runMicroCheck({ mode: "issue", issueId, reportHash: report.snapshotHash, requestId: `mutation:${knowledgeState.documentRevision}` });
  else if (report.target.rootIds[0]) await runMicroCheck({ mode: "component", componentId: report.target.rootIds[0], reportHash: report.snapshotHash, requestId: `mutation:${knowledgeState.documentRevision}` });
}

async function auditPages(pageIds: readonly string[]): Promise<void> {
  if (!figma.fileKey) throw new Error("Page batches need local saving to retain each result. This file supports session-only results; use Current page or Audit selection instead.");
  const pages = new Map(figma.root.children.map((page) => [page.id, page.name]));
  if (pageIds.some((id) => profile.excludedPageIds.includes(id))) throw new Error("An excluded page was requested. Include it and regenerate context first.");
  if (pageIds.some((id) => !pages.has(id))) throw new Error("A selected page no longer exists. Choose the pages again.");
  adapter.beginScan();
  post({ type: "batch-progress", completed: 0, total: pageIds.length, skipped: 0 });
  post({ type: "audit-started", target: { scope: "page" } });
  const current = await ensureKnowledge(false);
  const summary = await runPageBatch(pageIds, {
    assertFresh: assertVerifiedKnowledge,
    cancelled: () => adapter.isScanCancelled(),
    progress: (state, pageId) => post({ type: "batch-progress", completed: state.completed, total: state.total, skipped: state.skipped, pageName: pages.get(pageId) ?? "Page" }),
    yield: () => new Promise((resolve) => setTimeout(resolve, 0)),
    auditPage: async (pageId) => {
      const target: CapturedAuditTarget = { scope: "page", pageId };
      await adapter.assertTargetSources(target, current);
      const rootIds = adapter.targetRootIds(target, current);
      if (rootIds.length === 0) return false;
      const saveStatus = await analyzeCurrentGraph("page", rootIds, true, target);
      activeScope = "page";
      activeTarget = target;
      if (saveStatus.state !== "saved") throw new Error("The batch stopped because this page could not be saved. Its result is still open; export it before continuing. Previously saved pages have been kept.");
      return true;
    },
  });
  post({ type: "batch-complete", ...summary });
}

async function initialize(): Promise<void> {
  const generation = ++initializeGeneration;
  const revision = ++displayRevision;
  if (initialized) {
    graph = undefined;
    report = undefined;
    plans = [];
    appliedChanges = [];
    graphProfileHash = undefined;
    activeTarget = undefined;
    knowledgeState.markDirty();
  }
  historicalAudit = undefined;
  exportSnapshot = undefined;
  activeSavedAuditId = undefined;
  activeViewState = undefined;
  issueReviewState = undefined;
  sessionReferencePacks = [];
  sessionStyleGuidePack = undefined;
  pendingContribution = undefined;
  bootstrap = await adapter.getBootstrap();
  profile = bootstrap.profile;
  collections = bootstrap.collections;
  initialized = true;
  post({ type: "bootstrap", data: bootstrap, rulesetVersion: RULESET_VERSION, catalogVersion: CATALOG_VERSION, catalogDigest: CATALOG_DIGEST });
  void postContextStatus();
  void loadWaivers().then((waivers) => { if (generation === initializeGeneration) post({ type: "waivers-result", waivers }); }).catch(() => undefined);
  void restoreLastAudit(generation, revision).catch(() => {
    if (generation !== initializeGeneration || revision !== displayRevision) return;
    post({ type: "audit-save-status", status: { state: "not-saved", message: "Saved audits could not be restored. You can still run and export an audit." } });
  });
  void adapter.getCollectionOptions(true).then((discoveredCollections) => {
    if (generation !== initializeGeneration) return;
    collections = discoveredCollections;
    bootstrap = { ...bootstrap, collections };
    post({ type: "collections-result", collections });
  });
}

async function handleMessage(message: UiToPluginMessage): Promise<void> {
  if (message.type === "initialize") {
    await initialize();
    return;
  }
  assertInitialized();
  if (message.type === "scan" || message.type === "refresh-audit" || message.type === "recheck-audit" || message.type === "audit-pages"
    || message.type === "open-saved-audit" || message.type === "forget-saved-audit" || message.type === "clear-file-cache"
    || message.type === "save-profile" || message.type === "generate-context") displayRevision += 1;
  if (message.type === "generate-context") {
    if (invalidateProfileIfNeeded()) return;
    await generateContext(message.regenerate); return;
  }
  if (message.type === "clear-issue") {
    if (!report || report.snapshotHash !== message.reportHash || message.auditId !== activeSavedAuditId) throw new Error("This displayed result changed");
    const resolved = resolvedIssueKeys(issueReviewState, report);
    if (!issueReviewState || message.keys.some((key) => !resolved.has(key))) throw new Error("Only verified resolved issues can be cleared");
    issueReviewState = { ...issueReviewState, clearedKeys: [...new Set([...issueReviewState.clearedKeys, ...message.keys])].sort() };
    const persistence: AuditSaveStatus = figma.fileKey && activeSavedAuditId
      ? await auditStorage.updateIssueReview(figma.fileKey, activeSavedAuditId, report.snapshotHash, message.keys)
      : { state: "session-only", message: "Issue cleared for this session. This result has no saved copy." };
    post({ type: "issue-cleared", reportHash: report.snapshotHash, keys: message.keys, persistence }); return;
  }
  if (message.type === "open-saved-audit") {
    if (!figma.fileKey) throw new Error("Saved audits need a stable file key");
    const audit = await auditStorage.loadAudit(figma.fileKey, message.id);
    if (!audit) throw new Error("This saved audit is no longer available. It may have been removed to free local storage.");
    restoreAudit(audit);
    await postSavedAudits();
    return;
  }
  if (message.type === "clear-file-cache") {
    if (!figma.fileKey) return;
    await auditStorage.clearFile(figma.fileKey);
    post({ type: "mutation-result", message: "Rebuildable audit context cleared. Saved reports and view preferences were kept." });
    await postSavedAudits();
    return;
  }
  if (message.type === "forget-saved-audit") {
    if (!figma.fileKey) return;
    await auditStorage.forgetAudit(figma.fileKey, message.id);
    if (activeSavedAuditId === message.id) {
      activeSavedAuditId = undefined;
      activeViewState = undefined;
      if (historicalAudit) {
        historicalAudit = undefined;
        exportSnapshot = undefined;
        report = undefined;
        plans = [];
        activeTarget = undefined;
      }
      post({ type: "audit-save-status", status: { state: "not-saved", message: "The saved copy was removed from this device." } });
    }
    await postSavedAudits();
    return;
  }
  if (message.type === "audit-pages") {
    if (!figma.fileKey) throw new Error("Page batches require local saving; this file supports session-only results.");
    if (invalidateProfileIfNeeded()) return;
    if (!graph && !(figma.fileKey && await auditStorage.hasContext(figma.fileKey))) throw new Error("Generate context before running an audit.");
    await auditPages(message.pageIds);
    return;
  }
  if (message.type === "save-profile") {
      assertDocumentMutationAllowed();
      await adapter.saveProfile(message.profile);
      profile = message.profile;
      bootstrap = { ...bootstrap, ...adapter.reconcileProfile(profile, true) };
      graph = undefined;
      appliedChanges = [];
      graphProfileHash = undefined;
      pendingContribution = undefined;
      knowledgeState.markDirty();
      post({ type: "profile-saved", data: bootstrap });
      await postContextStatus();
    } else if (message.type === "scan") {
      if (invalidateProfileIfNeeded()) return;
      if (!graph && !(figma.fileKey && await auditStorage.hasContext(figma.fileKey))) throw new Error("Generate context before running an audit.");
      const target = resolveAuditTarget(
        { kind: "capture", scope: message.request.scope },
        activeTarget,
        (scope) => adapter.captureAuditTarget(scope),
      );
      await runScan(target, message.request.refreshKnowledge);
    } else if (message.type === "refresh-audit" || message.type === "recheck-audit") {
      if (invalidateProfileIfNeeded()) return;
      const target = resolveAuditTarget(
        { kind: "refresh" },
        activeTarget,
        (scope) => adapter.captureAuditTarget(scope),
      );
      if (message.type === "recheck-audit" && (message.request.mode === "issue" || message.request.mode === "component")) await runMicroCheck(message.request);
      else await runScan(target, true, message.type === "recheck-audit" ? message.request : { mode: "full" });
    } else if (message.type === "navigate") {
      await adapter.navigate(message.nodeId);
    } else if (message.type === "token-coverage-page") {
      const current = await assertCurrentReport("paging token coverage evidence");
      if (message.request.reportHash !== current.report.snapshotHash) throw new Error("The coverage evidence is stale; refresh the audit before paging it");
      const allowedRoots = new Set(current.report.target.rootIds);
      if (message.request.rootIds.some((rootId) => !allowedRoots.has(rootId))) throw new Error("The coverage page requests a source outside the current audit");
      post({
        type: "token-coverage-page",
        result: { ...message.request, ...tokenCoverageGroupPage(current.graph, message.request) },
      });
    } else if (message.type === "apply-plan") {
      if (invalidateProfileIfNeeded()) return;
      await assertCurrentReport("applying cleanup");
      const plan = plans.find((candidate) => candidate.id === message.planId);
      if (!plan) throw new Error("The cleanup plan is stale; rescan before applying changes");
      try {
        const result = await runDocumentMutation(
          plan.operations.map((operation) => operation.nodeId),
          () => applyChangePlan(plan, { undoOnlyAcknowledged: message.undoOnlyAcknowledged }),
          requiresTransientMutationGuard(plan.risk), plan.operations,
        );
        appliedChanges.push(plan);
        post({ type: "mutation-result", message: `Applied ${result.appliedOperationCount} operations${result.checkpointCreated ? " after a version-history checkpoint" : ""}. Checking supported fields…` });
      } catch (error) {
        post({ type: "knowledge-stale" });
        throw error;
      }
      await verifyAppliedChanges([plan]);
    } else if (message.type === "apply-all") {
      if (invalidateProfileIfNeeded()) return;
      await assertCurrentReport("applying all cleanup");
      const selectedPlans = message.planIds.map((planId) => plans.find((candidate) => candidate.id === planId));
      if (selectedPlans.some((plan) => !plan)) throw new Error("At least one cleanup plan is stale; rescan before applying all fixes");
      const approvedPlans = selectedPlans as ChangePlan[];
      if (approvedPlans.some((plan) => plan.operations.some((operation) => operation.kind === "set-certification"))) {
        throw new Error("Certification operations are retired; refresh the audit for current cleanup plans");
      }
      const structuralBatch = approvedPlans.every((plan) => plan.risk === "structural");
      if (!structuralBatch && approvedPlans.some((plan) => plan.risk === "structural")) {
        throw new Error("Structural plans cannot be mixed with safe or guarded cleanup");
      }
      let appliedOperationCount = 0;
      let failedPlanCount = 0;
      const failedPlanMessages: string[] = [];
      try {
        let sharedCheckpointCreated = false;
        if (structuralBatch) {
          try {
            await figma.saveVersionHistoryAsync(`Before ${PRODUCT_NAME} structural cleanup`, `${approvedPlans.length} isolated structural plans`);
            sharedCheckpointCreated = true;
          } catch (error) {
            if (!message.undoOnlyAcknowledged) throw new Error(`Version-history checkpoint failed. Structural work requires undo-only acknowledgement. ${String(error)}`);
          }
        }
        const batchNodeIds = approvedPlans.flatMap((plan) => plan.operations.map((operation) => operation.nodeId));
        for (const plan of approvedPlans) {
          try {
            const result = await runDocumentMutation(batchNodeIds, () => applyChangePlan(plan, {
              undoOnlyAcknowledged: message.undoOnlyAcknowledged,
              structuralCheckpointSatisfied: structuralBatch && (sharedCheckpointCreated || message.undoOnlyAcknowledged),
            }), structuralBatch, plan.operations);
            appliedChanges.push(plan);
            appliedOperationCount += result.appliedOperationCount;
          } catch (error) {
            if (!structuralBatch) throw error;
            failedPlanCount += 1;
            if (failedPlanMessages.length < 3) failedPlanMessages.push(errorMessage(error));
          }
        }
        const failureSummary = failedPlanCount > 0
          ? ` ${failedPlanCount} unsafe plan${failedPlanCount === 1 ? " was" : "s were"} rolled back${failedPlanMessages.length > 0 ? ` (${failedPlanMessages.join("; ")})` : ""}.`
          : "";
        post({ type: "mutation-result", message: structuralBatch
          ? `Applied ${appliedOperationCount} validated structural operation${appliedOperationCount === 1 ? "" : "s"} in isolated undo groups.${failureSummary} Checking supported fields…`
          : `Applied ${appliedOperationCount} safe or guarded operations in ${approvedPlans.length} undo group${approvedPlans.length === 1 ? "" : "s"}. Checking supported fields…` });
      } catch (error) {
        post({ type: "knowledge-stale" });
        throw new Error(`Fix all stopped after ${appliedOperationCount} completed operations. ${errorMessage(error)}`);
      }
      await verifyAppliedChanges(approvedPlans);
    } else if (message.type === "import-project-style-guide") {
      const binding = adapter.importProjectStyleGuide(message.raw);
      sessionStyleGuidePack = undefined;
      bootstrap = { ...bootstrap, projectStyleGuide: currentProjectStyleGuideStatus() };
      if (graph && report && !historicalAudit && currentKnowledgeAvailable()) await analyzeCurrentGraph(activeScope, report.target.rootIds);
      post({ type: "project-style-guide-result", action: "imported", binding, status: bootstrap.projectStyleGuide });
    } else if (message.type === "remove-project-style-guide") {
      adapter.removeProjectStyleGuide();
      bootstrap = { ...bootstrap, projectStyleGuide: currentProjectStyleGuideStatus() };
      if (graph && report && !historicalAudit && currentKnowledgeAvailable()) await analyzeCurrentGraph(activeScope, report.target.rootIds);
      post({ type: "project-style-guide-result", action: "removed", status: bootstrap.projectStyleGuide });
    } else if (message.type === "add-session-reference") {
      const pack = parseReferencePack(message.raw);
      const role = validateSessionPackUse(pack, Boolean(figma.fileKey));
      if (role === "style-guide") {
        sessionStyleGuidePack = pack;
      } else {
        const existing = sessionReferencePacks.findIndex((candidate) => candidate.source.sourceId === pack.source.sourceId);
        if (existing >= 0) sessionReferencePacks.splice(existing, 1, pack);
        else sessionReferencePacks.push(pack);
        sessionReferencePacks.sort((left, right) => left.source.sourceId.localeCompare(right.source.sourceId));
      }
      bootstrap = { ...bootstrap, projectStyleGuide: currentProjectStyleGuideStatus() };
      if (graph && report && !historicalAudit && currentKnowledgeAvailable()) await analyzeCurrentGraph(activeScope, report.target.rootIds);
      post({ type: "session-reference-result", count: sessionReferencePacks.length + (sessionStyleGuidePack ? 1 : 0), projectStyleGuide: bootstrap.projectStyleGuide });
    } else if (message.type === "clear-session-references") {
      sessionReferencePacks = [];
      sessionStyleGuidePack = undefined;
      bootstrap = { ...bootstrap, projectStyleGuide: currentProjectStyleGuideStatus() };
      if (graph && report && !historicalAudit && currentKnowledgeAvailable()) await analyzeCurrentGraph(activeScope, report.target.rootIds);
      post({ type: "session-reference-result", count: 0, projectStyleGuide: bootstrap.projectStyleGuide });
    } else if (message.type === "preview-contribution") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("previewing a learning contribution");
      const projectScope = activeProjectStyleGuidePack()?.source.projectScope
        ?? (figma.fileKey ? `project:${targetFileFingerprint(figma.fileKey).slice(4)}` : "project:session-unbound");
      pendingContribution = buildLearningEnvelope({
        projectScope,
        report: current.report,
        pluginVersion: PLUGIN_VERSION,
        knowledgeVersion: KNOWLEDGE_VERSION,
      });
      post({ type: "contribution-preview", envelope: pendingContribution, content: `${JSON.stringify(pendingContribution, null, 2)}\n` });
    } else if (message.type === "export-contribution") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("exporting a learning contribution");
      if (!pendingContribution || pendingContribution.digest !== message.digest) throw new Error("The contribution preview is stale; preview it again before export");
      if (current.report.rulesetVersion !== pendingContribution.producer.rulesetVersion) throw new Error("The contribution preview is stale; preview it again before export");
      const safeName = figma.root.name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "figma-file";
      post({
        type: "export-result",
        format: "json",
        filename: `${safeName}.design-passport-learning.json`,
        content: `${JSON.stringify(pendingContribution, null, 2)}\n`,
      });
    } else if (message.type === "waive" || message.type === "clear-waiver") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("managing waivers");
      if (!current.report.findings.some((finding) => finding.id === message.findingId)) throw new Error("The finding is stale; rescan before managing its waiver");
      const waivers = await loadWaivers();
      const finding = current.report.findings.find((finding) => finding.id === message.findingId)!;
      const issueKey = stableIssueKey(finding);
      if (message.type === "waive") {
        const reason = message.reason.normalize("NFKC").trim().slice(0, 500);
        if (!reason) throw new Error("A waiver requires a reason");
        waivers[issueKey] = { reason, createdAt: new Date().toISOString(), createdBy: "local designer" };
      } else {
        delete waivers[issueKey];
        delete waivers[message.findingId];
      }
      await saveWaivers(waivers);
      await analyzeCurrentGraph(activeScope, current.report.target.rootIds);
    } else if (message.type === "confirm-pattern") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("resolving a contextual alias");
      const finding = current.report.findings.find((candidate) => candidate.id === message.findingId);
      const contextual = finding?.ruleId === "naming.pattern-contextual"
        && finding.patternResolution?.candidates?.includes(message.canonicalName);
      const novelSourceName = finding?.patternResolution?.input.split("/")[0]?.trim() ?? finding?.patternResolution?.input.trim();
      const novel = finding?.ruleId === "naming.pattern-novel" && novelSourceName === message.canonicalName;
      if (!finding || (!contextual && !novel) || !finding.patternResolution) {
        throw new Error("The pattern decision is stale or invalid; rescan before confirming it");
      }
      const name = finding.patternResolution.qualifier ? `${message.canonicalName} / ${finding.patternResolution.qualifier}` : message.canonicalName;
      const sourceName = finding.patternResolution.input.split("/")[0]?.trim() ?? finding.patternResolution.input.trim();
      const operations: ChangePlan["operations"] = [{
        kind: "confirm-pattern",
        nodeId: finding.nodeId,
        value: { canonicalName: message.canonicalName, sourceName, catalogVersion: CATALOG_VERSION },
      }];
      if (name !== finding.patternResolution.input) operations.push({ kind: "rename-node", nodeId: finding.nodeId, value: { name } });
      const plan: ChangePlan = {
        id: `plan:confirmed-pattern:${finding.id}`,
        findingIds: [finding.id],
        risk: "low",
        operations,
        expectedPostconditions: operations.map((operation) => `${operation.nodeId}:${operation.kind}`),
        rollbackBoundary: "risk-group",
      };
      await runDocumentMutation(plan.operations.map((operation) => operation.nodeId), () => applyChangePlan(plan, { undoOnlyAcknowledged: false }), false, plan.operations);
      appliedChanges.push(plan);
      post({ type: "mutation-result", message: contextual ? `Renamed the contextual alias to ${name}. Checking supported fields…` : `Accepted ${name} as an intentional project term. Checking supported fields…` });
      await verifyAppliedChanges([plan]);
    } else if (message.type === "acknowledge-detachment" || message.type === "clear-detachment-acknowledgement") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("reviewing a detached design");
      const finding = current.report.findings.find((candidate) => candidate.id === message.findingId);
      if (!finding || finding.ruleId !== "component.detached-design") throw new Error("The detached-design review is stale; rescan before updating it");
      const operation: ChangePlan["operations"][number] = message.type === "acknowledge-detachment"
        ? { kind: "acknowledge-detachment", nodeId: finding.nodeId, value: { nodeId: finding.nodeId, acknowledgedAt: new Date().toISOString() } }
        : { kind: "clear-detachment-acknowledgement", nodeId: finding.nodeId };
      const plan: ChangePlan = {
        id: `plan:${operation.kind}:${finding.id}`,
        findingIds: [finding.id],
        risk: "low",
        operations: [operation],
        expectedPostconditions: [`${operation.nodeId}:${operation.kind}`],
        rollbackBoundary: "risk-group",
      };
      await runDocumentMutation([finding.nodeId], () => applyChangePlan(plan, { undoOnlyAcknowledged: false }), false, plan.operations);
      appliedChanges.push(plan);
      post({ type: "mutation-result", message: message.type === "acknowledge-detachment" ? "Marked the detached layer as an intentional standalone design. Checking supported fields…" : "Cleared the standalone-design acknowledgement. Checking supported fields…" });
      await verifyAppliedChanges([plan]);
    } else if (message.type === "create-token") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("creating a token");
      const sourceFinding = current.report.findings.find((candidate) => {
        const suggested = candidate.suggestedValue as { field?: unknown; nodeIds?: unknown; rawValue?: unknown } | undefined;
        return candidate.ruleId === "token.application.repeated-literal"
          && suggested?.field === message.field
          && Array.isArray(suggested.nodeIds)
          && stableStringify(suggested.nodeIds) === stableStringify(message.nodeIds)
          && stableStringify(suggested.rawValue) === stableStringify(message.rawValue);
      });
      if (!sourceFinding) throw new Error("The repeated-value proposal is stale; rescan before creating a token");
      const collection = collections.find((candidate) => candidate.id === message.collectionId && !candidate.remote);
      if (!collection || !profile.tokenSourceCollectionKeys.includes(collection.key)) throw new Error("Choose an approved local token collection from the current profile");
      const result = await runDocumentMutation(message.nodeIds, () => createSemanticTokenAndBind({
          collectionId: message.collectionId,
          name: message.name,
          field: message.field,
          nodeIds: message.nodeIds,
          rawValue: message.rawValue,
        }));
      post({ type: "mutation-result", message: `Created one semantic token and bound ${result.boundCount} repeated uses. Checking supported fields…` });
      post({ type: "knowledge-stale" });
      post({ type: "mutation-result", message: "Token created. Regenerate audit to verify the changed variable inventory." });
    } else if (message.type === "export") {
      if (!report || !exportSnapshot) throw new Error("Run or open an audit before exporting a report");
      if (historicalAudit || !await verifiedKnowledgeAvailable() || report.profileHash !== hashValue(profile)
        || report.target.knowledgeSnapshotHash !== graph?.snapshotHash) {
        const extension = message.format === "json" ? "json" : "md";
        const safeName = figma.root.name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "figma-file";
        post({ type: "export-result", format: message.format, filename: `${safeName}.historical-audit.${extension}`, content: historicalAuditContent(exportSnapshot, message.format) });
        return;
      }
      const content = message.format === "json" ? `${JSON.stringify(report, null, 2)}\n` : reportToMarkdown(report);
      const extension = message.format === "json" ? "json" : "md";
      const safeName = figma.root.name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "figma-file";
      post({ type: "export-result", format: message.format, filename: `${safeName}.ai-readiness.${extension}`, content });
  }
}

figma.showUI(__html__, { width: 500, height: 720, themeColors: true, title: PRODUCT_NAME });

figma.ui.onmessage = async (rawMessage: unknown) => {
  let release: (() => void) | undefined;
  let nonTerminal = false;
  try {
    const message = parseUiMessage(rawMessage);
    if (message.type === "cancel-scan") {
      adapter.cancel();
      return;
    }
    if (message.type === "save-audit-view") {
      if (initialized && figma.fileKey && activeSavedAuditId === message.id) {
        activeViewState = message.viewState;
        await auditStorage.updateView(figma.fileKey, message.id, message.viewState).catch(() => {
          post({ type: "audit-save-status", status: { state: "saved", message: "The audit is saved, but its view position could not be updated." } });
        });
      }
      return;
    }
    // Captured targets are immutable; browsing a historical result must remain
    // possible while a new audit verifies the file in the background.
    if (message.type === "navigate" || message.type === "token-coverage-page" || message.type === "export" && report) {
      nonTerminal = commandGate.active;
      await handleMessage(message);
      return;
    }
    release = commandGate.enter(message.type);
    await handleMessage(message);
  } catch (error) {
    if (nonTerminal) {
      post({ type: "error", message: errorMessage(error), nonTerminal: true });
      return;
    }
    const graphFailureState = graph
      ? { cancelled: graph.cancelled, complete: graph.complete, snapshotHash: graph.snapshotHash }
      : undefined;
    for (const failureMessage of scanFailureMessages(error, {
      knowledgeDirty: knowledgeState.dirty,
      graph: graphFailureState,
      reportKnowledgeSnapshotHash: report?.target.knowledgeSnapshotHash,
    })) {
      post(failureMessage);
    }
  } finally {
    release?.();
  }
};

figma.on("selectionchange", () => {
  if (graph && !adapter.matchesDocumentTopology(graph)) markKnowledgeDirty();
  post({ type: "selection", summary: adapter.getSelectionSummary() });
});

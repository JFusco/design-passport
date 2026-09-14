import { CATALOG_DIGEST, CATALOG_VERSION } from "../core/catalog";
import { PRODUCT_NAME } from "../core/constants";
import { RULESET_VERSION } from "../core/constants";
import type {
  ChangePlan,
  DesignKnowledgeGraph,
  DesignReferencePackV1,
  ReadinessProfile,
  ReadinessReport,
  ReviewLearningEnvelopeV1,
  ScanScope,
} from "../core/contracts";
import { isKnowledgeFresh } from "../core/knowledge";
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
import { buildChangePlans } from "../core/planner";
import { buildReadinessReport } from "../core/report";
import { evaluateRules } from "../core/rules";
import { hashValue, stableStringify } from "../core/stable";
import { applyWaivers, sanitizeWaiverStore, type WaiverStore } from "../core/waivers";
import { FigmaAdapter, type BootstrapData, type CapturedAuditTarget, type ProjectStyleGuideStatus, type VariableCollectionOption } from "../figma/adapter";
import { applyChangePlan, clearVariantCoverageAnnotations, createSemanticTokenAndBind, setCertification } from "../figma/mutations";
import { buildKnowledgeSummary } from "./knowledge-summary";
import { parseUiMessage } from "./message-validation";
import type { PluginToUiMessage, UiToPluginMessage } from "./messages";
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
let suppressDirty = false;
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
let activeSavedAuditId: string | undefined;
let activeViewState: AuditViewState | undefined;
let displayRevision = 0;

const PLUGIN_VERSION = "0.2.0";
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
  appliedChanges = [];
  pendingContribution = undefined;
  post({ type: "restored-audit", audit });
}

async function restoreLastAudit(generation: number, revision: number): Promise<void> {
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
    return;
  }
}

function currentKnowledgeAvailable(): boolean {
  return Boolean(graph && !knowledgeState.dirty && adapter.matchesDocumentTopology(graph)
    && isKnowledgeFresh(graph) && graphProfileHash === hashValue(profile));
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
  return sanitizeWaiverStore(await figma.clientStorage.getAsync(await waiverKey()));
}

async function saveWaivers(waivers: WaiverStore): Promise<void> {
  await figma.clientStorage.setAsync(await waiverKey(), waivers);
}

async function runDocumentMutation<T>(expectedNodeIds: readonly string[], mutation: () => Promise<T>, includesTransientNodes = false): Promise<T> {
  assertDocumentMutationAllowed();
  mutationChangeGuard.arm(documentMutationIds(expectedNodeIds), Date.now(), 120_000, includesTransientNodes);
  suppressDirty = true;
  try {
    const result = await mutation();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return result;
  } finally {
    suppressDirty = false;
    knowledgeState.markDirty();
  }
}

function documentMutationIds(expectedNodeIds: readonly string[]): string[] {
  const affectedIds = new Set<string>([figma.root.id, ...expectedNodeIds]);
  for (const nodeId of expectedNodeIds) {
    let node = graph?.nodes[nodeId];
    while (node?.parentId) {
      affectedIds.add(node.parentId);
      node = graph?.nodes[node.parentId];
    }
  }
  return [...affectedIds];
}

function assertInitialized(): void {
  if (!initialized) throw new Error("Initialize the plugin before sending commands");
}

function assertDocumentMutationAllowed(): void {
  if (figma.editorType !== "figma") {
    throw new Error("Document cleanup and certification are available in Figma Design mode; Dev Mode supports audit, navigation, guidance, and report export");
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

function markKnowledgeDirty(): void {
  if (suppressDirty) return;
  knowledgeState.markDirty();
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
  markKnowledgeDirty();
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

async function ensureKnowledge(refresh: boolean): Promise<DesignKnowledgeGraph> {
  assertScanNotCancelled();
  let rebuildReason = !graph ? "not-loaded" : refresh ? "requested-refresh" : knowledgeState.dirty ? "document-changed"
    : !adapter.matchesDocumentTopology(graph) ? "page-topology-changed" : graphProfileHash !== hashValue(profile) ? "profile-changed"
      : !isKnowledgeFresh(graph) ? "expired" : undefined;
  if (graph && !rebuildReason && !await verifiedKnowledgeAvailable()) rebuildReason = "variable-environment-changed";
  if (!graph || rebuildReason) {
    await ensureDocumentChangeWatcher();
    assertScanNotCancelled();
    const token = knowledgeState.beginBuild();
    try {
      const fileKey = figma.fileKey;
      const stagedFragments = new Map<string, unknown>();
      const result = await adapter.buildKnowledge(profile, (progress) => post({ type: "progress", progress }), {
        ...(fileKey ? { contextCache: {
          get: (key: string) => auditStorage.loadContext(fileKey, key),
          set: async (key: string, value: unknown) => { stagedFragments.set(key, value); },
        } } : {}),
      });
      graph = result.graph;
      collections = result.collections;
      graphProfileHash = hashValue(profile);
      const accepted = knowledgeState.completeBuild(token, graph.complete);
      if (!accepted) {
        if (graph.cancelled) throw new ScanCancelledError();
        throw new Error("The design changed while whole-file knowledge was being built; run the audit again");
      }
      // A successful whole-file rebuild is the synchronization boundary for
      // delayed documentchange echoes from the mutation that triggered it.
      mutationChangeGuard.clear();
      const contextStorageStarted = Date.now();
      if (fileKey && !adapter.isScanCancelled() && !knowledgeState.dirty) {
        await auditStorage.saveContexts(fileKey, [...stagedFragments].map(([key, value]) => ({ key, value }))).catch(() => undefined);
      }
      console.info("[Design Passport] context build", {
        reason: rebuildReason, ...result.diagnostics,
        contextStorageMs: Date.now() - contextStorageStarted, codec: { ...codecMetrics },
      });
    } catch (error) {
      if (knowledgeState.buildActive) knowledgeState.abandonBuild(token);
      throw error;
    }
  } else console.info("[Design Passport] context reuse", { source: "current-session" });
  assertScanNotCancelled();
  return graph;
}

async function analyzeCurrentGraph(scope: ScanScope, targetIds: readonly string[], cancellable = false, capturedTarget = activeTarget): Promise<AuditSaveStatus> {
  if (!graph) throw new Error("Build whole-file knowledge before analyzing targets");
  if (!capturedTarget) throw new Error("Capture an audit target before evaluating the design");
  await assertVerifiedKnowledge();
  if (cancellable) assertScanNotCancelled();
  const rootIds = [...targetIds];
  if (rootIds.length === 0) {
    if (scope === "selection") throw new Error("Select at least one frame, component, or component set to audit");
    throw new Error(`No source frames were found for the ${scope} scope and current page-role mapping`);
  }
  post({ type: "progress", progress: { phase: "analyzing", completed: 0, total: rootIds.length, message: `Evaluating ${rootIds.length} source target${rootIds.length === 1 ? "" : "s"}` } });
  const analysisStarted = Date.now();
  const rawFindings = evaluateRules(graph, profile, rootIds);
  const waivers = await loadWaivers();
  if (cancellable) assertScanNotCancelled();
  await assertVerifiedKnowledge();
  const findings = applyWaivers(rawFindings, waivers);
  const nextReport = buildReadinessReport({ graph, profile, scope, targetRootIds: rootIds, appliedChanges, findings });
  const nextPlans = buildChangePlans(findings);
  const projectPack = activeProjectStyleGuidePack();
  const insights = buildKnowledgeInsights({
    graph,
    targetRootIds: rootIds,
    ...(projectPack ? { projectPack } : {}),
    referencePacks: sessionReferencePacks,
    teamPack: TEAM_KNOWLEDGE_PACK,
  });
  bootstrap = { ...bootstrap, projectStyleGuide: currentProjectStyleGuideStatus() };
  const knowledge = buildKnowledgeSummary(graph);
  console.info("[Design Passport] report evaluation", { elapsedMs: Date.now() - analysisStarted, targets: rootIds.length, findings: findings.length });
  let saveStatus: AuditSaveStatus = { state: "session-only", message: "This file has no stable file key. Results are available for this session only." };
  let savedAuditId: string | undefined;
  let savedAt: string | undefined;
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
      provenance: { pluginVersion: PLUGIN_VERSION, knowledgeVersion: KNOWLEDGE_VERSION },
      ...(activeViewState && activeTarget && canonicalAuditTargetKey(activeTarget) === canonicalAuditTargetKey(capturedTarget)
        ? { viewState: activeViewState } : {}),
    });
    console.info("[Design Passport] report persistence", { elapsedMs: Date.now() - started, state: saved.status.state });
    saveStatus = saved.status;
    if (saveStatus.state === "saved") {
      savedAuditId = saved.audit.id;
      savedAt = saved.audit.savedAt;
    }
  }
  // A completed snapshot stays useful if the design changes during its save.
  // Publish it with an immediate stale signal, never as permission to mutate.
  report = nextReport;
  plans = nextPlans;
  historicalAudit = undefined;
  exportSnapshot = { report: nextReport, target: capturedTarget, provenance: { pluginVersion: PLUGIN_VERSION, knowledgeVersion: KNOWLEDGE_VERSION }, ...(savedAt ? { savedAt } : {}) };
  activeSavedAuditId = savedAuditId;
  pendingContribution = undefined;
  await postSavedAudits();
  const verifiedAtPublication = await verifiedKnowledgeAvailable();
  post({
    type: "scan-result",
    report,
    plans,
    knowledge,
    collections,
    insights,
    projectStyleGuide: bootstrap.projectStyleGuide,
    sessionReferenceCount: sessionReferencePacks.length,
    saveStatus,
    ...(savedAuditId ? { savedAuditId } : {}),
  });
  if (!verifiedAtPublication) post({ type: "knowledge-stale" });
  return saveStatus;
}

async function runScan(
  target: CapturedAuditTarget,
  refreshKnowledge: boolean,
): Promise<void> {
  await runCapturedAuditAttempt(target, {
    begin: () => adapter.beginScan(),
    post,
    execute: async (capturedTarget) => {
      assertScanNotCancelled();
      const current = await ensureKnowledge(refreshKnowledge);
      const rootIds = adapter.targetRootIds(capturedTarget, current);
      await analyzeCurrentGraph(capturedTarget.scope, rootIds, true, capturedTarget);
    },
    commit: (capturedTarget) => {
      activeScope = capturedTarget.scope;
      activeTarget = capturedTarget;
    },
  });
}

async function rescanActiveTarget(refreshKnowledge: boolean): Promise<void> {
  if (!activeTarget) throw new Error("Run an audit before rescanning after changes");
  await runScan(activeTarget, refreshKnowledge);
}

async function auditPages(pageIds: readonly string[]): Promise<void> {
  if (!figma.fileKey) throw new Error("Page batches need local saving to retain each result. This file supports session-only results; use Current page or Audit selection instead.");
  const pages = new Map(figma.root.children.map((page) => [page.id, page.name]));
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
  sessionReferencePacks = [];
  sessionStyleGuidePack = undefined;
  pendingContribution = undefined;
  bootstrap = await adapter.getBootstrap();
  profile = bootstrap.profile;
  collections = bootstrap.collections;
  initialized = true;
  post({ type: "bootstrap", data: bootstrap, rulesetVersion: RULESET_VERSION, catalogVersion: CATALOG_VERSION, catalogDigest: CATALOG_DIGEST });
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
  if (message.type === "scan" || message.type === "refresh-audit" || message.type === "audit-pages"
    || message.type === "open-saved-audit" || message.type === "forget-saved-audit" || message.type === "clear-file-cache"
    || message.type === "save-profile") displayRevision += 1;
  if (message.type === "open-saved-audit") {
    if (!figma.fileKey) throw new Error("Saved audits need a stable file key");
    const audit = await auditStorage.loadAudit(figma.fileKey, message.id);
    if (!audit) throw new Error("This saved audit is no longer available. It may have been removed to free local storage.");
    restoreAudit(audit);
    await postSavedAudits();
    return;
  }
  if (message.type === "forget-saved-audit" || message.type === "clear-file-cache") {
    if (!figma.fileKey) return;
    if (message.type === "clear-file-cache") await auditStorage.clearFile(figma.fileKey);
    else await auditStorage.forgetAudit(figma.fileKey, message.id);
    if (message.type === "clear-file-cache" || activeSavedAuditId === message.id) {
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
    if (invalidateProfileIfNeeded()) return;
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
    } else if (message.type === "scan") {
      if (invalidateProfileIfNeeded()) return;
      const target = resolveAuditTarget(
        { kind: "capture", scope: message.request.scope },
        activeTarget,
        (scope) => adapter.captureAuditTarget(scope),
      );
      await runScan(target, message.request.refreshKnowledge);
    } else if (message.type === "refresh-audit") {
      if (invalidateProfileIfNeeded()) return;
      const target = resolveAuditTarget(
        { kind: "refresh" },
        activeTarget,
        (scope) => adapter.captureAuditTarget(scope),
      );
      await runScan(target, true);
    } else if (message.type === "navigate") {
      await adapter.navigate(message.nodeId);
    } else if (message.type === "apply-plan") {
      if (invalidateProfileIfNeeded()) return;
      await assertCurrentReport("applying cleanup");
      const plan = plans.find((candidate) => candidate.id === message.planId);
      if (!plan) throw new Error("The cleanup plan is stale; rescan before applying changes");
      try {
        const result = await runDocumentMutation(
          plan.operations.map((operation) => operation.nodeId),
          () => applyChangePlan(plan, { undoOnlyAcknowledged: message.undoOnlyAcknowledged }),
          requiresTransientMutationGuard(plan.risk),
        );
        appliedChanges.push(plan);
        post({ type: "mutation-result", message: `Applied ${result.appliedOperationCount} operations${result.checkpointCreated ? " after a version-history checkpoint" : ""}. Rescanning the complete file…` });
      } catch (error) {
        post({ type: "knowledge-stale" });
        throw error;
      }
      await rescanActiveTarget(true);
    } else if (message.type === "apply-all") {
      if (invalidateProfileIfNeeded()) return;
      await assertCurrentReport("applying all cleanup");
      const selectedPlans = message.planIds.map((planId) => plans.find((candidate) => candidate.id === planId));
      if (selectedPlans.some((plan) => !plan)) throw new Error("At least one cleanup plan is stale; rescan before applying all fixes");
      const approvedPlans = selectedPlans as ChangePlan[];
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
            }), structuralBatch);
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
          ? `Applied ${appliedOperationCount} validated structural operation${appliedOperationCount === 1 ? "" : "s"} in isolated undo groups.${failureSummary} Rescanning the complete file…`
          : `Applied ${appliedOperationCount} safe or guarded operations in ${approvedPlans.length} undo group${approvedPlans.length === 1 ? "" : "s"}. Rescanning the complete file…` });
      } catch (error) {
        post({ type: "knowledge-stale" });
        throw new Error(`Fix all stopped after ${appliedOperationCount} completed operations. ${errorMessage(error)}`);
      }
      await rescanActiveTarget(true);
    } else if (message.type === "certify" || message.type === "certify-components") {
      if (invalidateProfileIfNeeded()) return;
      assertDocumentMutationAllowed();
      const current = await assertCurrentReport("certification");
      const componentCertification = message.type === "certify-components";
      const certificationFrames = componentCertification
        ? current.report.frames.filter((frame) => frame.rootType === "COMPONENT" || frame.rootType === "COMPONENT_SET")
        : current.report.frames;
      if (componentCertification) {
        if (certificationFrames.length === 0) throw new Error("This audit does not contain component roots to certify");
        if (certificationFrames.some((frame) => !frame.ready)) throw new Error("Every component root must be grade B or better with no blockers or unresolved critical reviews");
      } else if (!current.report.ready) {
        throw new Error("Certification requires grade B or better with no blockers or unresolved critical reviews");
      }
      const summaryBase = {
        schemaVersion: 1 as const,
        grade: current.report.grade.letter,
        score: current.report.grade.score,
        rulesetVersion: current.report.rulesetVersion,
        catalogVersion: current.report.catalogVersion,
        certifiedAt: new Date().toISOString(),
        snapshotHash: current.report.snapshotHash,
        knowledgeSnapshotHash: current.graph.snapshotHash,
      };
      const certificationNodeIds = certificationFrames.flatMap((frame) => [
        frame.rootId,
        ...(componentCertification ? (frame.variantCoverage ?? []).map((variant) => variant.variantId) : []),
      ]);
      mutationChangeGuard.arm(documentMutationIds(certificationNodeIds));
      suppressDirty = true;
      let count = 0;
      let removedVariantAnnotations = 0;
      figma.commitUndo();
      try {
        for (const frame of certificationFrames) {
          const node = await figma.getNodeByIdAsync(frame.rootId);
          if (!node || node.type === "DOCUMENT" || node.type === "PAGE") throw new Error(`Source frame ${frame.rootId} no longer exists`);
          const summary = { ...summaryBase, grade: frame.grade.letter, score: frame.grade.score };
          const variants = componentCertification ? frame.variantCoverage ?? [] : [];
          setCertification(node, summary, variants.length);
          for (const variant of variants) {
            const variantNode = await figma.getNodeByIdAsync(variant.variantId);
            if (!variantNode || variantNode.type === "DOCUMENT" || variantNode.type === "PAGE") {
              throw new Error(`Variant ${variant.variantId} no longer exists`);
            }
            removedVariantAnnotations += clearVariantCoverageAnnotations(variantNode);
          }
          count += 1;
        }
        if (count !== certificationFrames.length) throw new Error(`Every ${componentCertification ? "component" : "source frame"} must be certified in the same undo group`);
        figma.commitUndo();
        await new Promise((resolve) => setTimeout(resolve, 0));
      } catch (error) {
        figma.triggerUndo();
        knowledgeState.markDirty();
        post({ type: "knowledge-stale" });
        throw error;
      } finally {
        suppressDirty = false;
      }
      post({ type: "certified", count, target: componentCertification ? "components" : "source frames", removedVariantAnnotations });
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
      if (message.type === "waive") {
        const reason = message.reason.normalize("NFKC").trim().slice(0, 500);
        if (!reason) throw new Error("A waiver requires a reason");
        waivers[message.findingId] = { reason, createdAt: new Date().toISOString(), createdBy: "local designer" };
      } else {
        delete waivers[message.findingId];
      }
      await saveWaivers(waivers);
      await analyzeCurrentGraph(activeScope, current.report.target.rootIds);
    } else if (message.type === "confirm-pattern") {
      if (invalidateProfileIfNeeded()) return;
      const current = await assertCurrentReport("resolving a contextual alias");
      const finding = current.report.findings.find((candidate) => candidate.id === message.findingId);
      if (!finding || finding.ruleId !== "naming.pattern-contextual" || !finding.patternResolution?.candidates?.includes(message.canonicalName)) {
        throw new Error("The contextual alias choice is stale or invalid; rescan before renaming");
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
      await runDocumentMutation(plan.operations.map((operation) => operation.nodeId), () => applyChangePlan(plan, { undoOnlyAcknowledged: false }));
      appliedChanges.push(plan);
      post({ type: "mutation-result", message: `Renamed the contextual alias to ${name}. Rescanning the complete file…` });
      await rescanActiveTarget(true);
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
      post({ type: "mutation-result", message: `Created one semantic token and bound ${result.boundCount} repeated uses. Rescanning the complete file…` });
      await rescanActiveTarget(true);
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
    if (message.type === "navigate" || message.type === "export" && report) {
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

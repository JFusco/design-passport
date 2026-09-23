import { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_NAME } from "../core/constants";
import { producerLabel } from "../core/build-info";
import type {
  Axis,
  FindingCategory,
  ChangePlan,
  KnowledgeInsight,
  ReadinessProfile,
  ReadinessReport,
  ReviewLearningEnvelopeV1,
  ScanProgress,
  ScanScope,
} from "../core/contracts";
import type { SelectionSummary, VariableCollectionOption } from "../figma/adapter";
import type { AuditRecheckRequest, AuditTargetSummary, KnowledgeSummary, PluginToUiMessage, TokenCoveragePageRequest, TokenCoveragePageResult, UiToPluginMessage } from "../plugin/messages";
import type { AuditSaveStatus, AuditViewState, SavedAuditSummary } from "../plugin/audit-state";
import { BrandMark } from "./BrandMark";
import { Cleanup } from "./components/Cleanup";
import { ContextPanel } from "./components/ContextPanel";
import { Findings } from "./components/Findings";
import { Guidance } from "./components/Guidance";
import { Modules } from "./components/Modules";
import { Overview } from "./components/Overview";
import { ProfileEditor } from "./components/ProfileEditor";
import { SavedAudits } from "./components/SavedAudits";
import {
  AUDIT_CANCELLED_NOTICE,
  auditCompletionNotice,
  auditProgressPresentation,
  isAuditInterruptible,
  scanInFlightAfter,
} from "./operations/audit-scope";
import { actionableIssueSummary } from "./operations/breakdown";
import { findingsForReview } from "./operations/findings";
import { certificationNotice, cloneProfile, formatDateTime } from "./operations/presentation";
import { discardProfileDraft, profileDraftState } from "./operations/profile-state";
import { batchCompletionNotice, defaultAuditView, reportTargetIdentity, shouldRestoreAudit, type RestoreRequest } from "./operations/saved-audits";
import type { BootstrapEnvelope, Tab, TokenWizardState, WaiverDraft } from "./types";

const EMPTY_SELECTION_SUMMARY: SelectionSummary = { eligibleCount: 0, unsupportedCount: 0 };

function send(message: UiToPluginMessage): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapEnvelope>();
  const [committedProfile, setCommittedProfile] = useState<ReadinessProfile>();
  const [profile, setProfile] = useState<ReadinessProfile>();
  const [report, setReport] = useState<ReadinessReport>();
  const [coveragePages, setCoveragePages] = useState<Record<string, TokenCoveragePageResult>>({});
  const [plans, setPlans] = useState<ChangePlan[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeSummary>();
  const [collections, setCollections] = useState<VariableCollectionOption[]>([]);
  const [progress, setProgress] = useState<ScanProgress>();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selectionSummary, setSelectionSummary] = useState<SelectionSummary>(EMPTY_SELECTION_SUMMARY);
  const [auditTarget, setAuditTarget] = useState<AuditTargetSummary>();
  const [scanInFlight, setScanInFlight] = useState(false);
  const [stale, setStale] = useState(true);
  const [showPassing, setShowPassing] = useState(false);
  const [axisFilter, setAxisFilter] = useState<Axis | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | "all">("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [rootFilter, setRootFilter] = useState("all");
  const [variantFilter, setVariantFilter] = useState("all");
  const [expanded, setExpanded] = useState<string>();
  const [undoAcknowledged, setUndoAcknowledged] = useState(false);
  const [tokenWizard, setTokenWizard] = useState<TokenWizardState>();
  const [waiverDraft, setWaiverDraft] = useState<WaiverDraft>();
  const [insights, setInsights] = useState<KnowledgeInsight[]>([]);
  const [referencePackRaw, setReferencePackRaw] = useState("");
  const [sessionReferenceCount, setSessionReferenceCount] = useState(0);
  const [contribution, setContribution] = useState<{ envelope: ReviewLearningEnvelopeV1; content: string }>();
  const [savedAudits, setSavedAudits] = useState<SavedAuditSummary[]>([]);
  const [activeSavedId, setActiveSavedId] = useState<string>();
  const [saveStatus, setSaveStatus] = useState<AuditSaveStatus>();
  const [historical, setHistorical] = useState(false);
  const [loadingSavedAudit, setLoadingSavedAudit] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number; skipped: number; pageName?: string }>();
  const restoreRequest = useRef<RestoreRequest>("startup");
  const reportAccepted = useRef(false);
  const batchRunning = useRef(false);
  const lastPersistedView = useRef<string | undefined>(undefined);
  const lastReportTarget = useRef<string | undefined>(undefined);

  useEffect(() => {
    let initialized = false;
    const handler = (event: MessageEvent<{ pluginMessage?: PluginToUiMessage }>) => {
      const message = event.data?.pluginMessage;
      if (!message || typeof message !== "object" || typeof message.type !== "string") return;
      if (message.type === "bootstrap") {
        if (initialized) return;
        initialized = true;
        setBootstrap({
          data: message.data,
          rulesetVersion: message.rulesetVersion,
          catalogVersion: message.catalogVersion,
          catalogDigest: message.catalogDigest,
        });
        setCommittedProfile(cloneProfile(message.data.profile));
        setProfile(cloneProfile(message.data.profile));
        setCollections(message.data.collections);
        setSelectionSummary(message.data.selectionSummary);
        if (!message.data.profileConfigured && !reportAccepted.current) setActiveTab("profile");
      } else if (message.type === "saved-audits") {
        setSavedAudits(message.audits);
      } else if (message.type === "audit-save-status") {
        setSaveStatus(message.status);
      } else if (message.type === "restored-audit") {
        if (!shouldRestoreAudit(restoreRequest.current, message.audit.id)) return;
        restoreRequest.current = null;
        setLoadingSavedAudit(false);
        setScanInFlight(false);
        reportAccepted.current = true;
        const audit = message.audit;
        lastReportTarget.current = reportTargetIdentity(audit.report);
        const view = audit.viewState ?? defaultAuditView();
        lastPersistedView.current = JSON.stringify({ id: audit.id, viewState: view });
        setReport(audit.report);
        setCoveragePages({});
        setPlans(audit.plans);
        setKnowledge(audit.knowledge);
        setInsights(audit.insights);
        setActiveSavedId(audit.id);
        setSaveStatus({ state: "saved" });
        setHistorical(true);
        setStale(true);
        setAuditTarget(audit.target.scope === "selection" ? { scope: "selection", selectionCount: audit.target.nodeIds.length } : { scope: audit.target.scope });
        setActiveTab(view.activeTab);
        setShowPassing(view.showPassing);
        setAxisFilter(view.axisFilter);
        setCategoryFilter(view.categoryFilter ?? "all");
        setPageFilter(view.pageFilter);
        setRootFilter(view.rootFilter);
        setVariantFilter(view.variantFilter);
        setExpanded(view.expanded);
        setTokenWizard(undefined);
        setWaiverDraft(undefined);
        setUndoAcknowledged(false);
        setContribution(undefined);
        setError(undefined);
        setNotice(undefined);
      } else if (message.type === "batch-progress") {
        batchRunning.current = true;
        setBatchProgress(message);
        setScanInFlight(true);
      } else if (message.type === "batch-complete") {
        batchRunning.current = false;
        setBatchProgress(undefined);
        setProgress(undefined);
        setScanInFlight(false);
        setNotice(batchCompletionNotice(message));
      } else if (message.type === "collections-result") {
        setCollections(message.collections);
      } else if (message.type === "audit-started") {
        setAuditTarget(message.target);
        setScanInFlight((current) => scanInFlightAfter(current, "audit-started"));
      } else if (message.type === "progress") {
        setProgress(message.progress);
        setScanInFlight((current) => scanInFlightAfter(current, "progress"));
        setError(undefined);
      } else if (message.type === "scan-result") {
        restoreRequest.current = null;
        reportAccepted.current = true;
        setActiveSavedId(message.savedAuditId);
        setSaveStatus(message.saveStatus);
        setHistorical(false);
        const targetIdentity = reportTargetIdentity(message.report);
        if (targetIdentity !== lastReportTarget.current) {
          setShowPassing(false);
          setAxisFilter("all");
          setCategoryFilter("all");
          setPageFilter("all");
          setRootFilter("all");
          setVariantFilter("all");
          setExpanded(undefined);
        }
        lastReportTarget.current = targetIdentity;
        setReport(message.report);
        setCoveragePages({});
        setPageFilter((current) => current === "all" || message.report.frames.some((frame) => frame.pageId === current) ? current : "all");
        setRootFilter((current) => current === "all" || message.report.frames.some((frame) => frame.rootId === current) ? current : "all");
        setVariantFilter((current) => current === "all" || message.report.frames.some((frame) => frame.variantCoverage?.some((variant) => variant.variantId === current)) ? current : "all");
        setExpanded((current) => (message.report.findings.some((finding) => finding.id === current) || message.report.issueGroups?.some((group) => group.id === current)) ? current : undefined);
        setPlans(message.plans);
        setKnowledge(message.knowledge);
        setCollections(message.collections);
        setInsights(message.insights);
        setSessionReferenceCount(message.sessionReferenceCount);
        setBootstrap((current) => current ? { ...current, data: { ...current.data, projectStyleGuide: message.projectStyleGuide } } : current);
        setContribution(undefined);
        setProgress(undefined);
        setScanInFlight(batchRunning.current);
        setStale(false);
        setError(undefined);
        if (!batchRunning.current) setNotice(message.refresh
          ? `Recheck complete · ${message.refresh.resolvedCount} resolved · ${message.refresh.remainingCount} remaining. ${message.refresh.mode === "full" ? "Full rebuild" : "Verified context reuse"}. ${message.refresh.reason}`
          : auditCompletionNotice(message.report.target.scope, message.report.grade.letter, message.report.ready));
      } else if (message.type === "token-coverage-page") {
        setCoveragePages((current) => ({ ...current, [message.result.requestId]: message.result }));
      } else if (message.type === "knowledge-stale") {
        setCoveragePages({});
        setStale(true);
      } else if (message.type === "selection") {
        setSelectionSummary(message.summary);
      } else if (message.type === "profile-saved") {
        restoreRequest.current = null;
        batchRunning.current = false;
        setBootstrap((current) => current ? { ...current, data: message.data } : current);
        setCommittedProfile(cloneProfile(message.data.profile));
        setProfile(cloneProfile(message.data.profile));
        setCoveragePages({});
        setContribution(undefined);
        setProgress(undefined);
        setBatchProgress(undefined);
        setLoadingSavedAudit(false);
        setTokenWizard(undefined);
        setWaiverDraft(undefined);
        setUndoAcknowledged(false);
        setScanInFlight((current) => scanInFlightAfter(current, "profile-saved"));
        setStale(true);
        setError(undefined);
        setNotice("Audit setup saved. Refresh to verify this setup; completed results remain available for browsing and historical export.");
        setActiveTab("overview");
      } else if (message.type === "profile-invalidated") {
        restoreRequest.current = null;
        batchRunning.current = false;
        setBootstrap((current) => current ? { ...current, data: message.data } : current);
        setCommittedProfile(cloneProfile(message.data.profile));
        setProfile(cloneProfile(message.data.profile));
        setCoveragePages({});
        setContribution(undefined);
        setProgress(undefined);
        setBatchProgress(undefined);
        setLoadingSavedAudit(false);
        setTokenWizard(undefined);
        setWaiverDraft(undefined);
        setUndoAcknowledged(false);
        setScanInFlight((current) => scanInFlightAfter(current, "profile-invalidated"));
        setStale(true);
        setError(undefined);
        setNotice(undefined);
        setActiveTab("profile");
      } else if (message.type === "mutation-result") {
        setNotice(message.message);
      } else if (message.type === "certified") {
        setNotice(certificationNotice(message.count, message.target, message.removedVariantAnnotations));
      } else if (message.type === "project-style-guide-result") {
        setBootstrap((current) => current ? { ...current, data: { ...current.data, projectStyleGuide: message.status } } : current);
        setReferencePackRaw("");
        setNotice(message.action === "imported" ? "Project style guide connected to this Figma file." : "Project style guide removed from this Figma file.");
        setError(undefined);
      } else if (message.type === "session-reference-result") {
        setSessionReferenceCount(message.count);
        setBootstrap((current) => current ? { ...current, data: { ...current.data, projectStyleGuide: message.projectStyleGuide } } : current);
        setReferencePackRaw("");
        setNotice(message.count > 0 ? `${message.count} session reference${message.count === 1 ? "" : "s"} active.` : "Session references cleared.");
        setError(undefined);
      } else if (message.type === "contribution-preview") {
        setContribution({ envelope: message.envelope, content: message.content });
        setNotice(undefined);
        setError(undefined);
      } else if (message.type === "export-result") {
        download(message.filename, message.content, message.format === "json" ? "application/json" : "text/markdown");
      } else if (message.type === "scan-cancelled") {
        batchRunning.current = false;
        setBatchProgress(undefined);
        setError(undefined);
        setProgress(undefined);
        setScanInFlight((current) => scanInFlightAfter(current, "scan-cancelled"));
        setNotice(AUDIT_CANCELLED_NOTICE);
      } else if (message.type === "error") {
        setError(message.message);
        if (!message.nonTerminal) {
          batchRunning.current = false;
          restoreRequest.current = null;
          setBatchProgress(undefined);
          setLoadingSavedAudit(false);
          setProgress(undefined);
          setScanInFlight((current) => scanInFlightAfter(current, "error"));
        }
        setNotice(undefined);
      }
    };
    window.addEventListener("message", handler);
    const requestInitialization = () => {
      if (!initialized) send({ type: "initialize" });
    };
    requestInitialization();
    const retry = window.setInterval(requestInitialization, 3_000);
    return () => {
      window.clearInterval(retry);
      window.removeEventListener("message", handler);
    };
  }, []);

  useEffect(() => {
    if (!activeSavedId) return;
    const viewState: AuditViewState = {
      activeTab, showPassing, axisFilter, categoryFilter, pageFilter, rootFilter, variantFilter,
      ...(expanded === undefined ? {} : { expanded }),
    };
    const signature = JSON.stringify({ id: activeSavedId, viewState });
    if (lastPersistedView.current === signature) return;
    lastPersistedView.current = signature;
    send({ type: "save-audit-view", id: activeSavedId, viewState });
  }, [activeSavedId, activeTab, showPassing, axisFilter, categoryFilter, pageFilter, rootFilter, variantFilter, expanded]);

  const visibleFindings = useMemo(
    () => {
      const frames = new Map((report?.frames ?? []).map((frame) => [frame.rootId, frame]));
      return findingsForReview(report?.findings ?? [], { showPassing, axis: axisFilter })
        .filter((finding) => categoryFilter === "all" || finding.category === categoryFilter)
        .filter((finding) => pageFilter === "all" || frames.get(finding.rootId)?.pageId === pageFilter)
        .filter((finding) => rootFilter === "all" || finding.rootId === rootFilter)
        .filter((finding) => {
          if (variantFilter === "all") return true;
          const coverage = frames.get(finding.rootId)?.variantCoverage?.find((variant) => variant.variantId === variantFilter);
          return coverage?.findingIds.includes(finding.id) ?? false;
        });
    },
    [report, showPassing, axisFilter, categoryFilter, pageFilter, rootFilter, variantFilter],
  );

  const draftState = useMemo(
    () => profile && committedProfile && bootstrap
      ? profileDraftState({
        committed: committedProfile,
        draft: profile,
        configured: bootstrap.data.profileConfigured,
        profileIssues: bootstrap.data.profileIssues,
        pageIds: bootstrap.data.pages.map((page) => page.id),
      })
      : { dirty: false, semanticErrors: [], issues: [], blocked: true },
    [profile, committedProfile, bootstrap],
  );
  const profileGateMessage = draftState.semanticErrors.length > 0
    ? "Audit setup needs attention. Fix the listed items before auditing or applying fixes."
    : draftState.dirty
      ? "Advanced audit setup has unsaved changes. Save or discard them before auditing or applying fixes."
      : "Design Passport could not classify this file safely. Confirm the recommended audit setup to continue.";

  const scan = (scope: ScanScope, refreshKnowledge = false) => {
    if (!profile || draftState.blocked) {
      setActiveTab("profile");
      return;
    }
    restoreRequest.current = null;
    setError(undefined);
    setNotice(undefined);
    setContribution(undefined);
    setCoveragePages({});
    setTokenWizard(undefined);
    setWaiverDraft(undefined);
    setUndoAcknowledged(false);
    setScanInFlight((current) => scanInFlightAfter(current, "local-scan"));
    if (refreshKnowledge && report) send({ type: "refresh-audit" });
    else send({ type: "scan", request: { scope, refreshKnowledge } });
  };

  const recheck = (request: AuditRecheckRequest) => {
    if (!report || draftState.blocked || scanInFlight) return;
    restoreRequest.current = null;
    setError(undefined);
    setNotice(undefined);
    setContribution(undefined);
    setCoveragePages({});
    setTokenWizard(undefined);
    setWaiverDraft(undefined);
    setUndoAcknowledged(false);
    setScanInFlight(true);
    send({ type: "recheck-audit", request });
  };

  const reviewPages = (pageIds: string[]) => {
    if (draftState.blocked || pageIds.length === 0 || !bootstrap?.data.fileKeyAvailable) return;
    restoreRequest.current = null;
    batchRunning.current = true;
    setBatchProgress({ completed: 0, total: pageIds.length, skipped: 0 });
    setScanInFlight(true);
    setError(undefined);
    setNotice(undefined);
    setContribution(undefined);
    setCoveragePages({});
    setTokenWizard(undefined);
    setWaiverDraft(undefined);
    setUndoAcknowledged(false);
    send({ type: "audit-pages", pageIds });
  };

  const forgetDisplayedResult = () => {
    restoreRequest.current = null;
    setActiveSavedId(undefined);
    if (historical) {
      setReport(undefined);
      setCoveragePages({});
      setPlans([]);
      setKnowledge(undefined);
      setInsights([]);
      setHistorical(false);
      setSaveStatus(undefined);
    } else if (report) {
      setSaveStatus({ state: "not-saved", message: "This result remains open but is no longer saved. Export it before closing to keep a copy." });
    }
  };

  if (!bootstrap || !profile || !committedProfile) {
    return <main className="loading"><span className="spinner" />Loading {PRODUCT_NAME}…</main>;
  }

  const presentedProgress = scanInFlight && progress && auditTarget
    ? auditProgressPresentation(progress, auditTarget)
    : undefined;
  const showStaleNotification = Boolean(stale && report && !historical && !error && !scanInFlight);
  const saveFailure = saveStatus && saveStatus.state !== "saved";
  const panelLocked = scanInFlight && (!report || activeTab === "profile" || activeTab === "context");
  const hasNotifications = draftState.blocked
    || bootstrap.data.producer.channel === "development"
    || !bootstrap.data.canMutateDocument
    || showStaleNotification
    || historical
    || Boolean(saveFailure)
    || Boolean(error)
    || Boolean(notice);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <BrandMark className="brand-mark" />
          <div>
            <div className="brand-name">Cumulative</div>
            <h1>{PRODUCT_NAME}</h1>
          </div>
        </div>
        <div className="catalog-lock" title={bootstrap.catalogDigest}>Catalog {bootstrap.catalogVersion}</div>
      </header>

      <div className={`notification-stack${hasNotifications ? " has-notifications" : ""}`}>
        {bootstrap.data.producer.channel === "development" ? <div className="banner warning" role="status"><strong>Development build</strong> · Results and certificates from this plugin are visibly marked and should not be treated as production evidence.</div> : null}
        {draftState.blocked ? <div className="banner warning" role="status" aria-live="polite" aria-atomic="true"><span>{profileGateMessage}</span><button className="button subtle" onClick={() => setActiveTab("profile")}>Fix audit setup</button></div> : null}
        {!bootstrap.data.canMutateDocument ? <div className="banner info">Dev Mode is audit-only. Switch to Design mode to save the profile, clean up findings, or certify frames.</div> : null}
        {historical && report ? <div className="banner info" role="status"><span><strong>Saved result · {formatDateTime(report.generatedAt)}</strong><br />Browse, navigate, and export now. Refresh to verify the current design before applying fixes or certifying.</span></div> : null}
        {saveFailure ? <div className="banner warning" role="status"><span><strong>{saveStatus.state === "session-only" ? "Available this session only" : "Not saved"}</strong><br />{saveStatus.message ?? "Export this result before closing Passport to keep a copy."}</span></div> : null}
        {showStaleNotification ? <div className="banner warning" role="status" aria-live="polite" aria-atomic="true">This result hasn’t been verified against the current design and audit setup. Refresh before applying fixes or certifying.</div> : null}
        {error ? <div className="banner error" role="alert" aria-atomic="true"><span>{error}</span><button className="icon-button" onClick={() => setError(undefined)} aria-label="Dismiss error">×</button></div> : null}
        <div className={notice ? "banner success" : "status-announcer"} role="status" aria-live="polite" aria-atomic="true">
          {notice ? <><span>{notice}</span><button className="icon-button" onClick={() => setNotice(undefined)} aria-label="Dismiss notice">×</button></> : null}
        </div>
      </div>

      <SavedAudits
        audits={savedAudits}
        activeId={activeSavedId}
        status={saveStatus}
        disabled={scanInFlight}
        onOpen={(id) => { restoreRequest.current = { id }; setLoadingSavedAudit(true); setScanInFlight(true); send({ type: "open-saved-audit", id }); }}
        onForget={(id) => { send({ type: "forget-saved-audit", id }); if (id === activeSavedId) forgetDisplayedResult(); }}
        onClear={() => { send({ type: "clear-file-cache" }); forgetDisplayedResult(); }}
      />

      <nav className="tabs" aria-label="Plugin sections">
        {(["overview", "modules", "findings", "guidance", "cleanup", "context"] as Tab[]).map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab[0]?.toUpperCase()}{tab.slice(1)}
            {tab === "findings" && report ? <span className="count">{actionableIssueSummary(report).actionableCount}</span> : null}
          </button>
        ))}
      </nav>

      {loadingSavedAudit ? <section className="progress-card" role="status"><div className="progress-copy"><span className="spinner" aria-hidden="true" /><strong>Opening saved result…</strong></div></section> : batchProgress ? (
        <section className="progress-card">
          <div className="progress-copy" role="status" aria-live="polite" aria-atomic="true">
            <span className="spinner" aria-hidden="true" />
            <div><strong>Reviewing pages · {batchProgress.completed} of {batchProgress.total} audited</strong><small>{batchProgress.pageName ? `Current page: ${batchProgress.pageName}. ` : "Preparing verified file context. "}{batchProgress.skipped > 0 ? `${batchProgress.skipped} pages skipped: no audit targets. ` : ""}{presentedProgress?.detail}</small></div>
          </div>
          <button className="button subtle" onClick={() => send({ type: "cancel-scan" })}>Cancel page review</button>
        </section>
      ) : presentedProgress ? (
        <section className="progress-card">
          <div className="progress-copy" role="status" aria-live="polite" aria-atomic="true">
            <span className="spinner" aria-hidden="true" />
            <div><strong>{presentedProgress.headline}</strong><small>{presentedProgress.detail}</small></div>
          </div>
          {isAuditInterruptible(progress) ? <button className="button subtle" aria-label="Cancel audit" onClick={() => send({ type: "cancel-scan" })}>Cancel</button> : null}
        </section>
      ) : null}

      <div
        className={`panel-host${panelLocked ? " scan-locked" : ""}`}
        inert={panelLocked}
        aria-busy={scanInFlight}
      >
        {activeTab === "overview" && (
          <Overview
            report={report}
            selectionSummary={selectionSummary}
            stale={stale}
            canMutateDocument={bootstrap.data.canMutateDocument}
            scanning={scanInFlight}
            actionsBlocked={draftState.blocked}
            historical={historical}
            pages={bootstrap.data.pages}
            fileKeyAvailable={bootstrap.data.fileKeyAvailable}
            onReviewPages={reviewPages}
            onRecheck={recheck}
            recheckDisabled={draftState.blocked || scanInFlight}
            onScan={scan}
            onCertify={() => send({ type: "certify" })}
            onCertifyComponents={() => send({ type: "certify-components" })}
            onExport={(format) => send({ type: "export", format })}
          />
        )}
        {activeTab === "findings" && (
          <Findings
            findings={visibleFindings}
            groups={report?.issueGroups ?? []}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            onRecheckIssue={(issueId) => recheck({ mode: "issue", issueId })}
            recheckDisabled={historical || draftState.blocked || scanInFlight}
            frames={report?.frames ?? []}
            showPassing={showPassing}
            axisFilter={axisFilter}
            pageFilter={pageFilter}
            rootFilter={rootFilter}
            variantFilter={variantFilter}
            expanded={expanded}
            collections={collections.filter((collection) => !collection.remote && profile.tokenSourceCollectionKeys.includes(collection.key))}
            tokenWizard={tokenWizard}
            waiverDraft={waiverDraft}
            disabled={stale || draftState.blocked || scanInFlight}
            canMutateDocument={bootstrap.data.canMutateDocument}
            onTogglePassing={setShowPassing}
            onAxisFilter={setAxisFilter}
            onPageFilter={(pageId) => { setPageFilter(pageId); setRootFilter("all"); setVariantFilter("all"); }}
            onRootFilter={(rootId) => { setRootFilter(rootId); setVariantFilter("all"); }}
            onVariantFilter={setVariantFilter}
            onExpand={(id) => setExpanded(expanded === id ? undefined : id)}
            onNavigate={(nodeId) => send({ type: "navigate", nodeId })}
            onWaiverDraft={setWaiverDraft}
            onWaive={() => {
              if (!waiverDraft?.reason.trim()) return;
              send({ type: "waive", findingId: waiverDraft.findingId, reason: waiverDraft.reason.trim() });
              setWaiverDraft(undefined);
            }}
            onClearWaiver={(findingId) => send({ type: "clear-waiver", findingId })}
            onConfirmPattern={(findingId, canonicalName) => send({ type: "confirm-pattern", findingId, canonicalName })}
            onAcknowledgeDetachment={(findingId) => send({ type: "acknowledge-detachment", findingId })}
            onClearDetachmentAcknowledgement={(findingId) => send({ type: "clear-detachment-acknowledgement", findingId })}
            onOpenAuditSetup={() => setActiveTab("profile")}
            coverageCurrent={!historical && !stale}
            {...(report?.snapshotHash ? { coverageReportHash: report.snapshotHash } : {})}
            coveragePages={coveragePages}
            onRequestCoveragePage={(request: TokenCoveragePageRequest) => send({ type: "token-coverage-page", request })}
            onTokenWizard={setTokenWizard}
            onCreateToken={() => {
              if (!tokenWizard) return;
              send({
                type: "create-token",
                collectionId: tokenWizard.collectionId,
                name: tokenWizard.name,
                field: tokenWizard.field,
                nodeIds: tokenWizard.nodeIds,
                rawValue: tokenWizard.rawValue,
              });
              setTokenWizard(undefined);
            }}
          />
        )}
        {activeTab === "modules" && (
          <Modules
            report={report}
            onRecheck={recheck}
            recheckDisabled={historical || draftState.blocked || scanInFlight}
            onNavigate={(nodeId) => send({ type: "navigate", nodeId })}
            onViewFindings={(rootId) => {
              const frame = report?.frames.find((candidate) => candidate.rootId === rootId);
              setPageFilter(frame?.pageId ?? "all");
              setRootFilter(rootId);
              setVariantFilter("all");
              setActiveTab("findings");
            }}
            onViewVariantFindings={(rootId, variantId) => {
              const frame = report?.frames.find((candidate) => candidate.rootId === rootId);
              setPageFilter(frame?.pageId ?? "all");
              setRootFilter(rootId);
              setVariantFilter(variantId);
              setActiveTab("findings");
            }}
          />
        )}
        {activeTab === "guidance" && (
          <Guidance
            insights={insights}
            hasReport={Boolean(report)}
            canContribute={!stale && !draftState.blocked && !scanInFlight}
            historical={historical}
            contribution={contribution}
            projectStyleGuide={bootstrap.data.projectStyleGuide}
            onNavigate={(nodeId) => send({ type: "navigate", nodeId })}
            onPreviewContribution={() => send({ type: "preview-contribution" })}
            onExportContribution={(digest) => send({ type: "export-contribution", digest })}
            onCancelContribution={() => setContribution(undefined)}
          />
        )}
        {activeTab === "cleanup" && (
          <Cleanup
            disabled={stale || draftState.blocked || scanInFlight || !bootstrap.data.canMutateDocument}
            plans={plans}
            findings={report?.findings ?? []}
            undoAcknowledged={undoAcknowledged}
            onAcknowledge={setUndoAcknowledged}
            onApply={(planId) => send({ type: "apply-plan", planId, undoOnlyAcknowledged: undoAcknowledged })}
            onApplyAll={(planIds) => send({ type: "apply-all", planIds, undoOnlyAcknowledged: undoAcknowledged })}
          />
        )}
        {activeTab === "context" && (
          <ContextPanel
            knowledge={knowledge}
            actionsBlocked={draftState.blocked}
            onRefresh={() => scan(report?.target.scope ?? "selection", true)}
            projectStyleGuide={bootstrap.data.projectStyleGuide}
            referencePackRaw={referencePackRaw}
            onReferencePackRaw={setReferencePackRaw}
            onImportProjectStyleGuide={() => send({ type: "import-project-style-guide", raw: referencePackRaw })}
            onRemoveProjectStyleGuide={() => send({ type: "remove-project-style-guide" })}
            onAddSessionReference={() => send({ type: "add-session-reference", raw: referencePackRaw })}
            onClearSessionReferences={() => send({ type: "clear-session-references" })}
            sessionReferenceCount={sessionReferenceCount}
            canMutateDocument={bootstrap.data.canMutateDocument}
            fileKeyAvailable={bootstrap.data.fileKeyAvailable}
          />
        )}
        {activeTab === "profile" && (
          <ProfileEditor
            canPersist={bootstrap.data.canMutateDocument}
            profile={profile}
            suggestion={bootstrap.data.profileSuggestion}
            pages={bootstrap.data.pages}
            collections={collections}
            configured={bootstrap.data.profileConfigured}
            dirty={draftState.dirty}
            issues={draftState.issues}
            semanticErrors={draftState.semanticErrors}
            onChange={(next) => {
              setProfile(next);
              setContribution(undefined);
              setNotice(undefined);
              setError(undefined);
            }}
            onSave={() => send({ type: "save-profile", profile })}
            onAcceptSuggestion={() => send({ type: "save-profile", profile: bootstrap.data.profileSuggestion })}
            onDiscard={() => {
              setProfile(discardProfileDraft(committedProfile, bootstrap.data.profileSuggestion, bootstrap.data.profileConfigured));
              setContribution(undefined);
              setNotice(undefined);
              setError(undefined);
            }}
          />
        )}
      </div>

      <footer className="app-footer">
        <span title={producerLabel(bootstrap.data.producer)}>{producerLabel(bootstrap.data.producer)}</span>
        <span>·</span>
        <span>{bootstrap.data.fileName}</span>
        <button className="footer-link" onClick={() => setActiveTab("profile")}>Audit setup</button>
      </footer>
    </main>
  );
}

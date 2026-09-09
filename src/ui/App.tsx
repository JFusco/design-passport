import { useEffect, useMemo, useState } from "react";
import { PRODUCT_NAME } from "../core/constants";
import type {
  Axis,
  ChangePlan,
  ReadinessProfile,
  ReadinessReport,
  ScanProgress,
  ScanScope,
} from "../core/contracts";
import type { VariableCollectionOption } from "../figma/adapter";
import type { KnowledgeSummary, PluginToUiMessage, UiToPluginMessage } from "../plugin/messages";
import { BrandMark } from "./BrandMark";
import { Cleanup } from "./components/Cleanup";
import { ContextPanel } from "./components/ContextPanel";
import { Findings } from "./components/Findings";
import { Modules } from "./components/Modules";
import { Overview } from "./components/Overview";
import { ProfileEditor } from "./components/ProfileEditor";
import { findingsForReview } from "./operations/findings";
import { codeConnectImportFeedback } from "./operations/notices";
import { certificationNotice, cloneProfile } from "./operations/presentation";
import type { BootstrapEnvelope, Tab, TokenWizardState, WaiverDraft } from "./types";

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
  const [profile, setProfile] = useState<ReadinessProfile>();
  const [report, setReport] = useState<ReadinessReport>();
  const [plans, setPlans] = useState<ChangePlan[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeSummary>();
  const [collections, setCollections] = useState<VariableCollectionOption[]>([]);
  const [progress, setProgress] = useState<ScanProgress>();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selectionCount, setSelectionCount] = useState(0);
  const [stale, setStale] = useState(true);
  const [showPassing, setShowPassing] = useState(false);
  const [axisFilter, setAxisFilter] = useState<Axis | "all">("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [rootFilter, setRootFilter] = useState("all");
  const [variantFilter, setVariantFilter] = useState("all");
  const [expanded, setExpanded] = useState<string>();
  const [undoAcknowledged, setUndoAcknowledged] = useState(false);
  const [codeConnectRaw, setCodeConnectRaw] = useState("");
  const [tokenWizard, setTokenWizard] = useState<TokenWizardState>();
  const [waiverDraft, setWaiverDraft] = useState<WaiverDraft>();

  useEffect(() => {
    let initialized = false;
    const handler = (event: MessageEvent<{ pluginMessage?: PluginToUiMessage }>) => {
      const message = event.data?.pluginMessage;
      if (!message || typeof message !== "object" || typeof message.type !== "string") return;
      if (message.type === "bootstrap") {
        initialized = true;
        setBootstrap({
          data: message.data,
          rulesetVersion: message.rulesetVersion,
          catalogVersion: message.catalogVersion,
          catalogDigest: message.catalogDigest,
        });
        setProfile(cloneProfile(message.data.profile));
        setCollections(message.data.collections);
        setSelectionCount(message.data.selectionCount);
        if (!message.data.profileConfigured) setActiveTab("profile");
      } else if (message.type === "collections-result") {
        setCollections(message.collections);
      } else if (message.type === "progress") {
        setProgress(message.progress);
        setError(undefined);
      } else if (message.type === "scan-result") {
        setReport(message.report);
        setPlans(message.plans);
        setKnowledge(message.knowledge);
        setCollections(message.collections);
        setProgress(undefined);
        setStale(false);
        setError(undefined);
        setNotice(`Audit complete: ${message.report.grade.letter} · ${message.report.ready ? "ready" : "not ready"}`);
      } else if (message.type === "knowledge-stale") {
        setStale(true);
      } else if (message.type === "selection") {
        setSelectionCount(message.count);
      } else if (message.type === "profile-saved") {
        setProfile(cloneProfile(message.profile));
        setReport(undefined);
        setPlans([]);
        setKnowledge(undefined);
        setStale(true);
        setError(undefined);
        setNotice("Profile saved. The next audit will rebuild whole-file knowledge.");
        setActiveTab("overview");
      } else if (message.type === "mutation-result") {
        setNotice(message.message);
      } else if (message.type === "certified") {
        setNotice(certificationNotice(message.count, message.target, message.removedVariantAnnotations));
      } else if (message.type === "code-connect-result") {
        const feedback = codeConnectImportFeedback(message.accepted, message.rejected);
        if (feedback.tone === "error") {
          setError(feedback.message);
          setNotice(undefined);
        } else {
          setNotice(feedback.message);
          setError(undefined);
        }
        setCodeConnectRaw("");
      } else if (message.type === "export-result") {
        download(message.filename, message.content, message.format === "json" ? "application/json" : "text/markdown");
      } else if (message.type === "scan-cancelled") {
        setError(undefined);
        setProgress(undefined);
        setNotice("Audit cancelled. No document changes were applied.");
      } else if (message.type === "error") {
        setError(message.message);
        setProgress(undefined);
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

  const visibleFindings = useMemo(
    () => {
      const frames = new Map((report?.frames ?? []).map((frame) => [frame.rootId, frame]));
      return findingsForReview(report?.findings ?? [], { showPassing, axis: axisFilter })
        .filter((finding) => pageFilter === "all" || frames.get(finding.rootId)?.pageId === pageFilter)
        .filter((finding) => rootFilter === "all" || finding.rootId === rootFilter)
        .filter((finding) => {
          if (variantFilter === "all") return true;
          const coverage = frames.get(finding.rootId)?.variantCoverage?.find((variant) => variant.variantId === variantFilter);
          return coverage?.findingIds.includes(finding.id) ?? false;
        });
    },
    [report, showPassing, axisFilter, pageFilter, rootFilter, variantFilter],
  );

  const scan = (scope: ScanScope, refreshKnowledge = false) => {
    if (!profile) return;
    setError(undefined);
    setNotice(undefined);
    send({ type: "scan", request: { scope, profile, refreshKnowledge } });
  };

  if (!bootstrap || !profile) {
    return <main className="loading"><span className="spinner" />Loading {PRODUCT_NAME}…</main>;
  }

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

      {!bootstrap.data.profileConfigured && (
        <div className="banner warning">Confirm the file profile before the first audit. Suggested page roles are not persisted until they are saved in Design mode.</div>
      )}
      {!bootstrap.data.canMutateDocument && <div className="banner info">Dev Mode is audit-only. Switch to Design mode to save the profile, clean up findings, or certify frames.</div>}
      {stale && report && !error && (!progress || progress.phase === "complete") && <div className="banner warning">The design changed after this scan. Certification is disabled until whole-file knowledge is refreshed.</div>}
      {error && <div className="banner error"><span>{error}</span><button className="icon-button" onClick={() => setError(undefined)} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="banner success"><span>{notice}</span><button className="icon-button" onClick={() => setNotice(undefined)} aria-label="Dismiss notice">×</button></div>}

      <nav className="tabs" aria-label="Plugin sections">
        {(["overview", "modules", "findings", "cleanup", "context", "profile"] as Tab[]).map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab[0]?.toUpperCase()}{tab.slice(1)}
            {tab === "findings" && report ? <span className="count">{report.findings.filter((item) => item.status !== "pass" && item.status !== "not-applicable").length}</span> : null}
          </button>
        ))}
      </nav>

      {progress && progress.phase !== "complete" && (
        <section className="progress-card" aria-live="polite">
          <div className="progress-copy"><span className="spinner" /><div><strong>{progress.message}</strong><small>{progress.pageName ?? "Building complete design context"}</small></div></div>
          <div className="progress-track"><span style={{ width: `${progress.total ? Math.max(4, progress.completed / progress.total * 100) : 4}%` }} /></div>
          <button className="button subtle" onClick={() => send({ type: "cancel-scan" })}>Cancel</button>
        </section>
      )}

      {activeTab === "overview" && (
        <Overview
          report={report}
          knowledge={knowledge}
          selectionCount={selectionCount}
          stale={stale}
          canMutateDocument={bootstrap.data.canMutateDocument}
          scanning={Boolean(progress && progress.phase !== "complete")}
          onScan={scan}
          onCertify={() => send({ type: "certify" })}
          onCertifyComponents={() => send({ type: "certify-components" })}
          onExport={(format) => send({ type: "export", format })}
        />
      )}
      {activeTab === "findings" && (
        <Findings
          findings={visibleFindings}
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
          disabled={stale}
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
      {activeTab === "cleanup" && (
        <Cleanup
          disabled={stale || !bootstrap.data.canMutateDocument}
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
          codeConnectRaw={codeConnectRaw}
          onCodeConnectRaw={setCodeConnectRaw}
          onImport={() => send({ type: "import-code-connect", raw: codeConnectRaw })}
          onRefresh={() => scan(report?.target.scope ?? "selection", true)}
        />
      )}
      {activeTab === "profile" && (
        <ProfileEditor
          canPersist={bootstrap.data.canMutateDocument}
          profile={profile}
          pages={bootstrap.data.pages}
          collections={collections}
          onChange={(next) => {
            setProfile(next);
            setStale(true);
            setNotice(undefined);
            setError(undefined);
          }}
          onSave={() => send({ type: "save-profile", profile })}
        />
      )}

      <footer className="app-footer">
        <span>Ruleset {bootstrap.rulesetVersion}</span>
        <span>·</span>
        <span>{bootstrap.data.fileName}</span>
      </footer>
    </main>
  );
}

import type { ReactNode } from "react";
import { AXIS_LABELS } from "../../core/constants";
import { producerLabel } from "../../core/build-info";
import type { ReadinessReport, ScanScope } from "../../core/contracts";
import type { PageOption, SelectionSummary } from "../../figma/adapter";
import type { AuditRecheckRequest } from "../../plugin/messages";
import { actionableIssueSummary } from "../operations/breakdown";
import { BrandMark } from "../BrandMark";
import { auditedTargetSummary, selectionEligibility } from "../operations/audit-scope";
import { gradeClass, designerText } from "../operations/presentation";
import { PageBatch } from "./PageBatch";
import { TokenCoverage } from "./TokenCoverage";

export interface OverviewProps {
  report: ReadinessReport | undefined;
  auditOnly?: boolean;
  reportOnly?: boolean;
  excludedPageIds?: readonly string[];
  onCleanup?: () => void;
  selectionSummary: SelectionSummary;
  stale: boolean;
  scanning: boolean;
  actionsBlocked: boolean;
  historical?: boolean;
  pages?: PageOption[];
  fileKeyAvailable?: boolean;
  onReviewPages?: (pageIds: string[]) => void;
  onRecheck?: (request: AuditRecheckRequest) => void;
  recheckDisabled?: boolean;
  onScan: (scope: ScanScope, refresh?: boolean) => void;
  onExport: (format: "json" | "markdown") => void;
  children?: ReactNode;
  pageExclusions?: ReactNode;
  cleanupCount?: number;
}

export function Overview(props: OverviewProps) {
  const eligibility = selectionEligibility(props.selectionSummary);
  const historicalExport = props.historical || props.stale;
  const issues = props.report ? actionableIssueSummary(props.report) : undefined;
  const recheckDisabled = props.recheckDisabled || props.actionsBlocked || props.scanning;
  const auditedTarget = props.report
    ? auditedTargetSummary(props.report.target.scope, props.report.frames.map((frame) => frame.rootName))
    : undefined;
  const status = props.stale
    ? props.report?.ready ? "Grade passed · refresh required" : "Refresh required to confirm readiness"
    : props.report?.ready
      ? "Ready for handoff"
      : "Needs attention before handoff";
  return (
    <section className="panel stack">
      {!props.reportOnly && <div className="scope-card">
        <div><h2>Run the audit</h2><p>The rest of the file is supporting context. The grade and findings apply only to your chosen target.</p></div>
        <div className="scope-actions">
          <button className="button primary" disabled={props.actionsBlocked || props.scanning} onClick={() => props.onScan("page")}>Run audit · Current page</button>
          <button
            className="button"
            disabled={props.actionsBlocked || props.scanning || !eligibility.canAudit}
            aria-describedby={eligibility.guidance ? "selection-guidance" : undefined}
            onClick={() => props.onScan("selection")}
          >
            Audit selection ({props.selectionSummary.eligibleCount})
          </button>
        </div>
        {eligibility.guidance ? <p id="selection-guidance" className="selection-guidance" aria-live="polite">{eligibility.guidance}</p> : null}
        {props.pageExclusions}
        <details className="audit-more"><summary>More audit targets</summary><div className="stack"><button className="button" disabled={props.actionsBlocked || props.scanning} onClick={() => props.onScan("file")}>Source frames</button>{props.pages && props.onReviewPages ? <PageBatch excludedPageIds={props.excludedPageIds ?? []} pages={props.pages} canSave={props.fileKeyAvailable ?? true} disabled={props.actionsBlocked || props.scanning} onReview={props.onReviewPages} /> : null}</div></details>
      </div>}
      {!props.auditOnly && (!props.report ? (
        <div className="empty-state"><div className="empty-mark"><BrandMark /></div><h2>Build a trustworthy handoff signal</h2><p>Choose an audit target to see its readiness. The rest of the file informs the analysis without becoming part of the grade.</p></div>
      ) : (
        <>
          <div className="report-card">
          <div className="report-heading">
            <div className="report-target">
            <h2>{props.report.target.scope === "page" ? props.report.frames[0]?.pageName ?? "Audited page" : auditedTarget?.names[0] ?? "Audited design"} <span>[{props.report.target.scope === "page" ? "Page" : props.report.target.scope === "selection" ? "Selection" : "Source frames"}]</span></h2>
            <div className="audited-target-summary"><strong>{auditedTarget?.countLabel}</strong><div className="audited-target-names" aria-label="Audited target names">{auditedTarget?.names.map((name, index) => <span key={`${index}:${name}`}>{name}</span>)}{auditedTarget && auditedTarget.remainingCount > 0 ? <span>+{auditedTarget.remainingCount} more</span> : null}</div></div>
            </div>
          <div className="result-hero">
            <div className={`${gradeClass(props.report.grade.letter)} report-grade`} role="img" aria-label={`Grade ${props.report.grade.letter}, ${props.report.grade.score.toFixed(2)} out of 100`}><strong>{props.report.grade.letter}</strong><span>{props.report.grade.score.toFixed(2)}</span></div>
            <div><h3>{props.report.ready ? "Looking good" : "Needs work"}</h3><p className="hero-summary">{reportSummary(props.report)}</p>{props.stale ? <p className="needs-refresh">{status}</p> : null}</div>
          </div>
          {props.onCleanup ? <div className="cleanup-callout"><strong>{props.cleanupCount ?? 0} item{props.cleanupCount === 1 ? "" : "s"} available to clean up</strong><button className="button primary" onClick={props.onCleanup}>Run Cleanup</button></div> : null}
          </div>
          {props.children}
          </div>
          <details className="report-tools"><summary>Audit details &amp; exports</summary><div className="stack">
          <span className="section-label">{historicalExport ? "Historical readiness" : "Overall readiness"}</span><small>{props.report.producer ? `Audit producer: ${producerLabel(props.report.producer)}` : `Historical pre-v3 report · Ruleset ${props.report.rulesetVersion}`}</small>
          {props.report.target.resolution?.mode === "component-sources" ? <div className="banner info" role="status">The selected documentation wrapper was excluded. This audit targets its nested top-level component sets and standalone components.</div> : null}
          <TokenCoverage frames={props.report.frames} />
          {issues ? <div className="scope-card" aria-label="Issue summary">
            <div><strong>{issues.actionableCount} actionable issue{issues.actionableCount === 1 ? "" : "s"}</strong><p>{issues.occurrenceCount} affected occurrence{issues.occurrenceCount === 1 ? "" : "s"}. {issues.relatedGroupCount > 0 ? `${issues.relatedGroupCount} related group${issues.relatedGroupCount === 1 ? " needs" : "s need"} individual review; a shared fix is unverified.` : props.report.schemaVersion >= 2 ? "Verified common sources are counted once." : "Historical findings retain their original counts."}</p></div>
          </div> : null}
          {props.onRecheck ? <div className="scope-card">
            <div><span className="section-label">Verify this audit</span><p>Regenerate the captured target when context or unsupported changes need a full verification.</p></div>
            <div className="scope-actions">
              <button className="button primary" disabled={recheckDisabled} onClick={() => props.onRecheck?.({ mode: "full" })}>Regenerate audit to verify</button>
            </div>
          </div> : null}
          {props.report.blockers.length > 0 && <div className="blocker-card"><strong>{props.report.blockers.length} hard blocker{props.report.blockers.length === 1 ? "" : "s"}</strong>{props.report.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div>}
          <details className="report-diagnostics"><summary>Stats for nerds</summary><p>Report {props.report.snapshotHash} · Verified {props.report.verification?.verifiedAt ?? props.report.generatedAt}</p><p>{props.report.grade.capReason ? designerText(props.report.grade.capReason) : "No grade cap"}</p><div className="axis-grid">
            {props.report.axes.map((axis) => <div className="axis-row" key={axis.axis}><div><span>{AXIS_LABELS[axis.axis]}</span><strong>{axis.score.toFixed(1)}</strong></div><div className="score-track"><span style={{ width: `${axis.score}%` }} /></div></div>)}
          </div></details>
          <div className="footer-actions">
            <button className="button" disabled={!historicalExport && (props.scanning || props.actionsBlocked)} onClick={() => props.onExport("json")}>{historicalExport ? "Export historical JSON" : "Export JSON"}</button>
            <button className="button" disabled={!historicalExport && (props.scanning || props.actionsBlocked)} onClick={() => props.onExport("markdown")}>{historicalExport ? "Export historical Markdown" : "Export Markdown"}</button>
          </div>
          </div></details>
        </>
      ))}
    </section>
  );
}

export function reportSummary(report: ReadinessReport): string {
  const count = actionableIssueSummary(report).actionableCount;
  const weakest = [...report.frames].sort((a, b) => a.grade.score - b.grade.score)[0];
  return (count === 0 ? "Your audited design meets the readiness requirements." : `${count} issues to address. ${weakest?.rootName ?? "The lowest-scoring module"} sets your overall score.`).slice(0, 120);
}

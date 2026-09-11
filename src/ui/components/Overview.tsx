import { AXIS_LABELS } from "../../core/constants";
import type { ReadinessReport, ScanScope } from "../../core/contracts";
import type { SelectionSummary } from "../../figma/adapter";
import { BrandMark } from "../BrandMark";
import { auditedTargetSummary, selectionEligibility } from "../operations/audit-scope";
import { gradeClass } from "../operations/presentation";

export interface OverviewProps {
  report: ReadinessReport | undefined;
  selectionSummary: SelectionSummary;
  stale: boolean;
  canMutateDocument: boolean;
  scanning: boolean;
  onScan: (scope: ScanScope, refresh?: boolean) => void;
  onCertify: () => void;
  onCertifyComponents: () => void;
  onExport: (format: "json" | "markdown") => void;
}

export function Overview(props: OverviewProps) {
  const componentFrames = props.report?.frames.filter((frame) => frame.rootType === "COMPONENT" || frame.rootType === "COMPONENT_SET") ?? [];
  const componentsReady = componentFrames.length > 0 && componentFrames.every((frame) => frame.ready);
  const eligibility = selectionEligibility(props.selectionSummary);
  const auditedTarget = props.report
    ? auditedTargetSummary(props.report.target.scope, props.report.frames.map((frame) => frame.rootName))
    : undefined;
  const status = props.stale
    ? props.report?.ready ? "Grade passed · refresh required" : "Refresh required to confirm readiness"
    : props.report?.ready
      ? "Ready for MCP/API consumption"
      : "Not ready for certification";
  return (
    <section className="panel stack">
      <div className="scope-card">
        <div><span className="section-label">Audit target</span><p>Choose what to audit. The rest of the file is used only as supporting context; the grade and findings apply only to your chosen target.</p></div>
        <div className="scope-actions">
          <button
            className="button primary"
            disabled={props.scanning || !eligibility.canAudit}
            aria-describedby={eligibility.guidance ? "selection-guidance" : undefined}
            onClick={() => props.onScan("selection")}
          >
            Audit selection ({props.selectionSummary.eligibleCount})
          </button>
          <button className="button" disabled={props.scanning} onClick={() => props.onScan("page")}>Current page</button>
          <button className="button" disabled={props.scanning} onClick={() => props.onScan("file")}>Source frames</button>
        </div>
        {eligibility.guidance ? <p id="selection-guidance" className="selection-guidance" aria-live="polite">{eligibility.guidance}</p> : null}
      </div>
      {!props.report ? (
        <div className="empty-state"><div className="empty-mark"><BrandMark /></div><h2>Build a trustworthy handoff signal</h2><p>Choose an audit target to see its readiness. The rest of the file informs the analysis without becoming part of the grade.</p></div>
      ) : (
        <>
          <div className="result-hero">
            <div className={gradeClass(props.report.grade.letter)}>{props.report.grade.letter}</div>
            <div><span className="section-label">Overall readiness</span><h2>{props.report.grade.score.toFixed(1)} / 100</h2><p className={props.stale ? "needs-refresh" : props.report.ready ? "ready" : "not-ready"}>{status}</p>{props.report.grade.capReason && <small>{props.report.grade.capReason}</small>}</div>
          </div>
          <div className="audited-target-summary">
            <div>
              <span className="section-label">Audited target</span>
              <strong>{auditedTarget?.countLabel}</strong>
            </div>
            <div className="audited-target-names" aria-label="Audited target names">
              {auditedTarget?.names.map((name, index) => <span key={`${index}:${name}`}>{name}</span>)}
              {auditedTarget && auditedTarget.remainingCount > 0 ? <span>+{auditedTarget.remainingCount} more</span> : null}
            </div>
          </div>
          {props.report.blockers.length > 0 && <div className="blocker-card"><strong>{props.report.blockers.length} hard blocker{props.report.blockers.length === 1 ? "" : "s"}</strong>{props.report.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div>}
          <div className="axis-grid">
            {props.report.axes.map((axis) => <div className="axis-row" key={axis.axis}><div><span>{AXIS_LABELS[axis.axis]}</span><strong>{axis.score.toFixed(1)}</strong></div><div className="score-track"><span style={{ width: `${axis.score}%` }} /></div></div>)}
          </div>
          <div className="footer-actions">
            {props.stale
              ? <button className="button primary" disabled={props.scanning} onClick={() => props.onScan(props.report?.target.scope ?? "selection", true)}>Refresh audit to certify</button>
              : <>
                <button className="button primary" disabled={props.scanning || !props.canMutateDocument || !componentsReady} onClick={props.onCertifyComponents}>Certify components ({componentFrames.length})</button>
                <button className="button" disabled={props.scanning || !props.canMutateDocument || !props.report.ready} onClick={props.onCertify}>Certify source frames</button>
              </>}
            <button className="button" disabled={props.scanning || props.stale} onClick={() => props.onExport("json")}>Export JSON</button>
            <button className="button" disabled={props.scanning || props.stale} onClick={() => props.onExport("markdown")}>Export Markdown</button>
          </div>
        </>
      )}
    </section>
  );
}

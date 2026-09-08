import { AXIS_LABELS } from "../../core/constants";
import type { ReadinessReport, ScanScope } from "../../core/contracts";
import type { KnowledgeSummary } from "../../plugin/messages";
import { BrandMark } from "../BrandMark";
import { gradeClass } from "../operations/presentation";

export interface OverviewProps {
  report: ReadinessReport | undefined;
  knowledge: KnowledgeSummary | undefined;
  selectionCount: number;
  stale: boolean;
  canMutateDocument: boolean;
  scanning: boolean;
  onScan: (scope: ScanScope, refresh?: boolean) => void;
  onCertify: () => void;
  onExport: (format: "json" | "markdown") => void;
}

export function Overview(props: OverviewProps) {
  const status = props.stale
    ? props.report?.ready ? "Grade passed · refresh required" : "Refresh required to confirm readiness"
    : props.report?.ready
      ? "Ready for MCP/API consumption"
      : "Not ready for certification";
  return (
    <section className="panel stack">
      <div className="scope-card">
        <div><span className="section-label">Audit target</span><p>The target is graded independently; every scan uses whole-file knowledge.</p></div>
        <div className="scope-actions">
          <button className="button primary" disabled={props.scanning || props.selectionCount === 0} onClick={() => props.onScan("selection")}>Selection ({props.selectionCount})</button>
          <button className="button" disabled={props.scanning} onClick={() => props.onScan("page")}>Current page</button>
          <button className="button" disabled={props.scanning} onClick={() => props.onScan("file")}>Source frames</button>
        </div>
      </div>
      {!props.report ? (
        <div className="empty-state"><div className="empty-mark"><BrandMark /></div><h2>Build a trustworthy handoff signal</h2><p>Choose an audit target. The first run indexes every page, token source, component relationship, responsive family, and repeated structure before grading.</p></div>
      ) : (
        <>
          <div className="result-hero">
            <div className={gradeClass(props.report.grade.letter)}>{props.report.grade.letter}</div>
            <div><span className="section-label">Overall readiness</span><h2>{props.report.grade.score.toFixed(1)} / 100</h2><p className={props.stale ? "needs-refresh" : props.report.ready ? "ready" : "not-ready"}>{status}</p>{props.report.grade.capReason && <small>{props.report.grade.capReason}</small>}</div>
          </div>
          {props.report.blockers.length > 0 && <div className="blocker-card"><strong>{props.report.blockers.length} hard blocker{props.report.blockers.length === 1 ? "" : "s"}</strong>{props.report.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div>}
          <div className="axis-grid">
            {props.report.axes.map((axis) => <div className="axis-row" key={axis.axis}><div><span>{AXIS_LABELS[axis.axis]}</span><strong>{axis.score.toFixed(1)}</strong></div><div className="score-track"><span style={{ width: `${axis.score}%` }} /></div></div>)}
          </div>
          <div className="knowledge-strip">
            <div><strong>{props.knowledge?.nodeCount.toLocaleString() ?? "—"}</strong><span>nodes known</span></div>
            <div><strong>{props.knowledge?.componentCount.toLocaleString() ?? "—"}</strong><span>components</span></div>
            <div><strong>{props.knowledge?.responsiveFamilyCount.toLocaleString() ?? "—"}</strong><span>responsive families</span></div>
            <div><strong>{props.knowledge?.pageCount ?? "—"}/{props.knowledge?.loadedPageCount ?? "—"}</strong><span>pages / loaded</span></div>
          </div>
          <div className="footer-actions">
            {props.stale
              ? <button className="button primary" disabled={props.scanning} onClick={() => props.onScan(props.report?.target.scope ?? "selection", true)}>Refresh audit to certify</button>
              : <button className="button primary" disabled={!props.canMutateDocument || !props.report.ready} onClick={props.onCertify}>Certify source frames</button>}
            <button className="button" disabled={props.stale} onClick={() => props.onExport("json")}>Export JSON</button>
            <button className="button" disabled={props.stale} onClick={() => props.onExport("markdown")}>Export Markdown</button>
          </div>
        </>
      )}
    </section>
  );
}

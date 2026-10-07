import type { AuditSaveStatus, SavedAuditSummary } from "../../plugin/audit-state";
import { formatDateTime } from "../operations/presentation";
import { gradeClass } from "../operations/presentation";

export interface SavedAuditsProps {
  audits: SavedAuditSummary[];
  activeId: string | undefined;
  status: AuditSaveStatus | undefined;
  disabled: boolean;
  onOpen: (id: string) => void;
  onViewCurrent?: () => void;
  onForget: (id: string) => void;
  onClear: () => void;
}

export function SavedAudits(props: SavedAuditsProps) {
  const selected = props.audits.find((audit) => audit.id === props.activeId) ?? props.audits[0];
  return (
    <section className="saved-audits" aria-label="Saved audits">
      <div className="saved-audits-heading">
        <h2>Saved Audit Results</h2>
        {props.status?.state === "saved" ? <span className="saved-status" role="status" title={props.status.message}>Saved on this device</span> : null}
      </div>
      {selected ? <div className="saved-report"><span>{selected.label}</span><div className="saved-report-preview"><div className={`${gradeClass(selected.grade.letter)} saved-report-grade`}>{selected.grade.letter}</div><strong>{selected.grade.score.toFixed(1)}</strong><button className="button primary" disabled={props.disabled} onClick={() => { if (selected.id === props.activeId && props.onViewCurrent) props.onViewCurrent(); else props.onOpen(selected.id); }}>View report</button></div></div> : null}
      <details className="saved-audit-tools"><summary>History &amp; storage</summary><div className="stack">
      {props.audits.length > 0 ? (
        <>
          <label className="section-label" htmlFor="saved-audit-picker">Saved audits</label>
          <select id="saved-audit-picker" value={props.activeId ?? ""} disabled={props.disabled} onChange={(event) => { if (event.target.value) props.onOpen(event.target.value); }}>
            <option value="" disabled>Choose a saved result</option>
            {props.audits.map((audit) => <option key={audit.id} value={audit.id}>{audit.label} · {audit.grade.letter} · {formatDateTime(audit.generatedAt)}</option>)}
          </select>
        </>
      ) : <p className="fine-print">Completed audits save automatically on this device. Reopen Passport to pick up where you left off.</p>}
      <div className="saved-audits-actions">
        {props.audits.length > 0 ? <button className="button subtle" disabled={props.disabled || !props.activeId} onClick={() => { if (props.activeId && window.confirm("Delete this saved report and its view preferences? This cannot be undone.")) props.onForget(props.activeId); }}>Delete saved report</button> : null}
        <button className="button subtle" disabled={props.disabled} onClick={props.onClear}>Clear rebuildable context</button>
      </div>
      <p className="fine-print">Clearing context keeps saved reports and view preferences. Local space is limited; export reports you need to keep.</p>
      </div></details>
    </section>
  );
}

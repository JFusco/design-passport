import type { ContextStatus } from "../../plugin/messages";
import type { ScanProgress } from "../../core/contracts";
import { formatDateTime } from "../operations/presentation";

const LABELS = { missing: "Generate your file context", cached: "Cached, will validate on audit", current: "Context is current", outdated: "Context needs verification", generating: "Generating context…" };
export function ContextStatusPanel(props: { status: ContextStatus; progress?: ScanProgress; disabled: boolean; onGenerate: (regenerate: boolean) => void; onCancel: () => void }) {
  const { status, progress } = props;
  const generating = status.state === "generating";
  const determinate = progress && progress.total > 0;
  return <section className="context-status-card stack" aria-label="File context">
    <div className="section-heading"><h2>{LABELS[status.state]}</h2><span className={`context-badge context-${status.state}`}>{status.state}</span></div>
    <p role="status">{status.reason ?? "Context helps Passport understand your included pages before running an audit."}</p>
    {status.outcome === "failed" || status.outcome === "cancelled" ? <p className="fine-print">The previous report remains available.</p> : null}
    {status.knowledge ? <small>Last accepted capture: {formatDateTime(status.knowledge.builtAt)} · {status.knowledge.loadedPageCount} included pages captured · {status.knowledge.excludedPageIds?.length ?? 0} excluded</small> : null}
    {status.validatedAt ? <small>Whole context validated: {formatDateTime(status.validatedAt)}</small> : null}
    {generating ? <><progress aria-label="Context generation" {...(determinate ? { value: progress.completed, max: progress.total } : {})} /><span role="status">{progress?.message ?? "Preparing the file"}</span><button className="button" onClick={props.onCancel}>Cancel generation</button></> : <button className="button primary" disabled={props.disabled} onClick={() => props.onGenerate(status.state !== "missing")}>{status.state === "missing" ? "Generate context" : "Regenerate context"}</button>}
  </section>;
}
